/**
 * Worker for the idi mirror (idi.idi-official.workers.dev).
 *
 * Serves the static site through the ASSETS binding with the same IP gate
 * as the Pages site (shared in functions/_blocked.js). The run_worker_first
 * setting in wrangler.jsonc makes this script run before static assets, so
 * a blocked IP never reaches a page or a file.
 */

import { getClientIp, isPreview, isBlockedIp, blockedResponse } from "./functions/_blocked.js";

export default {
  async fetch(request, env, ctx) {
    const ip = getClientIp(request);

    if (isPreview(request) || (ip && (await isBlockedIp(ip, (p) => ctx.waitUntil(p))))) {
      return blockedResponse(ip);
    }

    return env.ASSETS.fetch(request);
  },
};
