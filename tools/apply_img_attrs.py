#!/usr/bin/env python3
"""Add sensible loading attributes to <img> tags.

Rules (idempotent):
  * icons / avatars / member photos that sit in grids or below the fold
    (width >= 64, or assets/member-*|contributor-*)  -> loading="lazy" decoding="async"
  * everything else (tiny topbar/footer brand marks) -> decoding="async"

The LCP element on the homepage is a JS-set backdrop, not an <img>, so no
fetchpriority hint is emitted anywhere.

Run from repo root:  python3 tools/apply_img_attrs.py
"""

import re
from pathlib import Path


def fix(match: re.Match) -> str:
    tag = match.group(0)
    src = (re.search(r'src="([^"]*)"', tag) or [None, ""])[1]
    width = re.search(r'width="(\d+)"', tag)
    width = int(width.group(1)) if width else 0

    below_fold = width >= 64 or bool(re.search(r"(member|contributor)-", src))
    if below_fold:
        if "loading=" in tag:
            add = [] if "decoding=" in tag else ['decoding="async"']
        else:
            add = ['loading="lazy"'] + ([] if "decoding=" in tag else ['decoding="async"'])
    else:
        add = [] if "decoding=" in tag else ['decoding="async"']
    if not add:
        return tag
    return tag[:-1].rstrip() + " " + " ".join(add) + ">"


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    changed = 0
    for html in sorted(root.rglob("*.html")):
        if ".git" in html.parts:
            continue
        src = html.read_text(encoding="utf-8", errors="replace")
        new = re.sub(r"<img\b[^>]*>", fix, src)
        if new != src:
            html.write_text(new, encoding="utf-8")
            changed += 1
    print(f"image attributes updated in {changed} files")


if __name__ == "__main__":
    main()
