#!/usr/bin/env python3
"""Keep the site's own cross-links consistent across every page.

The footer gains links to Glyphsmith, Changelog and Contact. The Beacon project
page also links to its module directory. Detection is based on link targets, not
whitespace, so Prettier-formatted markup stays idempotent.

Run from the repo root: python3 tools/apply_site_links.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

GLYPHSMITH_LINK = '<a href="/glyphsmith">Glyphsmith</a>'
CHANGELOG_LINK = '<a href="/changelog">Changelog</a>'
LICENSE_LINK = '<a href="/license">License</a>'
CONTACT_LINK = '<a href="mailto:0xffshell@duck.com">Contact</a>'
FOOTER_LINKS = (
    ("/changelog", CHANGELOG_LINK, None),
    ("mailto:0xffshell@duck.com", CONTACT_LINK, None),
    ("/license", LICENSE_LINK, "mailto:0xffshell@duck.com"),
    ("/glyphsmith", GLYPHSMITH_LINK, "/changelog"),
)
FOOTER = re.compile(
    r'<footer\b(?=[^>]*\sclass\s*=\s*["\']site-footer["\'])[^>]*>.*?</footer\s*>',
    re.S | re.I,
)
NAV = re.compile(r"<nav\b[^>]*>.*?</nav\s*>", re.S | re.I)

# On the Beacon page, alongside the existing action row.
MODULES_LINK = (
    '<a class="button button-glass" href="/projects/beacon/modules">'
    '<svg><use href="#i-arrow"/></svg>All {count} modules'
    "</a>"
)
MODULES_ANCHOR = re.compile(
    r'<a\b(?=[^>]*\sclass\s*=\s*["\']button button-glass["\'])'
    r'(?=[^>]*\shref\s*=\s*["\']/projects/beacon/modules["\'])[^>]*>.*?</a\s*>',
    re.S | re.I,
)
MODULE_ARROW = re.compile(r'<use\b(?=[^>]*\shref\s*=\s*["\']#i-arrow["\'])[^>]*>', re.S | re.I)
BEACON_ANCHOR = re.compile(
    r'<a\b(?=[^>]*\sclass\s*=\s*["\']button button-glass["\'])'
    r"(?=[^>]*\sdata-beacon-release-link(?:\s|=|>))[^>]*>",
    re.S | re.I,
)


def link_pattern(href: str) -> re.Pattern[str]:
    """Match one anchor by href, regardless of line breaks or attribute order."""
    return re.compile(
        r'<a\b(?=[^>]*\shref\s*=\s*["\']' + re.escape(href) + r'["\'])[^>]*>.*?</a\s*>',
        re.S | re.I,
    )


def keep_first_link(source: str, href: str) -> tuple[str, int]:
    count = 0

    def keep(match: re.Match[str]) -> str:
        nonlocal count
        count += 1
        return match.group(0) if count == 1 else ""

    return link_pattern(href).sub(keep, source), count


def ensure_link(nav: str, href: str, markup: str, before_href: str | None = None) -> str:
    nav, _ = keep_first_link(nav, href)
    if link_pattern(href).search(nav):
        return nav

    insertion_point = None
    if before_href:
        before = link_pattern(before_href).search(nav)
        if before:
            insertion_point = before.start()
    if insertion_point is None:
        closing = re.search(r"</nav\s*>", nav, re.I)
        if not closing:
            return nav
        insertion_point = closing.start()

    return nav[:insertion_point] + markup + nav[insertion_point:]


def normalize_footer(block: str) -> str:
    nav_match = NAV.search(block)
    if not nav_match:
        return block

    nav = nav_match.group(0)
    for href, markup, before_href in FOOTER_LINKS:
        nav = ensure_link(nav, href, markup, before_href)

    if nav == nav_match.group(0):
        return block
    return block[: nav_match.start()] + nav + block[nav_match.end() :]


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    snapshot = root / "data/beacon-modules.json"
    count = (
        json.loads(snapshot.read_text(encoding="utf-8"))["count"] if snapshot.is_file() else None
    )
    footers = beacon = 0

    for page in sorted(root.rglob("*.html")):
        if ".git" in page.parts:
            continue
        source = page.read_text(encoding="utf-8")
        updated = source

        footer = FOOTER.search(updated)
        if footer:
            block = footer.group(0)
            patched = normalize_footer(block)
            if patched != block:
                updated = updated[: footer.start()] + patched + updated[footer.end() :]
                footers += 1

        if page.relative_to(root).as_posix() == "projects/beacon/index.html":
            link = MODULES_LINK.format(count=count)
            module_link = MODULES_ANCHOR.search(updated)
            if module_link:
                markup = module_link.group(0)
                label = " ".join(re.sub(r"<[^>]*>", "", markup).split())
                if label != f"All {count} modules" or not MODULE_ARROW.search(markup):
                    updated = updated[: module_link.start()] + link + updated[module_link.end() :]
            else:
                anchor = BEACON_ANCHOR.search(updated)
                if anchor:
                    updated = (
                        updated[: anchor.start()]
                        + link
                        + "\n            "
                        + anchor.group(0)
                        + updated[anchor.end() :]
                    )
            if link in updated and link not in source:
                beacon += 1

        if updated != source:
            page.write_text(updated, encoding="utf-8")

    print(
        f"footer links (changelog, contact): {footers} page(s); "
        f"Beacon modules link: {beacon} page(s)"
    )


if __name__ == "__main__":
    main()
