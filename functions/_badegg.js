/**
 * BadEgg v2 — schema-2 blocklist consumer.
 *
 * Replaces the schema-1 logic (2.6 MB text scan + 11 feeds fetched per isolate).
 * Reads the prebuilt `hall-of-shame.v2.bin` from idi-assets, keeps it in KV, and
 * answers a lookup in ~1 µs with no network I/O on the hot path.
 *
 * Why this file exists:
 *   - schema 1 compared the raw CF-Connecting-IP string against the raw feed
 *     string, so 2001:db8::1 never matched 2001:db8:0:0:0:0:0:1. IPv6 was
 *     unenforceable even when listed. Here every address is parsed to bytes and
 *     compared numerically.
 *   - schema 1 sliced text out of the document and trusted it. An HTML error
 *     page from GitLab silently emptied the list and opened the gate. Here the
 *     artifact is validated (magic, version, size, trailer, counts) and a bad
 *     payload never replaces a good index.
 *   - schema 1 made every request a Function invocation that could block for a
 *     cold fetch. Here the index is built once and refreshed in the background;
 *     visitors never wait and the site never goes down.
 *
 * Failure policy, in order: validate -> swap. On any doubt keep the index that
 * is already loaded. If there has never been a good index, allow the request
 * (a broken blocklist must not take the site offline) and retry shortly.
 *
 * Bindings: optional KV namespace `IDI_BADEGG`. Without it the module still works,
 * it just pays the cold fetch once per isolate.
 */

export const BIN_URL =
  "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/main/hall-of-shame.v2.bin?ref_type=heads";
export const JSON_URL =
  "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/main/hall-of-shame.v2.json?ref_type=heads";

const KV_KEY = "badegg:blocklist:v2";
const TTL_MS = 10 * 60 * 1000;          // how stale the in-isolate index may get
const RETRY_MS = 60 * 1000;             // backoff after a failed refresh
const KV_CACHE_TTL_S = 300;             // Cloudflare edge cache for the KV read
const COLD_WAIT_MS = 1500;              // max a cold request may block
const FETCH_TIMEOUT_MS = 8000;
const CONTACT_EMAIL = "0xffshell@duck.com";
const BIN_MAGIC = 0x49444932;           // "IDI2"
const BIN_VERSION = 2;
const MIN_V4_IPS = 1000;                // sanity floors; a truncated file fails them
const MIN_V4_NETS = 100;
const MIN_V6_NETS = 1;

/** Manual entries, always enforced. Keep empty unless something is urgent. */
const EXTRA_BLOCKED = [];

// ---------------------------------------------------------------- state
// One index per isolate. `source` is for ?badegg-status=1 only.
let state = { index: null, loadedAt: 0, source: null, nextAttemptAt: 0, lastError: null };
let inflight = null;

// ---------------------------------------------------------------- parsing
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

/** 8 x u16 -> 32-char lowercase hex. Lexicographic order == numeric order. */
function key6(groups) {
  let out = "";
  for (let i = 0; i < 8; i++) out += groups[i].toString(16).padStart(4, "0");
  return out;
}

/** 16 network-order bytes -> 32-char lowercase hex. */
function key6bytes(bytes, off) {
  let out = "";
  for (let i = 0; i < 16; i++) out += bytes[off + i].toString(16).padStart(2, "0");
  return out;
}

/** Dotted quad -> u32, or null. */
export function ipToU32(value) {
  if (typeof value !== "string" || !isV4(value)) return null;
  const p = value.split(".");
  const a = +p[0], b = +p[1], c = +p[2], d = +p[3];
  if (a > 255 || b > 255 || c > 255 || d > 255) return null;
  return ((a << 24) >>> 0) + (b << 16) + (c << 8) + d >>> 0;
}

