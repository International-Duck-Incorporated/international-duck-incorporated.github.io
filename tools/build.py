#!/usr/bin/env python3
"""Run every generator in the order the committed artifacts depend on.

The handwritten sources are the page HTML, the css/*.css modules (which cascade
in MODULE_ORDER) and the root *.js files. Four committed artifacts are derived
from them:

  css/bundle.css              <- tools/bundle_css.py
  assets/*.webp               <- tools/optimize_images.py   (needs Pillow)
  <picture> pairs in HTML     <- tools/apply_image_sources.py
  projects/beacon/modules.html<- tools/gen_module_page.py    (from data/beacon-modules.json)
  changelog.html              <- tools/gen_changelog_page.py (from data/changelogs.json)
  head title/description/og   <- tools/apply_page_seo.py
  footer + Beacon links       <- tools/apply_site_links.py
  sitemap.xml                 <- tools/gen_sitemap.py
  ?v=<hash> cache-busted refs <- tools/bust_cache.py

  data/*.json                 <- tools/fetch_beacon_modules.py, tools/fetch_changelogs.py
                                 (network; snapshots are committed, so the build does not
                                 need GitLab to be reachable)

Run from the repo root:  python3 tools/build.py

Cloudflare Pages and GitLab Pages both serve the repository as-is, so these
artifacts are committed and must be regenerated (and committed) whenever a
source file changes. This script only chains the four tools; each of them is
idempotent and can also be run on its own.
"""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

STEPS = [
    "bundle_css.py",
    "optimize_images.py",
    "apply_image_sources.py",
    # Page generators. These read the checked-in snapshots in data/ and never the
    # network: run tools/fetch_beacon_modules.py / tools/fetch_changelogs.py first
    # when a project has moved on. They rebuild the page shell from
    # projects/beacon/index.html, so the sprite pass runs after them, not before.
    "gen_module_page.py",
    "gen_changelog_page.py",
    "apply_svg_sprite.py",      # every page gets the icons it references
    # Site-wide passes, in this order: copy -> metadata -> links -> sitemap.
    "apply_module_count.py",
    "apply_page_seo.py",
    "apply_site_links.py",
    "gen_sitemap.py",
    "bust_cache.py",
    "apply_image_sources.py",  # a no-op second pass: keeps the pair pass honest
    "bust_cache.py",           # after every rewrite, hashes are recomputed
]


def main() -> None:
    root = Path(__file__).resolve().parent
    sys.path.insert(0, str(root))
    for step in STEPS:
        print(f"--- {step}")
        try:
            runpy.run_path(str(root / step), run_name="__main__")
        except SystemExit as status:
            # Each tool ends in raise SystemExit(main()); under runpy that would
            # otherwise end this process at the first step.
            if status.code not in (0, None):
                raise SystemExit(f"{step} failed (exit {status.code})") from status


if __name__ == "__main__":
    main()
