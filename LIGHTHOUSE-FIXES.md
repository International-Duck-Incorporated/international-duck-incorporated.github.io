# Lighthouse follow-up — homepage performance, accessibility, payload

**Context:** Lighthouse 13.5.0 run against `https://idi-official.pages.dev/` on
2026-10-05 (desktop emulation, captured 22:03 UTC+2): Performance 99, Accessibility
95, Best Practices 100, SEO 100, with an estimated 209 KiB of image savings, 110 ms
of render-blocking CSS, a 325 ms critical-path tail, 4 898 KiB of payload and a
1 260 ms "element render delay" on the LCP element. This change set addresses the
parts of that report that live in this repository.

Everything below is measured on the same machine, the same day, with the same
Lighthouse version and a locally served copy of this repo (gzipped responses to
stand in for the brotli Cloudflare serves; before/after runs alternate so
environment noise cancels out).

| | before | after |
|---|---|---|
| Performance / Accessibility | 92 / 95 | **99–100 / 100** |
| LCP (observed) | 912 ms | **192–241 ms** |
| FCP (simulated) | 1 204 ms | 906 ms |
| Total Blocking Time | 0–54 ms | 0–32 ms |
| Cumulative Layout Shift | 0 (masked) | 0 (genuinely) |
| Render-blocking requests | 8 | **1** |
| Requests on the homepage | 24 | 17–18 |
| Image bytes on load | ~209 KiB | ~20 KiB |

## What changed

### 1. One stylesheet instead of eight

`tools/bundle_css.py` concatenates the eight `css/*.css` modules in their cascade
order into `css/bundle.css` and points every page at it. `tools/bust_cache.py`
still content-hashes the result, so the immutable caching in `_headers` is
unaffected. The modules stay the editable source of truth; the bundle carries a
"generated" banner. Eight blocking requests and the 325 ms critical-path tail
become one request (est. render-blocking savings in the report: 110 ms → the
remaining candidate is the bundle itself).

The CSS contents were not otherwise rewritten, so specificity and the "link
`overrides.css` last" contract are preserved exactly.

### 2. Images: correct dimensions and a compressed sibling

The report's biggest per-file items were oversized icons (512×512 and 1080×1080
files painted at 59×59) and a 167 KiB JPEG backdrop. `tools/optimize_images.py`
generates a `.webp` sibling for every raster asset (geometry capped at the
largest size it is ever displayed at, metadata stripped, animated GIF → animated
WebP), and `tools/apply_image_sources.py` wires them up:

* `<img>` becomes `<picture>` with the WebP source and the original PNG/JPEG as
  fallback — browsers pick one, they never double-download;
* CSS bitmaps (`background-image`) use `image-set()` with the same fallback;
* `[data-org-avatar]` images keep their runtime `src` swap to the live GitLab
  avatar, so they only get the smaller local fallback file;
* images created at runtime (`script.js`) now carry `loading="lazy"`.

Per-file: `venomous-icon.png` 78.2 → 7.7 KiB, `idi-member-collage.png`
1 926 → 45 KiB, `homepage-community-background-v4.jpg` 167 → 56 KiB,
`goofy-ahh.gif` 3 676 → 687 KiB (animated), `member-e-vdv-hu-bg.jpg` 416 → 226 KiB.
The PNG/JPEG originals stay in the repo as fallbacks and as `og:image` sources.

`picture { display: contents }` plus `picture > source { display: none }` keep
the wrapper out of layout — without the second rule the leaked `<source>` element
becomes a zero-size flex/grid item and eats a `gap` slot (that showed up as a
12 px shift in the footer brand and a 22 px shift on the Venomous logo stage
during verification, and is fixed).

### 3. The homepage LCP element paints with the first frame

The hero paragraph was inside `.reveal`, so it stayed at `opacity: 0` until the
deferred `script.js` ran the `IntersectionObserver` and a 0.65 s transition
finished — that is the report's 1 260 ms of element render delay on an element
that was already in the first HTML response. It now paints immediately; only the
media backdrop fades in behind it.