// ---------------------------------------------------------------- index
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
  if (bytes[bytes.length - 4] !== 0x45 || bytes[bytes.length - 3] !== 0x4e ||
      bytes[bytes.length - 2] !== 0x44 || bytes[bytes.length - 1] !== 0x32) {
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

  return { v4Ips, v4Starts, v4Ends, v6Ips, v6Starts, v6Ends, counts: { v4Ips: n4, v4Nets: n4n, v6Ips: n6, v6Nets: n6n } };
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
  if (counts.v4Ips !== v4ips.length || counts.v4Nets !== v4nets.length ||
      counts.v6Ips !== v6ips.length || counts.v6Nets !== v6nets.length) {
    throw new Error("counts do not match arrays");
  }
  if (v4ips.length < MIN_V4_IPS || v4nets.length < MIN_V4_NETS || v6nets.length < MIN_V6_NETS) {
    throw new Error("implausible counts - truncated?");
  }

  const index = emptyIndex();
  index.v4Ips = new Uint32Array(v4ips.map((x) => ipToU32(x) ?? 0)).sort();
  const ranges = v4nets.map((cidr) => {
    const [addr, bits] = cidr.split("/");
    const start = ipToU32(addr);
    const size = 2 ** (32 - Number(bits));
    return [start, (start + size - 1) >>> 0];
  }).sort((a, b) => a[0] - b[0]);
  index.v4Starts = new Uint32Array(ranges.map((r) => r[0]));
  index.v4Ends = new Uint32Array(ranges.map((r) => r[1]));

  for (const ip of v6ips) {
    const g = parse6(ip);
    if (g) index.v6Ips.add(key6(g));
  }
  const v6 = v6nets.map((cidr) => {
    const [addr, bits] = cidr.split("/");
    const g = parse6(addr);
    if (!g) return null;
    const start = key6(g);
    const size = 128 - Number(bits);
    const end = new Array(8);
    for (let i = 0; i < 8; i++) end[i] = g[i];
    // fill the host bits with 1s
    for (let bit = 0; bit < size; bit++) {
      const fromEnd = bit;                        // 0 = last group
      const gi = 7 - Math.floor(fromEnd / 16);
      const shift = fromEnd % 16;
      end[gi] |= 1 << shift;
    }
    return [start, key6(end)];
  }).filter(Boolean).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  index.v6Starts = v6.map((r) => r[0]);
  index.v6Ends = v6.map((r) => r[1]);
  index.counts = { v4Ips: v4ips.length, v4Nets: v4nets.length, v6Ips: v6ips.length, v6Nets: v6nets.length };
  return index;
}

// ---------------------------------------------------------------- lookup
function inU32(sorted, value) {
  let lo = 0, hi = sorted.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = sorted[mid];
    if (v === value) return true;
    if (v < value) lo = mid + 1; else hi = mid - 1;
  }
  return false;
}

function inRanges(starts, ends, value) {
  let lo = 0, hi = starts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (value < starts[mid]) hi = mid - 1;
    else if (value > ends[mid]) lo = mid + 1;
    else return true;
  }
  return false;
}

/**
 * Decide whether an address is listed.
 * @returns {{blocked: boolean, reason?: string}}
 */
