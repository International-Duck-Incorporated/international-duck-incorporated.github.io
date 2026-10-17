/**
 * Shared IP-gate logic and the themed blocked page.
 *
 * Used by both the Pages site (functions/_middleware.js) and the worker
 * mirror (worker.js), so blocked visitors get the same page everywhere.
 *
 * The blocklist is hall-of-shame.json in the idi-assets repo:
 *   https://gitlab.com/international-duck-incorporated/idi-assets/-/blob/main/hall-of-shame.json
 * Only the "blockedIps" array of quoted IP strings is read - for example:
 *   { "blockedIps": ["203.0.113.7", "2001:db8::1"], "candidateIps": [...] }
 * Other arrays (such as candidateIps) are ignored on purpose.
 *
 * The file is scanned as plain text rather than parsed as JSON, so even a
 * multi-megabyte list costs about a millisecond to search and a couple of
 * megabytes of isolate memory - no entry-count limit, no parse pauses.
 * Matching is exact (IPv4 or IPv6, letter case ignored).
 *
 * Edits there are picked up within about five minutes - no redeploy needed.
 * Once a list is loaded, refreshes happen in the background (waitUntil), so
 * visitors never wait on GitLab. If the list cannot be fetched, the last
 * good copy keeps working and the site stays open: blocking never takes the
 * whole site down.
 *
 * EXTRA_BLOCKED_IPS: manual entries for emergencies or while GitLab is
 * unreachable; merged with the remote list.
 *
 * To preview the blocked page from a normal connection, append
 * ?blocked-preview=1 to any URL on the site.
 */

export const LIST_URL =
  "https://gitlab.com/international-duck-incorporated/idi-assets/-/raw/main/hall-of-shame.json?ref_type=heads";

const EXTRA_BLOCKED_IPS = [];

const LIST_TTL_MS = 5 * 60 * 1000;
const LIST_RETRY_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;
const CONTACT_EMAIL = "0xffshell@duck.com";

// Per-isolate cache, shared between requests so the list is not fetched per
// visitor, plus single-flight so concurrent cold requests share one fetch.
// `section` holds just the text of the blockedIps array, lowercased.
let cache = { section: "", loaded: false, nextRefreshAt: 0 };
let inflight = null;

const normalizeIp = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

/**
 * Pull out the text of the "blockedIps" array without parsing the whole
 * document. Works no matter how large the file grows, and stops at the
 * array's closing bracket so other fields (candidateIps and friends) can
 * never leak into the blocklist.
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

async function loadList() {
  const res = await fetch(LIST_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!res.ok) throw new Error(`blocklist fetch failed: ${res.status}`);
  return blockedSectionFrom(await res.text());
}

function refreshList() {
  if (!inflight) {
    inflight = loadList()
      .then((section) => {
        cache = { section, loaded: true, nextRefreshAt: Date.now() + LIST_TTL_MS };
      })
      .catch(() => {
        // Keep the last good list (empty only on a cold start) and retry
        // shortly instead of failing loudly on every request.
        cache = { ...cache, nextRefreshAt: Date.now() + LIST_RETRY_MS };
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function getClientIp(request) {
  return (request.headers.get("CF-Connecting-IP") || "").trim().toLowerCase();
}

export function isPreview(request) {
  return new URL(request.url).searchParams.has("blocked-preview");
}

/**
 * @param {string} ip lowercase client IP
 * @param {(promise: Promise<unknown>) => void} [waitUntil] keeps a background
 *   refresh alive past the response; when omitted the refresh is awaited.
 */
export async function isBlockedIp(ip, waitUntil) {
  if (Date.now() >= cache.nextRefreshAt) {
    if (cache.loaded) {
      // We have a list (possibly a few minutes old): use it right away and
      // refresh in the background so the visitor never waits on GitLab.
      const refresh = refreshList();
      if (waitUntil) waitUntil(refresh);
      else await refresh;
    } else {
      // Cold isolate: wait for the first list so blocking starts immediately.
      await refreshList();
    }
  }
  if (cache.section.includes(`"${ip}"`)) return true;
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
