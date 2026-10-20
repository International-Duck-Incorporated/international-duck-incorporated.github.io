# SEO / crawlability audit — International Duck Incorporated

**Audited:** 2026-10-05 · repo `international-duck-incorporated/home` @ `1c57456` (pre-route/platform cleanup snapshot)
**Production:** `https://idi-official.pages.dev/` (Cloudflare Pages) — deployed HTML is byte-identical to repo HEAD ✓
**Mirror:** a separate GitLab Pages deployment — historically identical; pages.dev remains the canonical host

---

## TL;DR — the diagnosis

Your on-page basics are genuinely good (better than most hobby sites). The problem is not
"Google ranks us badly", it is **"Google almost certainly has not indexed us at all"**, and
there were three structural reasons in the original audit snapshot; the current implementation note below records the follow-up cleanup:

1. **Nothing links to you.** Zero of the six project READMEs mention the site. The GitLab group
   profile has no website link (`website_group_link: null`). The repo was created 2026-09-24 —
   11 days old, 2 stars. Crawlers discover URLs by following links; you have almost none pointing in.
2. **There is no sitemap and no Search Console property**, so nothing has ever been submitted.
3. **The homepage is empty to a crawler.** `index.html` contains **567 characters** of visible text.
   Every project name, member name, stat and description was injected by JavaScript from the GitLab/GitHub
   APIs. The current site keeps checked-in content as a fallback and uses GitLab only for live activity;
   the former GitHub organization is hidden/private and its API is intentionally disabled.

The original audit found historical GitHub mirror pages competing for project-name searches. Those
pages are no longer treated as active sources: the GitHub organization is hidden/private, while GitLab
is the current source of truth. Migration history remains documented on `/migration` without linking
users toward unavailable organization pages.

---

## What I measured

| Check                                                          | Result                                                                                                                      |     |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --- |
| Unique `<title>` + `<meta description>`                        | 20/20 pages                                                                                                                 | ✅  |
| Exactly one `<h1>` per page                                    | 20/20 pages                                                                                                                 | ✅  |
| `alt` on every `<img>`                                         | 100% coverage                                                                                                               | ✅  |
| `<html lang="en">`                                             | present                                                                                                                     | ✅  |
| `robots.txt` allows all crawlers                               | `User-agent: * / Allow: /`                                                                                                  | ✅  |
| Legacy flat URLs and `/people` route 301-redirect to new paths | explicit rules, correct targets                                                                                             | ✅  |
| `noindex` only where intended                                  | `404.html`, `easteregg.html`                                                                                                | ✅  |
| Brotli compression                                             | active (`content-encoding: br`)                                                                                             | ✅  |
| Deploy == repo HEAD                                            | md5 match                                                                                                                   | ✅  |
| `sitemap.xml`                                                  | **404**                                                                                                                     | ❌  |
| `Sitemap:` line in robots.txt                                  | missing                                                                                                                     | ❌  |
| `rel="canonical"`                                              | **0 of 20 pages**                                                                                                           | ❌  |
| `og:url`                                                       | missing on all pages                                                                                                        | ❌  |
| `twitter:card`                                                 | 0 tags                                                                                                                      | ❌  |
| JSON-LD structured data                                        | 0 blocks site-wide                                                                                                          | ❌  |
| Duplicate live hosts, no canonical                             | pages.dev + gitlab.io                                                                                                       | ❌  |
| Static text on homepage                                        | 567 chars (all real content is JS-injected)                                                                                 | ❌  |
| Render-blocking CSS per page                                   | **8 stylesheets, 97.8 KB, on every page**                                                                                   | ❌  |
| Asset weight                                                   | `goofy-ahh.gif` 3.6 MB · `beacon-background.mp4` 3.6 MB · `idi-member-collage.png` 1.9 MB · `member-e-vdv-hu-bg.jpg` 416 KB | ❌  |
| `loading="lazy"` / `fetchpriority`                             | not used anywhere                                                                                                           | ❌  |
| Cache headers on `/assets/*` and `/css/*`                      | `max-age=0, must-revalidate` (nothing cached)                                                                               | ❌  |
| `preconnect` to `gitlab.com`                                   | present where live data is used; GitHub API calls removed                                                                   | ✅  |
| `og:image` on 4 project pages                                  | points at `gitlab.com/.../-/raw/...` (icon-sized, can 404 for bots)                                                         | ⚠️  |

18 of 20 pages are indexable (`404.html` and `easteregg.html` are deliberately `noindex`).

---

## P1 — Get discovered _(highest impact, ~1 hour, do first)_

Nothing else matters until Google knows the site exists.

1. **Google Search Console** — verify `idi-official.pages.dev`. Easiest for Cloudflare Pages:
   add the `google-site-verification` meta tag to all 20 pages (I can script this once you paste the code).
   Then use _URL Inspection → Request Indexing_ on `/`, `/projects/`, `/members/`, and each project page.
