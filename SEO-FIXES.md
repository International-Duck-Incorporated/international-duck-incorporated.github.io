# Round 2 - what Google sees, page heads, module directory, changelog

Companion to `LIGHTHOUSE-FIXES.md` (round 1). Four things were asked for; this is
what each one turned into, plus the two pre-existing accessibility failures the
new pages surfaced. Everything here is in the working tree and reproducible with
`python3 tools/build.py`.

## 1. What Google actually sees

**Beacon's project page is not JS-rendered.** Fetching
`https://idi-official.pages.dev/projects/beacon` with the Googlebot user agent and
stripping every `<script>` still leaves **3,614 characters of real text**:
`<h1>Beacon.</h1>`, the lead paragraph, the project facts table, the module count
sentence and the release history. The `<head>` already carries a title,
`meta description`, `og:*` and a `canonical`, and the only script Cloudflare adds
on top of the repository is its own Web Analytics beacon (`beacon.min.js`).
Nothing needs re-architecting for crawlers.

The one remaining Step 1 action is on the Search Console side, which only you can
do: **URL Inspection -> View crawled page** for the same URL.

## 2. One head per page

`tools/apply_page_seo.py` now owns `<title>`, `meta description`, `canonical`,
`og:title`, `og:description`, `og:url` (plus `og:type`, `og:site_name`,
`og:locale`, `twitter:card/title/description`) for all 20 indexable pages from a
single table, and refuses to write anything that breaks the rules: titles over 60
characters, descriptions over 160, og descriptions over 120, or duplicated
titles/descriptions. `python3 tools/apply_page_seo.py --check` verifies the pages
on disk still match the table and exits non-zero if they have drifted, so CI (or
you) can catch a hand-edited title.

Every title leads with what the page is and puts the brand last; every
description is one sentence in the words people search ("Fabric", "Minecraft",
the mod it belongs to).

