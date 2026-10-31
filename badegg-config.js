/**
 * BadEgg v3 configuration surface: defaults, schema and resolution.
 *
 * This module is the single source of truth for *what can be tuned* and *what
 * the edge actually does with it*. It is imported by both sides:
 *
 *   - `functions/_badegg.js` (the Cloudflare Pages middleware / Worker) uses
 *     `resolveConfig` to turn environment variables + optional KV overrides
 *     into the runtime policy object.
 *   - The console in `badegg-v3` (`feat/idi-pages-dashboard`) uses
 *     `CONFIG_SCHEMA` to render its controls and `sanitizeConfigOverrides` to
 *     validate what the operator typed before it is exported or stored.
 *
 * One schema for both means the console cannot drift from the gateway: a knob
 * only exists if it is listed here, and every knob carries the same bounds the
 * gateway clamps to.
 *
 * Everything is expressed as environment-variable strings, because that is what
 * Cloudflare gives the gateway (`env.BADEGG_*`) and it makes presets, export and
 * import plain JSON objects that can be pasted into `wrangler.jsonc` or a
 * dashboard field.
 */

/** KV key holding runtime overrides written by the dashboard (see PUT /api/badegg/config). */
export const BADEGG_CONFIG_KV_KEY = "badegg:v3:config";

/** Path of the configuration API. Served by the gateway itself, not a static file. */
export const BADEGG_CONFIG_PATH = "/api/badegg/config";

/** Hard ceiling for any request body, inspected or not (10 MiB). */
export const MAX_UNINSPECTED_REQUEST_BYTES = 10_485_760;
/** Default cap on the part of a request body the WAF will actually read (1 MiB). */
export const DEFAULT_MAX_GATEWAY_BODY_BYTES = 1_000_000;
/** Default cap on characters handed to the deterministic rule set. */
export const DEFAULT_MAX_SCAN_CHARS = 1_100_000;
/** Default per-isolate in-flight request cap. */
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 64;

export const RISK_PROFILES = {
  minimize_false_bans: {
    label: "Minimize false bans",
    autoBlockThreshold: 0.97,
    alertThreshold: 0.6,
  },
  catch_more: {
    label: "Catch more threats",
    autoBlockThreshold: 0.92,
    alertThreshold: 0.4,
  },
};

export const CATEGORY_ACTION_OPTIONS = [
  {
    value: "default",
    label: "Default",
    description: "Use BadEgg's shipped action for this category (strike-ban for recon paths, ban for exploits).",
  },
  {
    value: "ban",
    label: "Ban IP",
    description: "Refuse with 403 and apply an immediate temporary or forever IP ban.",
  },
  {
    value: "strike_ban",
    label: "403 then Ban (3 strikes)",
    description: "Refuse each hit with 403; apply a finite temporary ban after 3 hits in 10 minutes.",
  },
  {
    value: "block",
    label: "Block request only (403)",
    description: "Refuse the request with 403 without banning the client IP.",
  },
  {
    value: "monitor",
    label: "Monitor only",
    description: "Record the event for visibility and let the request proceed.",
  },
  {
    value: "ignore",
    label: "Ignore / Off",
    description: "Skip rules in this category during request inspection.",
  },
];

export const CONFIGURABLE_CATEGORIES = [
  { id: "recon_path", label: "Recon & scanner paths", defaultAction: "strike_ban", defaultAbuseIpdb: true, abuseCategories: [19, 21] },
  { id: "sql_injection", label: "SQL injection", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [16, 21] },
  { id: "command_injection", label: "Command injection", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [15, 21] },
  { id: "cross_site_scripting", label: "Cross-site scripting (XSS)", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [21] },
  { id: "path_traversal", label: "Path traversal", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [21] },
  { id: "nosql_injection", label: "NoSQL injection", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [21] },
  { id: "template_injection", label: "Template injection (SSTI)", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [15, 21] },
  { id: "ssrf", label: "Server-side request forgery (SSRF)", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [15, 21] },
  { id: "prototype_pollution", label: "Prototype pollution", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [21] },
  { id: "xml_external_entity", label: "XML external entity (XXE)", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [21] },
  { id: "header_injection", label: "HTTP header / CRLF injection", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [21] },
  { id: "malicious_upload", label: "Malicious file upload", defaultAction: "ban", defaultAbuseIpdb: true, abuseCategories: [15, 21] },
  { id: "graphql_abuse", label: "GraphQL depth / introspection abuse", defaultAction: "ban", defaultAbuseIpdb: false, abuseCategories: [21] },
  { id: "prompt_injection", label: "AI prompt injection", defaultAction: "ban", defaultAbuseIpdb: false, abuseCategories: [21] },
  { id: "rate_limit", label: "Rate-limit flood escalation", defaultAction: "ban", defaultAbuseIpdb: false, abuseCategories: [4, 19] },
];

