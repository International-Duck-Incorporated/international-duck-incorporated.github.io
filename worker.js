/**
 * Worker for the idi mirror (idi.idi-official.workers.dev).
 *
 * Serves the static site through the ASSETS binding behind the same IP filter as
 * the Pages site (shared in functions/_badegg.js). `run_worker_first` in
 * wrangler.jsonc makes this run before static assets, so a blocked IP never
 * reaches a page or a file.
 */

import {
  getClientIp,
  isPreview,
  isBlockedIp,
  blockedResponse,
  wantsStatus,
  statusResponse,
  ensureIndex,
} from "./functions/_badegg.js";

export default {
  async fetch(request, env, ctx) {
    if (wantsStatus(request)) {
      await ensureIndex(env, { waitUntil: (p) => ctx.waitUntil(p) });
      return statusResponse();
    }

    const ip = getClientIp(request);
    const blocked = ip ? await isBlockedIp(ip, env, { waitUntil: (p) => ctx.waitUntil(p) }) : false;

    if (isPreview(request) || blocked) return blockedResponse(ip, env);

    return env.ASSETS.fetch(request);
  },
};
