#!/usr/bin/env python3
"""Inject crawlability / sharing metadata into the <head> of every indexable page.

Adds, per page:
  * <link rel="preconnect"> / dns-prefetch for the active GitLab API origin
  * <link rel="canonical"> pointing at the canonical production host
  * og:url, og:site_name, og:locale, og:image (+ width/height/alt) on the site default card
  * twitter:card / twitter:title / twitter:description / twitter:image

Canonical host: https://idi-official.pages.dev  (GitLab Pages mirrors carry the same
canonical so both hosts agree on which URL to index).

Idempotent: pages that already contain rel="canonical" are left alone.
Run from repo root:  python3 tools/apply_seo_head.py
"""
import re
from pathlib import Path

SITE = "https://idi-official.pages.dev"
OG_IMAGE = SITE + "/assets/og-default.png"

PAGES = {
    "index.html": "/",
    "activity.html": "/activity",
    "migration.html": "/migration",
    "members/index.html": "/members/",
    "members/0xffshell.html": "/members/0xffshell",
    "members/3spress0.html": "/members/3spress0",
    "members/e-vdv-hu.html": "/members/e-vdv-hu",
    "members/midas735.html": "/members/midas735",
    "members/superivar.html": "/members/superivar",
    "members/jojo-8002.html": "/members/jojo-8002",
    "projects/index.html": "/projects/",
    "projects/bagley.html": "/projects/bagley",
    "projects/beacon.html": "/projects/beacon",
    "projects/championscode.html": "/projects/championscode",
    "projects/nulltrace.html": "/projects/nulltrace",
    "projects/venomous.html": "/projects/venomous",
    "projects/website.html": "/projects/website",
    "projects/zonedout.html": "/projects/zonedout",
}


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;")


def apply(path: Path, url: str) -> bool:
    src = path.read_text(encoding="utf-8", errors="replace")
    if 'rel="canonical"' in src:
        return False

    title = (re.search(r"<title>(.*?)</title>", src, re.S) or [None, ""])[1].strip()
    desc = (re.search(r'<meta name="description" content="(.*?)"', src) or [None, ""])[1]
    desc = desc.replace("&amp;", "&")

    # 1) preconnect early, right after the viewport meta
    pre = ['  <link rel="preconnect" href="https://gitlab.com" crossorigin>',
           '  <link rel="dns-prefetch" href="https://gitlab.com">']
    src = src.replace('  <meta name="viewport" content="width=device-width, initial-scale=1">',
                      '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' + "\n".join(pre), 1)

    # 2) normalise og:image onto the self-hosted card, wherever it sits
    if re.search(r'<meta property="og:image" content="', src):
        src = re.sub(r'(<meta property="og:image" content=")[^"]*(")', rf"\g<1>{OG_IMAGE}\g<2>", src, count=1)
    else:
        src = src.replace("<title>", f'  <meta property="og:image" content="{OG_IMAGE}">\n  <title>', 1)

    # 3) canonical + remaining share metadata before </head>
    block = [
        f'  <link rel="canonical" href="{SITE}{url}">',
        f'  <meta property="og:url" content="{SITE}{url}">',
        '  <meta property="og:site_name" content="International Duck Incorporated">',
        '  <meta property="og:locale" content="en_US">',
        '  <meta property="og:image:width" content="1200">',
        '  <meta property="og:image:height" content="630">',
        '  <meta property="og:image:alt" content="International Duck Incorporated - open-source Minecraft mods, tools and experiments">',
        '  <meta name="twitter:card" content="summary_large_image">',
        f'  <meta name="twitter:title" content="{esc(title)}">',
        f'  <meta name="twitter:description" content="{esc(desc)}">',
        f'  <meta name="twitter:image" content="{OG_IMAGE}">',
    ]
    src = src.replace("</head>", "\n".join(block) + "\n</head>", 1)
    path.write_text(src, encoding="utf-8")
    return True


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    done = [u for rel, u in PAGES.items() if apply(root / rel, u)]
    print(f"updated {len(done)} pages: {', '.join(sorted(done))}")


if __name__ == "__main__":
    main()
