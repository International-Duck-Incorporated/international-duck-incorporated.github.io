/**
 * BadEgg v3 - edge HTTP security gateway & schema-2 blocklist consumer.
 *
 * Ports the BadEgg v3 security gateway (`international-duck-incorporated/badegg-v3`:
 * `badegg/engine.py`, `badegg/ratelimit.py`, `badegg/gateway.py`, `badegg/config.py`)
 * onto Cloudflare Pages Functions (`functions/_middleware.js`) and Workers
 * (`worker.js`), combined with the ~1 us binary `hall-of-shame.v2.bin` IPv4/IPv6
 * blocklist from `idi-assets`.
 *
 * Protection layers (in request order):
 *   1. Framing & method safeguards: supported HTTP verbs, Expect/Upgrade checks,
 *      Content-Length bounds, and per-isolate in-flight concurrency cap (64).
 *   2. Threat-intel IP/CIDR blocklist: `hall-of-shame.v2.bin` / `.json` cached
 *      in memory and optional `IDI_BADEGG` KV, numeric IPv4 + IPv6 matching.
 *   3. Explainable temporary exact-IP bans: 15-minute TTL bans (`ban_ttl_seconds = 900`)
 *      earned by high-confidence attack payloads or sustained rate-limit abuse,
 *      synced across isolates when `IDI_BADEGG` KV is bound.
 *   4. Per-IP token-bucket rate limiter: bounded LRU table (`MAX_TRACKED_SOURCES = 10_000`),
 *      HTTP 429 with `Retry-After`, optional strike escalation to temporary ban,
 *      zero IP retention in logs.
 *   5. Deterministic request inspection (`RULES`): 24 rules covering SQL injection,
 *      XSS (including obfuscated `javascript:` URIs), shell command injection,
 *      Log4Shell/JNDI & server-side template injection, NoSQL operator injection,
 *      and sensitive path traversal, with `minimize_false_bans` (0.97) and
 *      `catch_more` (0.92) risk profiles.
 *   6. Runtime configuration API (`GET|PUT|DELETE /api/badegg/config`), token
 *      authenticated with `BADEGG_ADMIN_TOKEN`, storing overrides in the
 *      `IDI_BADEGG` KV namespace so policy can be retuned without a redeploy.
 *   7. Outgoing secret-leak protection & metadata-only event ring buffer:
 *      redacts or blocks leaked credentials in response headers (and optional
 *      text/JSON bodies) while keeping zero raw payloads or client IPs in memory
 *      diagnostics (`?badegg-status=1`).
 */

import {
  BADEGG_CONFIG_KV_KEY,
  BADEGG_CONFIG_PATH,
  CONFIG_BY_KEY,
  CONFIG_DEFAULTS,
  CONFIG_GROUPS,
  CONFIG_KEYS,
  CONFIG_SCHEMA,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_MAX_GATEWAY_BODY_BYTES,
  DEFAULT_MAX_SCAN_CHARS,
  MAX_UNINSPECTED_REQUEST_BYTES,
  RISK_PROFILES,
  configEnvView,
  canonicalProtectionPath,
  normalizeConfigValue,
  resolveConfig,
  sanitizeConfigOverrides,
} from "../badegg-config.js";

// The configuration surface lives in `badegg-config.js` so the console and the
// gateway read the same schema. Re-exported here because this module was the
// public entry point for it, and tools/tests import it from here.
export {
  BADEGG_CONFIG_KV_KEY,
  BADEGG_CONFIG_PATH,
  CONFIG_DEFAULTS,
  CONFIG_GROUPS,
  CONFIG_KEYS,
  CONFIG_SCHEMA,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_MAX_GATEWAY_BODY_BYTES,
  DEFAULT_MAX_SCAN_CHARS,
  MAX_UNINSPECTED_REQUEST_BYTES,
  RISK_PROFILES,
  configEnvView,
  resolveConfig,
  sanitizeConfigOverrides,
};

export const BADEGG_VERSION = "3.0";

export const BIN_URL =
  "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/main/hall-of-shame.v2.bin?ref_type=heads";
export const JSON_URL =
  "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/main/hall-of-shame.v2.json?ref_type=heads";

const KV_KEY = "badegg:blocklist:v2";
const KV_TEMPBAN_PREFIX = "badegg:v3:ban:";
const TTL_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const KV_CACHE_TTL_S = 300;
const FETCH_TIMEOUT_MS = 2000;
const BLOCKLIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CONTACT_EMAIL = "0xffshell@duck.com";
const BIN_MAGIC = 0x49444932; // "IDI2"
const BIN_VERSION = 2;
const MIN_V4_IPS = 1000;
const MIN_V4_NETS = 100;
const MIN_V6_NETS = 1;

/** Manual entries, always enforced. Keep empty unless something is urgent. */
const EXTRA_BLOCKED = [];

// ---------------------------------------------------------------- v3 policy & constants
export const SUPPORTED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

export const MAX_TRACKED_SOURCES = 10_000;
export const IDLE_EVICTION_MS = 3_600_000;
export const MAX_ACTIVE_TEMP_BANS = 4_096;
export const MAX_EVENTS = 200;

// ---------------------------------------------------------------- v3 inspection rules
const JS_GAP = String.raw`(?:[\s\x00-\x20]|&#x?0*[0-9a-f]{1,6};?){0,8}`;
const JS_SCHEME =
  String.raw`(?!javascript\s*:)` +
  "javascript".split("").join(JS_GAP) +
  JS_GAP +
  String.raw`(?::|&colon;)`;

const SHELL_HARD =
  String.raw`sh|bash|zsh|ksh|dash|curl|wget|nc|ncat|netcat|telnet|chmod|chown|chgrp|` +
  String.raw`whoami|uname|hostname|ifconfig|ipconfig|nslookup|dig|powershell|pwsh|` +
  String.raw`python[23]?|perl|ruby|php|node|openssl|xxd|crontab|systemctl`;
const SHELL_SOFT =
  String.raw`cat|id|ps|rm|ls|cp|mv|dd|kill|head|tail|touch|find|grep|awk|sed|env|` +
  String.raw`export|wc|du|df|more|less|base64|tar|zip|unzip`;
const SHELL_ARG =
  String.raw`(?:\s+[-/~$'"\\.]|\s+\w+://|\s+[\w-]{1,40}\.[a-z]{2,6}(?:[/\s]|$)|` +
  String.raw`\s+\d{1,3}(?:\.\d{1,3}){3}\b|\s*[<>]|\s*\|\s*\w)`;
const SHELL_TERM = String.raw`(?=\s*(?:[;&|)\`]|[\r\n]|$))`;
const SHELL_CMD = String.raw`(?:(?:${SHELL_HARD})\b(?:${SHELL_ARG}|${SHELL_TERM})|(?:${SHELL_SOFT})\b${SHELL_ARG})`;
const SHELL_INJECTION_PATTERN =
  String.raw`(?:;|&&|\|\|)\s*${SHELL_CMD}` +
  String.raw`|\|\s*(?:sh|bash|zsh|python[23]?|perl|nc|ncat|netcat|telnet)\b` +
  String.raw`|\`\s*${SHELL_CMD}[^\`\r\n]{0,100}\``;