export function match(index, rawIp) {
  const ip = String(rawIp || "").trim().toLowerCase();
  if (!ip) return { blocked: false };

  if (ip.includes(":")) {
    const groups = parse6(ip);
    if (!groups) return { blocked: false, reason: "unparsable" };
    // IPv4-mapped (::ffff:a.b.c.d) is a v4 client; check it as one.
    if (groups[0] === 0 && groups[1] === 0 && groups[2] === 0 && groups[3] === 0 &&
        groups[4] === 0 && groups[5] === 0xffff) {
      const dotted = `${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`;
      const value = ipToU32(dotted);
      if (value !== null) {
        if (inU32(index.v4Ips, value)) return { blocked: true, reason: "v4-exact" };
        if (inRanges(index.v4Starts, index.v4Ends, value)) return { blocked: true, reason: "v4-net" };
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

// ---------------------------------------------------------------- loading
async function readKV(env, waitUntil) {
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
  // BIN first: smaller and zero-parse. JSON is the fallback and stays canonical.
  try {
    const buf = await fetchArtifact(BIN_URL, true);
    const index = binIndex(buf);
    if (env?.IDI_BADEGG && waitUntil) {
      waitUntil(env.IDI_BADEGG.put(KV_KEY, buf, { expirationTtl: 86400 }).catch(() => {}));
    }
    return { index, source: "network:bin" };
  } catch (binErr) {
    state.lastError = `bin: ${binErr.message}`;
  }
  const doc = await fetchArtifact(JSON_URL, false);
  return { index: jsonIndex(doc), source: "network:json" };
}

/**
 * Make sure an index is available.
 * @param {object} env           Worker env (may carry IDI_BADEGG)
 * @param {object} [options]     {waitUntil}
 * @returns {Promise<object|null>} index, or null when nothing could be loaded
 */
export async function ensureIndex(env, options = {}) {
  const waitUntil = options.waitUntil;
  const now = Date.now();

  if (state.index) {
    if (now >= state.loadedAt + TTL_MS && now >= state.nextAttemptAt) {
      const refresh = refreshIndex(env, waitUntil);
      if (waitUntil) waitUntil(refresh); else await refresh;
    }
    return state.index;
  }

  if (inflight) return inflight;
  if (now < state.nextAttemptAt) return null;

  const load = (async () => {
    // 1. KV: one fast read, no GitLab round trip.
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
    // 2. Network, bounded so a cold request cannot hang.
    const work = buildFromNetwork(env, waitUntil);
    if (waitUntil) {
      waitUntil(work.catch(() => {}));
      const raced = await Promise.race([
        work,
        new Promise((resolve) => setTimeout(() => resolve(null), COLD_WAIT_MS)),
      ]);
      if (!raced) return null;             // allowed; refresh lands in the background
      state = { index: raced.index, loadedAt: Date.now(), source: raced.source, nextAttemptAt: 0, lastError: null };
      return raced.index;
    }
    const { index, source } = await work;
    state = { index, loadedAt: Date.now(), source, nextAttemptAt: 0, lastError: null };
    return index;
  })()
    .catch((err) => {
      state.lastError = `load: ${err.message}`;
      state.nextAttemptAt = Date.now() + RETRY_MS;
      return null;                          // fail open, retry soon
    })
    .finally(() => { inflight = null; });

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
      // Keep the index already in memory; back off before trying again.
      state.lastError = `refresh: ${err.message}`;
      state.nextAttemptAt = Date.now() + RETRY_MS;
      return state.index;
    })
    .finally(() => { inflight = null; });
  inflight = run;
  return run;
}

/** Diagnostics for ?badegg-status=1. No addresses are exposed. */
export function badeggStatus() {
  return {
    loaded: Boolean(state.index),
    source: state.source,
    ageSeconds: state.index ? Math.round((Date.now() - state.loadedAt) / 1000) : null,
    counts: state.index ? state.index.counts : null,
    lastError: state.lastError,
  };
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
  if (ip === "127.0.0.1" || ip === "::1") return false;   // wrangler dev
  const index = await ensureIndex(env, options);
  if (!index) return false;                                // no data: stay open
  return match(index, ip).blocked;
}

// ---------------------------------------------------------------- response
const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

function blockedPage(ip) {
  const subject = encodeURIComponent("IP block appeal");
  const body = ip
    ? `&amp;body=${encodeURIComponent(`Hi team,\n\nMy IP address (${ip}) looks blocked on the site. Could you take a look?\n\nThanks!`)}`
    : "";
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}${body}`;
  const ipChip = ip ? `<p class="ip">Blocked IP <b>${escapeHtml(ip)}</b></p>\n    ` : "";
  return `<!doctype html>
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
    <p>Your IP address is on the site’s blocklist, so the site won’t load from this connection. If this is a mistake, email <a href="${mailto}">${CONTACT_EMAIL}</a> and we’ll take a look.</p>
    ${ipChip}<a class="btn" href="${mailto}"><svg viewBox="0 0 24 24"><path d="M3.5 5.5h17v13h-17z"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>Email the team</a>
  </main>
</body>
</html>`;
}

export function blockedResponse(ip) {
  return new Response(blockedPage(ip), {
    status: 403,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

export function statusResponse() {
  return new Response(JSON.stringify(badeggStatus(), null, 2), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
