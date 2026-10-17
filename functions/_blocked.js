/**
 * Shared IP-gate logic and the themed blocked page.
 *
 * Used by both the Pages site (functions/_middleware.js) and the worker
 * mirror (worker.js), so blocked visitors get the same page everywhere.
 *
 * The blocklist is hall-of-shame.json in the idi-assets repo:
 *   https://gitlab.com/international-duck-incorporated/idi-assets/-/blob/main/hall-of-shame.json
 *
 * Two things are read from it, both without parsing the whole document:
 *   1. blockedIps      - exact IPs, matched by text scan of just that array.
 *   2. threatIntelSources - the live keyless feeds listed there (currently
 *      IPsum L1, blocklist.de, CI Army, Spamhaus DROP, FireHOL L1+L2,
 *      ET compromised, GreenSnow, ET fwip, Binary Defense, DShield) are
 *      fetched and merged into one compact index: sorted exact IPv4,
 *      CIDR/range networks (binary search), and exact IPv6.
 *      Feeds that only list ASNs (Spamhaus ASN-DROP) are skipped - they
 *      cannot be matched without an ASN-to-prefix map.
 * Other arrays (such as candidateIps) are not blocked by themselves, but
 * an IP listed in a live feed is blocked regardless of that status.
 *
 * Refreshing: hall-of-shame.json every ~5 minutes, threat feeds every ~3
 * hours. Once loaded, refreshes happen in the background (waitUntil) so
 * visitors never wait; a cold isolate briefly waits (up to ~2s) for the
 * first index so blocking starts immediately. If a fetch fails, the last
 * good data keeps working and the site stays open: blocking never takes
 * the whole site down.
 *
 * EXTRA_BLOCKED_IPS: manual entries for emergencies or while GitLab is
 * unreachable; merged with the remote list.
 *
 * To preview the blocked page from a normal connection, append
 * ?blocked-preview=1 to any URL on the site. Loopback requests (local
 * wrangler dev) are never blocked.
 */

export const LIST_URL =
  "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/main/hall-of-shame.json?ref_type=heads";

const EXTRA_BLOCKED_IPS = [];

const JSON_TTL_MS = 5 * 60 * 1000;
const JSON_RETRY_MS = 60 * 1000;
const INTEL_TTL_MS = 3 * 60 * 60 * 1000;
const INTEL_RETRY_MS = 10 * 60 * 1000;
const INTEL_COLD_WAIT_MS = 2000;
const JSON_TIMEOUT_MS = 5000;
const FEED_TIMEOUT_MS = 10000;
const MAX_FEEDS = 24;
const CONTACT_EMAIL = "0xffshell@duck.com";
const FEED_UA = "IDI-IP-Gate/1.0 (+https://idi-official.pages.dev)";

// hall-of-shame.json cache (blockedIps text + the feed URLs to use).
let jsonCache = { section: "", feedUrls: [], loaded: false, nextRefreshAt: 0 };
let jsonInflight = null;

// Merged threat-intel index. Rebuilt when the feed URL set changes or the
// TTL lapses; on failure the previous index keeps serving (nextAttemptAt
// spaces out retries so a dead feed cannot get hammered).
let intel = { data: null, urlsKey: "", attemptedKey: "", nextAttemptAt: 0 };
let intelInflight = null;

const EMPTY_INTEL = {
  v4: new Uint32Array(0),
  starts: new Uint32Array(0),
  maxEnds: new Uint32Array(0),
  v6: new Set(),
};

const normalizeIp = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pull out the text of the "blockedIps" array without parsing the whole
 * document. Stops at the array's closing bracket so other fields
 * (candidateIps and friends) can never leak into the blocklist.
 */
export function blockedSectionFrom(text) {
  const key = text.indexOf('"blockedIps"');
  if (key === -1) return "";
  const start = text.indexOf("[", key);
  if (start === -1) return "";
  const end = text.indexOf("]", start);
  if (end === -1) return "";
  return text.slice(start + 1, end).toLowerCase();
}