export const RULES = [
  {
    key: "private_key",
    category: "private_key",
    directions: ["input", "output"],
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
    confidence: 1.0,
    severity: "critical",
    summary: "Private-key marker detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "aws_access_key",
    category: "cloud_credential",
    directions: ["input", "output"],
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/i,
    confidence: 0.99,
    severity: "high",
    summary: "AWS-style access-key format detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "github_token",
    category: "source_control_credential",
    directions: ["input", "output"],
    pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/i,
    confidence: 0.99,
    severity: "high",
    summary: "GitHub-token-like format detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "slack_token",
    category: "api_credential",
    directions: ["input", "output"],
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}/i,
    confidence: 0.99,
    severity: "high",
    summary: "Slack API token detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "stripe_secret_key",
    category: "api_credential",
    directions: ["input", "output"],
    pattern: /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/i,
    confidence: 0.99,
    severity: "high",
    summary: "Stripe secret key detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "google_api_key",
    category: "api_credential",
    directions: ["input", "output"],
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/i,
    confidence: 0.98,
    severity: "high",
    summary: "Google API key detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "connection_string_credential",
    category: "credential_assignment",
    directions: ["input", "output"],
    pattern:
      /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|mssql|ftp):\/\/[^\s:@/]{1,64}:(?<secret>[^\s:@/]{1,128})@/i,
    confidence: 0.98,
    severity: "high",
    summary: "Database or service connection string containing an inline password.",
    sensitive: true,
    pii: false,
  },
  {
    key: "openai_token",
    category: "api_credential",
    directions: ["input", "output"],
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/i,
    confidence: 0.98,
    severity: "high",
    summary: "API-token-like format detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "jwt",
    category: "bearer_credential",
    directions: ["input", "output"],
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/i,
    confidence: 0.96,
    severity: "high",
    summary: "JWT-like bearer token detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "authorization_credential",
    category: "authorization_credential",
    directions: ["input", "output"],
    pattern:
      /\b(?:proxy-)?authorization\b\s*[:=]\s*(?:basic|bearer|token)\s+[A-Za-z0-9._~+/-]{1,}={0,2}/i,
    confidence: 0.99,
    severity: "high",
    summary: "HTTP authorization credential detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "cookie_credential",
    category: "cookie_credential",
    directions: ["input", "output"],
    pattern:
      /\b(?:set-cookie|cookie)\b\s*:\s*[^\r\n]*?(?:\b(?:session|sess|sid|auth|token|jwt|login|remember|csrf|xsrf|phpsessid|jsessionid)\w*\s*=\s*[^;\r\n]{4,}|=\s*[A-Za-z0-9._~+/-]{24,}={0,2}(?:;|$))/i,
    confidence: 0.98,
    severity: "high",
    summary: "HTTP cookie/session credential detected.",
    sensitive: true,
    pii: false,
  },
  {
    key: "credential_assignment",
    category: "credential_assignment",
    directions: ["input", "output"],
    // The unquoted branch has to be value-shaped. `session: eating, sorting...`
    // in ordinary prose would otherwise read as a credential and, in `block`
    // mode, take down a page that merely uses the word.
    pattern:
      /\b(?:aws[_-]?secret[_-]?access[_-]?key|api[_-]?(?:key|secret)|(?:(?:access|refresh|id|auth)[_-]?)?token|client[_-]?secret|private[_-]?key|authorization|bearer|jwt|(?:session(?:[_-]?(?:id|token))?|sid)|secret|password|passwd)\b\s*[:=]\s*(?:"(?<secret_double>[^\r\n"]+)"|'(?<secret_single>[^\r\n']+)'|(?<secret>(?![^\s]*\s)[A-Za-z0-9_\-+/=.!~\[\]()]{8,}))/i,
    confidence: 0.9,
    severity: "high",
    summary: "Credential-like value assigned to a sensitive field.",
    sensitive: true,
    pii: false,
  },
  {
    key: "sql_union_select",
    category: "sql_injection",
    directions: ["input"],
    pattern: /\bunion\s+(?:all\s+)?select\b/i,
    confidence: 0.96,
    severity: "high",
    summary: "SQL UNION/SELECT pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "sql_tautology",
    category: "sql_injection",
    directions: ["input"],
    pattern:
      /['"]\s*\)?\s*(?:or|and)\s+['"]?[\w.-]{1,40}['"]?\s*=\s*['"]?[\w.-]{1,40}|\b(?:or|and)\s+['"][^'"\r\n]{1,40}['"]\s*=\s*['"]?[^'"\r\n]{1,40}|\b(?:or|and)\s+[\w.-]{1,20}(?:=|<>|!=|<|>)[\w.-]{1,20}(?![=<>])|\b(?:or|and)\s*\(\s*['"]{0,2}[\w.-]{0,40}['"]{0,2}\s*=\s*['"]{0,2}[\w.-]{0,40}|\b(?:or|and)\s+['"]{2}\s*(?:[-=<>&^*|+]|['"])/i,
    confidence: 0.99,
    severity: "critical",
    summary: "SQL tautology pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "sql_stacked_query",
    category: "sql_injection",
    directions: ["input"],
    pattern: /;\s*(?:drop|alter|truncate|delete|insert|update|exec(?:ute)?)\b/i,
    confidence: 0.99,
    severity: "critical",
    summary: "Stacked SQL statement pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "sql_comment_evasion",
    category: "sql_injection",
    directions: ["input"],
    pattern:
      /\/\*![\d\s]{0,8}(?:union|select|from|where|and|or|insert|update|delete|drop)\b|\/\*(?:!\d*)?[^*]{0,60}\*\/\s*(?:union|select|from|where|and|or|insert|update|delete|drop)\b|\b(?:union|select|from|where|and|or)\s*\/\*(?:!\d*)?[^*]{0,60}\*\//i,
    confidence: 0.97,
    severity: "high",
    summary: "SQL keywords separated by inline comments.",
    sensitive: false,
    pii: false,
  },
  {
    key: "sql_comment_terminator",
    category: "sql_injection",
    directions: ["input"],
    pattern:
      /[\w.@-]{1,40}['"]\)?(?:--|#)(?=\s|$|[^\w-])|[\w.@-]{1,40}['"]\)?\s{0,3}(?:--|#|\/\*)\s*(?=$|[&\r\n])/i,
    confidence: 0.97,
    severity: "high",
    summary: "Quoted value followed by a SQL comment marker.",
    sensitive: false,
    pii: false,
  },
  {
    key: "sql_time_delay",
    category: "sql_injection",
    directions: ["input"],
    pattern: /\b(?:sleep|benchmark|pg_sleep)\s*\(|\bwaitfor\s+delay\b/i,
    confidence: 0.98,
    severity: "high",
    summary: "SQL timing-function pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "xss",
    category: "cross_site_scripting",
    directions: ["input"],
    pattern: new RegExp(
      String.raw`<\s*script\b|javascript\s*:(?:\S|\s{1,5}\S*\()|\bon\w{2,32}\s*=\s*['"]?` +
        String.raw`|&#x?0*(?:3c|60)\s*;?\s*\/?\s*(?:script|img|svg|iframe|object|embed)\b` +
        String.raw`|data\s*:\s*(?:text\/html|application\/xhtml)` +
        String.raw`|style\s*=\s*['"][^'"]{0,80}expression\s*\(` +
        String.raw`|${JS_SCHEME}` +
        String.raw`|<\s*[a-z][^>]{0,200}?(?:&#x?0*[0-9a-f]{1,8};?){4,}`,
      "i"
    ),
    confidence: 0.97,
    severity: "high",
    summary: "Cross-site-scripting-like input pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "command_injection",
    category: "command_injection",
    directions: ["input"],
    pattern: new RegExp(SHELL_INJECTION_PATTERN, "is"),
    confidence: 0.99,
    severity: "critical",
    summary: "Shell-command-like input pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "shell_variable_assignment",
    category: "command_injection",
    directions: ["input"],
    pattern: /(?:^|[;&|\n])\s*\w{1,20}=\$\(/i,
    confidence: 0.99,
    severity: "critical",
    summary: "Shell variable assigned from command substitution.",
    sensitive: false,
    pii: false,
  },
  {
    key: "command_substitution",
    category: "command_injection",
    directions: ["input"],
    pattern: /\$\([^)]{1,120}\)|\$\{(?:IFS\b[^}\r\n]*|[^}\r\n]*[;|&`$(][^}\r\n]*)\}/is,
    confidence: 0.89,
    severity: "medium",
    summary: "Shell command-substitution syntax detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "jndi_lookup",
    category: "template_injection",
    directions: ["input"],
    pattern:
      /\$\{\s*(?:jndi|ldap|rmi|dns|iiop|corba|nis)\s*:|\$\{\s*(?:lower|upper|env|sys|date|java|ctx)\s*:[^}\r\n]{0,80}[:}]/i,
    confidence: 0.99,
    severity: "critical",
    summary: "JNDI or Log4j lookup syntax detected (Log4Shell family).",
    sensitive: false,
    pii: false,
  },
  {
    key: "template_expression",
    category: "template_injection",
    directions: ["input"],
    pattern:
      /\{\{\s*[^}\r\n]{0,60}?(?:[*/+-]\s*\d|\b(?:self|config|request|__\w+__|constructor|global|process|os\b|system|exec|popen)\b)[^}\r\n]{0,60}\}\}|\{%\s*(?:import|include|extends|for|if)\b[^%]{0,80}%\}|<%=\s*[^%\r\n]{0,80}%>|#\{[^}\r\n]{0,60}(?:[*/+-]\s*\d|\.class\b|getRuntime)[^}\r\n]{0,60}\}|\?\s*new\s*\(\s*\)/i,
    confidence: 0.97,
    severity: "high",
    summary: "Server-side template expression detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "nosql_operator",
    category: "nosql_injection",
    directions: ["input"],
    pattern:
      /["']?\$(?:ne|gt|gte|lt|lte|in|nin|regex|where|exists|expr|function|accumulator|mapReduce)["']?\s*:/i,
    confidence: 0.97,
    severity: "high",
    summary: "MongoDB query operator supplied in user input.",
    sensitive: false,
    pii: false,
  },
  {
    key: "path_traversal_sensitive",
    category: "path_traversal",
    directions: ["input"],
    pattern:
      /(?<![\w.-])\/(?:etc\/(?:passwd|shadow|group|sudoers|hosts)\b|proc\/self\/(?:environ|cmdline|maps)\b|root\/\.|var\/log\/|windows\/win\.ini|boot\.ini)|(?:\.\.\/|\.\.\\){3,}|(?:\/\.){4,}\/|(?:\.\.\/|\.\.\\)[^\r\n]{0,120}?(?:etc\/|proc\/|sys\/|var\/log|var\/www|root\/|windows\/|winnt\/|system32|win\.ini|boot\.ini|\.ssh|\.aws|\.env|id_rsa|passwd|shadow|wp-config|web\.config|secrets?\.[a-z]{2,5})/i,
    confidence: 0.98,
    severity: "critical",
    summary: "Path traversal toward a sensitive location detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "sensitive_file_parameter",
    category: "path_traversal",
    directions: ["input"],
    pattern:
      /=\s*[\w./\\-]{0,60}?(?:\/|\\\\)(?:\.bash_history|\.bash_profile|\.bashrc|\.ssh\/|\.aws\/|\.env\b|id_rsa|id_dsa|shadow\b|passwd\b|php\.ini|my\.cnf|httpd\.conf|apache2?\.conf|access[_.]log|error[_.]log|boot\.ini|grub\.conf|win\.ini|sam\b|wp-config\.php|web\.config)/i,
    confidence: 0.98,
    severity: "critical",
    summary: "Request parameter points at a sensitive system file.",
    sensitive: false,
    pii: false,
  },
  {
    key: "path_traversal",
    category: "path_traversal",
    directions: ["input"],
    pattern: /(?:\.\.\/|\.\.\\){1,}/i,
    confidence: 0.91,
    severity: "medium",
    summary: "Path-traversal-like input pattern detected.",
    sensitive: false,
    pii: false,
  },
  {
    key: "email_address",
    category: "email_address",
    directions: ["input", "output"],
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    confidence: 0.72,
    severity: "low",
    summary: "Email-address-like data detected.",
    sensitive: false,
    pii: true,
  },
];

export const ATTACK_CATEGORIES = new Set([
  "sql_injection",
  "command_injection",
  "cross_site_scripting",
  "path_traversal",
  "template_injection",
  "nosql_injection",
]);

export const SECRET_CATEGORIES = new Set([
  "private_key",
  "cloud_credential",
  "source_control_credential",
  "api_credential",
  "bearer_credential",
  "authorization_credential",
  "cookie_credential",
  "credential_assignment",
]);

// ---------------------------------------------------------------- v3 rate limiter
export class RateLimiter {
  constructor({ clock = () => Date.now(), maxSources = MAX_TRACKED_SOURCES } = {}) {
    this._clock = clock;
    this._maxSources = Math.max(1, Math.trunc(maxSources));
    this._buckets = new Map();
    this.allowedTotal = 0;
    this.throttledTotal = 0;
    this.escalationsTotal = 0;
    this.evictedTotal = 0;
  }

  _evictIfNeeded(now) {
    if (this._buckets.size < this._maxSources) return;
    for (const [source, bucket] of this._buckets) {
      if (now - bucket.updated >= IDLE_EVICTION_MS) {
        this._buckets.delete(source);
        this.evictedTotal++;
      }
    }
    while (this._buckets.size >= this._maxSources) {
      const oldest = this._buckets.keys().next().value;
      if (oldest === undefined) break;
      this._buckets.delete(oldest);
      this.evictedTotal++;
    }
  }

  check(source, { requests = 120, windowSeconds = 60, burst = 30, banAfter = 0 } = {}) {
    if (!source) throw new Error("A rate-limit source key is required.");
    const reqs = Math.max(1, Math.trunc(requests));
    const winMs = Math.max(1, Math.trunc(windowSeconds)) * 1000;
    const capacity = Math.max(1, Math.trunc(burst));
    const refillPerMs = reqs / winMs;
    const now = this._clock();

    let bucket = this._buckets.get(source);
    if (!bucket) {
      this._evictIfNeeded(now);
      bucket = { tokens: capacity, updated: now, strikes: 0, lastStrike: 0, lastReport: -1000 };
      this._buckets.set(source, bucket);
    } else {
      this._buckets.delete(source);
      const elapsed = Math.max(0, now - bucket.updated);
      bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
      bucket.updated = now;
      this._buckets.set(source, bucket);
    }

    if (bucket.strikes && now - bucket.lastStrike > winMs) {
      bucket.strikes = 0;
    }

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      this.allowedTotal++;
      return {
        allowed: true,
        retryAfter: 0,
        strikes: 0,
        shouldReport: false,
        escalate: false,
        remaining: Math.round(bucket.tokens * 1000) / 1000,
      };
    }

    const deficit = 1 - bucket.tokens;
    const retryAfter = Math.max(1, Math.ceil(deficit / (refillPerMs * 1000)));
    bucket.strikes += 1;
    bucket.lastStrike = now;
    this.throttledTotal++;

    const shouldReport = now - bucket.lastReport >= 1000;
    if (shouldReport) bucket.lastReport = now;

    const escalate = banAfter > 0 && bucket.strikes >= banAfter;
    if (escalate) {
      bucket.strikes = 0;
      this.escalationsTotal++;
    }

    return {
      allowed: false,
      retryAfter,
      strikes: bucket.strikes,
      shouldReport,
      escalate,
      remaining: 0,
    };
  }

  snapshot() {
    return {
      trackedSources: this._buckets.size,
      maxTrackedSources: this._maxSources,
      allowedTotal: this.allowedTotal,
      throttledTotal: this.throttledTotal,
      escalationsTotal: this.escalationsTotal,
      evictedTotal: this.evictedTotal,
    };
  }

  /**
   * Drop one address's bucket. Called when an operator lifts a ban: the
   * strikes that produced it should not quietly re-ban the address seconds
   * later, which would make "lift" look broken.
   */
  resetSource(source) {
    if (!source) return false;
    return this._buckets.delete(source);
  }

  reset() {
    this._buckets.clear();
    this.allowedTotal = 0;
    this.throttledTotal = 0;
    this.escalationsTotal = 0;
    this.evictedTotal = 0;
  }
}

// ---------------------------------------------------------------- isolate state
let state = { index: null, loadedAt: 0, source: null, nextAttemptAt: 0, lastError: null };
let inflight = null;

const rateLimiter = new RateLimiter();
const tempBans = new Map(); // normalizedIp -> { ip, expiresAtMs, reasonCategories, mode }
const recentEvents = []; // bounded metadata-only ring buffer (newest first, max MAX_EVENTS)
const wafMetrics = {
  inspectedTotal: 0,
  blockedAttacksTotal: 0,
  blockedTempBansTotal: 0,
  blockedAlwaysTotal: 0,
  redactedOutputsTotal: 0,
  blockedOutputsTotal: 0,
  activeRequests: 0,
  peakConcurrentRequests: 0,
  overloadRejections: 0,
};

export function resetBadEggV3State() {
  rateLimiter.reset();
  tempBans.clear();
  recentEvents.length = 0;
  wafMetrics.inspectedTotal = 0;
  wafMetrics.blockedAttacksTotal = 0;
  wafMetrics.blockedTempBansTotal = 0;
  wafMetrics.blockedAlwaysTotal = 0;
  wafMetrics.redactedOutputsTotal = 0;
  wafMetrics.blockedOutputsTotal = 0;
  wafMetrics.activeRequests = 0;
  wafMetrics.peakConcurrentRequests = 0;
  wafMetrics.overloadRejections = 0;
}

// ---------------------------------------------------------------- IP parsing
const isV4 = (s) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s);

/** Parse an IPv6 literal into 8 x u16. Returns null when invalid. */
export function parse6(input) {
  if (typeof input !== "string") return null;
  let s = input.trim().toLowerCase();
  if (!s.includes(":")) return null;
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);

  const lastColon = s.lastIndexOf(":");
  if (s.slice(lastColon + 1).includes(".")) {
    const v4 = dottedToWords(s.slice(lastColon + 1));
    if (!v4) return null;
    s = s.slice(0, lastColon + 1) + v4;
  }

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  let groups;
  if (halves.length === 2) {
    const missing = 8 - head.length - tail.length;
    if (missing < 1) return null;
    groups = [...head, ...new Array(missing).fill("0"), ...tail];
  } else {
    if (head.length !== 8) return null;
    groups = head;
  }
  if (groups.length !== 8) return null;
  const out = new Array(8);
  for (let i = 0; i < 8; i++) {
    if (!/^[0-9a-f]{1,4}$/.test(groups[i])) return null;
    out[i] = parseInt(groups[i], 16);
  }
  return out;
}

function dottedToWords(s) {
  const p = s.split(".");
  if (p.length !== 4) return null;
  const n = p.map((x) => (/^\d{1,3}$/.test(x) ? Number(x) : NaN));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return null;
  return `${((n[0] << 8) | n[1]).toString(16)}:${((n[2] << 8) | n[3]).toString(16)}`;
}

function key6(groups) {
  let out = "";
  for (let i = 0; i < 8; i++) out += groups[i].toString(16).padStart(4, "0");
  return out;
}

function key6bytes(bytes, off) {
  let out = "";
  for (let i = 0; i < 16; i++) out += bytes[off + i].toString(16).padStart(2, "0");
  return out;
}

/** Dotted quad -> u32, or null. */
export function ipToU32(value) {
  if (typeof value !== "string" || !isV4(value)) return null;
  const p = value.split(".");
  const a = +p[0],
    b = +p[1],
    c = +p[2],
    d = +p[3];
  if (a > 255 || b > 255 || c > 255 || d > 255) return null;
  return (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
}

export function normalizeIp(raw) {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes(":")) {
    const g = parse6(s);
    if (!g) return null;
    if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0xffff) {
      return `${g[6] >> 8}.${g[6] & 255}.${g[7] >> 8}.${g[7] & 255}`;
    }
    return key6(g);
  }
  const u = ipToU32(s);
  if (u === null) return null;
  return `${(u >>> 24) & 255}.${(u >>> 16) & 255}.${(u >>> 8) & 255}.${u & 255}`;
}

export function isAllowlistedIp(rawIp, config) {
  const norm = normalizeIp(rawIp);
  if (!norm) return false;
  if (norm === "127.0.0.1" || norm === "00000000000000000000000000000001") return true;
  if (config?.allowlist?.length) return matchIpList(norm, config.allowlist);
  return false;
}

/** Turn a normalized IPv6 key (32 hex chars) back into 8 x u16 groups. */
function hexKeyToGroups(key) {
  if (!/^[0-9a-f]{32}$/.test(key)) return null;
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = Number.parseInt(key.slice(i * 4, i * 4 + 4), 16);
  return out;
}

/** Parse "a.b.c.d", "a.b.c.d/24" or "2001:db8::/32" into { ip, prefix }. */
function parseIpEntry(entry) {
  const raw = String(entry).trim().toLowerCase();
  const slash = raw.lastIndexOf("/");
  if (slash === -1) return { ip: raw, prefix: null };
  const ip = raw.slice(0, slash);
  const prefix = Number.parseInt(raw.slice(slash + 1), 10);
  if (!Number.isInteger(prefix) || prefix < 0) return null;
  return { ip, prefix };
}

/**
 * True when `rawIp` falls inside any entry of `entries`.
 *
 * Exact IPs and CIDRs, IPv4 and IPv6, on the same normalized forms the
 * blocklist matcher uses. A prefix of 0 matches everything, which is legal
 * and useful ("ban the whole internet").
 */
export function matchIpList(rawIp, entries) {
  const norm = normalizeIp(rawIp);
  if (!norm) return false;
  for (const entry of entries) {
    const parsed = parseIpEntry(entry);
    if (!parsed) continue;
    const target = normalizeIp(parsed.ip);
    if (!target) continue;
    if (parsed.prefix === null) {
      if (norm === target) return true;
      continue;
    }
    if (target.includes(".")) {
      const a = ipToU32(norm);
      const b = ipToU32(target);
      if (a === null || b === null) continue;
      if (prefixMatch32(a, b, parsed.prefix)) return true;
    } else {
      const a = hexKeyToGroups(norm);
      const b = hexKeyToGroups(target);
      if (!a || !b) continue;
      if (prefixMatch6(a, b, parsed.prefix)) return true;
    }
  }
  return false;
}

function prefixMatch32(a, b, prefix) {
  if (prefix <= 0) return true;
  if (prefix >= 32) return a === b;
  return a >>> (32 - prefix) === b >>> (32 - prefix);
}

function prefixMatch6(a, b, prefix) {
  if (prefix <= 0) return true;
  let bits = 0;
  for (let i = 0; i < 8; i++) {
    if (bits >= prefix) return true;
    const remaining = prefix - bits;
    if (remaining >= 16) {
      if (a[i] !== b[i]) return false;
      bits += 16;
    } else {
      const shift = 16 - remaining;
      return a[i] >>> shift === b[i] >>> shift;
    }
  }
  return bits >= prefix;
}

// ---------------------------------------------------------------- v3 redaction & scanning
export function redactText(text, scanPii = false) {
  let redacted = String(text ?? "");
  for (const rule of RULES) {
    if (!rule.sensitive && !(scanPii && rule.pii)) continue;
    const globalFlags = rule.pattern.flags.includes("g")
      ? rule.pattern.flags
      : rule.pattern.flags + "g";
    const re = new RegExp(rule.pattern.source, globalFlags);
    if (rule.key === "credential_assignment") {
      redacted = redacted.replace(re, (full, ...args) => {
        const groups = args.at(-1);
        const secret =
          groups && typeof groups === "object"
            ? (groups.secret_double ?? groups.secret_single ?? groups.secret)
            : null;
        if (!secret) return full;
        const idx = full.lastIndexOf(secret);
        if (idx < 0) return full;
        return full.slice(0, idx) + "[REDACTED]" + full.slice(idx + secret.length);
      });
    } else {
      const label =
        rule.key === "email_address"
          ? "[REDACTED_EMAIL]"
          : `[REDACTED_${rule.category.toUpperCase()}]`;
      redacted = redacted.replace(re, label);
    }
  }
  return redacted;
}

export function safeRoute(route) {
  const raw = String(route || "").trim();
  if (!raw) return "";
  let path = raw.split("?")[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    // keep raw path segment on malformed % sequence
  }
  path = redactText(path, true);
  path = path.replace(/(?<![A-Za-z0-9])[A-Fa-f0-9]{32,}(?![A-Za-z0-9])/g, "[REDACTED_ID]");
  path = path.replace(/(?<![A-Za-z0-9])[A-Za-z0-9_-]{40,}(?![A-Za-z0-9])/g, "[REDACTED_VALUE]");
  let clean = "";
  for (let i = 0; i < path.length && clean.length < 256; i++) {
    const code = path.charCodeAt(i);
    clean += code >= 0x20 && code !== 0x7f ? path[i] : "?";
  }
  return clean;
}


/* --------------------------------------------------------------------------
 * Durable metrics + event persistence (optional D1 binding `BADEGG_DB`).
 *
 * The per-isolate counters and ring buffer above reset on every deploy and
 * only ever reflect what this isolate has seen. With a shared D1 database
 * (`idi-badegg-metrics`) bound, refusals and scans are persisted there, and
 * the status API reads fleet-wide totals back: the console keeps working
 * across deploys and sees home, the worker mirror and Agentarium at once.
 * Without the binding everything behaves exactly as before, in-memory only.
 * All writes are fire-and-forget and fail open.
 * ------------------------------------------------------------------------ */

const D1_EVENTS_RETENTION_MS = 30 * 86400_000;
const D1_EVENT_THROTTLE_MS = 60_000;
const D1_METRICS_FLUSH_MS = 60_000;
const d1EventThrottle = new Map();
let d1WriteWindow = 0;
let d1WriteCount = 0;
const D1_MAX_EVENT_WRITES_PER_MINUTE = 120; // cap per isolate; history is sampled
const d1Local = { inspected: 0, blocked: 0, throttled: 0 }; // observed by THIS isolate
const d1Persisted = { inspected: 0, blocked: 0, throttled: 0 }; // flushed by this isolate
let d1LastFlush = Date.now();

function d1Db(env) {
  const db = env?.BADEGG_DB;
  return db && typeof db.prepare === "function" ? db : null;
}

function d1Site(env) {
  const s = String(env?.BADEGG_SITE || "home").trim().toLowerCase();
  return /^[a-z0-9-]{1,32}$/.test(s) ? s : "home";
}

function d1Run(env, waitUntil, promise) {
  if (waitUntil) waitUntil(promise.catch(() => {}));
  else promise.catch(() => {});
}

function d1FlushMetrics(env, waitUntil) {
  const db = d1Db(env);
  if (!db) return;
  const now = Date.now();
  if (now - d1LastFlush < D1_METRICS_FLUSH_MS) return;
  const delta = {
    inspected: d1Local.inspected - d1Persisted.inspected,
    blocked: d1Local.blocked - d1Persisted.blocked,
    throttled: d1Local.throttled - d1Persisted.throttled,
  };
  if (!delta.inspected && !delta.blocked && !delta.throttled) return;
  d1LastFlush = now;
  d1Persisted.inspected += delta.inspected;
  d1Persisted.blocked += delta.blocked;
  d1Persisted.throttled += delta.throttled;
  const bucket = Math.floor(now / 300_000) * 300;
  d1Run(
    env,
    waitUntil,
    db
      .prepare(
        "INSERT INTO badegg_metrics (bucket_start, site, inspected, blocked, throttled) VALUES (?, ?, ?, ?, ?) " +
          "ON CONFLICT(bucket_start, site) DO UPDATE SET inspected = inspected + excluded.inspected, " +
          "blocked = blocked + excluded.blocked, throttled = throttled + excluded.throttled"
      )
      .bind(bucket, d1Site(env), delta.inspected, delta.blocked, delta.throttled)
      .run()
      .then(async () => {
        // Amortized retention sweep (~1-in-20 flushes): events keep 30 days.
        if (Math.random() < 0.05) {
          await db.prepare("DELETE FROM badegg_events WHERE ts < ?").bind(now - D1_EVENTS_RETENTION_MS).run();
        }
      })
  );
}

function d1Note(kind, env, waitUntil) {
  if (!Object.hasOwn(d1Local, kind)) return;
  d1Local[kind]++;
  d1FlushMetrics(env, waitUntil);
}

// Bounded metadata; separate input evidence may include inspected headers and body.
function requestTelemetry(request) {
  const cf = request.cf || {};
  const bounded = (v, n) => typeof v === "string" && v ? v.replace(/[\x00-\x1f\x7f]/g, " ").slice(0, n) : null;
  return {
    userAgent: bounded(request.headers.get("user-agent"), 512),
    httpVersion: bounded(cf.httpProtocol, 24), tlsVersion: bounded(cf.tlsVersion, 24),
    country: bounded(cf.country, 8), colo: bounded(cf.colo, 12),
    asn: Number.isSafeInteger(cf.asn) && cf.asn >= 0 ? cf.asn : null,
    contentType: bounded(request.headers.get("content-type"), 128),
    rayId: bounded(request.headers.get("cf-ray"), 80),
  };
}

// The scanner receives decoded/flattened text, not necessarily raw bytes. Keep
// an upper bound and state truncation; never collect authorization/cookie or
// other credential-named headers. Output-secret material is never retained.
function inputEvidence(parts, findings, scanLimit) {
  let remaining = Math.min(scanLimit, 8192), truncated = false, first = true;
  const segments = [];
  for (const part of parts) {
    if (!part.text) continue;
    if (!first) remaining--; // newlines in the actual concatenated scan text
    first = false;
    if (remaining <= 0) { truncated = true; break; }
    const scanned = part.text.slice(0, remaining);
    const text = part.secret ? `[${part.source} excluded]` : scanned;
    if (text) segments.push({source:part.source, text, excluded:!!part.secret});
    remaining -= scanned.length;
    if (scanned.length < part.text.length) { truncated = true; break; }
  }
  const matches = [];
  for (const finding of findings) {
    if (!ATTACK_CATEGORIES.has(finding.category)) continue;
    const rule = RULES.find(r => r.key === finding.ruleId);
    if (!rule) continue;
    for (const part of segments) {
      if (part.excluded) continue;
      const result = new RegExp(rule.pattern.source, rule.pattern.flags.replace(/[gy]/g, "")).exec(part.text);
      if (result) { matches.push({ruleId:finding.ruleId, source:part.source, match:result[0].slice(0, 512)}); break; }
    }
  }
  return {segments, matches, truncated};
}

function d1PersistEvent(entry, env, waitUntil, context = {}) {
  const db = d1Db(env);
  if (!db) return;
  try {
    const decision = String(entry?.decision || entry?.status || "event").slice(0, 64);
    const categories = Array.isArray(entry?.categories) ? entry.categories.join(",") : "";
    // Preserve distinct sources, but limit global write amplification during floods.
    const clientIp = normalizeIp(context.ip) ? String(context.ip).trim().toLowerCase().slice(0, 45) : "";
    const path = safeRoute(entry?.route || "");
    const host = /^[a-z0-9.-]{1,253}$/.test(String(context.host || "").toLowerCase()) ? String(context.host).toLowerCase() : "";
    const method = /^[A-Z]{1,16}$/.test(String(context.method || "")) ? String(context.method) : "";
    const ruleIds = Array.isArray(context.ruleIds) ? context.ruleIds.filter(x => /^[a-z0-9_]{1,80}$/.test(String(x))).slice(0, 29).join(",") : "";
    const direction = ["input", "output"].includes(context.direction || entry?.direction) ? (context.direction || entry.direction) : "";
    const confidence = ruleIds && context.direction !== "output" && entry?.maxConfidence != null && Number.isFinite(Number(entry.maxConfidence)) ? Math.max(0, Math.min(1, Number(entry.maxConfidence))) : null;
    const key = `${decision}|${categories.slice(0, 120)}|${clientIp}|${path}`;
    const now = Date.now();
    // Per-decision/category/source/path sampling plus a per-isolate global cap.
    // This is not a complete request log; distinct records can be dropped under flood.
    if (now - (d1EventThrottle.get(key) || 0) < D1_EVENT_THROTTLE_MS) return;
    if (d1EventThrottle.size > 500) d1EventThrottle.clear();
    const window = Math.floor(now / 60_000);
    if (window !== d1WriteWindow) { d1WriteWindow = window; d1WriteCount = 0; }
    if (d1WriteCount >= D1_MAX_EVENT_WRITES_PER_MINUTE) return;
    d1EventThrottle.set(key, now); d1WriteCount++;
    const ts = Date.parse(entry?.timestamp || "") || now;
    const basic = [d1Site(env), ts, decision, String(entry?.status || "").slice(0, 32), String(categories).slice(0, 200)];
    // During a rolling deployment the old schema remains writable. Once the
    // one-time migration is applied, new events gain optional context.
    const contextValues = [clientIp || null, path || null, host || null, method || null, ruleIds || null, direction || null, confidence];
    const details = context.requestInfo || context.evidence ? JSON.stringify({request:context.requestInfo || null, evidence:context.evidence || null}) : null;
    const fullInsert = "INSERT INTO badegg_events (site, ts, decision, status, categories, client_ip, path, host, method, rule_ids, direction, confidence, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const contextInsert = "INSERT INTO badegg_events (site, ts, decision, status, categories, client_ip, path, host, method, rule_ids, direction, confidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    const write = Promise.resolve().then(() => db.prepare(fullInsert).bind(...basic, ...contextValues, details).run())
      .catch(error => {
        if (/no column named\s+details_json/i.test(String(error))) return db.prepare(contextInsert).bind(...basic, ...contextValues).run();
        throw error;
      })
      .catch(error => {
        if (!/no column named\s+(?:client_ip|path|host|method|rule_ids|direction|confidence)/i.test(String(error))) throw error;
        return db.prepare("INSERT INTO badegg_events (site, ts, decision, status, categories) VALUES (?, ?, ?, ?, ?)").bind(...basic).run();
      });
    d1Run(env, waitUntil, write);
  } catch {
    // best-effort telemetry only
  }
}

async function d1Totals(env) {
  const db = d1Db(env);
  if (!db) return null;
  try {
    const sums = await db
      .prepare(
        "SELECT COALESCE(SUM(inspected), 0) AS inspected, COALESCE(SUM(blocked), 0) AS blocked, " +
          "COALESCE(SUM(throttled), 0) AS throttled FROM badegg_metrics"
      )
      .first();
    const ev = await db
      .prepare("SELECT site, ts, decision, status, categories FROM badegg_events ORDER BY id DESC LIMIT 20")
      .all();
    return {
      inspected: Number(sums?.inspected) || 0,
      blocked: Number(sums?.blocked) || 0,
      throttled: Number(sums?.throttled) || 0,
      events: Array.isArray(ev?.results) ? ev.results : [],
    };
  } catch {
    return null;
  }
}

function d1Event(decision, categories, status, route) {
  return {
    timestamp: new Date().toISOString(),
    direction: "input",
    mode: "enforce",
    status,
    decision,
    executionMode: "active",
    maxConfidence: 0,
    categories,
    inspectedCharacters: 0,
    route: safeRoute(route),
  };
}

function recordEvent(entry) {
  recentEvents.unshift(entry);
  if (recentEvents.length > MAX_EVENTS) recentEvents.length = MAX_EVENTS;
}

function expireTempBans(now = Date.now()) {
  for (const [key, ban] of tempBans) {
    if (ban.expiresAtMs !== null && ban.expiresAtMs <= now) tempBans.delete(key);
  }
}

export function addTemporaryBan(rawIp, reasonCategories, config, env, waitUntil) {
  const key = normalizeIp(rawIp);
  if (!key) return null;
  const now = Date.now();
  expireTempBans(now);
  while (tempBans.size >= MAX_ACTIVE_TEMP_BANS) {
    // Prefer dropping a ban that was going to expire anyway; only churn a
    // forever ban when the table is full of them.
    let victim = null;
    for (const [candidate, ban] of tempBans) {
      if (ban.expiresAtMs === null) continue;
      victim = candidate;
      break;
    }
    if (victim === null) victim = tempBans.keys().next().value;
    if (victim === undefined) break;
    tempBans.delete(victim);
  }
  const forever = config.banForever === true;
  const ttlSeconds = config.banTtlSeconds;
  const expiresAtMs = forever ? null : now + ttlSeconds * 1000;
  const record = {
    expiresAt: forever ? null : new Date(expiresAtMs).toISOString(),
    expiresAtMs,
    ttlSeconds: forever ? null : ttlSeconds,
    forever: Boolean(forever),
    reasonCategories: [...new Set(reasonCategories)].sort(),
    mode: config.enforcementMode === "enforce" ? "active" : "dry_run",
  };
  tempBans.set(key, record);

  if (record.mode === "active" && env?.IDI_BADEGG && waitUntil) {
    const kvKey = `${KV_TEMPBAN_PREFIX}${key}`;
    // A forever ban is stored without an expirationTtl, which is exactly what
    // "never expires" means in KV.
    const options = forever ? {} : { expirationTtl: ttlSeconds };
    waitUntil(env.IDI_BADEGG.put(kvKey, JSON.stringify(record), options).catch(() => {}));
  }
  return record;
}

export async function getActiveTemporaryBan(rawIp, env) {
  const key = normalizeIp(rawIp);
  if (!key) return null;
  const now = Date.now();
  expireTempBans(now);
  const local = tempBans.get(key);
  if (local) {
    return local.mode === "active" && (local.expiresAtMs === null || local.expiresAtMs > now)
      ? local
      : null;
  }
  if (env?.IDI_BADEGG) {
    try {
      const stored = await env.IDI_BADEGG.get(`${KV_TEMPBAN_PREFIX}${key}`, {
        type: "json",
        cacheTtl: 60,
      });
      if (
        stored &&
        stored.mode === "active" &&
        (stored.expiresAtMs === null || stored.expiresAtMs > now)
      ) {
        tempBans.set(key, stored);
        return stored;
      }
    } catch {
      throw new Error("ban_store_unavailable");
    }
  }
  return null;
}

/**
 * Hydrate active bans from the shared IDI_BADEGG KV into this isolate's
 * in-memory map. Bans are written to KV (under `badegg:v3:ban:*`) by every
 * Worker/isolate sharing the namespace — home, Agentarium, and the console's
 * Lift endpoint all touch the same store — but per-request enforcement reads
 * back lazily per IP, which means the bans LIST API and the status counters
 * would otherwise only show what this specific isolate has seen. Calling this
 * in those read paths makes the whole-fleet view visible to the dashboard.
 *
 * Reads bypass the KV cache (cacheTtl 0) so Lift operations from the console
 * are reflected immediately. Fails open on KV errors.
 */
async function hydrateBansFromKv(env) {
  const kv = env?.IDI_BADEGG;
  if (!kv || typeof kv.list !== "function" || typeof kv.get !== "function") {
    throw new Error("ban_store_unavailable");
  }
  try {
    let cursor;
    do {
      const page = await kv.list({ prefix: KV_TEMPBAN_PREFIX, cursor });
      for (const entry of page?.keys || []) {
        const key = String(entry.name || "").slice(KV_TEMPBAN_PREFIX.length);
        if (!key || tempBans.has(key)) continue;
        const stored = await kv.get(entry.name, { type: "json", cacheTtl: 60 });
        if (
          stored &&
          stored.mode === "active" &&
          (stored.expiresAtMs === null || stored.expiresAtMs > Date.now())
        ) {
          tempBans.set(key, stored);
        }
      }
      cursor = page && page.list_complete === false ? page.cursor : undefined;
    } while (cursor);
  } catch {
    throw new Error("ban_store_unavailable");
  }
}

/**
 * Scan normalized text in `"input"` or `"output"` direction using BadEgg v3's
 * deterministic rule set and risk profile thresholds.
 */
export function scanText({
  direction = "input",
  text = "",
  clientIp = "",
  route = "",
  host = "",
  method = "",
  live = false,
  config = resolveConfig(),
  env = null,
  waitUntil = null,
  requestInfo = null,
  evidenceParts = null,
} = {}) {
  if (direction !== "input" && direction !== "output") {
    throw new Error("direction must be 'input' or 'output'.");
  }
  const body = String(text ?? "");
  if (body.length > config.maxScanChars) {
    throw new Error(
      `Payload is ${body.length} characters; configured scan limit is ${config.maxScanChars}.`
    );
  }

  const routeSafe = safeRoute(route);
  const liveEnforcement = Boolean(live && config.enforcementMode === "enforce");
  const executionMode = liveEnforcement ? "active" : "dry_run";
  const enabled = direction === "input" ? config.scanInputs : config.scanOutputs;

  if (!enabled) {
    return {
      direction,
      mode: config.riskMode,
      status: "skipped_by_policy",
      decision: "skipped_by_policy",
      maxConfidence: 0,
      findings: [],
      redactedPreview: null,
      executionMode,
      rawContentRetained: false,
      route: routeSafe,
    };
  }

  if (direction === "input") {
    wafMetrics.inspectedTotal++;
    d1Note("inspected", env, waitUntil);
  }

  const findings = [];
  for (const rule of RULES) {
    if (!rule.directions.includes(direction)) continue;
    if (rule.pii && !config.scanPii) continue;
    if (rule.pattern.test(body)) {
      findings.push({
        ruleId: rule.key,
        category: rule.category,
        confidence: rule.confidence,
        severity: rule.severity,
        message: rule.summary,
      });
    }
  }

  const attackFindings = findings.filter((f) => ATTACK_CATEGORIES.has(f.category));
  const maxAttackConfidence = attackFindings.reduce((m, f) => Math.max(m, f.confidence), 0);
  const maxConfidence = findings.reduce((m, f) => Math.max(m, f.confidence), 0);
  let decision = "clean";
  let redactedPreview = null;
  let banRecord = null;

  if (direction === "output") {
    const sensitiveFindings = findings.filter(
      (f) => SECRET_CATEGORIES.has(f.category) || (config.scanPii && f.category === "email_address")
    );
    if (sensitiveFindings.length) {
      const actionMap = {
        alert: "alert_secret",
        redact: "redact_output",
        block: "block_response",
      };
      const actionType = actionMap[config.outputAction] || "redact_output";
      decision = liveEnforcement ? actionType : `would_${actionType}`;
      if (config.outputAction === "redact") {
        redactedPreview = redactText(body, config.scanPii);
      }
    }
  }

  if (direction === "input" && attackFindings.length) {
    const categories = [...new Set(attackFindings.map((f) => f.category))].sort();
    if (clientIp && isAllowlistedIp(clientIp, config)) {
      if (decision === "clean") decision = "allowlisted";
    } else if (config.autoBlockEnabled && maxAttackConfidence >= config.autoBlockThreshold) {
      if (!normalizeIp(clientIp)) {
        decision = liveEnforcement ? "blocked_without_verified_ip" : "would_temp_block_no_ip";
      } else {
        banRecord = addTemporaryBan(clientIp, categories, config, env, waitUntil);
        decision = liveEnforcement ? "blocked" : "would_temp_block";
      }
      if (liveEnforcement) {
        wafMetrics.blockedAttacksTotal++;
        d1Note("blocked", env, waitUntil);
      }
    } else if (maxAttackConfidence >= config.alertThreshold) {
      const actionType = config.riskMode === "catch_more" ? "challenge" : "alert_for_review";
      if (decision === "clean") decision = `would_${actionType}`;
    } else if (decision === "clean") {
      decision = "would_alert_for_review";
    }
  } else if (findings.length && decision === "clean") {
    decision = "would_alert_for_review";
  }

  const status =
    liveEnforcement &&
    (decision === "blocked" ||
      decision === "blocked_without_verified_ip" ||
      decision === "block_response")
      ? "blocked"
      : liveEnforcement && decision === "redact_output"
        ? "redacted"
        : "inspected";

  if (findings.length) {
    const eventEntry = {
      timestamp: new Date().toISOString(),
      direction,
      mode: config.riskMode,
      status,
      decision,
      executionMode,
      maxConfidence: Math.round(maxConfidence * 1000) / 1000,
      categories: [...new Set(findings.map((f) => f.category))].sort(),
      inspectedCharacters: body.length,
      route: routeSafe,
    };
    recordEvent(eventEntry);
    let evidence = null;
    try { if (direction === "input" && evidenceParts && d1Db(env)) evidence = inputEvidence(evidenceParts, findings, config.maxScanChars); } catch { /* evidence must not affect request handling */ }
    d1PersistEvent(eventEntry, env, waitUntil, {ip:clientIp, host, method, ruleIds:findings.map(f=>f.ruleId), requestInfo, evidence});
  }

  return {
    direction,
    mode: config.riskMode,
    status,
    decision,
    maxConfidence: Math.round(maxConfidence * 1000) / 1000,
    autoBlockThreshold: config.autoBlockThreshold,
    inspectedCharacters: body.length,
    route: routeSafe,
    findings,
    banRecord,
    redactedPreview,
    executionMode,
    rawContentRetained: false,
  };
}

// ---------------------------------------------------------------- schema-2 blocklist index
function emptyIndex() {
  return {
    v4Ips: new Uint32Array(0),
    v4Starts: new Uint32Array(0),
    v4Ends: new Uint32Array(0),
    v6Ips: new Set(),
    v6Starts: [],
    v6Ends: [],
    counts: { v4Ips: 0, v4Nets: 0, v6Ips: 0, v6Nets: 0 },
  };
}

function binIndex(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < 28) {
    throw new Error("not an ArrayBuffer / too short");
  }
  const dv = new DataView(buffer);
  if (dv.getUint32(0, false) !== BIN_MAGIC) throw new Error("bad magic");
  const version = dv.getUint8(4);
  if (version !== BIN_VERSION) throw new Error(`unsupported version ${version}`);
  const n4 = dv.getUint32(8, true);
  const n4n = dv.getUint32(12, true);
  const n6 = dv.getUint32(16, true);
  const n6n = dv.getUint32(20, true);
  const expected = 24 + n4 * 4 + n4n * 8 + n6 * 16 + n6n * 32 + 4;
  if (buffer.byteLength !== expected) {
    throw new Error(`size ${buffer.byteLength} != expected ${expected}`);
  }
  const bytes = new Uint8Array(buffer);
  if (
    bytes[bytes.length - 4] !== 0x45 ||
    bytes[bytes.length - 3] !== 0x4e ||
    bytes[bytes.length - 2] !== 0x44 ||
    bytes[bytes.length - 1] !== 0x32
  ) {
    throw new Error("bad trailer");
  }
  if (n4 < MIN_V4_IPS || n4n < MIN_V4_NETS || n6n < MIN_V6_NETS) {
    throw new Error(`implausible counts ${n4}/${n4n}/${n6n} - truncated?`);
  }

  let off = 24;
  const v4Ips = new Uint32Array(buffer, off, n4);
  off += n4 * 4;
  const v4Starts = new Uint32Array(n4n);
  const v4Ends = new Uint32Array(n4n);
  for (let i = 0; i < n4n; i++) {
    v4Starts[i] = dv.getUint32(off + i * 8, true);
    v4Ends[i] = dv.getUint32(off + i * 8 + 4, true);
  }
  off += n4n * 8;

  const v6Ips = new Set();
  for (let i = 0; i < n6; i++) v6Ips.add(key6bytes(bytes, off + i * 16));
  off += n6 * 16;

  const v6Starts = new Array(n6n);
  const v6Ends = new Array(n6n);
  for (let i = 0; i < n6n; i++) {
    v6Starts[i] = key6bytes(bytes, off + i * 32);
    v6Ends[i] = key6bytes(bytes, off + i * 32 + 16);
  }

  return {
    v4Ips,
    v4Starts,
    v4Ends,
    v6Ips,
    v6Starts,
    v6Ends,
    counts: { v4Ips: n4, v4Nets: n4n, v6Ips: n6, v6Nets: n6n },
  };
}

function jsonIndex(doc) {
  if (!doc || doc.schema !== 2) throw new Error("schema is not 2");
  const block = doc.block;
  if (!block || !block.v4 || !block.v6) throw new Error("missing block");
  const counts = doc.counts || {};
  const v4ips = block.v4.ips || [];
  const v4nets = block.v4.nets || [];
  const v6ips = block.v6.ips || [];
  const v6nets = block.v6.nets || [];
  if (
    counts.v4Ips !== v4ips.length ||
    counts.v4Nets !== v4nets.length ||
    counts.v6Ips !== v6ips.length ||
    counts.v6Nets !== v6nets.length
  ) {
    throw new Error("counts do not match arrays");
  }
  if (v4ips.length < MIN_V4_IPS || v4nets.length < MIN_V4_NETS || v6nets.length < MIN_V6_NETS) {
    throw new Error("implausible counts - truncated?");
  }

  const index = emptyIndex();
  index.v4Ips = new Uint32Array(v4ips.map((x) => ipToU32(x) ?? 0)).sort();
  const ranges = v4nets
    .map((cidr) => {
      const [addr, bits] = cidr.split("/");
      const start = ipToU32(addr);
      const size = 2 ** (32 - Number(bits));
      return [start, (start + size - 1) >>> 0];
    })
    .sort((a, b) => a[0] - b[0]);
  index.v4Starts = new Uint32Array(ranges.map((r) => r[0]));
  index.v4Ends = new Uint32Array(ranges.map((r) => r[1]));

  for (const ip of v6ips) {
    const g = parse6(ip);
    if (g) index.v6Ips.add(key6(g));
  }
  const v6 = v6nets
    .map((cidr) => {
      const [addr, bits] = cidr.split("/");
      const g = parse6(addr);
      if (!g) return null;
      const start = key6(g);
      const size = 128 - Number(bits);
      const end = new Array(8);
      for (let i = 0; i < 8; i++) end[i] = g[i];
      for (let bit = 0; bit < size; bit++) {
        const fromEnd = bit;
        const gi = 7 - Math.floor(fromEnd / 16);
        const shift = fromEnd % 16;
        end[gi] |= 1 << shift;
      }
      return [start, key6(end)];
    })
    .filter(Boolean)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  index.v6Starts = v6.map((r) => r[0]);
  index.v6Ends = v6.map((r) => r[1]);
  index.counts = {
    v4Ips: v4ips.length,
    v4Nets: v4nets.length,
    v6Ips: v6ips.length,
    v6Nets: v6nets.length,
  };
  return index;
}

// ---------------------------------------------------------------- blocklist lookup
function inU32(sorted, value) {
  let lo = 0,
    hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = sorted[mid];
    if (v === value) return true;
    if (v < value) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

function inRanges(starts, ends, value) {
  let lo = 0,
    hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (value < starts[mid]) hi = mid - 1;
    else if (value > ends[mid]) lo = mid + 1;
    else return true;
  }
  return false;
}

export function match(index, rawIp) {
  const ip = String(rawIp || "")
    .trim()
    .toLowerCase();
  if (!ip) return { blocked: false };

  if (ip.includes(":")) {
    const groups = parse6(ip);
    if (!groups) return { blocked: false, reason: "unparsable" };
    if (
      groups[0] === 0 &&
      groups[1] === 0 &&
      groups[2] === 0 &&
      groups[3] === 0 &&
      groups[4] === 0 &&
      groups[5] === 0xffff
    ) {
      const dotted = `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
      const value = ipToU32(dotted);
      if (value !== null) {
        if (inU32(index.v4Ips, value)) return { blocked: true, reason: "v4-exact" };
        if (inRanges(index.v4Starts, index.v4Ends, value))
          return { blocked: true, reason: "v4-net" };
      }
      return { blocked: false };
    }
    const k = key6(groups);
    if (index.v6Ips.has(k)) return { blocked: true, reason: "v6-exact" };
    if (inRanges(index.v6Starts, index.v6Ends, k)) return { blocked: true, reason: "v6-net" };
    return { blocked: false };
  }

  const value = ipToU32(ip);
  if (value === null) return { blocked: false, reason: "unparsable" };
  if (inU32(index.v4Ips, value)) return { blocked: true, reason: "v4-exact" };
  if (inRanges(index.v4Starts, index.v4Ends, value)) return { blocked: true, reason: "v4-net" };
  if (EXTRA_BLOCKED.includes(ip)) return { blocked: true, reason: "manual" };
  return { blocked: false };
}

// ---------------------------------------------------------------- blocklist loading
async function readKV(env) {
  const kv = env?.IDI_BADEGG;
  if (!kv) return null;
  try {
    const buf = await kv.get(KV_KEY, { type: "arrayBuffer", cacheTtl: KV_CACHE_TTL_S });
    return buf ? buf : null;
  } catch (err) {
    state.lastError = `kv: ${err}`;
    return null;
  }
}

async function fetchArtifact(url, expectBinary) {
  const res = await fetch(url, {
    headers: expectBinary ? { accept: "application/octet-stream" } : { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (!expectBinary && /text\/html/i.test(type)) throw new Error("HTML instead of JSON");
  return expectBinary ? res.arrayBuffer() : res.json();
}

async function buildFromNetwork(env, waitUntil) {
  let lastError;
  // One initial attempt and three retries, each trying binary then JSON.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const buf = await fetchArtifact(BIN_URL, true);
      const index = binIndex(buf);
      if (env?.IDI_BADEGG && waitUntil) {
        waitUntil(env.IDI_BADEGG.put(KV_KEY, buf, { expirationTtl: 86400 }).catch(() => {}));
      }
      return { index, source: "network:bin" };
    } catch (err) {
      lastError = err;
    }
    try {
      const doc = await fetchArtifact(JSON_URL, false);
      return { index: jsonIndex(doc), source: "network:json" };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("blocklist unavailable");
}

export async function ensureIndex(env, options = {}) {
  const waitUntil = options.waitUntil;
  const now = Date.now();

  if (state.index) {
    if (now >= state.loadedAt + BLOCKLIST_MAX_AGE_MS) {
      if (now >= state.nextAttemptAt) await refreshIndex(env, waitUntil);
      return Date.now() < state.loadedAt + BLOCKLIST_MAX_AGE_MS ? state.index : null;
    }
    if (now >= state.loadedAt + TTL_MS && now >= state.nextAttemptAt) {
      const refresh = refreshIndex(env, waitUntil);
      if (waitUntil) waitUntil(refresh);
      else await refresh;
    }
    return state.index;
  }

  if (inflight) return inflight;
  if (now < state.nextAttemptAt) return null;

  const load = (async () => {
    const cached = await readKV(env);
    if (cached) {
      try {
        const index = binIndex(cached);
        state = { index, loadedAt: Date.now(), source: "kv", nextAttemptAt: 0, lastError: null };
        return index;
      } catch (err) {
        state.lastError = `kv parse: ${err.message}`;
      }
    }
    // Do not forward a cold request while verification is still in progress.
    const work = buildFromNetwork(env, waitUntil);
    const { index, source } = await work;
    state = { index, loadedAt: Date.now(), source, nextAttemptAt: 0, lastError: null };
    return index;
  })()
    .catch((err) => {
      state.lastError = `load: ${err.message}`;
      state.nextAttemptAt = Date.now() + RETRY_MS;
      return null;
    })
    .finally(() => {
      inflight = null;
    });

  inflight = load;
  return load;
}

async function refreshIndex(env, waitUntil) {
  if (inflight) return inflight;
  const run = buildFromNetwork(env, waitUntil)
    .then(({ index, source }) => {
      state = { index, loadedAt: Date.now(), source, nextAttemptAt: 0, lastError: null };
      return index;
    })
    .catch((err) => {
      state.lastError = `refresh: ${err.message}`;
      state.nextAttemptAt = Date.now() + RETRY_MS;
      return state.index;
    })
    .finally(() => {
      inflight = null;
    });
  inflight = run;
  return run;
}

/** Diagnostics for ?badegg-status=1. No client IP addresses or payloads are exposed. */
export function badeggStatus(env = {}, options = {}) {
  const record = options.record || emptyConfigRecord();
  const cfg = resolveConfig(env, record.values);
  expireTempBans();
  let activeTempBans = 0;
  for (const ban of tempBans.values()) {
    if (ban.mode === "active") activeTempBans++;
  }
  return {
    version: BADEGG_VERSION,
    engine: "BadEgg v3",
    mode: cfg.enforcementMode,
    riskMode: cfg.riskMode,
    autoBlockThreshold: cfg.autoBlockThreshold,
    loaded: Boolean(state.index),
    source: state.source,
    ageSeconds: state.index ? Math.round((Date.now() - state.loadedAt) / 1000) : null,
    counts: state.index ? state.index.counts : null,
    lastError: state.lastError,
    config: {
      storage: record.storage,
      overrides: record.values,
      updatedAt: record.updatedAt,
      updatedBy: record.updatedBy,
      revision: record.revision,
      effective: configEnvView(env, record.values),
      groups: CONFIG_GROUPS.map((group) => group.id),
    },
    waf: {
      rulesLoaded: RULES.length,
      attackCategories: [...ATTACK_CATEGORIES],
      scanInputs: cfg.scanInputs,
      scanOutputs: cfg.scanOutputs,
      outputAction: cfg.outputAction,
      banTtlSeconds: cfg.banTtlSeconds,
      banForever: cfg.banForever,
      inspectedTotal: wafMetrics.inspectedTotal,
      blockedAttacksTotal: wafMetrics.blockedAttacksTotal,
      blockedTempBansTotal: wafMetrics.blockedTempBansTotal,
      blockedAlwaysTotal: wafMetrics.blockedAlwaysTotal,
      redactedOutputsTotal: wafMetrics.redactedOutputsTotal,
      blockedOutputsTotal: wafMetrics.blockedOutputsTotal,
      activeTempBans,
      recentEvents: recentEvents.slice(0, 20),
    },
    rateLimit: {
      enabled: cfg.rateLimitEnabled,
      requests: cfg.rateLimitRequests,
      windowSeconds: cfg.rateLimitWindowSeconds,
      burst: cfg.rateLimitBurst,
      action: cfg.rateLimitAction,
      banAfter: cfg.rateLimitBanAfter,
      ...rateLimiter.snapshot(),
    },
    concurrency: {
      activeRequests: wafMetrics.activeRequests,
      peakConcurrentRequests: wafMetrics.peakConcurrentRequests,
      maxConcurrentRequests: cfg.maxConcurrentRequests,
      overloadRejections: wafMetrics.overloadRejections,
    },
  };
}

// ---------------------------------------------------------------- runtime configuration
// Dashboard-written overrides live in KV (`badegg:v3:config`) and win over the
// env vars in `wrangler.jsonc`, so the site can be retuned without a redeploy.
// The env vars stay the baseline: with no KV binding, or an empty record, the
// gateway behaves exactly as before.
const CONFIG_CACHE_MS = 15_000;
const CONFIG_TOKEN_MIN_LENGTH = 16;
const CONFIG_AUTH_FAILURE_LIMIT = 10;
const CONFIG_AUTH_FAILURE_WINDOW_MS = 60_000;

let configRecordCache = { at: 0, record: null };
// Approximate in-isolate per-source defense, not a replacement for a
// distributed Cloudflare rate limit. Bound memory and fail over to one bucket
// when a trustworthy connecting address is unavailable.
const configAuthFailures = new Map();
function rejectedOperatorAuth(request, error = "unauthorized") {
  const now = Date.now();
  const key = normalizeIp(getClientIp(request)) || "unknown";
  let entry = configAuthFailures.get(key);
  if (!entry || now - entry.firstAt >= CONFIG_AUTH_FAILURE_WINDOW_MS) {
    if (configAuthFailures.size >= 10000) {
      for (const [k, v] of configAuthFailures) {
        if (now - v.firstAt >= CONFIG_AUTH_FAILURE_WINDOW_MS) configAuthFailures.delete(k);
      }
      if (configAuthFailures.size >= 10000) configAuthFailures.delete(configAuthFailures.keys().next().value);
    }
    entry = { count: 0, firstAt: now };
    configAuthFailures.set(key, entry);
  }
  if (entry.count >= CONFIG_AUTH_FAILURE_LIMIT) {
    const retry = Math.max(1, Math.ceil((entry.firstAt + CONFIG_AUTH_FAILURE_WINDOW_MS - now) / 1000));
    return jsonResponse({ ok: false, error: "too_many_attempts", message: "Too many rejected credentials; retry later." }, 429, { "retry-after": String(retry) });
  }
  entry.count++;
  return jsonResponse({ ok: false, error }, 401);
}

/** The "no overrides, environment only" record. */
export function emptyConfigRecord() {
  return { values: {}, updatedAt: null, revision: 0, updatedBy: null, storage: "env" };
}

/** Forget the in-isolate cache; called after a write so the next request sees it. */
export function invalidateConfigCache() {
  configRecordCache = { at: 0, record: null };
}

/** Test helper: also clears the token brute-force window. */
export function resetConfigApiState() {
  invalidateConfigCache();
  configAuthFailures.clear();
}

/**
 * Read dashboard-written overrides from KV.
 *
 * Cached in memory for `CONFIG_CACHE_MS` because this runs on every request.
 * With no binding the environment is the baseline. A bound but unreadable
 * store is an error: silently replacing saved overrides with defaults is unsafe.
 */
export async function loadConfigRecord(env = {}, options = {}) {
  const kv = env && env.IDI_BADEGG;
  if (!kv || typeof kv.get !== "function") return emptyConfigRecord();
  const now = Date.now();
  if (!options.force && configRecordCache.record && now - configRecordCache.at < CONFIG_CACHE_MS) {
    return configRecordCache.record;
  }

  // KV is bound, so the dashboard can write even before anything has been saved.
  let record = { ...emptyConfigRecord(), storage: "kv" };
  try {
    const raw = await kv.get(BADEGG_CONFIG_KV_KEY, { type: "json", cacheTtl: 30 });
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      // Accept both the stored shape and a bare override map.
      const source = raw.values && typeof raw.values === "object" ? raw.values : raw;
      const { values, errors } = sanitizeConfigOverrides(source);
      if (errors.some(e=>e.key === "BADEGG_DISALLOWED_PATHS")) throw new Error("invalid_path_policy");
      const revision = Number.parseInt(String(raw.revision ?? ""), 10);
      record = {
        values,
        updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
        revision: Number.isFinite(revision) ? revision : 0,
        updatedBy: typeof raw.updatedBy === "string" ? raw.updatedBy : null,
        storage: "kv",
      };
    }
  } catch {
    throw new Error("policy_store_unavailable");
  }

  configRecordCache = { at: now, record };
  return record;
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-badegg-version": BADEGG_VERSION,
      ...extraHeaders,
    },
  });
}

/** Retry-After for a ban: none when the ban is set to never expire. */
function banRetryAfter(config) {
  return config.banForever ? undefined : config.banTtlSeconds;
}

/** Length-independent comparison, so a wrong token leaks no prefix timing. */
function constantTimeEquals(a, b) {
  const left = String(a);
  const right = String(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function configApiPayload(env, record) {
  return {
    ok: true,
    endpoint: BADEGG_CONFIG_PATH,
    schemaVersion: 1,
    engine: `BadEgg v${BADEGG_VERSION}`,
    storage: env && env.IDI_BADEGG ? "kv" : "unbound",
    overrides: record.values,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
    revision: record.revision,
    effective: configEnvView(env, record.values),
    defaults: CONFIG_DEFAULTS,
  };
}

/**
 * `GET|PUT|DELETE /api/badegg/config`.
 *
 * GET     - current overrides, effective values and defaults (token required).
 * PUT     - replace the override set; body `{ "overrides": { "BADEGG_*": "..." } }`.
 * DELETE  - drop every override and fall back to the environment.
 *
 * Authentication is a bearer secret in `env.BADEGG_ADMIN_TOKEN`. Without that
 * secret configured the endpoint refuses to do anything (503) rather than
 * defaulting to something guessable.
 */
export async function handleConfigApi(request, env = {}, options = {}) {
  const method = (request.method || "GET").toUpperCase();
  const url = new URL(request.url);
  const token = String((env && env.BADEGG_ADMIN_TOKEN) || "").trim();
  const kv = env && env.IDI_BADEGG;

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "GET, PUT, DELETE, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-allow-methods": "GET, PUT, DELETE, OPTIONS",
        "cache-control": "no-store",
        "x-badegg-version": BADEGG_VERSION,
      },
    });
  }

  if (token.length < CONFIG_TOKEN_MIN_LENGTH) {
    return jsonResponse(
      {
        ok: false,
        error: "admin_token_not_configured",
        message: `Set the BADEGG_ADMIN_TOKEN secret (at least ${CONFIG_TOKEN_MIN_LENGTH} characters) to manage BadEgg from the dashboard.`,
      },
      503
    );
  }

  const presented = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  // Valid credentials are never locked out by another client's failures.
  const bearerOk = presented && constantTimeEquals(presented, token);
  const sessionOk = !presented && Boolean(await readSessionCookie(request, token));
  if (!bearerOk && !sessionOk) return rejectedOperatorAuth(request);

  let record;
  try { record = await loadConfigRecord(env, { force: true }); }
  catch { return jsonResponse({ ok: false, error: "policy_store_unavailable", message: "Policy storage is unavailable; retry later." }, 503); }

  if (method === "GET") {
    return jsonResponse(configApiPayload(env, record));
  }

  if (!kv || typeof kv.put !== "function") {
    return jsonResponse(
      {
        ok: false,
        error: "kv_not_bound",
        message:
          "Live editing needs the IDI_BADEGG KV namespace. Bind it in wrangler.jsonc (see the comments there), or copy the values into BADEGG_* env vars instead.",
      },
      503
    );
  }

  if (method === "DELETE") {
    const next = {
      values: {},
      updatedAt: new Date().toISOString(),
      updatedBy: "dashboard",
      revision: record.revision + 1,
    };
    await kv.put(BADEGG_CONFIG_KV_KEY, JSON.stringify(next));
    invalidateConfigCache();
    return jsonResponse({ ...configApiPayload(env, { ...next, storage: "kv" }), applied: true });
  }

  if (method !== "PUT" && method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
      allow: "GET, PUT, DELETE, OPTIONS",
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
        message: 'Body must be JSON: {"overrides": {...}}.',
      },
      400
    );
  }

  const submitted =
    body && typeof body === "object" ? (body.overrides ?? body.values ?? body) : null;
  const { values, errors } = sanitizeConfigOverrides(submitted);
  if (errors.length) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_settings",
        message: "Nothing was saved. Fix the settings below and try again.",
        errors,
      },
      422
    );
  }

  const next = {
    values,
    updatedAt: new Date().toISOString(),
    updatedBy: String((body && body.updatedBy) || "dashboard").slice(0, 64),
    revision: record.revision + 1,
  };
  await kv.put(BADEGG_CONFIG_KV_KEY, JSON.stringify(next));
  invalidateConfigCache();

  if (options.waitUntil) {
    options.waitUntil(
      Promise.resolve().then(() => {
        const eventEntry = {
          timestamp: new Date().toISOString(),
          direction: "input",
          mode: values.BADEGG_MODE === "monitor" ? "monitor" : "enforce",
          status: "observed",
          decision: "config_updated",
          executionMode: "active",
          maxConfidence: 0,
          categories: ["config"],
          inspectedCharacters: 0,
          route: safeRoute(`${BADEGG_CONFIG_PATH}${url.search}`),
        };
        recordEvent(eventEntry);
        // Management calls can be proxied via a service binding. Do not mislabel
        // the gateway peer as the human operator without a trusted identity.
        d1PersistEvent(eventEntry, env, options.waitUntil, {host:url.hostname, method});
      })
    );
  }

  return jsonResponse({
    ...configApiPayload(env, { ...next, storage: "kv" }),
    applied: true,
    effectiveImmediately: true,
  });
}