2. **Bing Webmaster Tools** — import from GSC in one click. Bing's index also feeds DuckDuckGo,
   Ecosia, Startpage and **ChatGPT search / Copilot**, so this punches above its weight.
3. **Create `sitemap.xml`** with all 18 indexable URLs (trailing-slash-free form, matching how
   Cloudflare 308s `/projects/venomous/` → `/projects/venomous`). Reference it from `robots.txt`:

   ```
   User-agent: *
   Allow: /

   Sitemap: https://idi-official.pages.dev/sitemap.xml
   ```

4. **Set the GitLab group website link** to `https://idi-official.pages.dev/`
   (Group → Settings → General → "Website"). Currently empty. This is a free link from a
   high-authority, topically-relevant page.
5. **Add a site link to all six project READMEs** — one line each. GitLab READMEs and release
   notes are the active source surface; a link from them is the single most realistic way to get
   discovered and to pass relevance.

## P2 — Pick one canonical host _(blocks correct indexing)_

Two hosts serve identical HTML right now. Google will either pick one arbitrarily or split the
signals between them — and it may well pick the ugly 62-character `gitlab.io` URL as canonical.

Decide which is primary, then make the other defer:

- **If `idi-official.pages.dev` is primary** (recommended, since Cloudflare gives you control and
  the URL is short): keep GitLab Pages as a mirror, but add `<link rel="canonical">` on every
  GitLab-Pages-served page pointing at pages.dev. Cheapest robust way is a client-side canonical —
  but crawlers need it in HTML, so the better fix is to _disable GitLab Pages deployment_ for this
  project, or 301 the `gitlab.io` root to pages.dev.
- **If you plan a custom domain** (e.g. `idi.gg`, `duckinc.dev`): do it _before_ you accumulate
  any rankings. Moving domains later costs you months. A custom domain also removes the risk of
  a shared `pages.dev`/`gitlab.io` neighbour affecting you.

Then add to all 18 indexable pages:

```html
<link rel="canonical" href="https://idi-official.pages.dev/projects/venomous" />
<meta property="og:url" content="https://idi-official.pages.dev/projects/venomous" />
<meta name="twitter:card" content="summary_large_image" />
```

## P3 — Make content visible without JavaScript _(biggest on-page lever)_

A crawler should be able to read the page with JS disabled and still understand what it is.
Today it cannot.

- **Pre-render the real content into HTML.** The README already says "checked-in content and
  authentic local images keep the pages useful if the API is unavailable" — extend that principle to
  the _text_: hard-code each project's name, one-line description, latest release, language and
  link into the initial HTML, and let JS _overwrite_ it with live values when the API answers.
  Progressive enhancement, not client-only rendering.
- Target roughly **300–600 words of unique text per project page**. The repository README is not a
  substitute for useful on-site copy; the website needs something the source repository does not have.
- Watch out for a self-inflicted trap: your `/activity` page fetches the newest 100 commits per repo
  from the former GitHub organization. That organization is now hidden/private, so the site intentionally
  does not depend on GitHub activity data. Anything you want indexed must be present in checked-in HTML
  or come from the active GitLab source.

## P4 — Structured data _(you have zero; this is cheap and high-yield)_

You are a Minecraft mod org, which is one of the best-supported verticals for rich results.
Add JSON-LD to each page:

- **Every page:** `Organization` + `WebSite` with `sameAs` limited to the active GitLab group;
  the hidden GitHub organization is mentioned only in the migration/unavailable-data explanation.
- **Project pages** (`beacon`, `venomous`, `nulltrace`, `championscode`, `bagley`, `zonedout`):
  `SoftwareApplication` → `applicationCategory: "GameMod"`, `operatingSystem: "Minecraft"`,
  `offers.price: 0`, `softwareVersion`, `dateModified`, `downloadUrl`, `codeRepository`.
  This is what makes download counts and versions eligible for rich display.
- **Member pages:** `ProfilePage` + `Person` (`name`, `url`, `sameAs`).
- **Directory pages** (`/projects/`, `/members/`): `ItemList` + `BreadcrumbList`.
- Validate with Google's Rich Results Test before shipping.

## P5 — Core Web Vitals _(mobile rankings + crawl budget)_

Two assets are 3.6 MB each. On a mid-range phone over 4G that is a failed LCP before the page
even paints.

