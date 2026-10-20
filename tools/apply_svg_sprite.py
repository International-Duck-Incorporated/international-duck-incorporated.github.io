#!/usr/bin/env python3
"""Give every page the SVG symbols it actually references.

Each page carries its own inline `svg.svg-sprite` with only the icons that page
happened to need, and the sets drifted: beacon.html references `#i-external` (and
pages built from it inherit the gap) without defining it, so those icons render
as nothing. This tool builds one library from every definition found anywhere in
the repository and appends whichever symbols a page is missing, so a `<use>`
reference always resolves.

Definitions are copied verbatim - this does not redraw or restyle any icon.

Run from the repo root:  python3 tools/apply_svg_sprite.py
"""

from __future__ import annotations

import re
from collections import OrderedDict
from pathlib import Path

SPRITE = re.compile(r'<svg class="svg-sprite"[^>]*>(?P<body>.*?)</svg>', re.S)
SYMBOL = re.compile(r'<symbol id="(?P<id>[\w-]+)".*?</symbol>', re.S)
USE = re.compile(r'href="#(?P<id>i-[\w-]+)"')


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    pages = [p for p in sorted(root.rglob("*.html")) if ".git" not in p.parts]
    sources = {page: page.read_text(encoding="utf-8") for page in pages}

    # One definition per symbol id, taken from whichever page defines it first.
    library: "OrderedDict[str, str]" = OrderedDict()
    for source in sources.values():
        sprite = SPRITE.search(source)
        if not sprite:
            continue
        for definition in SYMBOL.finditer(sprite.group("body")):
            library.setdefault(definition.group("id"), definition.group(0))

    updated_pages = 0
    added_total = 0
    for page, source in sources.items():
        sprite = SPRITE.search(source)
        if not sprite:
            continue
        defined = set(re.findall(r'<symbol id="([\w-]+)"', sprite.group("body")))
        referenced = set(USE.findall(source))
        missing = [name for name in referenced - defined if name in library]
        unknown = sorted((referenced - defined) - set(library))
        if unknown:
            print(
                f"  note: {page.relative_to(root)} references {', '.join('#' + u for u in unknown)} "
                f"(no definition anywhere in the repo)"
            )
        if not missing:
            continue
        # Keep a stable, predictable order in the appended tail.
        additions = "".join(library[name] for name in sorted(missing))
        new_sprite = sprite.group(0).replace("</svg>", additions + "</svg>", 1)
        new_source = source[: sprite.start()] + new_sprite + source[sprite.end() :]
        page.write_text(new_source, encoding="utf-8")
        updated_pages += 1
        added_total += len(missing)

    print(
        f"symbols in library: {len(library)}; added {added_total} symbol(s) to {updated_pages} page(s)"
    )


if __name__ == "__main__":
    main()