// ---------------------------------------------------------------- dashboard sessions
//
// The console ships in `badegg-v3`, but the password check lives here on the
// edge: signing in is an endpoint the console calls, not something a page does,
// so the same flow works wherever the console is built. Auth is a signed,
// HttpOnly cookie rather than a token in the page, so the password never reaches
// JavaScript and a leaked page source is worthless.
//
// The signing key is the existing `BADEGG_ADMIN_TOKEN` secret: one secret, one
// place to rotate. The cookie is `expiry.nonce.hmac`, HMAC-SHA256 over
// `expiry.nonce`, verified in constant time.

export const SESSION_COOKIE = "badegg_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomNonce() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Read the session cookie and check it against the secret.
 *
 * @returns {Promise<{expiry: number}|null>}
 */
export async function readSessionCookie(request, secret) {
  if (!secret) return null;
  const header = request.headers.get("cookie") || "";
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(header);
  if (!match) return null;
  let value = "";
  try {
    value = decodeURIComponent(match[1]).trim();
  } catch {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [expiry, nonce, signature] = parts;
  const expiryMs = Number.parseInt(expiry, 10);
  if (!Number.isFinite(expiryMs) || expiryMs < Date.now()) return null;
  const expected = await hmacHex(secret, `${expiry}.${nonce}`);
  return constantTimeEquals(signature, expected) ? { expiry: expiryMs, nonce } : null;
}

function sessionCookieHeader(value, secure) {
  const attrs = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

function expiredSessionCookieHeader(secure) {
  const attrs = [`${SESSION_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

function isSecureRequest(request) {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

async function readLoginBody(request) {
  const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (type === "application/x-www-form-urlencoded") {
    const text = await request.text();
    const params = new URLSearchParams(text);
    return { password: params.get("password") || "" };
  }
  try {
    const body = await request.json();
    return { password: String(body?.password ?? body?.token ?? "") };
  } catch {
    return { password: "" };
  }
}

/**
 * `POST /api/badegg/login` - verify the dashboard password.
 *
 * The password is `BADEGG_ADMIN_TOKEN`. A successful login sets the session
 * cookie, which the console presents on its next request to the operator
 * endpoints.
 */
export async function handleLoginApi(request, env) {
  const method = (request.method || "POST").toUpperCase();
  const secret = String(env?.BADEGG_ADMIN_TOKEN || "").trim();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST, OPTIONS",
        "cache-control": "no-store",
        "x-badegg-version": BADEGG_VERSION,
      },
    });
  }
  if (method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
      allow: "POST, OPTIONS",
    });
  }
  if (secret.length < CONFIG_TOKEN_MIN_LENGTH) {
    return jsonResponse(
      {
        ok: false,
        error: "admin_token_not_configured",
        message: `Set the BADEGG_ADMIN_TOKEN secret (at least ${CONFIG_TOKEN_MIN_LENGTH} characters) before the dashboard can be unlocked.`,
      },
      503
    );
  }

  const now = Date.now();
  const { password } = await readLoginBody(request);
  if (!password || !constantTimeEquals(password, secret)) {
    return rejectedOperatorAuth(request, "invalid_password");
  }

  const expiry = now + SESSION_TTL_MS;
  const nonce = randomNonce();
  const signature = await hmacHex(secret, `${expiry}.${nonce}`);
  return jsonResponse({ ok: true, expiresAt: new Date(expiry).toISOString() }, 200, {
    "set-cookie": sessionCookieHeader(`${expiry}.${nonce}.${signature}`, isSecureRequest(request)),
  });
}

/** `POST /api/badegg/logout` - drop the session cookie. */
export async function handleLogoutApi(request) {
  const method = (request.method || "POST").toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  }
  if (method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
      allow: "POST, OPTIONS",
    });
  }
  return jsonResponse({ ok: true }, 200, {
    "set-cookie": expiredSessionCookieHeader(isSecureRequest(request)),
  });
}

/** `GET /api/badegg/session` - is the caller signed in? */
export async function handleSessionApi(request, env) {
  const secret = String(env?.BADEGG_ADMIN_TOKEN || "").trim();
  const session = await readSessionCookie(request, secret);
  if (!session) return rejectedOperatorAuth(request, "unauthenticated");
  return jsonResponse({
    ok: true,
    authenticated: true,
    expiresAt: new Date(session.expiry).toISOString(),
  });
}

/**
 * `POST /api/badegg/lift` - remove one temporary ban.
 *
 * Needed because a forever ban has no expiry to wait out: without a way to lift
 * it, turning `BADEGG_BAN_FOREVER` on would be a one-way door. Authenticated
 * with the same bearer token or session cookie as the config API.
 */
export async function handleLiftApi(request, env) {
  const method = (request.method || "POST").toUpperCase();
  const secret = String(env?.BADEGG_ADMIN_TOKEN || "").trim();
  if (secret.length < CONFIG_TOKEN_MIN_LENGTH) {
    return jsonResponse({ ok: false, error: "admin_token_not_configured" }, 503);
  }
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { allow: "POST, OPTIONS" } });
  }
  if (method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
      allow: "POST, OPTIONS",
    });
  }

  const presented = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const authorized = presented
    ? constantTimeEquals(presented, secret)
    : Boolean(await readSessionCookie(request, secret));
  if (!authorized) return rejectedOperatorAuth(request);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }
  const rawIp = String(body?.ip || "").trim();
  const key = normalizeIp(rawIp);
  if (!key) {
    return jsonResponse(
      { ok: false, error: "invalid_ip", message: "Send an IP address to lift." },
      422
    );
  }

  const kv = env?.IDI_BADEGG;
  if (!kv || typeof kv.delete !== "function") {
    return jsonResponse({ ok: false, error: "ban_store_unavailable", message: "Ban storage is unavailable; retry later." }, 503);
  }
  try {
    await kv.delete(`${KV_TEMPBAN_PREFIX}${key}`);
  } catch {
    return jsonResponse({ ok: false, error: "ban_store_unavailable", message: "The lift was not confirmed; retry later." }, 503);
  }
  const existed = tempBans.delete(key);
  rateLimiter.resetSource(key);
  return jsonResponse({ ok: true, lifted: rawIp, existed, propagation: "KV is eventually consistent; other locations may take time to reflect this change." });
}

/**
 * `GET /api/badegg/bans` - the temporary bans this isolate is currently holding.
 *
 * Authenticated like the config API. The public `?badegg-status=1` payload only
 * reports a count, never the addresses.
 */
export async function handleBansApi(request, env) {
  const secret = String(env?.BADEGG_ADMIN_TOKEN || "").trim();
  if (secret.length < CONFIG_TOKEN_MIN_LENGTH) {
    return jsonResponse({ ok: false, error: "admin_token_not_configured" }, 503);
  }
  const presented = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const authorized = presented
    ? constantTimeEquals(presented, secret)
    : Boolean(await readSessionCookie(request, secret));
  if (!authorized) return rejectedOperatorAuth(request);
  try {
    await hydrateBansFromKv(env);
  } catch {
    return jsonResponse({ ok: false, error: "ban_store_unavailable", message: "Active bans could not be read; retry later." }, 503);
  }
  expireTempBans();
  const bans = [];
  for (const [ip, ban] of tempBans) {
    if (ban.mode !== "active") continue;
    bans.push({
      ip,
      expiresAt: ban.expiresAt,
      forever: ban.expiresAtMs === null,
      reasonCategories: ban.reasonCategories,
    });
  }
  bans.sort((a, b) => String(a.ip).localeCompare(String(b.ip)));
  return jsonResponse({ ok: true, bans, count: bans.length });
}

// ---------------------------------------------------------------- request helpers
export function getClientIp(request) {
  return (request.headers.get("CF-Connecting-IP") || "").trim().toLowerCase();
}

export function isPreview(request) {
  return new URL(request.url).searchParams.has("blocked-preview");
}

export function wantsStatus(request) {
  return new URL(request.url).searchParams.has("badegg-status");
}

export async function isBlockedIp(ip, env, options = {}) {
  const cfg = resolveConfig(env);
  if (cfg.banAlways.length && matchIpList(ip, cfg.banAlways)) return true;
  const tempBan = await getActiveTemporaryBan(ip, env);
  if (tempBan) return true;
  const index = await ensureIndex(env, options);
  if (!index) throw new Error("blocklist_unavailable");
  return match(index, ip).blocked;
}

// ---------------------------------------------------------------- v3 request & response gateway
const TEXT_MEDIA_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/javascript",
  "application/graphql",
  "application/x-www-form-urlencoded",
  "application/xhtml+xml",
]);

/**
 * Static assets are public by definition: the same bytes for every visitor,
 * served from a hashed, immutable URL. Scanning their bodies is pure cost, and
 * in `block`/`redact` mode it is actively harmful - a bundled script that merely
 * *mentions* `authorization: Bearer ...` (like the dashboard does) would come
 * back redacted, or as a 502, and take the site down. Headers are still scanned:
 * a secret there is a real misconfiguration.
 */
const STATIC_ASSET_EXTENSIONS = new Set([
  ".js",
  ".mjs",
  ".css",
  ".map",
  ".svg",
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".avif",
  ".mp4",
  ".webm",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".txt",
  ".xml",
]);

const NON_SCRIPTABLE_OUTPUT_TYPES =
  /^(?:text\/css|text\/javascript|application\/javascript|application\/x-javascript|image\/|font\/|audio\/|video\/)/i;

export function isScannableOutputBody(route, contentType) {
  const media = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!media) return false;
  if (NON_SCRIPTABLE_OUTPUT_TYPES.test(media)) return false;
  const path = String(route || "")
    .split("?")[0]
    .toLowerCase();
  const dot = path.lastIndexOf(".");
  if (dot > 0 && STATIC_ASSET_EXTENSIONS.has(path.slice(dot))) return false;
  return true;
}

function isInspectableTextType(contentType) {
  const media = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!media || media === "text/event-stream") return false;
  return (
    media.startsWith("text/") ||
    TEXT_MEDIA_TYPES.has(media) ||
    media.endsWith("+json") ||
    media.endsWith("+xml")
  );
}

function isJsonType(contentType) {
  const media = String(contentType || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  return media === "application/json" || media.endsWith("+json");
}

function flattenJsonValue(value, depth = 0) {
  if (depth > 64 || value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((item) => flattenJsonValue(item, depth + 1)).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([k, v]) => `${k}:${flattenJsonValue(v, depth + 1)}`)
      .join(" ");
  }
  return String(value);
}

function safeDecodeQuery(rawSearch) {
  if (!rawSearch) return "";
  const plusExpanded = rawSearch.replace(/\+/g, " ");
  try {
    return decodeURIComponent(plusExpanded);
  } catch {
    return plusExpanded;
  }
}

function safeDecodePath(rawPath) {
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

const SKIPPED_SCAN_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "accept-language",
  "cache-control",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "connection",
  "cookie",
  "authorization",
  "proxy-authorization",
  "dnt",
  "if-modified-since",
  "if-none-match",
  "pragma",
  "priority",
  "range",
  "sec-ch-ua",
  "sec-ch-ua-mobile",
  "sec-ch-ua-platform",
  "sec-fetch-dest",
  "sec-fetch-mode",
  "sec-fetch-site",
  "sec-fetch-user",
  "te",
  "transfer-encoding",
  "upgrade-insecure-requests",
]);

function gatewayErrorResponse(status, message, extraHeaders = {}) {
  return new Response(message, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
      "x-badegg-version": BADEGG_VERSION,
      ...extraHeaders,
    },
  });
}

export function throttledResponse(retryAfterSeconds = 1, request = null) {
  const retry = String(Math.max(1, Math.trunc(retryAfterSeconds)));
  const accept = request?.headers?.get("accept") || "";
  if (accept.includes("text/html")) {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#07090d">
  <meta name="robots" content="noindex">
  <title>Rate limited - International Duck</title>
  <style>
    :root{color-scheme:dark;--amber:#f6c177;--muted:#929b96;--line:rgba(255,255,255,.1)}
    *{box-sizing:border-box}
    body{display:grid;min-height:100svh;margin:0;padding:1.25rem;place-items:center;color:#f4f7f5;background:#07090d;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .card{width:min(100%,36rem);padding:clamp(2rem,7vw,3.4rem);border:1px solid var(--line);border-radius:1.4rem;background:linear-gradient(145deg,rgba(31,28,22,.84),rgba(13,12,10,.76));text-align:center}
    .code{color:var(--amber);font:700 .68rem "SFMono-Regular",Consolas,monospace;letter-spacing:.14em;text-transform:uppercase}
    h1{margin:.9rem 0 .65rem;font-size:clamp(2.1rem,7vw,3.4rem);line-height:.98;letter-spacing:-.05em}
    p{margin:0;color:var(--muted);line-height:1.65}
    .chip{display:inline-flex;margin-top:1.2rem;padding:.5rem .85rem;border:1px solid var(--line);border-radius:999px;font:500 .68rem "SFMono-Regular",Consolas,monospace;color:#f6c177}
  </style>
</head>
<body>
  <main class="card">
    <span class="code">BadEgg v3 / 429</span>
    <h1>Slow down a moment.</h1>
    <p>BadEgg is rate limiting this connection after a burst of requests. Wait a moment and refresh.</p>
    <p class="chip">Retry after ${escapeHtml(retry)}s</p>
  </main>
</body>
</html>`;
    return new Response(html, {
      status: 429,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "retry-after": retry,
        "x-content-type-options": "nosniff",
        "x-robots-tag": "noindex",
        "x-badegg-version": BADEGG_VERSION,
      },
    });
  }
  return gatewayErrorResponse(
    429,
    "BadEgg is rate limiting this source IP. Please retry after the stated delay.",
    { "retry-after": retry }
  );
}

/**
 * Inspect an outgoing Response according to BadEgg v3's output policy:
 * redacts or blocks leaked secret patterns in headers (and optional text/JSON
 * bodies when `BADEGG_SCAN_OUTPUT_BODIES=1`), leaving binary and immutable
 * static streams untouched.
 */
export async function inspectOutgoingResponse(response, route, config, env = null, waitUntil = null, context = {}) {
  if (!response || !config.scanOutputs || config.enforcementMode !== "enforce") {
    return response;
  }

  const headerLines = [];
  for (const [name, value] of response.headers.entries()) {
    headerLines.push(`${name}: ${value}`);
  }
  const headerText = headerLines.join("\n");
  let sanitizedHeaders = null;

  if (headerText) {
    const headerScan = scanText({
      direction: "output",
      text: headerText,
      route,
      live: true,
      config,
    });
    const hasSecret = headerScan.findings.some(
      (f) => SECRET_CATEGORIES.has(f.category) || (config.scanPii && f.category === "email_address")
    );
    if (hasSecret) {
      if (config.outputAction === "block") {
        wafMetrics.blockedOutputsTotal++;
        d1Note("blocked", env, waitUntil);
        d1PersistEvent(
          d1Event(
            "block_output_secret",
            [...new Set(headerScan.findings.map((f) => f.category))].sort(),
            "blocked",
            route
          ),
          env,
          waitUntil,
          {...context, direction:"output", ruleIds:headerScan.findings.map(f=>f.ruleId)}
        );
        return gatewayErrorResponse(
          502,
          "BadEgg blocked a response header containing a sensitive-data pattern."
        );
      }
      if (config.outputAction === "redact") {
        sanitizedHeaders = new Headers();
        for (const [name, value] of response.headers.entries()) {
          const redactedLine = redactText(`${name}: ${value}`, config.scanPii);
          const idx = redactedLine.indexOf(":");
          sanitizedHeaders.append(name, idx >= 0 ? redactedLine.slice(idx + 1).trimStart() : value);
        }
        wafMetrics.redactedOutputsTotal++;
      }
    }
  }

  const responseType = response.headers.get("content-type") || "";
  if (
    config.scanOutputBodies &&
    response.status !== 204 &&
    response.status !== 304 &&
    response.status !== 206 &&
    !response.headers.get("content-encoding") &&
    isInspectableTextType(responseType) &&
    isScannableOutputBody(route, responseType)
  ) {
    const lenHeader = response.headers.get("content-length");
    const declaredLen = lenHeader ? Number.parseInt(lenHeader, 10) : 0;
    if (!lenHeader || (Number.isFinite(declaredLen) && declaredLen <= config.maxGatewayBodyBytes)) {
      const clone = response.clone();
      const text = await clone.text();
      if (text.length <= config.maxScanChars) {
        let scanTarget = text;
        if (isJsonType(response.headers.get("content-type") || "")) {
          try {
            scanTarget = flattenJsonValue(JSON.parse(text));
          } catch {
            scanTarget = text;
          }
        }
        // This exact address is intentionally published throughout the home
        // site's HTML, both as link text and in footer mailto links. Exempt it
        // only from body scanning on this hostname; all other addresses, hosts,
        // headers and secrets remain subject to policy.
        if (context.host === "idi.idi-official.workers.dev" && /^text\/html(?:\s*;|\s*$)/i.test(responseType)) {
          scanTarget = scanTarget.replace(/(?<![A-Z0-9._%+-])0xffshell@duck\.com(?![A-Z0-9_%+-]|\.[A-Z0-9-])/gi, "[PUBLIC_CONTACT]");
        }
        const bodyScan = scanText({
          direction: "output",
          text: scanTarget,
          route,
          live: true,
          config,
        });
        const hasBodySecret = bodyScan.findings.some(
          (f) =>
            SECRET_CATEGORIES.has(f.category) || (config.scanPii && f.category === "email_address")
        );
        if (hasBodySecret) {
          if (config.outputAction === "block") {
            wafMetrics.blockedOutputsTotal++;
            d1Note("blocked", env, waitUntil);
            d1PersistEvent(
              d1Event(
                "block_output_secret",
                [...new Set(bodyScan.findings.map((f) => f.category))].sort(),
                "blocked",
                route
              ),
              env,
              waitUntil,
              {...context, direction:"output", ruleIds:bodyScan.findings.map(f=>f.ruleId)}
            );
            return gatewayErrorResponse(
              502,
              "BadEgg blocked an upstream response containing a sensitive-data pattern."
            );
          }
          if (config.outputAction === "redact") {
            const headers = sanitizedHeaders || new Headers(response.headers);
            headers.delete("content-length");
            headers.delete("etag");
            wafMetrics.redactedOutputsTotal++;
            return new Response(redactText(text, config.scanPii), {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
          }
        }
      }
    }
  }

  if (sanitizedHeaders) {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: sanitizedHeaders,
    });
  }
  return response;
}

/**
 * Full BadEgg v3 edge handler shared by Cloudflare Pages (`functions/_middleware.js`)
 * and Cloudflare Workers (`worker.js`).
 */
export async function handleBadEggRequest(request, env, options = {}, forward) {
  const waitUntil = options.waitUntil;
  let configRecord;
  try { configRecord = await loadConfigRecord(env); }
  catch { return gatewayErrorResponse(503, "BadEgg policy storage is unavailable. Please retry later.", { "retry-after": "60" }); }
  const config = resolveConfig(env, configRecord.values);
  const url = new URL(request.url);
  const route = url.pathname.slice(0, 256);
  const requestInfo = requestTelemetry(request);

  // Operator-supplied path denials apply to every method and enforcement mode,
  // including operator routes, before an allowlist or scan can bypass them.
  if (!Array.isArray(config.disallowedPaths)) return gatewayErrorResponse(503, "BadEgg path policy is invalid. Please retry later.", {"retry-after":"60"});
  const pathRules=config.disallowedPaths.filter(r=>r.host === "*" || r.host === url.hostname.toLowerCase().replace(/\.$/,""));
  if (pathRules.length) {
    const normalized=canonicalProtectionPath(url.pathname);
    if (normalized === null) return gatewayErrorResponse(400, "BadEgg could not safely normalize the request path.");
    if (pathRules.some(r=>r.match === "exact" ? normalized === r.path : normalized.startsWith(r.path))) {
      const ip=getClientIp(request);
      d1Note("blocked", env, waitUntil);
      d1PersistEvent(d1Event("blocked_disallowed_path", ["disallowed_path"], "blocked", route), env, waitUntil, {ip,host:url.hostname,method:request.method,requestInfo});
      return blockedResponse(ip, env, {reason:"disallowed_path"});
    }
  }

  // 1. Diagnostics endpoint (?badegg-status=1). Gated like the console: it
  //    reports the effective policy, so an open endpoint would hand the same
  //    information the login screen is there to protect.
  if (wantsStatus(request)) {
    const secret = String(env?.BADEGG_ADMIN_TOKEN || "").trim();
    const presented = (request.headers.get("authorization") || "")
      .replace(/^Bearer\s+/i, "")
      .trim();
    const authorized =
      secret.length >= CONFIG_TOKEN_MIN_LENGTH &&
      ((presented && constantTimeEquals(presented, secret)) ||
        Boolean(await readSessionCookie(request, secret)));
    if (!authorized) return rejectedOperatorAuth(request);
    const index = await ensureIndex(env, { waitUntil });
    if (!index) return jsonResponse({ ok: false, error: "blocklist_unavailable", message: "Blocklist verification failed; retry later." }, 503, { "retry-after": "60" });
    // Status polling must not enumerate KV bans: list operations have a strict
    // account-wide daily quota. The separate bans endpoint is explicit/on demand.
    return statusResponse(env, configRecord);
  }

  // 2. Hard concurrency cap (applies in both Monitor and Enforce)
  if (wafMetrics.activeRequests >= config.maxConcurrentRequests) {
    wafMetrics.overloadRejections++;
    d1Note("throttled", env, waitUntil);
    return gatewayErrorResponse(
      503,
      "BadEgg gateway is at its configured concurrency limit. Please retry shortly.",
      { "retry-after": "1" }
    );
  }

  wafMetrics.activeRequests++;
  if (wafMetrics.activeRequests > wafMetrics.peakConcurrentRequests) {
    wafMetrics.peakConcurrentRequests = wafMetrics.activeRequests;
  }

  try {
    const method = (request.method || "GET").toUpperCase();
    if (!SUPPORTED_METHODS.has(method)) {
      return gatewayErrorResponse(501, "HTTP method is not supported by BadEgg v3.");
    }

    const expect = (request.headers.get("expect") || "").trim().toLowerCase();
    if (expect && expect !== "100-continue") {
      return gatewayErrorResponse(417, "Unsupported HTTP expectation.");
    }

    const rawLength = request.headers.get("content-length");
    let bodyLength = 0;
    if (rawLength !== null) {
      const trimmed = rawLength.trim();
      if (!/^\d+$/.test(trimmed)) {
        return gatewayErrorResponse(400, "Invalid Content-Length.");
      }
      bodyLength = Number.parseInt(trimmed, 10);
      if (bodyLength > MAX_UNINSPECTED_REQUEST_BYTES) {
        return gatewayErrorResponse(413, "Request exceeds BadEgg v3 hard payload limit.");
      }
    }

    const ip = getClientIp(request);

    // 3. Operator surface: login, session probe, lift/ban listing and the config
    //    API. All of it sits ahead of every ban so the console stays reachable
    //    and fixable, whatever the current policy says. The console itself is
    //    built in badegg-v3 and calls these endpoints.
    if (route === "/api/badegg/login") return handleLoginApi(request, env);
    if (route === "/api/badegg/logout") return handleLogoutApi(request);
    if (route === "/api/badegg/session") return handleSessionApi(request, env);
    if (route === "/api/badegg/lift") return handleLiftApi(request, env);
    if (route === "/api/badegg/bans") return handleBansApi(request, env);
    if (route === BADEGG_CONFIG_PATH || route === `${BADEGG_CONFIG_PATH}/`) {
      return handleConfigApi(request, env, { waitUntil });
    }

    // 4. Explicit 403 preview switch (?blocked-preview=1)
    if (isPreview(request)) {
      return blockedResponse(ip, env, { reason: "preview" });
    }

    // 5. Always-banned IPs/CIDRs: an explicit operator list that blocks in
    //    monitor and enforce mode alike, checked before the allowlist so it wins.
    if (ip && config.banAlways.length && matchIpList(ip, config.banAlways)) {
      wafMetrics.blockedAlwaysTotal++;
      d1Note("blocked", env, waitUntil);
      d1PersistEvent(d1Event("ban_always", ["ban_always"], "blocked", route), env, waitUntil, {ip, host:url.hostname, method, requestInfo});
      return blockedResponse(ip, env, { reason: "ban_always" });
    }

    const allowlisted = ip ? isAllowlistedIp(ip, config) : false;

    // 6. Static IP/CIDR blocklist (`hall-of-shame.v2.bin`) + active v3 temporary exact-IP bans.
    //    These are identity refusals, not content findings: like ban_always they
    //    apply in monitor mode as well — monitor relaxes what the scanner does
    //    with request content, never who is allowed in at all.
    if (ip) {
      let activeBan;
      try { activeBan = await getActiveTemporaryBan(ip, env); }
      catch { return gatewayErrorResponse(503, "BadEgg ban storage is unavailable. Please retry later.", { "retry-after": "60" }); }
      if (activeBan) {
        wafMetrics.blockedTempBansTotal++;
        d1Note("blocked", env, waitUntil);
        d1PersistEvent(
          d1Event(
            "temp_ban",
            activeBan.reasonCategories?.length ? activeBan.reasonCategories : ["temporary_ban"],
            "blocked",
            route
          ),
          env,
          waitUntil,
          {ip, host:url.hostname, method, requestInfo}
        );
        const retrySeconds =
          activeBan.expiresAtMs === null
            ? undefined
            : Math.max(1, Math.ceil((activeBan.expiresAtMs - Date.now()) / 1000));
        return blockedResponse(ip, env, {
          reason: activeBan.reasonCategories?.join(", ") || "temporary_ban",
          retryAfter: retrySeconds,
        });
      }

      const index = await ensureIndex(env, { waitUntil });
      if (!index) {
        return gatewayErrorResponse(503, "BadEgg could not verify the blocklist. Please retry later.", { "retry-after": "60" });
      }
      if (match(index, ip).blocked) {
        d1Note("blocked", env, waitUntil);
        d1PersistEvent(d1Event("blocklist", ["blocklist"], "blocked", route), env, waitUntil, {ip, host:url.hostname, method, requestInfo});
        return blockedResponse(ip, env);
      }
    }

    // 5. Configuration API (`/api/badegg/config`). Deliberately ahead of the rate
    //    limiter: a rate limit that was set too low must stay fixable from the
    //    dashboard, and the endpoint authenticates with its own bearer token.
    if (route === BADEGG_CONFIG_PATH || route === `${BADEGG_CONFIG_PATH}/`) {
      return handleConfigApi(request, env, { waitUntil });
    }

    // 7. Per-IP token-bucket rate limiter. The operator endpoints are handled
    //    above, ahead of this, so a limit set too low cannot lock them out.
    if (config.rateLimitEnabled && ip && !allowlisted) {
      const escalating = config.rateLimitAction === "ban" && config.enforcementMode === "enforce";
      const rateDecision = rateLimiter.check(normalizeIp(ip) || ip, {
        requests: config.rateLimitRequests,
        windowSeconds: config.rateLimitWindowSeconds,
        burst: config.rateLimitBurst,
        banAfter: escalating ? config.rateLimitBanAfter : 0,
      });

      if (!rateDecision.allowed) {
        if (rateDecision.shouldReport) {
          const eventEntry = {
            timestamp: new Date().toISOString(),
            direction: "input",
            mode: config.riskMode,
            status: config.enforcementMode === "enforce" ? "blocked" : "observed",
            decision:
              config.enforcementMode !== "enforce"
                ? "would_throttle_rate_limit"
                : rateDecision.escalate
                  ? "blocked_rate_limit_ban"
                  : "throttled_rate_limit",
            executionMode: config.enforcementMode === "enforce" ? "active" : "dry_run",
            maxConfidence: rateDecision.escalate ? 1 : 0,
            categories: ["rate_limit"],
            inspectedCharacters: 0,
            route: safeRoute(route),
          };
          recordEvent(eventEntry);
          d1PersistEvent(eventEntry, env, waitUntil, {ip, host:url.hostname, method, requestInfo});
        }
        if (config.enforcementMode === "enforce") {
          if (escalating && rateDecision.escalate) {
            addTemporaryBan(ip, ["rate_limit"], config, env, waitUntil);
            d1Note("blocked", env, waitUntil);
            return blockedResponse(ip, env, {
              reason: "rate_limit",
              retryAfter: banRetryAfter(config),
            });
          }
          d1Note("throttled", env, waitUntil);
          return throttledResponse(rateDecision.retryAfter, request);
        }
      }
    }

    // 8. BadEgg v3 deterministic request inspection (path + query + headers + text/JSON body)
    if (config.scanInputs) {
      const decodedPath = safeDecodePath(url.pathname);
      const decodedQuery = url.search ? safeDecodeQuery(url.search.slice(1)) : "";
      const targetLine = `${method} ${decodedPath}${decodedQuery ? `?${decodedQuery}` : ""}`;

      const headerLines = [];
      const evidenceParts = [{source:"request target (decoded)", text:targetLine}];
      for (const [name, value] of request.headers.entries()) {
        if (!SKIPPED_SCAN_HEADERS.has(name.toLowerCase())) {
          const line = `${name}: ${value}`;
          headerLines.push(line);
          evidenceParts.push({source:`header: ${name}`, text:line, secret:/(?:authorization|cookie|api[-_]?key|auth|access[-_]?token|csrf|xsrf|session|secret|password|credential|bearer|token)/i.test(name)});
        }
      }

      const parts = [targetLine, headerLines.join("\n")];

      if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        const contentType = request.headers.get("content-type") || "";
        const contentEncoding = (request.headers.get("content-encoding") || "identity")
          .trim()
          .toLowerCase();
        if (bodyLength > config.maxGatewayBodyBytes && config.enforcementMode === "enforce") {
          return gatewayErrorResponse(
            413,
            "Request body exceeds BadEgg v3 configured inspection limit."
          );
        }
        if (
          (bodyLength > 0 || (rawLength === null && contentType)) &&
          contentEncoding === "identity" &&
          isInspectableTextType(contentType)
        ) {
          const cloned = request.clone();
          const rawBody = await cloned.text();
          if (rawBody.length > config.maxScanChars) {
            if (config.enforcementMode === "enforce") {
              return gatewayErrorResponse(
                413,
                "Request body exceeds BadEgg v3 configured character scan limit."
              );
            }
          } else if (rawBody) {
            const media = contentType.split(";")[0].trim().toLowerCase();
            if (media === "application/x-www-form-urlencoded") {
              parts.push(safeDecodeQuery(rawBody));
            } else if (isJsonType(contentType)) {
              try {
                parts.push(flattenJsonValue(JSON.parse(rawBody)));
              } catch {
                parts.push(rawBody);
              }
            } else {
              parts.push(rawBody);
            }
          }
        }
      }

      if (parts.length > 2) evidenceParts.push({source:"request body (decoded/flattened)", text:parts[2]});
      const inspectedText = parts.filter(Boolean).join("\n").slice(0, config.maxScanChars);
      const scanResult = scanText({
        direction: "input",
        text: inspectedText,
        clientIp: ip,
        route,
        host: url.hostname,
        method,
        requestInfo,
        evidenceParts,
        live: config.enforcementMode === "enforce",
        config,
        env,
        waitUntil,
      });

      if (
        config.enforcementMode === "enforce" &&
        (scanResult.decision === "blocked" || scanResult.decision === "blocked_without_verified_ip")
      ) {
        const categories = [
          ...new Set(
            scanResult.findings
              .filter((f) => ATTACK_CATEGORIES.has(f.category))
              .map((f) => f.category)
          ),
        ].join(", ");
        return blockedResponse(ip, env, {
          reason: categories || "waf_policy",
          retryAfter: scanResult.banRecord ? banRetryAfter(config) : undefined,
        });
      }
    }

    // 9. Forward clean request & inspect outgoing headers
    const upstreamResponse = await forward();
    return await inspectOutgoingResponse(upstreamResponse, route, config, env, waitUntil, {ip, host:url.hostname, method, requestInfo});
  } finally {
    if (wafMetrics.activeRequests > 0) wafMetrics.activeRequests--;
  }
}

