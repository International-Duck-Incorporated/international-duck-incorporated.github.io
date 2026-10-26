#!/usr/bin/env node
/**
 * Local dev server for the BadEgg v3 gateway and its operator endpoints.
 *
 * Cloudflare Pages serves the static files and runs `functions/_middleware.js`
 * in front of them; this script does the same thing on localhost so the login
 * flow, the config API and the ban endpoints can be exercised end to end
 * (real middleware, real operator API, in-memory KV) without a deploy. The
 * console UI itself ships in `badegg-v3` on `feat/idi-pages-dashboard`.
 *
 *   node tools/dev-server.js            # http://localhost:4173
 *   PORT=8080 node tools/dev-server.js
 *
 * Differences from production, all deliberate:
 *   - KV (`IDI_BADEGG`) is an in-memory Map, so overrides vanish on restart.
 *   - The blocklist download from GitLab is stubbed to fail immediately: the
 *     gateway is designed to fail open, and there is no point pulling a
 *     multi-megabyte list to exercise the operator endpoints.
 *   - Requests are attributed to 127.0.0.1, which the gateway always allowlists,
 *     so local browsing is never blocked by its own rate limiter.
 *   - `BADEGG_ADMIN_TOKEN` defaults to a local value, printed at startup. It is
 *     the password the console asks for, and the status endpoint is gated by it.
 */

import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleBadEggRequest, resetBadEggV3State } from "../functions/_badegg.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_TOKEN = process.env.BADEGG_ADMIN_TOKEN || "local-dev-token-change-me";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

/** Minimal stand-in for a Cloudflare KV namespace. */
function createKv() {
  const store = new Map();
  return {
    async get(key, options = {}) {
      if (!store.has(key)) return null;
      const value = store.get(key);
      if (options.type === "json") return JSON.parse(value);
      return value;
    },
    async put(key, value) {
      store.set(key, typeof value === "string" ? value : String(value));
    },
    async delete(key) {
      store.delete(key);
    },
    _store: store,
  };
}

// Keep the local run offline: `ensureIndex` fetches the real blocklist from GitLab.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input?.url || "";
  if (url.includes("hall-of-shame")) throw new Error("dev server: blocklist download disabled");
  return realFetch(input, init);
};

const env = {
  IDI_BADEGG: createKv(),
  BADEGG_ADMIN_TOKEN: ADMIN_TOKEN,
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => key.startsWith("BADEGG_") && key !== "BADEGG_ADMIN_TOKEN"
    )
  ),
};

/** Pages-style resolution: /x -> x, x.html, x/index.html; then 404.html. */
async function resolveFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  // "/" and "/dir/" serve their index; "/x" may be x.html or x/index.html.
  const candidates = decoded.endsWith("/")
    ? [`${decoded}index.html`]
    : [decoded, `${decoded}.html`, `${decoded}/index.html`];
  for (const candidate of candidates) {
    const absolute = path.resolve(ROOT, `.${candidate}`);
    if (!absolute.startsWith(ROOT)) continue; // no traversal above the repo
    try {
      if ((await fs.stat(absolute)).isFile()) return absolute;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function createAssetsBinding() {
  return {
    async fetch(request) {
      const url = new URL(typeof request === "string" ? request : request.url);
      const file = await resolveFile(url.pathname);
      if (!file) return new Response("not found", { status: 404 });
      const body = await fs.readFile(file);
      return new Response(body, {
        headers: { "content-type": MIME[path.extname(file)] || "application/octet-stream" },
      });
    },
  };
}

env.ASSETS = createAssetsBinding();

async function serveStatic(request) {
  const url = new URL(request.url);
  const file = await resolveFile(url.pathname);
  if (!file) {
    const notFound = await resolveFile("/404.html");
    const body = notFound ? await fs.readFile(notFound) : "not found";
    return new Response(body, {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  const body = await fs.readFile(file);
  return new Response(request.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "content-type": MIME[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-store", // always pick up edits while developing
    },
  });
}

const server = http.createServer(async (req, res) => {
  const url = `http://${req.headers.host || `localhost:${PORT}`}${req.url}`;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const hasBody = chunks.length > 0 && req.method !== "GET" && req.method !== "HEAD";
  const request = new Request(url, {
    method: req.method,
    headers: {
      ...req.headers,
      // The gateway keys everything off CF-Connecting-IP; 127.0.0.1 is allowlisted.
      "cf-connecting-ip": req.headers["cf-connecting-ip"] || "127.0.0.1",
    },
    body: hasBody ? Buffer.concat(chunks) : undefined,
  });

  const pending = [];
  let response;
  try {
    response = await handleBadEggRequest(
      request,
      env,
      { waitUntil: (promise) => pending.push(promise) },
      () => serveStatic(request)
    );
  } catch (error) {
    console.error("gateway error:", error);
    response = new Response(`dev server error: ${error.message}`, { status: 500 });
  }

  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
  await Promise.allSettled(pending);
});

server.listen(PORT, HOST, () => {
  resetBadEggV3State();
  console.log(`BadEgg v3 dev server on http://localhost:${PORT}`);
  console.log(
    "  dashboard   badegg-v3 @ feat/idi-pages-dashboard (this repo runs the gateway and the operator API)"
  );
  console.log(
    `  status      http://localhost:${PORT}/?badegg-status=1 (Authorization: Bearer ${ADMIN_TOKEN})`
  );
  console.log(
    `  config API  ${PORT ? "" : ""}/api/badegg/config (Authorization: Bearer ${ADMIN_TOKEN})`
  );
});