export const CONFIGURABLE_CATEGORY_BY_ID = new Map(
  CONFIGURABLE_CATEGORIES.map((entry) => [entry.id, entry])
);

const VALID_CATEGORY_ACTIONS = new Set(CATEGORY_ACTION_OPTIONS.map((opt) => opt.value));


/**
 * Groups are presentation only: they order and label the dashboard sections.
 * The gateway ignores them.
 */
export const CONFIG_GROUPS = [
  {
    id: "enforcement",
    label: "Enforcement",
    description:
      "Whether BadEgg acts or only observes, and how confident a finding must be before it bans.",
  },
  {
    id: "rateLimit",
    label: "Rate limiting",
    description:
      "Per-IP token bucket: sustained rate, headroom burst, and what happens when it runs out.",
  },
  {
    id: "inspection",
    label: "Request & response inspection",
    description:
      "The deterministic WAF rules, and what happens to secrets found on the way out.",
  },
  {
    id: "limits",
    label: "Bans & limits",
    description: "Ban lifetime, concurrency ceiling and the IPs that are never blocked.",
  },
];

/**
 * The settings the gateway understands.
 *
 * `default` is the value used when the variable is unset, so
 * `resolveConfig({})` and `resolveConfig(CONFIG_DEFAULTS)` are identical.
 *
 * `type`:
 *   - "select"  one of `options`
 *   - "toggle"  on/off, stored as "1" / "0"
 *   - "number"  integer within [min, max]
 *   - "list"    comma separated tokens (IPs / CIDRs)
 *   - "text"    free string
 */