// ---------------------------------------------------------------- 403 response rendering
export const BLOCKED_PAGE_PATH = "/403.html";

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

export function appealMailto(ip) {
  const subject = encodeURIComponent("IP block appeal");
  const body = ip
    ? `&amp;body=${encodeURIComponent(`Hi team,\n\nMy IP address (${ip}) looks blocked on the site. Could you take a look?\n\nThanks!`)}`
    : "";
  return `mailto:${CONTACT_EMAIL}?subject=${subject}${body}`;
}

export function ipChip(ip, options = {}) {
  const reason = options?.reason && options.reason !== "preview" ? String(options.reason) : "";
  if (ip && reason) {
    return `<p class="ip">Blocked IP <b>${escapeHtml(ip)}</b> · BadEgg v3 <b>${escapeHtml(reason)}</b></p>\n    `;
  }
  if (ip) {
    return `<p class="ip">Blocked IP <b>${escapeHtml(ip)}</b></p>\n    `;
  }
  if (reason) {
    return `<p class="ip">BadEgg v3 <b>${escapeHtml(reason)}</b></p>\n    `;
  }
  return "";
}

export function renderBlockedPage(template, ip, options = {}) {
  return template
    .replaceAll("{{MAILTO}}", appealMailto(ip))
    .replaceAll("{{IP_CHIP}}", ipChip(ip, options));
}