| Fix                                                                                                                                                   | Target                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `assets/goofy-ahh.gif` 3.6 MB → WebM/AVIF video, or a static WebP                                                                                     | ~200–400 KB                 |
| `assets/beacon-background.mp4` 3.6 MB → H.265/AV1 re-encode, `preload="none"` on mobile, keep `poster`                                                | ~600 KB                     |
| `assets/idi-member-collage.png` 1.9 MB → AVIF/WebP + `srcset`                                                                                         | ~150 KB                     |
| `member-e-vdv-hu-bg.jpg` 416 KB → AVIF/WebP                                                                                                           | ~60 KB                      |
| `loading="lazy"` on every below-the-fold `<img>`                                                                                                      | all pages                   |
| `fetchpriority="high"` on the LCP image, `preload="none"` on autoplay video                                                                           | homepage, beacon            |
| `<link rel="preconnect" href="https://gitlab.com">` + GitLab API dns-prefetch                                                                         | pages with live GitLab data |
| Cut from 8 render-blocking stylesheets to 1–2 per page (`bagley.css` on the homepage and `migration.css` on project pages are dead weight)            | all pages                   |
| Add a Cloudflare Pages `_headers` file: `/assets/*` and `/css/*` → `Cache-Control: public, max-age=31536000, immutable`; HTML stays `must-revalidate` | site-wide                   |

That last one is currently hurting you: **every asset ships `max-age=0`**, so each repeat visit and
each recrawl re-downloads ~11 MB of media.

## P6 — Off-page: the real ranking lever _(where the effort belongs)_

For an 11-day-old domain with no links, on-page perfection gets you indexed, not ranked.
Realistic wins, roughly in order:

1. **Niche directories** — these pages already rank for your keywords and hand out followed links:
   CurseForge, Modrinth, Planet Minecraft. NullTrace is noted as already on CurseForge; make sure
   every project has a Modrinth/CurseForge page whose description links back to the site.
2. **Link from GitLab READMEs and release notes** (see P1.5). Active releases are crawled constantly.
3. **Community presence** — Minecraft modding Discords, r/MinecraftMods, r/fabricmc,
   Minecraft Forum. One genuine, non-spammy post per project with a link.
4. **Profiles with `sameAs` links** — set the group/org website field on active surfaces: GitLab
   group, CurseForge, Modrinth, and any Discord discovery listing. Do not add the hidden GitHub org.
5. **Publish content that only exists on the site.** Comparison pages ("NullTrace vs No Chat Reports"),
   setup guides, changelogs, a "why we moved to GitLab" write-up (you already have `migration.html` —
   that is genuinely linkable, opinionated content; promote it). Unique content is the only durable
   reason for Google to prefer your domain over the GitHub mirror.
6. **Freshness signals** — your `/activity` feed is a natural reason to be recrawled, once it's
   pre-rendered so crawlers can see it.

## P7 — AI crawlers _(small effort, growing traffic source)_

`robots.txt` already allows `*`, so GPTBot, ClaudeBot, PerplexityBot and Google-Extended are
permitted by default. Two additions worth making:

- **`llms.txt`** at the site root — a markdown index of your pages and what they are. Cheap, and
  increasingly used by AI answer engines.
- Explicitly name the AI agents in `robots.txt` so the intent is documented and survives future edits.
- Since your content is JS-injected, **AI crawlers currently see an empty page** — P3 is what makes
  you quotable in AI answers.

## What I would _not_ bother with

- Keyword-stuffing titles/descriptions — yours are already clean and unique.
- An XML news sitemap, hreflang, or an AMP version — irrelevant at this scale.
- Buying backlinks / PBNs — will get an 11-day-old domain penalised.
- Moving to an SSG (Astro/Hugo/11ty) _just_ for SEO. That said: if you do P3 properly you're
  effectively hand-rolling pre-rendering, and a tiny build step that injects live GitLab data into
  HTML at CI time would solve P3 permanently. Worth considering, not urgent.

---

## Implementation log - 2026-10-05

Canonical host decided: **https://idi-official.pages.dev**.
Everything below is implemented locally and **uncommitted** - review with `git diff` / `git status`.
All generators are idempotent, so re-running them after future edits is safe.

### Done

