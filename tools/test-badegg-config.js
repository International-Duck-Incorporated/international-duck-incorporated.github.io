/**
 * Tests for the BadEgg v3 configuration surface: the shared schema, the runtime
 * KV overrides, and the token-gated config API.
 *
 * Run with:  node --test tools/test-badegg-config.js
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CONFIG_DEFAULTS,
  CONFIG_KEYS,
  CONFIG_SCHEMA,
  configEnvView,
  normalizeConfigValue,
  resolveConfig,
  sanitizeConfigOverrides,
} from "../badegg-config.js";

import {
  addTemporaryBan,
  getActiveTemporaryBan,
  handleBadEggRequest,
  resetBadEggV3State,
  resetConfigApiState,
} from "../functions/_badegg.js";

const blocklistFixture = {schema:2, block:{v4:{ips:Array.from({length:1000},(_,i)=>`10.${Math.floor(i/256)}.${i%256}.1`), nets:Array.from({length:100},(_,i)=>`198.18.${i}.0/24`)},v6:{ips:[],nets:["2001:db8:aaaa::/48"]}}, counts:{v4Ips:1000,v4Nets:100,v6Ips:0,v6Nets:1}};
globalThis.fetch = async url => String(url).includes(".bin") ? new Response("no binary",{status:503}) : new Response(JSON.stringify(blocklistFixture),{headers:{"content-type":"application/json"}});
const TOKEN = "test-token-at-least-16-chars";

function makeKv() {
  const store = new Map();
  return {
    store,
    async get(key, options = {}) {
      if (!store.has(key)) return null;
      const value = store.get(key);
      return options.type === "json" ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async list({prefix = ""} = {}) {
      return {keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({name})), list_complete:true};
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

function makeEnv(overrides = {}) {
  return { IDI_BADEGG: makeKv(), BADEGG_ADMIN_TOKEN: TOKEN, ...overrides };
}

/** Call the gateway the way the middleware does, with a static asset behind it. */
async function call(env, path, init = {}) {
  const request = new Request(`https://idi.test${path}`, {
    ...init,
    headers: { "cf-connecting-ip": "203.0.113.9", ...(init.headers || {}) },
  });
  return handleBadEggRequest(request, env, { waitUntil: () => {} }, () =>
    Promise.resolve(new Response("ok", { headers: { "content-type": "text/html" } }))
  );
}

test("every schema entry is well formed and unique", () => {
  assert.ok(CONFIG_SCHEMA.length >= 18);
  assert.equal(new Set(CONFIG_KEYS).size, CONFIG_KEYS.length);
  for (const field of CONFIG_SCHEMA) {
    assert.match(field.key, /^BADEGG_[A-Z_]+$/, field.key);
    assert.ok(
      ["enforcement", "rateLimit", "inspection", "limits"].includes(field.group),
      field.group
    );
    assert.ok(field.label && field.help, `${field.key} needs a label and help text`);
    if (field.type === "select") {
      assert.ok(
        field.options.some((option) => option.value === field.default),
        field.key
      );
    }
    if (field.type === "number") {
      assert.ok(Number.isFinite(field.min) && Number.isFinite(field.max), field.key);
      assert.ok(field.min < field.max, field.key);
    }
  }
});

test("schema defaults reproduce the shipped policy", () => {
  const fromNothing = resolveConfig({});
  const fromDefaults = resolveConfig(CONFIG_DEFAULTS);
  const strip = (config) => ({ ...config, allowlist: [...config.allowlist].sort() });
  assert.deepEqual(strip(fromDefaults), strip(fromNothing));
  assert.equal(fromDefaults.enforcementMode, "enforce");
  assert.equal(fromDefaults.riskMode, "minimize_false_bans");
  assert.equal(fromDefaults.autoBlockThreshold, 0.97);
  assert.equal(fromDefaults.rateLimitRequests, 180);
  assert.equal(fromDefaults.banTtlSeconds, 900);
});

