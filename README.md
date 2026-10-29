# International Duck Incorporated

**Open source. Built in the open.**

The official static website for [International Duck Incorporated (IDI)](https://gitlab.com/international-duck-incorporated), hosted on [Cloudflare Pages](https://idi-official.pages.dev).

IDI is an independent, developer-led organization focused on open-source software, developer tools, privacy, cybersecurity, Minecraft projects, and experimental AI systems. This repository contains the website, its source files, build tools, and generated content.

## Platform and development

IDI maintains an active presence on both GitLab and GitHub.

- **GitLab:** Primary development platform for repositories, releases, issues, and project activity.
- **GitHub:** Public development presence. On October 29, 2026, GitHub Support lifted the restrictions on the `@3spress0` account, and access to the IDI organization was restored.

Both platforms remain linked from the website. Historical migration documentation reflects the circumstances and platform status at the time it was written.

## Repository structure

The website is built from lightweight, static HTML, CSS, and JavaScript. Python scripts handle asset optimization, page generation, metadata, and build automation.

| Path | Purpose |
|---|---|
| `*.html` | Handwritten website pages |
| `css/` | Modular stylesheets and generated CSS bundle |
| `*.js` | Website functionality |
| `assets/` | Images, icons, and optimized assets |
| `data/` | Committed data snapshots for generated pages |
| `tools/` | Build, formatting, optimization, and generation scripts |
| `LIGHTHOUSE-FIXES.md` | Performance and accessibility improvements |
| `SEO-FIXES.md` | SEO, crawlability, and metadata improvements |

## Development

### Requirements

- Python 3
- [Ruff](https://docs.astral.sh/ruff/) for Python formatting
- [Prettier 3.6.2](https://prettier.io/) for web and configuration files
- Pillow for image optimization

Install Ruff:

```sh
python3 -m pip install ruff
```

### Code formatting

The project uses the following formatting tools:

- **Prettier 3.6.2:** HTML, CSS, JavaScript, JSON/JSONC, YAML, and Markdown.
- **Ruff:** Python source files.
- **EditorConfig:** Consistent editor settings.

Formatting configuration is maintained in `.editorconfig`, `.prettierrc.json`, and `pyproject.toml`.

Run the formatting and build workflow:

```sh
tools/format_code.sh
```

This script formats source files, rebuilds generated assets and pages, and formats generated HTML afterward.

XML files, including the generated sitemap, are excluded from Prettier because the configured parser does not support XML. The generated `css/bundle.css` is also excluded; its source modules are formatted individually.

### Building the website

The handwritten source files are the HTML pages, the ordered `css/*.css` modules, and the root JavaScript files.

Several build artifacts are committed to the repository because Cloudflare Pages and GitLab Pages serve the repository directly without requiring a separate build environment.

Run:

```sh
python3 tools/build.py
```

The build pipeline handles:

1. CSS bundling from the ordered stylesheet modules.
2. WebP image generation.
3. Responsive `<picture>` markup generation.
4. Content-based cache-busting hashes for CSS and JavaScript references.
5. Generated website pages.

Individual build scripts:

| Script | Responsibility |
|---|---|
| `tools/bundle_css.py` | Generates `css/bundle.css` |
| `tools/optimize_images.py` | Creates optimized WebP image assets |
| `tools/apply_image_sources.py` | Generates `<picture>` elements from image sources |
| `tools/bust_cache.py` | Updates CSS and JavaScript cache-busting hashes |

**Do not edit generated artifacts directly.** Modify their source files and rerun the build pipeline to keep generated output and cache-busting references synchronized.

## Generated pages and data

Some website pages are generated from committed data snapshots rather than maintained as handwritten HTML.

| Generated page | Generator | Source data |
|---|---|---|
| `/projects/beacon/modules` | `tools/gen_module_page.py` | `data/beacon-modules.json` |
| `/changelog` | `tools/gen_changelog_page.py` | `data/changelogs.json` |
| `/license` | `tools/gen_license_page.py` | `LICENSE.md` |

### Refreshing data snapshots

Snapshots are collected from the public GitLab API and committed to the repository.

Refresh them with:

```sh
python3 tools/fetch_beacon_modules.py
python3 tools/fetch_changelogs.py
python3 tools/build.py
```

The scripts retrieve:

- **Beacon modules:** Registered modules and their descriptions, extracted from `ModuleManager.java`.
- **Changelogs:** Project `CHANGELOG.md` files matched against their corresponding GitLab releases.
- **Generated pages:** Updated HTML based on the refreshed snapshots.

Snapshots are committed so that building the website does not require GitLab API access. This keeps deployments reproducible and prevents temporary API outages from breaking the build.

The Beacon module count is also derived automatically from `data/beacon-modules.json` through `tools/apply_module_count.py`. This keeps the displayed module count consistent with the underlying snapshot.

## SEO and metadata

Page metadata is centrally managed by:

```text
tools/apply_page_seo.py
```

This script controls:

- HTML page titles and descriptions
- Canonical URLs
- Open Graph metadata
- Twitter card metadata

Metadata is applied to all pages, including generated pages.

**When changing page metadata, update `tools/apply_page_seo.py` rather than editing individual HTML tags.**

## External project references

Beacon-related download links are maintained centrally where possible.

The module directory's download links, its hero button, and the two CurseForge references on the Beacon project page point to the public [Beacon QoL listing](https://www.curseforge.com/minecraft/mc-mods/beacon-qol).

The project URL and display name are defined in `tools/gen_module_page.py`:

- `CURSEFORGE_URL`
- `CURSEFORGE_NAME`

Update these constants if the listing changes.