export const CONFIG_SCHEMA = [
  { key:"BADEGG_DISALLOWED_PATHS", group:"inspection", label:"Always-disallowed paths", type:"path-rules", default:"[]", help:"JSON list of host, path and exact/prefix match. Enforced in Monitor and before operator routes." },
  {
    key: "BADEGG_MODE",
    group: "enforcement",
    label: "Mode",
    type: "select",
    default: "enforce",
    options: [
      {
        value: "enforce",
        label: "Enforce",
        description: "Block, ban and throttle for real. This is the production setting.",
      },
      {
        value: "monitor",
        label: "Monitor only",
        description: "Log what would have been blocked and let every request through.",
      },
    ],
    help: "Monitor mode is a dry run: findings are recorded as events but nothing is blocked.",
  },
  {
    key: "BADEGG_RISK_MODE",
    group: "enforcement",
    label: "Risk profile",
    type: "select",
    default: "minimize_false_bans",
    options: [
      {
        value: "minimize_false_bans",
        label: "Minimize false bans",
        description: "Auto-ban at 0.97 confidence, alert from 0.6.",
      },
      {
        value: "catch_more",
        label: "Catch more threats",
        description: "Auto-ban at 0.92 confidence, alert from 0.4.",
      },
    ],
    help: "The profile sets the default auto-block and alert thresholds. A threshold override wins.",
  },
  {
    key: "BADEGG_AUTO_BLOCK",
    group: "enforcement",
    label: "Automatic bans",
    type: "toggle",
    default: "1",
    help: "Off means the WAF still inspects and records, but never earns a temporary ban.",
  },
  {
    key: "BADEGG_AUTO_BLOCK_THRESHOLD",
    group: "enforcement",
    label: "Auto-ban confidence",
    type: "number",
    default: "",
    min: 0.1,
    max: 1,
    step: 0.01,
    placeholder: "Profile default",
    help: "Empty inherits the risk profile (0.97 or 0.92). Lower catches more and bans more false positives.",
  },
  {
    key: "BADEGG_BAN_TTL_SECONDS",
    group: "limits",
    label: "Temporary ban length",
    type: "number",
    default: "900",
    min: 30,
    max: 86_400,
    step: 30,
    unit: "seconds",
    help: "How long an exact-IP ban lasts after a high-confidence attack or sustained abuse. Ignored while bans are set to last forever.",
    dependsOn: {
      key: "BADEGG_BAN_FOREVER",
      value: "1",
      note: "ignored while bans are set to last forever",
    },
  },
  {
    key: "BADEGG_BAN_FOREVER",
    group: "limits",
    label: "Ban forever",
    type: "toggle",
    default: "0",
    help: "When on, temporary bans never expire. Lift one from the Active bans panel, or turn this off and restart the isolate.",
  },
  {
    key: "BADEGG_RATE_LIMIT",
    group: "rateLimit",
    label: "Rate limiting",
    type: "toggle",
    default: "1",
    help: "Per-IP token bucket in front of every route.",
  },
  {
    key: "BADEGG_RATE_LIMIT_REQUESTS",
    group: "rateLimit",
    label: "Sustained requests",
    type: "number",
    default: "180",
    min: 1,
    max: 100_000,
    step: 1,
    unit: "per window",
    help: "Refill rate of the token bucket: requests allowed per window, per IP.",
  },
  {
    key: "BADEGG_RATE_LIMIT_WINDOW_S",
    group: "rateLimit",
    label: "Window",
    type: "number",
    default: "60",
    min: 1,
    max: 3600,
    step: 1,
    unit: "seconds",
    help: "Length of the window the sustained budget is measured over.",
  },
  {
    key: "BADEGG_RATE_LIMIT_BURST",
    group: "rateLimit",
    label: "Burst",
    type: "number",
    default: "60",
    min: 1,
    max: 10_000,
    step: 1,
    unit: "requests",
    help: "Bucket size: how far above the sustained rate a single IP can spike before it is held.",
  },
  {
    key: "BADEGG_RATE_LIMIT_ACTION",
    group: "rateLimit",
    label: "When the budget runs out",
    type: "select",
    default: "ban",
    options: [
      {
        value: "ban",
        label: "429 then ban",
        description: "Answer 429 with Retry-After, then ban repeat offenders.",
      },
      {
        value: "throttle",
        label: "429 only",
        description: "Answer 429 with Retry-After and never escalate to a ban.",
      },
    ],
    help: "Throttling keeps every client addressable; escalating bans make repeat floods cheap to stop.",
  },
  {
    key: "BADEGG_RATE_LIMIT_BAN_AFTER",
    group: "rateLimit",
    label: "Escalate after",
    type: "number",
    default: "10",
    min: 1,
    max: 1000,
    step: 1,
    unit: "strikes",
    help: "Consecutive over-limit decisions before a temporary ban, when the action is 429 then ban.",
  },
  {
    key: "BADEGG_SCAN_INPUTS",
    group: "inspection",
    label: "Scan requests",
    type: "toggle",
    default: "1",
    help: "Inspect path, query, headers and text/JSON bodies against the rule set.",
  },
  {
    key: "BADEGG_SCAN_OUTPUTS",
    group: "inspection",
    label: "Scan responses",
    type: "toggle",
    default: "1",
    help: "Inspect outgoing response headers for leaked credentials.",
  },
  {
    key: "BADEGG_SCAN_OUTPUT_BODIES",
    group: "inspection",
    label: "Scan response bodies",
    type: "toggle",
    default: "0",
    help: "Also read text/JSON response bodies. Costs CPU on every response.",
  },
  {
    key: "BADEGG_SCAN_PII",
    group: "inspection",
    label: "Flag PII",
    type: "toggle",
    default: "0",
    help: "Also flag email addresses and phone-number shaped strings as possible PII.",
  },
  {
    key: "BADEGG_OUTPUT_ACTION",
    group: "inspection",
    label: "Secrets on the way out",
    type: "select",
    default: "redact",
    options: [
      { value: "redact", label: "Redact", description: "Replace the secret with a placeholder." },
      { value: "block", label: "Block", description: "Refuse to send the response at all." },
      {
        value: "alert",
        label: "Alert only",
        description: "Record the event and send it unchanged.",
      },
    ],
    help: "Redaction keeps a working page; blocking is the strictest and can take a page down.",
  },
  {
    key: "BADEGG_MAX_SCAN_CHARS",
    group: "inspection",
    label: "Scan budget",
    type: "number",
    default: String(DEFAULT_MAX_SCAN_CHARS),
    min: 1024,
    max: 5_000_000,
    step: 1024,
    unit: "characters",
    help: "Upper bound on the text handed to the rule set per direction.",
  },
  {
    key: "BADEGG_MAX_BODY_BYTES",
    group: "inspection",
    label: "Body inspection cap",
    type: "number",
    default: String(DEFAULT_MAX_GATEWAY_BODY_BYTES),
    min: 1024,
    max: MAX_UNINSPECTED_REQUEST_BYTES,
    step: 1024,
    unit: "bytes",
    help: "Bodies larger than this are rejected in enforce mode instead of being read.",
  },
  {
    key: "BADEGG_MAX_CONCURRENT",
    group: "limits",
    label: "Concurrency ceiling",
    type: "number",
    default: String(DEFAULT_MAX_CONCURRENT_REQUESTS),
    min: 1,
    max: 4096,
    step: 1,
    unit: "in flight",
    help: "Per-isolate in-flight request cap. Requests over it get a 503 with Retry-After.",
  },
  {
    key: "BADEGG_ALLOWLIST",
    group: "limits",
    label: "Allowlist",
    type: "list",
    default: "",
    placeholder: "203.0.113.7, 2001:db8::/32",
    help: "Comma separated IPs or CIDRs that skip the blocklist, rate limiter and WAF entirely. 127.0.0.1 and ::1 are always allowed.",
  },
  {
    key: "BADEGG_BAN_ALWAYS",
    group: "limits",
    label: "Ban always list",
    type: "list",
    default: "",
    placeholder: "198.51.100.7, 2001:db8:dead::/48",
    help: "Comma separated IPs or CIDRs that are blocked on every request, in monitor and enforce mode alike, and before the rate limiter. Checked before the allowlist, so it wins.",
  },
  {
    key: "BADEGG_CATEGORY_ACTIONS",
    group: "enforcement",
    label: "Per-category actions & AbuseIPDB",
    type: "category-actions",
    default: "{}",
    help: "JSON map of detection category overrides ({ action: default|ban|strike_ban|block|monitor|ignore, reportAbuseIpdb: boolean }).",
  },
  {
    key: "BADEGG_ABUSEIPDB_ENABLED",
    group: "enforcement",
    label: "AbuseIPDB auto-reporting",
    type: "toggle",
    default: "0",
    help: "When enabled, the central BadEgg Worker reports blocked public IPs for enabled categories to AbuseIPDB v2.",
  },
  {
    key: "BADEGG_ABUSEIPDB_COOLDOWN_S",
    group: "limits",
    label: "AbuseIPDB per-IP cooldown",
    type: "number",
    default: "3600",
    min: 900,
    max: 604_800,
    step: 300,
    unit: "seconds",
    help: "Minimum seconds before reporting the same IP address to AbuseIPDB again (minimum 900s = 15 minutes).",
  },
];