/**
 * Collect the feed URLs from the "threatIntelSources" section. ASN-only
 * feeds (asndrop) are skipped, non-HTTPS and duplicates are dropped.
 */
export function sourceUrlsFrom(text) {
  const key = text.indexOf('"threatIntelSources"');
  if (key === -1) return [];
  const urls = [];
  const seen = new Set();
  for (const match of text.slice(key).matchAll(/"url"\s*:\s*"([^"]+)"/g)) {
    const url = match[1];
    if (!/^https:\/\//i.test(url)) continue;
    if (/asndrop/i.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
    if (urls.length >= MAX_FEEDS) break;
  }
  return urls;
}

const ipToU32 = (value) => {
  const s = String(value).trim();
  const parts = s.split(".");
  if (parts.length !== 4) return null;
  const a = +parts[0], b = +parts[1], c = +parts[2], d = +parts[3];
  if (!(a >= 0 && a <= 255 && b >= 0 && b <= 255 && c >= 0 && c <= 255 && d >= 0 && d <= 255)) return null;
  return (((a << 24) >>> 0) + (b << 16) + (c << 8) + d) >>> 0;
};

/**
 * Parse one feed's text. Handles plain IPs, CIDR lines ("a.b.c.d/n"),
 * comments ("#" anywhere), and the DShield two-column start/end format.
 */
function parseFeedText(text, isRangeList) {
  const v4 = [];
  const ranges = [];
  const v6 = [];
  for (const raw of text.split("\n")) {
    const hash = raw.indexOf("#");
    const line = (hash === -1 ? raw : raw.slice(0, hash)).trim();
    if (!line) continue;
    if (isRangeList) {
      const [a, b] = line.split(/\s+/);
      const start = ipToU32(a);
      const end = ipToU32(b);
      if (start !== null && end !== null && start <= end) ranges.push([start, end]);
      continue;
    }
    if (line.includes("/")) {
      const slash = line.indexOf("/");
      const base = ipToU32(line.slice(0, slash));
      const bits = Number(line.slice(slash + 1).trim().split(/\s+/)[0]);
      if (base === null || !Number.isInteger(bits) || bits < 0 || bits > 32) continue;
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      const start = (base & mask) >>> 0;
      ranges.push([start, (start | (~mask >>> 0)) >>> 0]);
      continue;
    }
    if (line.includes(":")) {
      v6.push(line.toLowerCase());
      continue;
    }
    const value = ipToU32(line);
    if (value !== null) v4.push(value);
  }
  return { v4, ranges, v6 };
}

async function fetchFeed(url) {
  const res = await fetch(url, {
    headers: { "user-agent": FEED_UA, accept: "text/plain, */*" },
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 1800 },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return parseFeedText(await res.text(), /dshield/i.test(url));
}

async function buildIntel(urls) {
  const results = await Promise.allSettled(urls.map((url) => fetchFeed(url)));
  const v4Chunks = [];
  const ranges = [];
  const v6 = new Set();
  let ok = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") {
      failed++;
      continue;
    }
    ok++;
    v4Chunks.push(result.value.v4);
    for (const range of result.value.ranges) ranges.push(range);
    for (const address of result.value.v6) v6.add(address);
  }
  if (ok === 0 && urls.length > 0) throw new Error("all threat intel feeds failed");
  if (failed) console.warn(`[ip-gate] ${failed} of ${urls.length} threat feeds failed; using the rest`);

  let total = 0;
  for (const chunk of v4Chunks) total += chunk.length;
  const v4 = new Uint32Array(total);
  let offset = 0;
  for (const chunk of v4Chunks) {
    v4.set(chunk, offset);
    offset += chunk.length;
  }
  v4.sort();

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const starts = new Uint32Array(ranges.length);
  const maxEnds = new Uint32Array(ranges.length);
  let running = 0;
  for (let i = 0; i < ranges.length; i++) {
    starts[i] = ranges[i][0];
    if (ranges[i][1] > running) running = ranges[i][1];
    maxEnds[i] = running;
  }
  return { v4, starts, maxEnds, v6 };
}

