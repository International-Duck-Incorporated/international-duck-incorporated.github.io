#!/usr/bin/env python3
"""Regenerate sitemap.xml from the HTML files that are meant to be indexed.

Run from the repo root:  python3 tools/gen_sitemap.py
Skips pages that declare <meta name="robots" content="noindex">.
<lastmod> is taken from the most recent commit that touched each file.
"""
import datetime
import re
import subprocess
import sys
from pathlib import Path

SITE = "https://idi-official.pages.dev"

# URL path for each page, matching how Cloudflare Pages serves them
# (directory indexes keep the trailing slash; pages do not).
PRIORITY = {
    "/": ("weekly", "1.0"),
    "/projects/": ("weekly", "0.9"),
    "/projects/beacon": ("weekly", "0.9"),
    "/projects/venomous": ("weekly", "0.9"),
    "/projects/nulltrace": ("weekly", "0.9"),
    "/projects/championscode": ("monthly", "0.8"),
    "/people/": ("monthly", "0.8"),
    "/projects/bagley": ("monthly", "0.7"),
    "/projects/zonedout": ("monthly", "0.7"),
    "/activity": ("weekly", "0.6"),
    "/migration": ("yearly", "0.6"),
    "/people/0xffshell": ("monthly", "0.6"),
    "/people/3spress0": ("monthly", "0.6"),
    "/people/e-vdv-hu": ("monthly", "0.6"),
    "/people/midas735": ("monthly", "0.6"),
    "/people/superivar": ("monthly", "0.6"),
    "/people/jojo-8002": ("monthly", "0.6"),
    "/projects/website": ("monthly", "0.5"),
}

ORDER = list(PRIORITY)


def url_for(path: Path) -> str:
    rel = path.as_posix()
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel[: -len(".html")]


def lastmod(path: Path) -> str:
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", path.as_posix()],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
        return out or datetime.date.today().isoformat()
    except subprocess.CalledProcessError:
        return datetime.date.today().isoformat()


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    entries = []
    for html in sorted(root.rglob("*.html")):
        if ".git" in html.parts:
            continue
        text = html.read_text(encoding="utf-8", errors="replace")
        if re.search(r'<meta\s+name="robots"\s+content="[^"]*noindex', text, re.I):
            continue
        entries.append((url_for(html.relative_to(root)), html))

    unknown = [u for u, _ in entries if u not in PRIORITY]
    if unknown:
        print(f"warning: pages missing priority mapping: {unknown}", file=sys.stderr)

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, path in sorted(entries, key=lambda e: ORDER.index(e[0]) if e[0] in ORDER else 99):
        changefreq, prio = PRIORITY.get(url, ("monthly", "0.5"))
        lines += ["  <url>",
                  f"    <loc>{SITE}{url}</loc>",
                  f"    <lastmod>{lastmod(path)}</lastmod>",
                  f"    <changefreq>{changefreq}</changefreq>",
                  f"    <priority>{prio}</priority>",
                  "  </url>"]
    lines.append("</urlset>")

    (root / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote sitemap.xml with {len(entries)} URLs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
