# International Duck Incorporated

Static GitLab Pages site for [International Duck Incorporated](https://gitlab.com/international-duck-incorporated)

**Platform policy:** GitLab is IDI's active platform and source of truth for development, releases, issues, and live activity. The former GitHub organization is currently hidden/private from public view, so this site does not call its APIs or link to its mirror. GitHub references are retained only where they explain the migration history or unavailable-data status.

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