async function loadJson() {
  const res = await fetch(LIST_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(JSON_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`blocklist fetch failed: ${res.status}`);
  const text = await res.text();
  return { section: blockedSectionFrom(text), feedUrls: sourceUrlsFrom(text) };
}

function refreshJson() {
  if (!jsonInflight) {
    jsonInflight = loadJson()
      .then(({ section, feedUrls }) => {
        jsonCache = { section, feedUrls, loaded: true, nextRefreshAt: Date.now() + JSON_TTL_MS };
      })
      .catch(() => {
        // Keep the last good data (empty only on a cold start) and retry
        // shortly instead of failing loudly on every request.
        jsonCache = { ...jsonCache, nextRefreshAt: Date.now() + JSON_RETRY_MS };
      })
      .finally(() => {
        jsonInflight = null;
      });
  }
  return jsonInflight;
}

function refreshIntel(urls, urlsKey) {
  intel.attemptedKey = urlsKey;
  if (!intelInflight) {
    const run = urls.length ? buildIntel(urls) : Promise.resolve(EMPTY_INTEL);
    intelInflight = run
      .then((data) => {
        intel = { data, urlsKey, attemptedKey: urlsKey, nextAttemptAt: Date.now() + INTEL_TTL_MS };
      })
      .catch(() => {
        // Keep the previous index; retry after INTEL_RETRY_MS.
        intel.nextAttemptAt = Date.now() + INTEL_RETRY_MS;
      })
      .finally(() => {
        intelInflight = null;
      });
  }
  return intelInflight;
}

export function getClientIp(request) {
  return (request.headers.get("CF-Connecting-IP") || "").trim().toLowerCase();
}

export function isPreview(request) {
  return new URL(request.url).searchParams.has("blocked-preview");
}

function inV4Index(data, ip) {
  const value = ipToU32(ip);
  if (value === null) return false;
  const v4 = data.v4;
  let lo = 0;
  let hi = v4.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const v = v4[mid];
    if (v === value) return true;
    if (v < value) lo = mid + 1;
    else hi = mid - 1;
  }
  // Range/network check: any network that starts at or below the IP must
  // have one whose end reaches it (maxEnds is a running max of ends).
  const starts = data.starts;
  lo = 0;
  hi = starts.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= value) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return idx >= 0 && data.maxEnds[idx] >= value;
}

/**
 * @param {string} ip lowercase client IP
 * @param {(promise: Promise<unknown>) => void} [waitUntil] keeps background
 *   refreshes alive past the response; when omitted they are awaited.
 */
export async function isBlockedIp(ip, waitUntil) {
  // Loopback (local wrangler dev) is never blocked.
  if (ip === "127.0.0.1" || ip === "::1") return false;

  if (Date.now() >= jsonCache.nextRefreshAt) {
    const refreshing = refreshJson();
    if (jsonCache.loaded) {
      if (waitUntil) waitUntil(refreshing);
      else await refreshing;
    } else {
      await refreshing;
    }
  }

  const urls = jsonCache.feedUrls;
  const urlsKey = urls.join("|");
  const sameKey = Boolean(intel.data) && intel.urlsKey === urlsKey;
  const due = Date.now() >= intel.nextAttemptAt;
  const shouldBuild = (!sameKey && (intel.attemptedKey !== urlsKey || due)) || (sameKey && due);
  if (shouldBuild) {
    const building = refreshIntel(urls, urlsKey);
    if (intel.data && waitUntil) waitUntil(building);
    else if (intel.data) await building;
    else if (waitUntil) {
      waitUntil(building);
      await Promise.race([building, sleep(INTEL_COLD_WAIT_MS)]);
    } else {
      await building;
    }
  }

  if (jsonCache.section.includes(`"${ip}"`)) return true;
  const data = intel.data;
  if (data) {
    if (ip.includes(":")) {
      if (data.v6.has(ip)) return true;
    } else if (inV4Index(data, ip)) {
      return true;
    }
  }
  return EXTRA_BLOCKED_IPS.some((entry) => normalizeIp(entry) === ip);
}

const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]
  );

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
