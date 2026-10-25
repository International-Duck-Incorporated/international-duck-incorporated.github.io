/**
 * Site-wide BadEgg v3 security gateway (Cloudflare Pages Functions middleware).
 *
 * Runs before every request. Enforces framing safeguards, the schema-2 IP/CIDR
 * blocklist (`hall-of-shame.v2.bin`), temporary exact-IP bans, per-IP token-bucket
 * rate limiting (HTTP 429 + Retry-After), deterministic request WAF inspection,
 * and outgoing response-header secret redaction.
 *
 * All logic lives in `functions/_badegg.js`, shared with `worker.js`.
 * Two debug switches: `?blocked-preview=1` renders the 403 page from any
 * connection; `?badegg-status=1` reports BadEgg v3 status (no addresses or bodies).
 */

import { handleBadEggRequest } from "./_badegg.js";

export async function onRequest(context) {
  const { request, env } = context;
  return handleBadEggRequest(request, env, { waitUntil: (p) => context.waitUntil(p) }, () =>
    context.next()
  );
}