| URL | Title | Chars | Description | Chars |
| --- | --- | --- | --- | --- |
| `/` | International Duck - free Minecraft mods and tools | 50 | Open-source Minecraft mods and tools from International Duck Incorporated: the 56-module Beacon, Venomous, NullTrace and more, all free on GitLab. | 146 |
| `/activity` | Live GitLab commit activity | International Duck | 48 | Live commit activity for every International Duck project, read from the public GitLab API: recent commits, authors and which repository each one landed in. | 156 |
| `/changelog` | Changelog: Beacon, Venomous, NullTrace releases | IDI | 53 | Every release from every International Duck project - Beacon, Venomous, NullTrace, ChampionsCode and Bagley - transcribed from each repository's CHANGELOG.md. | 158 |
| `/migration` | GitHub to GitLab migration, September 2026 | IDI | 48 | Why International Duck moved from GitHub to GitLab in September 2026: a sourced, dated timeline of what changed, what moved and what is still unavailable. | 154 |
| `/members/` | The International Duck team: public members | IDI | 49 | The public members of International Duck Incorporated - developers, testers and writers behind the group's free Minecraft mods on GitLab. | 137 |
| `/members/0xffshell` | 0xFFshell - International Duck member profile | IDI | 51 | 0xFFshell is the main writer at International Duck Incorporated, contributing to the Venomous Meteor addon and the group's other Minecraft projects on GitLab. | 158 |
| `/members/3spress0` | espress0 - International Duck member profile | IDI | 50 | espress0 is a backend developer and the backbone of most International Duck projects, working across security research tooling and Minecraft client mods. | 153 |
| `/members/e-vdv-hu` | E-VDV-HU - International Duck member profile | IDI | 50 | E-VDV-HU is a public member of International Duck Incorporated, handling backend services and hosting for the group's Minecraft mod projects on GitLab. | 151 |
| `/members/jojo-8002` | Jojo-8002 - International Duck member profile | IDI | 51 | Jojo-8002 is a public member of International Duck Incorporated, active around the group's free Minecraft mod projects on GitLab. | 129 |
| `/members/midas735` | midas735 - International Duck member profile | IDI | 50 | midas735 is a public member of International Duck Incorporated, taking part in the group's free Minecraft mod projects and their GitLab activity. | 145 |
| `/members/superivar` | Xx-superIvar-xX - IDI member profile | IDI | 42 | Xx-superIvar-xX is a public member of International Duck Incorporated and tests the group's Fabric client mods and Minecraft releases before they ship. | 151 |
| `/projects/` | All projects: Minecraft mods, addons, tools | IDI | 49 | Every International Duck project in one place - Beacon, Venomous, NullTrace, ChampionsCode, Bagley and ZonedOut - free Fabric client mods for Minecraft. | 152 |
| `/projects/bagley` | Bagley, AI chat addon for the Beacon Minecraft mod | IDI | 56 | Bagley is a free, opt-in AI chat assistant addon for the Beacon Minecraft mod, with local provider configuration and optional conversation memory. | 146 |
| `/projects/beacon` | Beacon, free Fabric client utility mod for Minecraft | IDI | 58 | Beacon is a free, open-source Fabric client mod for Minecraft 26.2 with 56 vanilla-server-safe utility, render and world modules. Download and source code. | 155 |
| `/projects/championscode` | ChampionsCode, Fabric research mod for Minecraft | IDI | 54 | ChampionsCode is a free Fabric mod for Minecraft 26.3 for authorized, defensive server and plugin research and controlled runtime Java addon development. | 153 |
| `/projects/nulltrace` | NullTrace, Fabric privacy mod for Minecraft | IDI | 49 | NullTrace is a free Fabric privacy mod for Minecraft: client brand spoofing, fingerprint protection and tracking defenses across four supported game versions. | 158 |
| `/projects/venomous` | Venomous, Meteor Client addon for Minecraft 26.2 | IDI | 54 | Venomous is an optimized, refined Meteor Client addon for Minecraft 26.2 - free and open source, with stable releases and nightly builds on GitLab. | 147 |
| `/projects/website` | This website: how idi-official.pages.dev works | IDI | 52 | How this site is built: committed static HTML with generated WebP assets, live GitLab data, no framework and no build server. | 125 |
| `/projects/zonedout` | ZonedOut, Fabric seed-analysis mod for Minecraft | IDI | 54 | ZonedOut is a free Fabric client mod for Minecraft 26.3 with combat and utility features, a Metro-style UI and a 36-module world-generation analysis suite. | 155 |
| `/projects/beacon/modules` | Beacon modules: all 56 Fabric utilities, listed | IDI | 53 | Every module Beacon registers, with the description it ships with and a link to its source: AFK Fisher, AutoEat, Freecam, LightOverlay and 52 more. | 147 |

The homepage title was the bare brand name (`International Duck Incorporated`);
it is now `International Duck - free Minecraft mods and tools`.

## 3. `/projects/beacon/modules`

A generated directory of all **56 modules** Beacon registers, from Beacon's own
registration list at commit `62d569a2` - not from the README, so the
count is whatever the code says: Utility 21 · Render 16 · World 6 · Misc 10 · Fun 3.

* One card per module with a stable anchor (`/projects/beacon/modules#afk-fisher`),
  the module's own description string, a link to the `.java` file that defines it,
  a Download link and a Source link.
* Grouped into the five categories with jump chips at the top.
* Each `<h2>` category section and every card is linkable; the page footer states
  exactly where the list came from (source file, commit, commit date, snapshot date)
  so it can be re-verified.
* `ItemList` + `BreadcrumbList` JSON-LD.

**One gap, deliberate:**

* **The module screenshots are placeholder tiles** - initials on a grid, with a
  line of copy above them saying so. The real ones are a drop-in:
  `assets/modules/<module-id>.png` (or `.webp`) plus a small
  `tools/apply_module_shots.py`, which is not written yet.

