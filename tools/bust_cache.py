#!/usr/bin/env python3
"""Add content-hash cache-busting query strings to local CSS/JS/asset refs.

Every <link rel="stylesheet" href="/css/*.css"> and <script src="/*.js"> in the
HTML gets ?v=<first 8 chars of the md5 of that file>, and so does every local
reference to a file under assets/ - in HTML (src, srcset, href), in the
stylesheets (url(), image-set()) and in the root scripts (the avatar and
backdrop path tables). Combined with the immutable Cache-Control rules in
_headers this lets Cloudflare cache everything for a year while still picking
up changes instantly (new content => new URL). Swapping a member avatar used
to keep its URL and therefore stayed frozen in returning visitors' browsers
for a year; hashed asset refs close that hole.

Absolute URLs (og:image, JSON-LD) are left alone on purpose: they are identity
URLs for crawlers and scrapers, not browser downloads.

Run from the repo root:  python3 tools/bust_cache.py
Idempotent: existing ?v= values are replaced on each run.
"""
import hashlib
import re
from pathlib import Path

ASSET_EXT = ("png", "webp", "jpg", "jpeg", "gif", "svg", "mp4", "webm")
ASSET_REF = re.compile(
    r"""(["'(])/assets/(?P<name>[\w./-]+\.(?:""" + "|".join(ASSET_EXT) + r"""))(?:\?v=[\w-]+)?"""
)


def vhash(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()[:8]


def main() -> None:
    root = Path(__file__).resolve().parent.parent

    css = {p.stem: vhash(p) for p in (root / "css").glob("*.css")}
    js = {p.stem: vhash(p) for p in root.glob("*.js") if p.is_file()}
    assets = {
        p.relative_to(root / "assets").as_posix(): vhash(p)
        for p in (root / "assets").rglob("*")
        if p.is_file() and p.suffix.lstrip(".").lower() in ASSET_EXT
    }

    def fix_asset(match: re.Match) -> str:
        digest = assets.get(match.group("name"))
        if not digest:
            return match.group(0)
        return f'{match.group(1)}/assets/{match.group("name")}?v={digest}'

    changed = 0
    pages = sorted(root.rglob("*.html"))
    pages += sorted((root / "css").glob("*.css"))
    pages += sorted(p for p in root.glob("*.js") if p.is_file())
    for page in pages:
        if ".git" in page.parts:
            continue
        src = page.read_text(encoding="utf-8", errors="replace")
        orig = src

        # CSS/JS reference rewriting belongs to HTML only: some root scripts
        # quote their own script tag in a header comment, and rewriting those
        # would change the file's hash on every run (never converging).
        if page.suffix == ".html":
            src = re.sub(r'href="/css/(?P<name>[\w-]+)\.css(?:\?v=[\w-]+)?"',
                         lambda m: f'href="/css/{m.group("name")}.css?v={css[m.group("name")]}"', src)
            src = re.sub(r'src="/(?P<name>[\w-]+)\.js(?:\?v=[\w-]+)?"',
                         lambda m: f'src="/{m.group("name")}.js?v={js[m.group("name")]}"', src)
        src = ASSET_REF.sub(fix_asset, src)

        if src != orig:
            page.write_text(src, encoding="utf-8")
            changed += 1

    print(f"hashed {len(css)} css + {len(js)} js + {len(assets)} assets; updated {changed} files")


if __name__ == "__main__":
    main()