That exposed the real cause of the shift the fade had been hiding: the backdrop
was picked *after* the first layout, and the hero copy sits top-left for clips
and bottom-right for stills, so the copy jumped once `data-frame` was applied
(CLS 0.21). `index.html`'s head script now makes the pick — with the same pool,
odds and "never twice in a row" rule — before the first style calculation, and
sets `data-frame` / `data-wordmark` / `--focus` on `<html>`. `easteregg.js`
mounts that pick instead of re-rolling (it still rolls for itself on a page with
no head pick). The copy is laid out once, in its final position: LCP ~200 ms,
CLS 0.

### 4. The rotating clips no longer compete with the first paint

The homepage streams a 4–18 MB clip from the `idi-assets` bundle and plays it as
the backdrop. That request used to start with the page; it now starts once the
document has finished loading and the browser is idle (`requestIdleCallback`,
2.5 s timeout). The stylesheet backdrop stays visible until the clip can paint,
which is the state a slow clip already produced before. The footer rotation
snapshot's 4 420 KiB third-party row disappears from the load phase as a result.

Note this does not make the clips smaller: they are the payload, and the trace
now simply sees the whole file. Re-encoding them (720p, ~1.5 Mbps) is the real
win there and lives in the `idi-assets` repository, not here.

### 5. Accessibility: footer contrast

`color-contrast` was the only failing accessibility audit: `.sync-state`
("GitLab data synced live", and its `/activity` and `/easteregg` variants) was
`#59635c` on `#07090d` — 3.19:1. It is now `#7d8780` (6.36:1), the smallest
change that clears AA while keeping the muted mono look. Accessibility is 100 in
the local runs.

### 6. Housekeeping

* `index.html` (and the pages that talk to the GitLab API) now preconnect to
  `gitlab.com` both with and without `crossorigin`: the CORS API fetches reuse
  the `crossorigin` connection, the plain `<img>`/video requests do not, which is
  what Lighthouse flagged as an unused preconnect.
* `README.md` documents the generated artifacts and `tools/build.py` runs the
  whole pipeline (`bundle_css.py` → `optimize_images.py` →
  `apply_image_sources.py` → `bust_cache.py`).

## What is deliberately not fixed here

| Finding | Why |
|---|---|
| 32 KiB GitLab group avatar (`modern-image-formats`, `uses-responsive-images`) | served straight from `gitlab.com/uploads/...` and swapped in at runtime by `script.js`; the repo cannot re-compress or resize it. The local fallback is now a 10 KiB WebP. |
| `org-avatar.webp` "9 KiB larger than needed" | it is a 192 px 2x asset for a 136 px slot; shrinking it would soften the panel on retina screens. |
| `beacon.min.js`, 1-day cache TTL, legacy polyfills | injected by Cloudflare Web Analytics at the edge, not a file in this repo. Disabling it in the Cloudflare dashboard (or proxying it) is the only lever. |
| `goofy-ahh.gif` (687 KiB animated, midas735's page) | already 81 % smaller as animated WebP; an animated AVIF or a short video would be smaller again, but the page is a member easter egg, not a landing page. |
| Rotation clips of 4–18 MB | payload lives in the `idi-assets` repository; re-encode there. |
| Remaining unused CSS (18 KiB gzipped) | the bundle carries every module on every page. Splitting per page type (core + page + overrides) is possible but adds a build dimension for a few kilobytes; noted as a follow-up rather than done here. |

## Verification performed

* `python3 tools/build.py` is idempotent (second run: no HTML rewritten).
* Every local reference in every page resolves (272 checked, 0 missing).
* Geometry diff against the pre-change build for all 15 pages at 1400×900: the
  only differences are the added zero-size `<picture>`/`<source>` nodes. With the
  backdrop pick pinned, the homepage hero is pixel-identical in both layouts
  (clip state and still state).
* Behaviour checks: normal desktop (clip + still picks), reduced motion, low-power
  device, no head pick (fallback roll), JavaScript disabled (static default
  layout), `/easteregg` low-power branch. No console errors on any route.
* Layout shift probe: 0 shifts across repeated runs (was 0.105 on still picks
  once the hero copy became visible).
