/**
 * Worker for the idi mirror (idi.idi-official.workers.dev).
 *
 * Serves the static site through the ASSETS binding behind the same BadEgg v3
 * edge security gateway as the Pages site (`functions/_badegg.js`).
 * `run_worker_first` in `wrangler.jsonc` makes this run before static assets,
 * so blocked IPs, rate-limited floods, and attack payloads never reach a file.
 */

import { handleBadEggRequest } from "./functions/_badegg.js";

export default {
  async fetch(request, env, ctx) {
    return handleBadEggRequest(request, env, { waitUntil: (p) => ctx.waitUntil(p) }, () =>
      env.ASSETS.fetch(request)
    );
  },
};
