# International Duck Incorporated

Static GitLab Pages site for [International Duck Incorporated](https://gitlab.com/international-duck-incorporated)

**Platform policy:** GitLab is IDI's active platform and source of truth for development, releases, issues, and live activity. The former GitHub organization is currently hidden/private from public view, so this site does not call its APIs or link to its mirror. GitHub references are retained only where they explain the migration history or unavailable-data status.

Change notes live in `LIGHTHOUSE-FIXES.md` (round 1: performance and
accessibility) and `SEO-FIXES.md` (round 2: crawlability, page heads, the module
directory and the changelog). The module page's Download links, its hero button
and the two CurseForge references on the Beacon page point at the public
listing (Beacon QoL, project 1720579); the URL and name live in
`tools/gen_module_page.py` as `CURSEFORGE_URL` / `CURSEFORGE_NAME`.

## Code formatting

HTML, CSS, JavaScript, JSON/JSONC, YAML and Markdown use Prettier 3.6.2; Python tools use Ruff's formatter. XML (including the generated sitemap) is excluded because Prettier has no XML parser here. The checked-in settings are `.editorconfig`, `.prettierrc.json` and `pyproject.toml`.

Install Ruff once with `python3 -m pip install ruff`. After editing sources, run the formatting/build script:

```sh
tools/format_code.sh
```

The script formats source files, rebuilds committed outputs, and formats generated HTML afterward. `css/bundle.css` is intentionally excluded from Prettier: it is generated from the formatted `css/*.css` source modules.

## Build steps

Handwritten sources are the page HTML, the `css/*.css` modules (in cascade
order) and the root `*.js` files. Four artifacts are generated from them and are
committed, because both Cloudflare Pages and GitLab Pages serve the repository
as-is. After editing a source, regenerate them so the `?v=` hashes in the HTML
keep matching:

```sh
python3 tools/build.py   # bundle CSS, WebP siblings, <picture> pairs, cache-bust hashes
```

Individual steps: `tools/bundle_css.py` (writes `css/bundle.css` from the ordered
modules), `tools/optimize_images.py` (writes the `assets/*.webp` siblings, needs
Pillow), `tools/apply_image_sources.py` (rewrites `<img>` to `<picture>` pairs),
`tools/bust_cache.py` (`?v=<content hash>` on every CSS/JS reference). Do not
hand-edit `css/bundle.css`, the `.webp` files or the hashes; edit the sources and
re-run the build.

### Generated pages and snapshots

Three pages are generated from committed files/snapshots rather than hand-written:

| Page                       | Generator                     | Data                       |
| -------------------------- | ----------------------------- | -------------------------- |
| `/projects/beacon/modules` | `tools/gen_module_page.py`    | `data/beacon-modules.json` |
| `/changelog`               | `tools/gen_changelog_page.py` | `data/changelogs.json`     |
| `/license`                 | `tools/gen_license_page.py`   | `LICENSE.md`               |

The snapshots come from the projects themselves and are refreshed on demand (they
need network access to the public GitLab API):

```sh
python3 tools/fetch_beacon_modules.py   # registered modules + their descriptions, from ModuleManager.java
python3 tools/fetch_changelogs.py       # every CHANGELOG.md, matched to GitLab releases
python3 tools/build.py                  # regenerate the pages from the snapshots
```

Snapshots are committed so the build itself never depends on GitLab being
reachable. The module count and the "N registered modules" copy on the site are
derived from `data/beacon-modules.json` by `tools/apply_module_count.py`, so the
number cannot go stale in the copy without the snapshot changing first.

Search and share metadata (title, description, canonical, Open Graph, Twitter) is
owned by `tools/apply_page_seo.py` for every page, including the generated ones -
edit the table there, not the tags in the HTML.