const BLOCKED_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "x-robots-tag": "noindex",
  "x-badegg-version": BADEGG_VERSION,
};

export function blockedResponseFrom(template, ip, options = {}) {
  const headers = { ...BLOCKED_HEADERS };
  if (options?.retryAfter) {
    headers["retry-after"] = String(Math.max(1, Math.trunc(options.retryAfter)));
  }
  return new Response(renderBlockedPage(template, ip, options), { status: 403, headers });
}

export async function blockedResponse(ip, env, options = {}) {
  const assets = env && env.ASSETS;
  if (assets && typeof assets.fetch === "function") {
    try {
      const res = await assets.fetch(`https://assets.internal${BLOCKED_PAGE_PATH}`);
      if (res.ok) {
        const template = await res.text();
        if (template.includes("{{MAILTO}}")) return blockedResponseFrom(template, ip, options);
      }
    } catch {
      // fall through to the inline template
    }
  }
  return blockedResponseFrom(FALLBACK_TEMPLATE, ip, options);
}

/** Inline copy of 403.html. Verified against 403.html in tools/test-badegg-v3.mjs. */
export const FALLBACK_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#07090d">
  <meta name="robots" content="noindex">
  <title>Blocked - International Duck</title>
  <style>
    :root{color-scheme:dark;--red:#ff8f8f;--blue:#5a9bf2;--muted:#929b96;--line:rgba(255,255,255,.1)}
    *{box-sizing:border-box}
    body{display:grid;min-height:100svh;margin:0;padding:1.25rem;place-items:center;overflow:hidden;color:#f4f7f5;background:#07090d;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    body:before,body:after{position:fixed;z-index:-1;width:34rem;height:34rem;border-radius:50%;filter:blur(90px);content:""}
    body:before{top:-18rem;right:-12rem;background:rgba(255,120,120,.12)}
    body:after{bottom:-24rem;left:-15rem;background:rgba(150,80,90,.09)}
    .card{position:relative;width:min(100%,38rem);padding:clamp(2rem,7vw,3.8rem);overflow:hidden;border:1px solid var(--line);border-radius:1.4rem;background:linear-gradient(145deg,rgba(31,25,27,.82),rgba(14,11,13,.7));box-shadow:0 30px 90px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.06);text-align:center;backdrop-filter:blur(24px)}
    .card:before{position:absolute;inset:0;background:radial-gradient(circle at 50% 0,rgba(255,143,143,.08),transparent 42%);pointer-events:none;content:""}
    .mark{position:relative;display:grid;width:4.5rem;height:4.5rem;margin:0 auto 2rem;place-items:center;color:var(--red);background:linear-gradient(145deg,rgba(255,143,143,.13),rgba(255,255,255,.03));border:1px solid rgba(255,143,143,.3);border-radius:1rem;box-shadow:0 14px 28px rgba(0,0,0,.35)}
    .mark svg{width:2.05rem;height:2.05rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .code{position:relative;color:var(--red);font:700 .68rem "SFMono-Regular",Consolas,monospace;letter-spacing:.14em;text-transform:uppercase}
    h1{position:relative;margin:.9rem 0 .65rem;font-size:clamp(2.3rem,8vw,4rem);line-height:.95;letter-spacing:-.06em}
    p{position:relative;margin:0;color:var(--muted);line-height:1.65}
    p a{color:#e9efeb;text-decoration:underline;text-decoration-color:rgba(255,255,255,.28);text-underline-offset:3px}
    p a:hover{color:#fff}
    .ip{display:inline-flex;margin:1.15rem 0 0;padding:.5rem .85rem;gap:.45rem;align-items:center;justify-content:center;flex-wrap:wrap;color:#a9b1ab;background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:999px;font:500 .64rem "SFMono-Regular",Consolas,monospace}
    .ip b{color:#ffb4b4;font-weight:600;overflow-wrap:anywhere}
    a.btn{position:relative;display:inline-flex;margin-top:2rem;padding:.85rem 1.15rem;gap:.55rem;align-items:center;color:#fff;background:var(--blue);border-radius:.65rem;box-shadow:0 10px 30px rgba(90,155,242,.16);font-size:.77rem;font-weight:800;text-decoration:none;transition:.2s ease}
    a.btn:hover{background:#70aaf5;transform:translateY(-2px)}
    a.btn:focus-visible{outline:2px solid #fff;outline-offset:4px}
    a.btn svg{width:.95rem;height:.95rem;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  </style>
</head>
<body>
  <main class="card">
    <span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.6"/><path d="M5.9 5.9l12.2 12.2"/></svg></span>
    <span class="code">Error / 403</span>
    <h1>Uh oh, you’re blocked.</h1>
    <p>Your IP address is on the site’s blocklist, so the site won’t load from this connection. If this is a mistake, email <a href="{{MAILTO}}">0xffshell@duck.com</a> and we’ll take a look.</p>
    {{IP_CHIP}}<a class="btn" href="{{MAILTO}}"><svg viewBox="0 0 24 24"><path d="M3.5 5.5h17v13h-17z"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>Email the team</a>
  </main>
</body>
</html>`;


/**
 * Overlay the durable fleet totals (D1 `BADEGG_DB`) onto this isolate's
 * counters for the status API: display = persisted fleet sum plus this
 * isolate's not-yet-flushed observations. `badeggStatus` itself stays
 * synchronous (the public ?badegg-status=1 diagnostics route uses it); this
 * is the only read path that awaits D1, and it fails open to in-memory only.
 */
async function mergePersistentStatus(body, env) {
  const totals = await d1Totals(env);
  if (!totals || !body || !body.waf) return;
  body.waf.inspectedTotal = totals.inspected + (d1Local.inspected - d1Persisted.inspected);
  body.waf.blockedAttacksTotal = totals.blocked + (d1Local.blocked - d1Persisted.blocked);
  if (body.concurrency) {
    body.concurrency.overloadRejections = totals.throttled + (d1Local.throttled - d1Persisted.throttled);
  }
  if (totals.events.length) {
    body.waf.recentEvents = totals.events.map((row) => ({
      timestamp: new Date(Number(row.ts) || Date.now()).toISOString(),
      direction: "input",
      status: String(row.status || ""),
      decision: String(row.decision || "event"),
      categories: String(row.categories || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      site: String(row.site || ""),
    }));
  }
}

export async function statusResponse(env = {}, record = null) {
  const body = badeggStatus(env, { record });
  // Isolate memory is not a fleet-wide count; an operator may fetch the list
  // explicitly instead of repeatedly enumerating KV on each status refresh.
  body.waf.activeTempBans = null;
  body.waf.banCountScope = "not_loaded";
  await mergePersistentStatus(body, env);
  return new Response(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-badegg-version": BADEGG_VERSION,
    },
  });
}