test("normalizeConfigValue clamps, validates and canonicalises", () => {
  const ttl = CONFIG_SCHEMA.find((field) => field.key === "BADEGG_BAN_TTL_SECONDS");
  assert.deepEqual(normalizeConfigValue(ttl, "60"), { value: "60" });
  assert.deepEqual(normalizeConfigValue(ttl, "999999"), { value: "86400" });
  assert.deepEqual(normalizeConfigValue(ttl, "1"), { value: "30" });
  assert.match(normalizeConfigValue(ttl, "soon").error, /number/);

  const mode = CONFIG_SCHEMA.find((field) => field.key === "BADEGG_MODE");
  assert.deepEqual(normalizeConfigValue(mode, "monitor"), { value: "monitor" });
  assert.match(normalizeConfigValue(mode, "off").error, /Expected one of/);

  const toggle = CONFIG_SCHEMA.find((field) => field.key === "BADEGG_RATE_LIMIT");
  assert.deepEqual(normalizeConfigValue(toggle, "off"), { value: "0" });
  assert.deepEqual(normalizeConfigValue(toggle, true), { value: "1" });

  const threshold = CONFIG_SCHEMA.find((field) => field.key === "BADEGG_AUTO_BLOCK_THRESHOLD");
  assert.deepEqual(normalizeConfigValue(threshold, ""), { value: "" });
  assert.deepEqual(normalizeConfigValue(threshold, "0.935"), { value: "0.94" });

  const allowlist = CONFIG_SCHEMA.find((field) => field.key === "BADEGG_ALLOWLIST");
  assert.deepEqual(normalizeConfigValue(allowlist, "10.0.0.1, 2001:db8::/32"), {
    value: "10.0.0.1, 2001:db8::/32",
  });
  assert.match(normalizeConfigValue(allowlist, "not-an-ip").error, /not an IP/);
});

test("sanitizeConfigOverrides drops unknown keys instead of guessing", () => {
  const { values, errors } = sanitizeConfigOverrides({
    BADEGG_MODE: "monitor",
    BADEGG_FUTURE_KNOB: "1",
    BADEGG_RATE_LIMIT_REQUESTS: "45",
  });
  assert.deepEqual(values, { BADEGG_MODE: "monitor", BADEGG_RATE_LIMIT_REQUESTS: "45" });
  assert.deepEqual(
    errors.map((error) => error.key),
    ["BADEGG_FUTURE_KNOB"]
  );
  assert.deepEqual(sanitizeConfigOverrides("nope").values, {});
});

test("configEnvView always returns every key, canonical", () => {
  const view = configEnvView({ BADEGG_MODE: "monitor" }, { BADEGG_MAX_CONCURRENT: "999999" });
  assert.deepEqual(Object.keys(view).sort(), [...CONFIG_KEYS].sort());
  assert.equal(view.BADEGG_MODE, "monitor");
  assert.equal(view.BADEGG_MAX_CONCURRENT, "4096");
  assert.equal(view.BADEGG_ALLOWLIST, "");
});

