#!/usr/bin/env python3
"""Keep the site's own cross-links consistent across every page.

The footer gains links to Glyphsmith, Changelog and Contact. The primary nav
gains the GitHub icon that mirrors the GitLab icon. Every top-level GitLab
repository link whose project also exists on GitHub gains a GitHub sibling next
to it. The Beacon project page also links to its module directory. Detection is
based on link targets, not whitespace, so Prettier-formatted markup stays
idempotent.

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
TOPBAR_NAV = re.compile(
    r'<nav\b(?=[^>]*\sclass\s*=\s*["\']main-nav["\'])[^>]*>.*?</nav\s*>', re.S | re.I
)
GITHUB_URL = "https://github.com/international-duck-incorporated"
GITLAB_ICON = re.compile(
    r'<a\b(?=[^>]*\sclass\s*=\s*["\']icon-link["\'])'
    r'(?=[^>]*\shref\s*=\s*["\']https://gitlab\.com/[^"\']+["\'])[^>]*>',
    re.S | re.I,
)

# Only projects that actually exist under the GitHub organization are mirrored.
# GitLab `home` is published as a GitHub Pages repository; `beacon-bagley` uses
# the GitHub casing `Beacon-Bagley`.
GITHUB_REPOS = {
    "home": "international-duck-incorporated.github.io",
    "beacon-bagley": "Beacon-Bagley",
    "Beacon": "Beacon",
    "Venomous": "Venomous",
    "NullTrace": "NullTrace",
    "ChampionsCode": "ChampionsCode",
    "Baritone": "Baritone",
}
GITHUB_ORG_URL = "https://github.com/International-Duck-Incorporated"
GITLAB_REPO_URL = re.compile(
    r"https://gitlab\.com/international-duck-incorporated/(?P<repo>[A-Za-z0-9_.-]+)/?"
)
ANCHOR = re.compile(r"<a\b[^>]*>.*?</a\s*>", re.S | re.I)
NEXT_ANCHOR = re.compile(r"\s*<a\b[^>]*>", re.S | re.I)
HREF = re.compile(r'\shref\s*=\s*["\']([^"\']+)["\']', re.I)
CLASS = re.compile(r'(class\s*=\s*["\'])([^"\']*)(["\'])', re.I)
REPO_LABELS = {
    "View repository": "GitHub repository",
    "View GitLab repository": "View GitHub repository",
    "View source": "View source on GitHub",
    "Browse the repository": "Browse on GitHub",
    "Inspect the project": "Inspect on GitHub",
    "Read the source": "Read the source on GitHub",
    "Open on GitLab": "Open on GitHub",
    "Repository": "GitHub repository",
    "GitLab": "GitHub",
}

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


def github_icon(indent: str) -> str:
    """Mirror the nav's GitLab icon with the GitHub logo at the same indentation."""
    inner = indent + "  "
    return (
        "<a\n"
        f'{inner}class="icon-link"\n'
        f'{inner}href="{GITHUB_URL}"\n'
        f'{inner}target="_blank"\n'
        f'{inner}rel="noreferrer"\n'
        f'{inner}aria-label="International Duck Incorporated on GitHub"\n'
        f'{inner}><svg><use href="#i-github" /></svg\n'
        f"{indent}></a>"
    )


def ensure_nav_github(nav: str) -> str:
    """Put the GitHub logo immediately before the GitLab logo, unless present."""
    if link_pattern(GITHUB_URL).search(nav):
        return nav

    gitlab = GITLAB_ICON.search(nav)
    if not gitlab:
        return nav

    indent = re.search(r"[ \t]*$", nav[: gitlab.start()]).group(0)
    joiner = "\n" + indent if indent else "\n"
    return nav[: gitlab.start()] + github_icon(indent) + joiner + nav[gitlab.start() :]


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


def replace_button_class(opening: str) -> str:
    """Keep a primary GitLab button primary and make the GitHub sibling secondary."""
    match = CLASS.search(opening)
    if not match:
        return opening

    classes = match.group(2).split()
    if "button-blue" not in classes:
        return opening

    classes = ["button-glass" if item == "button-blue" else item for item in classes]
    return opening[: match.start(2)] + " ".join(classes) + opening[match.end(2) :]


