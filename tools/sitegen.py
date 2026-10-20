#!/usr/bin/env python3
"""Shared helpers for the generated pages (module directory, changelog).

The site's pages carry a lot of boilerplate that must stay identical: the
low-end-device bootstrap script, the preconnects, the inline SVG symbol sprite,
the topbar navigation and the footer. Rather than hand-maintaining a second copy
of it in a template, the generators lift those blocks out of an existing page -
`projects/beacon/index.html` by default - and re-assemble them around new content. A
change to the sprite or the nav therefore flows into the generated pages on the
next build instead of drifting.

Page metadata (title, description, canonical, og:*) is deliberately *not* owned
here: `tools/apply_page_seo.py` rewrites it for every page from one table after
generation, so the generated pages and the hand-written ones cannot disagree.
"""

from __future__ import annotations

import html
import re
from pathlib import Path

REFERENCE_PAGE = "projects/beacon/index.html"

SPRITE = re.compile(r'<svg class="svg-sprite".*?</svg>', re.S)
HEADER = re.compile(r'<header class="topbar".*?</header>', re.S)
FOOTER = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)
JSONLD = re.compile(r'\s*<script type="application/ld\+json">.*?</script>', re.S)
STYLESHEET = re.compile(r'<link rel="stylesheet" href="[^"]+">')
PAGE_SCRIPTS = re.compile(r'\s*<script src="[^"]+"[^>]*></script>')
HEAD_DROP = re.compile(
    r'\s*(?:<title>.*?</title>|<meta name="description"[^>]*>'
    r'|<meta property="og:[^"]*"[^>]*>|<meta name="twitter:[^"]*"[^>]*>'
    r'|<meta name="robots"[^>]*>|<link rel="canonical"[^>]*>)',
    re.S,
)


def read_shell(root: Path, reference: str = REFERENCE_PAGE) -> dict:
    """Lift the reusable parts out of an existing page."""
    source = (root / reference).read_text(encoding="utf-8")
    head = source.split("<head>", 1)[1].split("</head>", 1)[0]
    head = HEAD_DROP.sub("", head)
    head = JSONLD.sub("", head)
    # Dropping a tag leaves its indentation behind as a whitespace-only line.
    head = re.sub(r"[ \t]+\n", "\n", head)
    stylesheet = STYLESHEET.search(head)
    # The reference page's own stylesheet links and scripts are replaced with the
    # set the generated page asks for (same bundle, only the scripts it needs).
    head = PAGE_SCRIPTS.sub("", head)
    head = STYLESHEET.sub("", head)
    shells = {
        "head": head.strip("\n"),
        "sprite": SPRITE.search(source).group(0),
        "header": HEADER.search(source).group(0),
        "footer": FOOTER.search(source).group(0),
        "stylesheet": stylesheet.group(0) if stylesheet else LINK_STYLESHEET_FALLBACK,
    }
    missing = [key for key in ("sprite", "header", "footer") if not shells[key]]
    if missing:
        raise SystemExit(f"could not find {missing} in {reference}")
    return shells


LINK_STYLESHEET_FALLBACK = '<link rel="stylesheet" href="/css/bundle.css">'


def nav_with_active(header: str, active: str | None) -> str:
    """Move the `active` class onto `active` (a nav href), leaving the rest unset."""
    header = re.sub(
        r'<a class="[^"]*active[^"]*" href="/">Overview</a>', '<a href="/">Overview</a>', header
    )
    header = header.replace(
        '<a href="/projects">Projects</a>', '<a class="active" href="/projects">Projects</a>'
    )
    if active == "/":
        header = header.replace(
            '<a href="/">Overview</a>', '<a class="active" href="/">Overview</a>'
        )
    return header


def assemble(
    *,
    shells: dict,
    url_path: str,
    title: str,
    description: str,
    body: str,
    scripts: list[str],
    jsonld: str | None,
    body_attrs: str = "",
    active_nav: str | None = None,
    extra_head: str = "",
) -> str:
    """Compose a page from the shell plus generated content."""
    head_parts = [
        shells["head"],
        f"  <title>{html.escape(title)}</title>",
        f'  <meta name="description" content="{html.escape(description, quote=True)}">',
        f'  <link rel="canonical" href="https://idi-official.pages.dev{url_path}">',
    ]
    if extra_head:
        head_parts.append("  " + extra_head)
    if jsonld:
        head_parts.append(jsonld)
    head_parts.append("  " + shells["stylesheet"])
    for source in scripts:
        head_parts.append(f'  <script src="{source}" defer></script>')
    head = "\n".join(part.rstrip("\n") for part in head_parts if part)

    header = nav_with_active(shells["header"], active_nav)
    footer = shells["footer"]
    document = (
        '<!doctype html>\n<html lang="en">\n<head>\n'
        f"{head}\n</head>\n<body{(' ' + body_attrs) if body_attrs else ''}>\n"
        f"{shells['sprite']}\n"
        f"{header}\n"
        f"{body.strip()}\n"
        f"{footer}\n</body>\n</html>\n"
    )
    # Never emit trailing whitespace: it shows up as a "whitespace errors"
    # warning when the patch is applied.
    return re.sub(r"[ \t]+\n", "\n", document)


# --------------------------------------------------------------------- markdown
CODE = re.compile(r"`([^`]+)`")
BOLD = re.compile(r"\*\*([^*]+)\*\*")
ITALIC = re.compile(r"(?<![\w*])\*([^*\n]+)\*(?![\w*])")
LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")


def inline_md(text: str, base_url: str | None = None) -> str:
    """Render the markdown inline syntax the changelogs actually use.

    Escapes first, then applies code / bold / links, so nothing in the source
    text can inject markup.
    """
    out = html.escape(text, quote=False)
    out = CODE.sub(lambda m: f"<code>{m.group(1)}</code>", out)
    out = BOLD.sub(lambda m: f"<strong>{m.group(1)}</strong>", out)
    out = ITALIC.sub(lambda m: f"<em>{m.group(1)}</em>", out)

    def link(match: re.Match) -> str:
        label, href = match.group(1), match.group(2)
        if href.startswith(("http://", "https://")):
            return f'<a href="{html.escape(href, quote=True)}" target="_blank" rel="noreferrer">{label}</a>'
        if base_url:
            href = f"{base_url.rstrip('/')}/{href.lstrip('./')}"
            return f'<a href="{html.escape(href, quote=True)}" target="_blank" rel="noreferrer">{label}</a>'
        return label

    return LINK.sub(link, out)


def render_items(items: list[dict], base_url: str | None = None) -> str:
    parts = ["<ul>"]
    for item in items:
        text = inline_md(item["text"], base_url)
        parts.append(
            f"<li>{text}</li>"
            if not item.get("children")
            else f"<li>{text}{render_items(item['children'], base_url)}</li>"
        )
    parts.append("</ul>")
    return "".join(parts)