/** key -> schema entry. */
export const CONFIG_BY_KEY = new Map(CONFIG_SCHEMA.map((field) => [field.key, field]));

/** Every key the gateway understands, in schema order. */
export const CONFIG_KEYS = CONFIG_SCHEMA.map((field) => field.key);

/** key -> default value string. */
export const CONFIG_DEFAULTS = Object.fromEntries(
  CONFIG_SCHEMA.map((field) => [field.key, field.default])
);

/** The defaults as a config API payload would express them. */
export const DEFAULT_CONFIG_OVERRIDES = Object.freeze({ ...CONFIG_DEFAULTS });

const BOOLEAN_TRUE = new Set(["1", "true", "on", "yes", "y", "enabled"]);
const BOOLEAN_FALSE = new Set(["0", "false", "off", "no", "n", "disabled"]);

const LIST_TOKEN = /^[0-9a-fA-F:.]{2,45}(?:\/\d{1,3})?$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const IPV6 = /^[0-9a-fA-F:]*:[0-9a-fA-F:.]*$/;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Normalize for deny matching only; this does not rewrite the forwarded URL.
// Decode bounded repeated encodings, resolve slash/backslash and dot segments.
// Malformed or excessive encodings return null and are rejected for hosts with rules.
export function canonicalProtectionPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 2048) return null;
  let path=value;
  for(let i=0;i<5;i++){
    if(!/%[0-9a-f]{2}/i.test(path))break;
    if(i===4)return null;
    try { path=decodeURIComponent(path); } catch { return null; }
  }
  if(/[\x00-\x1f\x7f]/.test(path) || path.length>2048) return null;
  path=path.replace(/\\/g,"/");
  const out=[];for(const segment of path.split("/")){if(!segment || segment===".")continue;if(segment===".."){out.pop();continue}out.push(segment)}
  return "/"+out.join("/");
}

