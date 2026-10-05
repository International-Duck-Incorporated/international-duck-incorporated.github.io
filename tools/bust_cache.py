#!/usr/bin/env python3
"""Add content-hash cache-busting query strings to local CSS/JS references.

Every <link rel="stylesheet" href="/css/*.css"> and <script src="/*.js"> in the
HTML gets ?v=<first 8 chars of the md5 of that file>. Combined with the
immutable Cache-Control rules in _headers this lets Cloudflare cache CSS/JS for
a year while still picking up changes instantly (new content => new URL).

Run from the repo root:  python3 tools/bust_cache.py
Idempotent: existing ?v= values are replaced on each run.
"""
import hashlib
import re
from pathlib import Path


def vhash(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]


def main() -> None:
    root = Path(__file__).resolve().parent.parent

    css = {p.stem: vhash(p) for p in (root / "css").glob("*.css")}
    js = {p.stem: vhash(p) for p in root.glob("*.js") if p.is_file()}

    changed = 0
    for html in sorted(root.rglob("*.html")):
        if ".git" in html.parts:
            continue
        src = html.read_text(encoding="utf-8", errors="replace")
        orig = src

        src = re.sub(r'href="/css/(?P<name>[\w-]+)\.css(?:\?v=[\w-]+)?"',
                     lambda m: f'href="/css/{m.group("name")}.css?v={css[m.group("name")]}"', src)
        src = re.sub(r'src="/(?P<name>[\w-]+)\.js(?:\?v=[\w-]+)?"',
                     lambda m: f'src="/{m.group("name")}.js?v={js[m.group("name")]}"', src)

        if src != orig:
            html.write_text(src, encoding="utf-8")
            changed += 1

    print(f"hashed {len(css)} css + {len(js)} js; updated {changed} html files")


if __name__ == "__main__":
    main()
