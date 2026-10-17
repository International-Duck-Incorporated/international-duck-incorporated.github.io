/**
 * Site-wide IP gate (Cloudflare Pages Functions middleware).
 *
 * Runs before every request to the Pages site. Blocked IPs get the themed
 * 403 page instead of the requested page or asset - pages, images, files,
 * all of it. The blocklist, the page and the caching live in
 * functions/_blocked.js, which the worker mirror (worker.js) shares.
 */

import { getClientIp, isPreview, isBlockedIp, blockedResponse } from "./_blocked.js";

export async function onRequest(context) {
  const { request } = context;
  const ip = getClientIp(request);

  if (isPreview(request) || (ip && (await isBlockedIp(ip)))) {
    return blockedResponse(ip);
  }

  return context.next();
}
