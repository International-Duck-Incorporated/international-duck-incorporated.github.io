#!/usr/bin/env python3
"""Run every generator in the order the committed artifacts depend on.

The handwritten sources are the page HTML, the css/*.css modules (which cascade
in MODULE_ORDER) and the root *.js files. Four committed artifacts are derived
from them:

  css/bundle.css              <- tools/bundle_css.py
  assets/*.webp               <- tools/optimize_images.py   (needs Pillow)
  <picture> pairs in HTML     <- tools/apply_image_sources.py
  ?v=<hash> cache-busted refs <- tools/bust_cache.py

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
    "bust_cache.py",
    "apply_image_sources.py",  # a no-op second pass: keeps the pair pass honest
    "bust_cache.py",           # after every rewrite, hashes are recomputed
]


def main() -> None:
    root = Path(__file__).resolve().parent
    sys.path.insert(0, str(root))
    for step in STEPS:
        print(f"--- {step}")
        runpy.run_path(str(root / step), run_name="__main__")


if __name__ == "__main__":
    main()