Every Download link on the page, and the hero button, now go to the **Beacon QoL
CurseForge listing** (`https://www.curseforge.com/minecraft/mc-mods/beacon-qol`,
project 1720579), with GitLab releases kept as the second button for tagged
stable builds. `CURSEFORGE_URL`, `CURSEFORGE_NAME` and `RELEASES_URL` at the top
of `tools/gen_module_page.py` are the only place those URLs live. The Beacon page
links the same listing from its status pill, its facts row and its release
callout, and its JSON-LD carries `installUrl`.

## 4. `/changelog`

Every version of every project, transcribed from each repository's `CHANGELOG.md`
and cross-referenced with the GitLab releases API: **36 version sections, 302 individual
entries** (Beacon 5, Venomous 5, NullTrace 5, ChampionsCode 20, Bagley 1). Each version is a `<details>` with its date, a link to
the matching GitLab release (or an explicit "no tagged release yet" when the
version has no tag - never a guessed date), the artifact count, and the entries
themselves with issue references linked.

*n* newest versions per project start open; the rest are one click away.
Also linked from the footer of every page and listed in `sitemap.xml` and
`llms.txt`.

## Also in this patch

* **Beacon's project page moved to `projects/beacon/index.html`.** The module
  directory lives at `projects/beacon/modules`, and once a `projects/beacon/`
  directory exists, a flat `projects/beacon.html` makes the route depend on host
  resolution quirks (Apache-style directory precedence vs Cloudflare's flat-file
  precedence). A directory index removes the ambiguity: `/projects/beacon` is
  unambiguous on any host, and `_redirects` 301s `/projects/beacon.html` and
  `/projects/beacon/index.html` to it. `tools/sitegen.py` (which builds the new
  pages out of that page's shell) was repointed.
* **The sitemap is now derived from each page's own canonical tag**, so the
  sitemap and the canonicals cannot disagree. Still 20 URLs, both new routes
  included.
* **Two accessibility failures, fixed because the new pages inherited them:**
  * white on the site blue `--blue` (#5a9bf2) is only 2.84:1 - the filled
    `.button-blue` is deepened to #3f74c0 (4.70:1) and #3a6cb4 on hover (5.27:1).
    The `--blue` token itself is untouched, so links, borders and focus rings
    keep the brand colour.
  * breadcrumb text was #657069, 3.8:1 on the page background, at 8.6px - it now
    uses the site's own `--muted` token (~7:1).
* **Changelog summary bug**: the version label in each `<summary>` was being
  overwritten by the section-heading loop variable, leaving 24 of 36 summaries
  blank. Fixed in `tools/gen_changelog_page.py`.
* **`tools/build.py` now runs every step.** The individual scripts end in
  `raise SystemExit(main())`, which `runpy` used to turn into "stop after step
  one"; the build catches that, keeps going, and fails loudly on a real non-zero
  exit. The sprite pass moved after the two page generators, so a regenerated
  page picks up its icons in the same run. Two consecutive runs now produce
  byte-identical output.
* `.gitignore` added for `__pycache__/`.

## Verification

Lighthouse, local server, mobile emulation, one run per page:

| Route | Perf | A11y | Best practices | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| `/projects/beacon/modules` | 100 | 100 | 100 | 100 | 1.24 s | 0.000 |
| `/changelog` | 100 | 100 | 100 | 100 | 1.37 s | 0.000 |
| `/projects/beacon` | 100 | 100 | 100 | 100 | 1.19 s | 0.000 |
| `/` | 100 | 100 | 100 | 100 | 1.88 s | 0.000 |

Playwright, 1400x1000 and 390x844: both new pages render with no console errors,
no failed requests, no horizontal overflow; all 56 card anchors and both category
anchors resolve and scroll into view; `<details>` toggles; the footer `Changelog`
link and Beacon's "All 56 modules" button both land on the right page.

## Refreshing the snapshots

The generated pages read checked-in snapshots, never the network:

```bash
python3 tools/fetch_beacon_modules.py   # data/beacon-modules.json (56 modules)
python3 tools/fetch_changelogs.py       # data/changelogs.json    (36 versions)
python3 tools/build.py                  # regenerate pages, sitemap, hashes
```

`python3 tools/apply_page_seo.py --check` afterwards should print
`would update 0 of 20 pages`.