def replace_label(body: str, label: str, new_label: str) -> str | None:
    """Swap the visible label while leaving icons and pixel canvases untouched."""
    parts = label.split()
    if not parts:
        return None

    pattern = re.compile(r"\s+".join(re.escape(part) for part in parts))
    updated, count = pattern.subn(new_label, body, count=1)
    return updated if count else None


def github_sibling(
    markup: str, gitlab_href: str, github_href: str, label: str, new_label: str
) -> str | None:
    """Clone one GitLab anchor into its GitHub twin."""
    sibling = markup.replace(gitlab_href, github_href, 1)
    open_end = sibling.index(">") + 1
    opening = replace_button_class(sibling[:open_end])
    opening = re.sub(
        r'(aria-label\s*=\s*["\'][^"\']*)GitLab([^"\']*["\'])',
        r"\1GitHub\2",
        opening,
        flags=re.I,
    )
    sibling = opening + sibling[open_end:]

    body_start = open_end
    body_end = sibling.lower().rindex("</a")
    body = sibling[body_start:body_end].replace("#i-gitlab", "#i-github")
    body = replace_label(body, label, new_label)
    if body is None:
        return None
    return sibling[:body_start] + body + sibling[body_end:]


def add_github_repo_links(source: str) -> tuple[str, int]:
    """Put a GitHub link next to every mirrored top-level GitLab repository link."""
    matches = []
    for match in ANCHOR.finditer(source):
        markup = match.group(0)
        open_end = markup.index(">") + 1
        href_match = HREF.search(markup[:open_end])
        if not href_match:
            continue

        href = href_match.group(1)
        repo_match = GITLAB_REPO_URL.fullmatch(href)
        if not repo_match:
            continue
        repo = repo_match.group("repo")
        github_repo = GITHUB_REPOS.get(repo)
        if not github_repo:
            continue

        label = " ".join(re.sub(r"<[^>]*>", " ", match.group(0)).split())
        new_label = REPO_LABELS.get(label)
        if new_label is None and "GitLab" in label:
            new_label = label.replace("GitLab", "GitHub")
        if new_label is None:
            continue

        matches.append((match.start(), match.end(), href, github_repo, label, new_label))

    added = 0
    for start, end, gitlab_href, github_repo, label, new_label in reversed(matches):
        github_href = f"{GITHUB_ORG_URL}/{github_repo}"
        next_anchor = NEXT_ANCHOR.match(source, end)
        if next_anchor and github_href in next_anchor.group(0):
            continue

        sibling = github_sibling(source[start:end], gitlab_href, github_href, label, new_label)
        if sibling is None:
            continue

        line_start = source.rfind("\n", 0, start) + 1
        indent = re.match(r"[ \t]*", source[line_start:start]).group(0)
        separator = "" if source[end:].startswith("<") else "\n" + indent
        source = source[:end] + separator + sibling + source[end:]
        added += 1

    return source, added


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    snapshot = root / "data/beacon-modules.json"
    count = (
        json.loads(snapshot.read_text(encoding="utf-8"))["count"] if snapshot.is_file() else None
    )
    footers = beacon = navs = repos = 0

    for page in sorted(root.rglob("*.html")):
        if ".git" in page.parts:
            continue
        source = page.read_text(encoding="utf-8")
        updated = source
        relative = page.relative_to(root).as_posix()

        footer = FOOTER.search(updated)
        if footer:
            block = footer.group(0)
            patched = normalize_footer(block)
            if patched != block:
                updated = updated[: footer.start()] + patched + updated[footer.end() :]
                footers += 1

        nav = TOPBAR_NAV.search(updated)
        if nav:
            block = nav.group(0)
            patched = ensure_nav_github(block)
            if patched != block:
                updated = updated[: nav.start()] + patched + updated[nav.end() :]
                navs += 1

        if relative != "noosphere.html":
            updated, added = add_github_repo_links(updated)
            repos += added

        if relative == "projects/beacon/index.html":
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
        f"Beacon modules link: {beacon} page(s); GitHub nav icon: {navs} page(s); "
        f"GitHub repository links: {repos}"
    )


if __name__ == "__main__":
    main()