/**
 * Turn one operator-supplied value into the canonical env string for `field`.
 *
 * Returns `{ value }` on success or `{ error }` with a human sentence, which is
 * what the dashboard shows next to the offending control. Out-of-range numbers
 * are clamped rather than rejected (matching `resolveConfig`), but a value that
 * is not a number at all, or a select value that is not offered, is an error.
 */
export function normalizeConfigValue(field, raw) {
  if (field.type === "category-actions") {
    let parsed;
    try {
      parsed = typeof raw === "object" && raw !== null ? raw : JSON.parse(String(raw ?? "{}"));
    } catch {
      return { error: "Category actions must be valid JSON." };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "Category actions must be a JSON object keyed by category name." };
    }
    const clean = {};
    for (const key of Object.keys(parsed).sort()) {
      const meta = CONFIGURABLE_CATEGORY_BY_ID.get(key);
      if (!meta) {
        return { error: `Unknown detection category "${key}".` };
      }
      const entry = parsed[key];
      let action = "default";
      let reportAbuseIpdb = meta.defaultAbuseIpdb;
      if (typeof entry === "string") {
        action = entry.trim().toLowerCase();
      } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        if (entry.action !== undefined) {
          action = String(entry.action || "").trim().toLowerCase();
        }
        const rawAbuseFlag = entry.reportAbuseIpdb !== undefined ? entry.reportAbuseIpdb : entry.abuseipdb;
        if (rawAbuseFlag !== undefined) {
          if (typeof rawAbuseFlag !== "boolean") {
            return { error: `Category "${key}" reportAbuseIpdb must be true or false.` };
          }
          reportAbuseIpdb = rawAbuseFlag;
        }
      } else {
        return { error: `Category "${key}" must be an action string or { action, reportAbuseIpdb } object.` };
      }
      if (!VALID_CATEGORY_ACTIONS.has(action)) {
        return {
          error: `Category "${key}" action must be one of: ${[...VALID_CATEGORY_ACTIONS].join(", ")}.`,
        };
      }
      if (key === "rate_limit" && action !== "default" && action !== "ban") {
        return { error: `Category "rate_limit" only supports default/ban action plus reportAbuseIpdb.` };
      }
      if (action !== "default" || reportAbuseIpdb !== meta.defaultAbuseIpdb) {
        clean[key] = { action, reportAbuseIpdb };
      }
    }
    return { value: JSON.stringify(clean) };
  }

  if (field.type === "path-rules") {
    let rules;try { rules=JSON.parse(String(raw ?? "[]")); } catch { return {error:"Path rules must be valid JSON."}; }
    if (!Array.isArray(rules) || rules.length > 200) return {error:"Expected at most 200 path rules."};
    const clean=[], seen=new Set();
    for (const rule of rules) {
      if (!rule || typeof rule!=="object" || Array.isArray(rule) || typeof rule.host!=="string" || typeof rule.path!=="string" || !["exact","prefix"].includes(rule.match)) return {error:"Each path rule needs host, path and exact/prefix match."};
      const host=rule.host.trim().toLowerCase().replace(/\.$/,"");
      if (host!=="*") { try { const u=new URL(`https://${host}/`);if(!host || host.length>253 || u.hostname!==host || u.port || u.username || u.password || u.pathname!=="/" || u.search || u.hash || !/^[a-z0-9.-]+$/.test(host) || host.includes("..")) throw Error(); } catch { return {error:"Use an exact hostname (or *) without a URL, port or path."}; } }
      if (/[?#]/.test(rule.path)) return {error:"Rule paths cannot contain query strings or fragments."};
      const path=canonicalProtectionPath(rule.path);
      if(path===null) return {error:"Invalid or excessively encoded path."};
      const key=JSON.stringify([host,path,rule.match]);if(seen.has(key))return {error:"Duplicate path rule."};seen.add(key);
      clean.push({host,path,match:rule.match});
    }
    return {value:JSON.stringify(clean)};
  }

  if (field.type === "toggle") {
    if (typeof raw === "boolean") return { value: raw ? "1" : "0" };
    const text = String(raw ?? "")
      .trim()
      .toLowerCase();
    if (BOOLEAN_TRUE.has(text)) return { value: "1" };
    if (BOOLEAN_FALSE.has(text)) return { value: "0" };
    return { error: "Expected on/off." };
  }

  if (field.type === "select") {
    const text = String(raw ?? "").trim();
    if (!field.options.some((option) => option.value === text)) {
      const allowed = field.options.map((option) => option.value).join(", ");
      return { error: `Expected one of: ${allowed}.` };
    }
    return { value: text };
  }

  if (field.type === "number") {
    const text = String(raw ?? "").trim();
    // The confidence threshold is the one nullable number: empty means inherit.
    if (text === "" && field.default === "") return { value: "" };
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return { error: "Expected a number." };
    const clamped = clampNumber(parsed, field.min, field.max);
    const rounded =
      field.step && field.step < 1 ? Math.round(clamped * 100) / 100 : Math.round(clamped);
    return { value: String(rounded) };
  }

  if (field.type === "list") {
    const tokens = String(raw ?? "")
      .split(/[\s,]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    for (const token of tokens) {
      if (!LIST_TOKEN.test(token)) {
        return { error: `"${token}" is not an IP address or CIDR.` };
      }
      // Entries may carry a CIDR prefix; the address part is what has to parse.
      const slash = token.lastIndexOf("/");
      const address = (slash === -1 ? token : token.slice(0, slash)).toLowerCase();
      const prefix = slash === -1 ? "" : token.slice(slash + 1);
      const isIpv4 = IPV4.test(address);
      const isIpv6 = !isIpv4 && IPV6.test(address);
      if (!isIpv4 && !isIpv6) {
        return { error: `"${token}" is not an IP address or CIDR.` };
      }
      if (prefix !== "") {
        const bits = isIpv4 ? 32 : 128;
        const parsed = Number(prefix);
        if (!/^\d{1,3}$/.test(prefix) || !Number.isInteger(parsed) || parsed < 0 || parsed > bits) {
          return { error: `"${token}" has a prefix outside 0-${bits}.` };
        }
      }
    }
    return { value: tokens.join(", ") };
  }

  return { value: String(raw ?? "").trim() };
}

/**
 * Validate a whole override map (e.g. a pasted JSON blob or a KV record).
 *
 * Unknown keys are dropped and reported, because a stale dashboard tab must not
 * be able to smuggle a setting the running gateway does not implement.
 *
 * @param {Record<string, unknown>} input
 * @returns {{ values: Record<string, string>, errors: { key: string, message: string }[] }}
 */
export function sanitizeConfigOverrides(input) {
  const values = {};
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { values, errors: [{ key: "", message: "Expected an object of BADEGG_* settings." }] };
  }
  for (const [key, raw] of Object.entries(input)) {
    const field = CONFIG_BY_KEY.get(key);
    if (!field) {
      errors.push({ key, message: "Unknown setting for this BadEgg version." });
      continue;
    }
    const result = normalizeConfigValue(field, raw);
    if (result.error) errors.push({ key, message: result.error });
    else values[key] = result.value;
  }
  return { values, errors };
}

/**
 * Resolve the effective gateway policy.
 *
 * @param {Record<string, unknown>} env Cloudflare bindings (`env.BADEGG_*`).
 * @param {Record<string, string>|null} overrides Values written by the dashboard,
 *   which win over the environment. Only keys that passed `sanitizeConfigOverrides`
 *   should be passed here.
 */
export function resolveCategoryActions(raw = "{}") {
  const field = CONFIG_BY_KEY.get("BADEGG_CATEGORY_ACTIONS");
  const normalized = normalizeConfigValue(field, raw ?? "{}");
  const overrides = normalized.error ? {} : JSON.parse(normalized.value);
  const resolved = {};
  for (const meta of CONFIGURABLE_CATEGORIES) {
    const ov = overrides[meta.id];
    const configuredAction = ov?.action || "default";
    const effectiveAction = configuredAction === "default" ? meta.defaultAction : configuredAction;
    const reportAbuseIpdb =
      typeof ov?.reportAbuseIpdb === "boolean" ? ov.reportAbuseIpdb : meta.defaultAbuseIpdb;
    resolved[meta.id] = {
      action: configuredAction,
      effectiveAction,
      reportAbuseIpdb,
      abuseCategories: [...meta.abuseCategories],
    };
  }
  return resolved;
}

export function effectiveCategoryAction(category, config = null) {
  const entry = config?.categoryActions?.[category];
  if (entry?.effectiveAction) return entry.effectiveAction;
  const meta = CONFIGURABLE_CATEGORY_BY_ID.get(category);
  return meta ? meta.defaultAction : "ban";
}

export function shouldReportCategoryToAbuseIpdb(category, config = null) {
  const entry = config?.categoryActions?.[category];
  if (typeof entry?.reportAbuseIpdb === "boolean") return entry.reportAbuseIpdb;
  const meta = CONFIGURABLE_CATEGORY_BY_ID.get(category);
  return meta ? meta.defaultAbuseIpdb : false;
}

export function abuseIpdbCategoriesFor(categories = []) {
  const ids = new Set();
  for (const cat of categories) {
    const meta = CONFIGURABLE_CATEGORY_BY_ID.get(cat);
    if (meta) {
      for (const id of meta.abuseCategories) ids.add(id);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

export function resolveConfig(env = {}, overrides = null) {
  const source = overrides && typeof overrides === "object" ? { ...env, ...overrides } : env || {};
  const rawRisk = String(source?.BADEGG_RISK_MODE || "minimize_false_bans").trim();
  const riskMode = RISK_PROFILES[rawRisk] ? rawRisk : "minimize_false_bans";
  const rawMode = String(source?.BADEGG_MODE || "enforce")
    .trim()
    .toLowerCase();
  const enforcementMode = rawMode === "monitor" ? "monitor" : "enforce";
  const overrideRaw = source?.BADEGG_AUTO_BLOCK_THRESHOLD;
  const thresholdOverride =
    overrideRaw !== undefined && overrideRaw !== "" && Number.isFinite(Number(overrideRaw))
      ? Math.min(1, Math.max(0.1, Number(overrideRaw)))
      : null;

  const extraAllow = String(source?.BADEGG_ALLOWLIST || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const banAlways = String(source?.BADEGG_BAN_ALWAYS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // "Forever" is a single toggle rather than a magic TTL number: bans either
  // expire on a schedule or they do not. `banTtlSeconds` stays a real number so
  // every other consumer (Retry-After, the status payload) keeps working.
  const banForever = String(source?.BADEGG_BAN_FOREVER || "")
    .trim()
    .toLowerCase();
  const banNeverExpires = ["1", "true", "on", "yes", "y", "enabled"].includes(banForever);

  const intOr = (val, fallback, min, max) => {
    const n = Number.parseInt(String(val ?? ""), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  return {
    riskMode,
    enforcementMode,
    disallowedPaths: (() => { const v=normalizeConfigValue(CONFIG_BY_KEY.get("BADEGG_DISALLOWED_PATHS"), source?.BADEGG_DISALLOWED_PATHS ?? "[]"); return v.error ? null : JSON.parse(v.value); })(),
    autoBlockEnabled: source?.BADEGG_AUTO_BLOCK !== "0",
    autoBlockThreshold: thresholdOverride ?? RISK_PROFILES[riskMode].autoBlockThreshold,
    alertThreshold: RISK_PROFILES[riskMode].alertThreshold,
    banTtlSeconds: intOr(source?.BADEGG_BAN_TTL_SECONDS, 900, 30, 86_400),
    banForever: banNeverExpires,
    scanInputs: source?.BADEGG_SCAN_INPUTS !== "0",
    scanOutputs: source?.BADEGG_SCAN_OUTPUTS !== "0",
    scanOutputBodies: source?.BADEGG_SCAN_OUTPUT_BODIES === "1",
    scanPii: source?.BADEGG_SCAN_PII === "1",
    outputAction: ["alert", "redact", "block"].includes(source?.BADEGG_OUTPUT_ACTION)
      ? source.BADEGG_OUTPUT_ACTION
      : "redact",
    maxScanChars: intOr(source?.BADEGG_MAX_SCAN_CHARS, DEFAULT_MAX_SCAN_CHARS, 1024, 5_000_000),
    maxGatewayBodyBytes: intOr(
      source?.BADEGG_MAX_BODY_BYTES,
      DEFAULT_MAX_GATEWAY_BODY_BYTES,
      1024,
      MAX_UNINSPECTED_REQUEST_BYTES
    ),
    rateLimitEnabled: source?.BADEGG_RATE_LIMIT !== "0",
    rateLimitRequests: intOr(source?.BADEGG_RATE_LIMIT_REQUESTS, 180, 1, 100_000),
    rateLimitWindowSeconds: intOr(source?.BADEGG_RATE_LIMIT_WINDOW_S, 60, 1, 3600),
    rateLimitBurst: intOr(source?.BADEGG_RATE_LIMIT_BURST, 60, 1, 10_000),
    rateLimitAction: source?.BADEGG_RATE_LIMIT_ACTION === "throttle" ? "throttle" : "ban",
    rateLimitBanAfter: intOr(source?.BADEGG_RATE_LIMIT_BAN_AFTER, 10, 1, 1000),
    maxConcurrentRequests: intOr(
      source?.BADEGG_MAX_CONCURRENT,
      DEFAULT_MAX_CONCURRENT_REQUESTS,
      1,
      4096
    ),
    // An array rather than a Set: like the ban list, an entry can be a single
    // address or a CIDR, so matching is done by `matchIpList` at the gateway.
    allowlist: ["127.0.0.1", "::1", ...extraAllow],
    // Raw, lowercased IP/CIDR entries. Matching happens in the gateway, which
    // already owns the IPv4/IPv6 parsers.
    banAlways,
    categoryActions: resolveCategoryActions(source?.BADEGG_CATEGORY_ACTIONS ?? "{}"),
    abuseIpdbEnabled: BOOLEAN_TRUE.has(
      String(source?.BADEGG_ABUSEIPDB_ENABLED || "0").trim().toLowerCase()
    ),
    abuseIpdbCooldownSeconds: intOr(source?.BADEGG_ABUSEIPDB_COOLDOWN_S, 3600, 900, 604_800),
  };
}

/**
 * The settings as an env-shaped view: every key present, canonical strings only.
 *
 * This is what the dashboard diffs against the live gateway, and what
 * "copy as wrangler vars" emits, so an operator can promote a dashboard config
 * into `wrangler.jsonc` and stop using KV at all.
 */
export function configEnvView(env = {}, overrides = null) {
  const merged = overrides && typeof overrides === "object" ? { ...env, ...overrides } : env || {};
  const view = {};
  for (const field of CONFIG_SCHEMA) {
    const raw = merged?.[field.key];
    const value = raw === undefined || raw === null ? field.default : String(raw);
    const normalized = normalizeConfigValue(field, value);
    view[field.key] = normalized.error ? field.default : normalized.value;
  }
  return view;
}

/** Keys whose value differs from the schema default, for a compact diff. */
export function changedConfigKeys(values = {}) {
  return Object.entries(values)
    .filter(([key, value]) => key in CONFIG_DEFAULTS && String(value) !== CONFIG_DEFAULTS[key])
    .map(([key]) => key);
}

/** One-line human summary of a resolved config, used in status output and the UI. */
export function summarizeConfig(config) {
  const rate = config.rateLimitEnabled
    ? `${config.rateLimitRequests}/${config.rateLimitWindowSeconds}s burst ${config.rateLimitBurst}`
    : "off";
  const bans = config.banForever ? "forever" : `${config.banTtlSeconds}s`;
  return `${config.enforcementMode} · ${config.riskMode} · rate limit ${rate} · bans ${bans}`;
}
