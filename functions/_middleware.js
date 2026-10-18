/**
 * Site-wide IP filter (Cloudflare Pages Functions middleware).
 *
 * Runs before every request. Blocked IPs get the themed 403 page instead of the
 * requested page or asset - pages, images, files, all of it.
 *
 * All logic lives in functions/_badegg.js, which the worker mirror also uses.
 * Two debug switches: ?blocked-preview=1 renders the 403 page from any
 * connection, ?badegg-status=1 reports the loaded index (no addresses).
 */

import {
  getClientIp,
  isPreview,
  isBlockedIp,
  blockedResponse,
  wantsStatus,
  statusResponse,
} from "./_badegg.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (wantsStatus(request)) return statusResponse();

  const ip = getClientIp(request);
  const blocked = ip
    ? await isBlockedIp(ip, env, { waitUntil: (p) => context.waitUntil(p) })
    : false;

  if (isPreview(request) || blocked) return blockedResponse(ip);

  return context.next();
}