test("KV overrides win over the environment, and clearing them restores it", async () => {
  resetBadEggV3State();
  resetConfigApiState();
  const env = makeEnv({ BADEGG_RATE_LIMIT_REQUESTS: "300" });

  const before = await (
    await call(env, "/?badegg-status=1", { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.equal(before.rateLimit.requests, 300);
  assert.equal(before.config.storage, "kv", "a bound namespace is writable even when empty");
  assert.deepEqual(before.config.overrides, {});

  const saved = await call(env, "/api/badegg/config", {
    method: "PUT",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      overrides: { BADEGG_RATE_LIMIT_REQUESTS: "42", BADEGG_MODE: "monitor" },
    }),
  });
  assert.equal(saved.status, 200);
  const savedBody = await saved.json();
  assert.equal(savedBody.applied, true);
  assert.equal(savedBody.revision, 1);

  const during = await (
    await call(env, "/?badegg-status=1", { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.equal(during.rateLimit.requests, 42);
  assert.equal(during.mode, "monitor");
  assert.equal(during.config.storage, "kv");
  assert.deepEqual(during.config.overrides, {
    BADEGG_RATE_LIMIT_REQUESTS: "42",
    BADEGG_MODE: "monitor",
  });

  const cleared = await call(env, "/api/badegg/config", {
    method: "DELETE",
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(cleared.status, 200);

  const after = await (
    await call(env, "/?badegg-status=1", { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.equal(after.rateLimit.requests, 300, "env baseline is back in force");
  assert.equal(after.mode, "enforce");
  assert.deepEqual(after.config.overrides, {});
});

test("the config API rejects bad tokens, bad bodies and missing KV", async () => {
  resetConfigApiState();
  const env = makeEnv();

  assert.equal((await call(env, "/api/badegg/config")).status, 401);
  assert.equal(
    (
      await call(env, "/api/badegg/config", {
        headers: { authorization: "Bearer wrong-token-wrong-token" },
      })
    ).status,
    401,
    "a wrong token is not accepted"
  );

  const invalid = await call(env, "/api/badegg/config", {
    method: "PUT",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ overrides: { BADEGG_MODE: "chaos" } }),
  });
  assert.equal(invalid.status, 422);
  const invalidBody = await invalid.json();
  assert.equal(invalidBody.errors[0].key, "BADEGG_MODE");
  assert.deepEqual(env.IDI_BADEGG.store.size, 0, "a rejected write stores nothing");

  const noKv = makeEnv({ IDI_BADEGG: undefined });
  assert.equal(
    (
      await call(noKv, "/api/badegg/config", {
        method: "PUT",
        headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
        body: JSON.stringify({ overrides: { BADEGG_MODE: "monitor" } }),
      })
    ).status,
    503
  );

  const noSecret = makeEnv({ BADEGG_ADMIN_TOKEN: undefined });
  assert.equal(
    (await call(noSecret, "/api/badegg/config", { headers: { authorization: `Bearer ${TOKEN}` } }))
      .status,
    503,
    "without a configured secret the endpoint stays shut"
  );

  const shortSecret = makeEnv({ BADEGG_ADMIN_TOKEN: "short" });
  assert.equal(
    (await call(shortSecret, "/api/badegg/config", { headers: { authorization: "Bearer short" } }))
      .status,
    503,
    "a short secret is refused rather than trusted"
  );
});

test("repeated bad tokens are throttled per isolate", async () => {
  resetConfigApiState();
  const env = makeEnv();
  let last = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    last = await call(env, "/api/badegg/config", {
      headers: { authorization: "Bearer nope-nope-nope-nope" },
    });
  }
  assert.equal(last.status, 429);
  assert.ok(last.headers.get("retry-after"));
});

test("a tampered KV record cannot inject settings the gateway does not know", async () => {
  resetConfigApiState();
  const env = makeEnv();
  await env.IDI_BADEGG.put(
    "badegg:v3:config",
    JSON.stringify({
      values: { BADEGG_MODE: "monitor", BADEGG_NOT_REAL: "1", BADEGG_BAN_TTL_SECONDS: 10 },
      revision: 7,
    })
  );
  const status = await (
    await call(env, "/?badegg-status=1", { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.equal(status.mode, "monitor");
  assert.equal(status.waf.banTtlSeconds, 30, "out-of-range values are clamped, not trusted");
  assert.deepEqual(Object.keys(status.config.overrides), ["BADEGG_MODE", "BADEGG_BAN_TTL_SECONDS"]);
  assert.equal(status.config.revision, 7);
});

test("static asset bodies are never body-scanned, pages and JSON still are", async () => {
  const { isScannableOutputBody } = await import("../functions/_badegg.js");
  assert.equal(isScannableOutputBody("/badegg-config.js", "text/javascript; charset=utf-8"), false);
  assert.equal(isScannableOutputBody("/css/bundle.css", "text/css"), false);
  assert.equal(isScannableOutputBody("/assets/x.webp", "image/webp"), false);
  assert.equal(isScannableOutputBody("/projects/badegg", "text/html; charset=utf-8"), true);
  assert.equal(isScannableOutputBody("/api/badegg/config", "application/json"), true);
});

test("no page on the site trips the strictest output profile", async () => {
  // The dashboard offers `block` + response-body scanning, which is the most
  // aggressive combination available. If a rule fires on our own copy (as
  // "session: eating, sorting..." once did), turning that on takes the site
  // down, so every page is checked here instead of in production.
  const { scanText } = await import("../functions/_badegg.js");
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const config = resolveConfig({
    BADEGG_OUTPUT_ACTION: "block",
    BADEGG_SCAN_OUTPUT_BODIES: "1",
    BADEGG_RISK_MODE: "catch_more",
  });

  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html")) pages.push(full);
    }
  };
  walk(root);
  assert.ok(pages.length > 20, `expected to find the site pages, found ${pages.length}`);

  const flagged = pages
    .map((file) => {
      const text = fs.readFileSync(file, "utf8");
      const result = scanText({ direction: "output", text, live: true, config });
      const categories = (result.findings || []).map((finding) => finding.category);
      // Anything other than a clean scan means the page would be blocked or
      // redacted in production.
      const blocked = !["clean", "allow", "observed"].includes(result.decision);
      return blocked ? `${path.relative(root, file)}: ${categories.join(", ")}` : null;
    })
    .filter(Boolean);
  assert.deepEqual(flagged, []);
});

test("list settings accept CIDRs and reject malformed entries", async () => {
  const fields = Object.fromEntries(CONFIG_SCHEMA.map((spec) => [spec.key, spec]));
  const check = (key, value) => normalizeConfigValue(fields[key], value);

  for (const key of ["BADEGG_ALLOWLIST", "BADEGG_BAN_ALWAYS"]) {
    assert.deepEqual(check(key, "192.0.2.0/24, 2001:db8::/32"), {
      value: "192.0.2.0/24, 2001:db8::/32",
    });
    assert.deepEqual(check(key, "203.0.113.7"), { value: "203.0.113.7" });
    assert.ok(check(key, "192.0.2.0/33").error, "an IPv4 prefix over 32 is refused");
    assert.ok(check(key, "2001:db8::/129").error, "an IPv6 prefix over 128 is refused");
    assert.ok(check(key, "not-an-ip").error);
    assert.ok(check(key, "192.0.2.0/-1").error);
  }
});

test("the allowlist matches CIDRs, not just exact addresses", async () => {
  resetBadEggV3State();
  resetConfigApiState();
  const env = makeEnv({ BADEGG_ALLOWLIST: "192.0.2.0/24, 2001:db8::/32" });

  // An address inside an allowed range skips the blocklist and rate limiter.
  for (const ip of ["192.0.2.9", "192.0.2.200", "2001:db8:ff::1"]) {
    const response = await call(env, "/", { headers: { "cf-connecting-ip": ip } });
    assert.equal(response.status, 200, `${ip} is allowlisted`);
  }

  // An address outside every range is not.
  const outside = await call(env, "/", { headers: { "cf-connecting-ip": "192.0.3.9" } });
  assert.equal(outside.status, 200, "not blocked, but not allowlisted either");

  // The dashboard config API still reports the list as text.
  const config = await (
    await call(env, "/api/badegg/config", {
      headers: { authorization: `Bearer ${TOKEN}` },
    })
  ).json();
  assert.equal(config.effective.BADEGG_ALLOWLIST, "192.0.2.0/24, 2001:db8::/32");
});

test("the status endpoint now requires the console credentials", async () => {
  resetConfigApiState();
  const env = makeEnv();
  const anonymous = await call(env, "/?badegg-status=1");
  assert.equal(anonymous.status, 401);
  const withToken = await call(env, "/?badegg-status=1", {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(withToken.status, 200);
});

test("signing in sets a session cookie that unlocks the operator endpoints", async () => {
  resetConfigApiState();
  const env = makeEnv();

  // A wrong password is refused.
  const bad = await call(env, "/api/badegg/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong-wrong-wrong-wrong" }),
  });
  assert.equal(bad.status, 401);
  assert.equal((await bad.json()).error, "invalid_password");

  // The right password issues an HttpOnly session cookie.
  const good = await call(env, "/api/badegg/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: TOKEN }),
  });
  assert.equal(good.status, 200);
  const issued = good.headers.get("set-cookie") || "";
  assert.match(issued, /badegg_session=/);
  assert.match(issued, /HttpOnly/i);
  assert.match(issued, /SameSite=Strict/i);
  const cookie = issued.split(";")[0];

  // The session probe accepts it.
  const session = await call(env, "/api/badegg/session", { headers: { cookie } });
  assert.equal(session.status, 200);
  assert.equal((await session.json()).authenticated, true);

  // The config API works off the cookie alone, with no bearer header.
  const config = await call(env, "/api/badegg/config", { headers: { cookie } });
  assert.equal(config.status, 200);

  // A tampered signature is not accepted.
  const tampered = cookie.replace(/[^.]+$/, "deadbeef");
  const denied = await call(env, "/api/badegg/config", { headers: { cookie: tampered } });
  assert.equal(denied.status, 401);

  // An expired session is not accepted either.
  const expired = `1.abc.${cookie.split(".")[2]}`;
  const expiredDenied = await call(env, "/api/badegg/config", { headers: { cookie: expired } });
  assert.equal(expiredDenied.status, 401);

  // Logout clears the cookie.
  const out = await call(env, "/api/badegg/logout", { method: "POST", headers: { cookie } });
  assert.equal(out.status, 200);
  assert.match(out.headers.get("set-cookie") || "", /Max-Age=0/);
});

test("login is refused when the admin secret is not configured", async () => {
  resetConfigApiState();
  const env = makeEnv({ BADEGG_ADMIN_TOKEN: undefined });
  const response = await call(env, "/api/badegg/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "anything" }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "admin_token_not_configured");
});

test("the ban always list blocks matching IPs in every mode", async () => {
  resetBadEggV3State();
  resetConfigApiState();
  const env = makeEnv({ BADEGG_BAN_ALWAYS: "203.0.113.7, 192.0.2.0/24, 2001:db8::/32" });

  const exact = await call(env, "/", { headers: { "cf-connecting-ip": "203.0.113.7" } });
  assert.equal(exact.status, 403, "an exact entry is blocked");

  const inNet = await call(env, "/", { headers: { "cf-connecting-ip": "192.0.2.200" } });
  assert.equal(inNet.status, 403, "an IPv4 CIDR is matched");

  const outside = await call(env, "/", { headers: { "cf-connecting-ip": "192.0.3.200" } });
  assert.equal(outside.status, 200, "an address outside the range is not");

  const v6 = await call(env, "/", { headers: { "cf-connecting-ip": "2001:db8:dead:beef::1" } });
  assert.equal(v6.status, 403, "an IPv6 CIDR is matched");

  const v6Outside = await call(env, "/", { headers: { "cf-connecting-ip": "2001:db9::1" } });
  assert.equal(v6Outside.status, 200);

  // It blocks in monitor mode too: "always" means always.
  const monitorEnv = makeEnv({ BADEGG_MODE: "monitor", BADEGG_BAN_ALWAYS: "203.0.113.7" });
  const monitorBlocked = await call(monitorEnv, "/", {
    headers: { "cf-connecting-ip": "203.0.113.7" },
  });
  assert.equal(monitorBlocked.status, 403);

  // The allowlist does not rescue an address on the ban list.
  const both = makeEnv({
    BADEGG_ALLOWLIST: "203.0.113.7",
    BADEGG_BAN_ALWAYS: "203.0.113.7",
  });
  const stillBlocked = await call(both, "/", { headers: { "cf-connecting-ip": "203.0.113.7" } });
  assert.equal(stillBlocked.status, 403, "ban always wins over the allowlist");

  // The operator endpoints stay reachable from a banned address, so a ban
  // cannot lock the console out of its own fix.
  const stillOpen = await call(env, "/api/badegg/config", {
    headers: { "cf-connecting-ip": "203.0.113.7", authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(stillOpen.status, 200, "the config API answers from a banned IP");
});

test("forever bans never expire and can be lifted from the console", async () => {
  resetBadEggV3State();
  resetConfigApiState();
  const env = makeEnv({ BADEGG_BAN_FOREVER: "1" });
  const config = resolveConfig(env);
  assert.equal(config.banForever, true);
  assert.equal(config.banTtlSeconds, 900, "the numeric TTL is still reported");

  const record = addTemporaryBan("203.0.113.50", ["waf_policy"], config, env, () => {});
  assert.equal(record.forever, true);
  assert.equal(record.expiresAtMs, null);
  assert.equal(record.ttlSeconds, null);

  // Still active long after any finite TTL would have lapsed.
  const still = await getActiveTemporaryBan("203.0.113.50", env);
  assert.ok(still, "a forever ban has no expiry to wait out");

  // A request from that address is refused.
  const blocked = await call(env, "/", { headers: { "cf-connecting-ip": "203.0.113.50" } });
  assert.equal(blocked.status, 403);

  // Status reports the mode, and the console lists the address.
  const status = await (
    await call(env, "/?badegg-status=1", { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.equal(status.waf.banForever, true);
  assert.equal(status.waf.activeTempBans, null, "status does not imply a fleet-wide ban count");

  const list = await (
    await call(env, "/api/badegg/bans", { headers: { authorization: `Bearer ${TOKEN}` } })
  ).json();
  assert.deepEqual(
    list.bans.map((ban) => ban.ip),
    ["203.0.113.50"]
  );
  assert.equal(list.bans[0].forever, true);

  // Lifting removes it, locally and from KV.
  const lift = await call(env, "/api/badegg/lift", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ ip: "203.0.113.50" }),
  });
  assert.equal(lift.status, 200);
  assert.equal((await lift.json()).existed, true);
  assert.equal(await getActiveTemporaryBan("203.0.113.50", env), null);
  assert.equal(env.IDI_BADEGG.store.has("badegg:v3:ban:203.0.113.50"), false);

  const after = await call(env, "/", { headers: { "cf-connecting-ip": "203.0.113.50" } });
  assert.equal(after.status, 200);
});

test("lifting a ban requires the console credentials", async () => {
  resetConfigApiState();
  const env = makeEnv();
  const config = resolveConfig(env);
  addTemporaryBan("203.0.113.60", ["waf_policy"], config, env, () => {});

  assert.equal((await call(env, "/api/badegg/bans")).status, 401);
  assert.equal(
    (
      await call(env, "/api/badegg/lift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ip: "203.0.113.60" }),
      })
    ).status,
    401
  );
  assert.ok(
    await getActiveTemporaryBan("203.0.113.60", env),
    "an unauthenticated call lifts nothing"
  );
});

test("lifting a ban clears the rate limiter's memory of the address", async () => {
  resetBadEggV3State();
  resetConfigApiState();
  const env = makeEnv({
    BADEGG_BAN_FOREVER: "0",
    BADEGG_RATE_LIMIT_REQUESTS: "1",
    BADEGG_RATE_LIMIT_BURST: "1",
    BADEGG_RATE_LIMIT_BAN_AFTER: "1",
  });

  // Two requests from a tight limit: the first passes, the second bans.
  const first = await call(env, "/", { headers: { "cf-connecting-ip": "203.0.113.80" } });
  assert.equal(first.status, 200);
  const second = await call(env, "/", { headers: { "cf-connecting-ip": "203.0.113.80" } });
  assert.equal(second.status, 403);

  // Lift it, and the address is let through again rather than re-banned.
  const lift = await call(env, "/api/badegg/lift", {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ ip: "203.0.113.80" }),
  });
  assert.equal(lift.status, 200);

  const third = await call(env, "/", { headers: { "cf-connecting-ip": "203.0.113.80" } });
  assert.equal(third.status, 200, "the lift is not undone by the old strikes");
});

test("a finite ban still expires on schedule", async () => {
  resetBadEggV3State();
  resetConfigApiState();
  const env = makeEnv({ BADEGG_BAN_FOREVER: "0", BADEGG_BAN_TTL_SECONDS: "30" });
  const config = resolveConfig(env);
  assert.equal(config.banForever, false);

  const record = addTemporaryBan("203.0.113.70", ["rate_limit"], config, env, () => {});
  assert.equal(record.forever, false);
  assert.equal(record.ttlSeconds, 30);
  assert.ok(record.expiresAtMs > Date.now());
  assert.ok(await getActiveTemporaryBan("203.0.113.70", env));
});

test("category actions and AbuseIPDB settings validate and canonicalise", () => {
  const clean = sanitizeConfigOverrides({
    BADEGG_CATEGORY_ACTIONS: JSON.stringify({
      sql_injection: { action: "strike_ban", reportAbuseIpdb: true },
      recon_path: "block",
    }),
    BADEGG_ABUSEIPDB_ENABLED: "true",
    BADEGG_ABUSEIPDB_COOLDOWN_S: "100", // clamps to 900s minimum
  });
  assert.equal(clean.errors.length, 0);
  assert.equal(clean.values.BADEGG_ABUSEIPDB_ENABLED, "1");
  assert.equal(clean.values.BADEGG_ABUSEIPDB_COOLDOWN_S, "900");
  const resolved = resolveConfig({}, clean.values);
  assert.equal(resolved.abuseIpdbEnabled, true);
  assert.equal(resolved.abuseIpdbCooldownSeconds, 900);
  assert.equal(resolved.categoryActions.sql_injection.effectiveAction, "strike_ban");
  assert.equal(resolved.categoryActions.recon_path.effectiveAction, "block");

  const bad = sanitizeConfigOverrides({
    BADEGG_CATEGORY_ACTIONS: JSON.stringify({ unknown_cat: "ban" }),
  });
  assert.equal(bad.errors.length, 1);
  assert.equal(bad.errors[0].key, "BADEGG_CATEGORY_ACTIONS");
});