| Change                                                                                                                                                                                                                                        | Where                                               | Regenerate with                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- |
| `sitemap.xml`, 18 URLs, `<lastmod>` from git, correct trailing-slash forms                                                                                                                                                                    | new file                                            | `python3 tools/gen_sitemap.py`    |
| `robots.txt`: added `Sitemap:` + explicit allow rules for AI agents (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, ...)                                                                                                           | edited                                              | hand                              |
| `llms.txt` machine-readable site index for AI answer engines                                                                                                                                                                                  | new file                                            | hand                              |
| `_headers` (Cloudflare Pages): immutable caching for `/assets/*`, `/css/*` and all root JS; 1 h for discovery files                                                                                                                           | new file                                            | hand                              |
| Content-hash cache-busting (`?v=`) on every CSS/JS reference, so immutable caching is safe                                                                                                                                                    | 18 HTML files                                       | `python3 tools/bust_cache.py`     |
| `rel="canonical"`, `og:url`, `og:site_name`, `og:locale`, `og:image` + width/height/alt, full `twitter:*` set on all 18 indexable pages                                                                                                       | 18 HTML files                                       | `python3 tools/apply_seo_head.py` |
| `og:image` normalised away from fragile `gitlab.com/.../-/raw/` and preview-host URLs onto one self-hosted 1200x630 card                                                                                                                      | `assets/og-default.png`                             | `python3 tools/make_og_image.py`  |
| JSON-LD on all 18 pages: `Organization`, `WebSite`, `WebPage`/`ProfilePage`/`CollectionPage`, `BreadcrumbList`, `SoftwareApplication` (6 mods + website, with versions/licences/repo/download URLs), `Person` (6), `ItemList` (2 directories) | 18 HTML files                                       | `python3 tools/apply_jsonld.py`   |
| `preconnect` + `dns-prefetch` to `gitlab.com` where used; GitHub API hints removed                                                                                                                                                            | indexable HTML                                      | `python3 tools/apply_seo_head.py` |
| Homepage pre-rendered content: projects grid and about prose; `/members/` and `/activity/` explanatory sections                                                                                                                               | `index.html`, `members/index.html`, `activity.html` | `python3 tools/enrich_content.py` |
| `loading="lazy"` + `decoding="async"` on below-the-fold grid and member images; `fetchpriority="high"` on the homepage profile avatar (LCP)                                                                                                   | 19 HTML files                                       | one-off script                    |
| Vertical rhythm for the new sections                                                                                                                                                                                                          | `css/overrides.css` (`.home-directory`)             | hand                              |

`404.html` and `easteregg.html` were deliberately left `noindex` **without** canonicals.

Static no-JS word count in `<main>`: homepage 49 -> 413, `/members/` 49 -> 155, `/activity/` 56 -> 251.

### Deliberately not done, and why

- **Stylesheet pruning (8 per page -> fewer).** Selector analysis showed every stylesheet matches
  selectors on every page; compound selectors such as `.project-icon.bagley` make pruning unsafe
  without visual regression testing, and I cannot screenshot the result here. The immutable
  caching above removes most of the repeat-visit cost instead. Revisit with a real browser test.
- **Media recompression** (`goofy-ahh.gif` 3.6 MB, `beacon-background.mp4` 3.6 MB,
  `idi-member-collage.png` 1.9 MB) - skipped on your instruction. This remains the single biggest
  Core Web Vitals item if you change your mind.
- `preload="none"` on the autoplay video - left untouched so the intended visuals do not change.

### Still manual (needs your accounts / permissions)

1. **Google Search Console**: add and verify `idi-official.pages.dev`, submit
   `https://idi-official.pages.dev/sitemap.xml`, then _URL Inspection -> Request Indexing_ for the
   18 URLs. Highest-impact remaining action.
2. **Bing Webmaster Tools**: import the GSC property in one click.
3. **GitLab group -> Settings -> General -> Website**: set `https://idi-official.pages.dev/`
   (currently empty; free high-authority inbound link).
4. **Six sibling repos** (Beacon, Venomous, NullTrace, ChampionsCode, beacon-bagley, zonedout):
   add one line linking to the site in each active GitLab README. None currently link to it.
5. Optionally **disable GitLab Pages** for `home` now that canonicals point at pages.dev, or keep it
   as a mirror - the canonical tags already tell Google which host to index.
6. **CurseForge / Modrinth**: fill the website field and link from project descriptions.
7. After deploying: in Search Console confirm the canonical is respected and watch for
   "Duplicate, Google chose different canonical" warnings on the gitlab.io host.

### Follow-up: members route and GitHub availability cleanup

- The member directory and every profile now use `/members`; the former `/people` route is
  retained only as an explicit 301 compatibility redirect. Navigation, breadcrumbs, canonicals,
  Open Graph URLs, JSON-LD, generators, documentation, and the sitemap all use `/members`.
- Every sitemap URL now declares `<changefreq>weekly</changefreq>`.
- Activity and member commit feeds query GitLab only. The activity page visibly warns that the
  GitHub organization is hidden/private and that GitLab is the active source of truth.
- Organization-level GitHub links, API hints, and JSON-LD `sameAs` entries were removed. The
  migration page retains historical GitHub references only to explain the move and unavailable
  status; the third-party Starry Night license attribution remains required.

### Handy commands

```bash
git diff                            # review every HTML/CSS change before committing
python3 tools/gen_sitemap.py        # after adding/renaming pages
python3 tools/bust_cache.py         # after editing any CSS or JS file
python3 tools/apply_seo_head.py     # no-op on pages already processed
python3 tools/apply_jsonld.py       # no-op on pages already processed
python3 tools/enrich_content.py     # no-op on pages already processed
```
