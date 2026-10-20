#!/usr/bin/env python3
"""Own every page's search/share metadata from one table.

For each page listed in PAGES this tool (re)writes, inside <head>:

  * <title>                     - <= 60 chars, leads with what the page is
  * <meta name="description">   - one honest sentence, <= 160 chars
  * <link rel="canonical">      - the production URL
  * og:type / og:title / og:description / og:url / og:site_name / og:locale
  * twitter:card / twitter:title / twitter:description

The table is the source of truth: values are replaced on every run, so a page
can never drift back to a stale title. Tags this tool does not own (og:image and
its width/height/alt, JSON-LD, preconnects) are left exactly as they are.

This is separate from tools/apply_seo_head.py, which was a one-shot tool that
*added* the tags it found missing and then skipped pages that already had a
canonical. Once a page has been through it, this tool is what keeps the values
current.

Run from the repo root:  python3 tools/apply_page_seo.py [--check]
`--check` verifies the pages on disk already match the table and exits non-zero
if not (useful in CI).
"""

from __future__ import annotations

import argparse
import html
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://idi-official.pages.dev"
BRAND = "IDI"

# page -> (url path, title, description, short og description)
PAGES: dict[str, tuple[str, str, str, str]] = {
    "index.html": (
        "/",
        "International Duck — open-source mods and tools",
        "Open-source Minecraft mods and tools from International Duck Incorporated: the 56-module "
        "Beacon, Venomous, NullTrace and more, all free on GitLab.",
        "Free, open-source Minecraft mods and Fabric client tools, built in public on GitLab.",
    ),
    "projects/index.html": (
        "/projects/",
        "All projects: Minecraft mods, addons, tools | IDI",
        "Every International Duck project in one place - Beacon, Venomous, NullTrace, "
        "ChampionsCode, Bagley and ZonedOut - free Fabric client mods for Minecraft.",
        "Free Fabric client mods for Minecraft: utilities, a Meteor addon and privacy tooling.",
    ),
    "projects/beacon/index.html": (
        "/projects/beacon",
        "Beacon, free Fabric client utility mod for Minecraft | IDI",
        "Beacon is a free, open-source Fabric client mod for Minecraft 26.2 with 56 "
        "vanilla-server-safe utility, render and world modules. Download and source code.",
        "Free, open-source, vanilla-server-safe utility mod for Fabric.",
    ),
    "projects/beacon/modules.html": (
        "/projects/beacon/modules",
        "Beacon modules: all 56 Fabric utilities, listed | IDI",
        "Every module Beacon registers, with the description it ships with and a link to its "
        "source: AFK Fisher, AutoEat, Freecam, LightOverlay and 52 more.",
        "All 56 Beacon modules, what each one does, and where its source lives.",
    ),
    "projects/venomous.html": (
        "/projects/venomous",
        "Venomous, Meteor Client addon for Minecraft 26.2 | IDI",
        "Venomous is an optimized, refined Meteor Client addon for Minecraft 26.2 - free and "
        "open source, with stable releases and nightly builds on GitLab.",
        "Optimized, refined Meteor Client addon for Minecraft 26.2. Free and open source.",
    ),
    "projects/nulltrace.html": (
        "/projects/nulltrace",
        "NullTrace, Fabric privacy mod for Minecraft | IDI",
        "NullTrace is a free Fabric privacy mod for Minecraft: client brand spoofing, fingerprint "
        "protection and tracking defenses across four supported game versions.",
        "Free Fabric privacy mod: brand spoofing, fingerprint protection, tracking defenses.",
    ),
    "projects/championscode.html": (
        "/projects/championscode",
        "ChampionsCode, Fabric research mod for Minecraft | IDI",
        "ChampionsCode is a free Fabric mod for Minecraft 26.3 for authorized, defensive server "
        "and plugin research and controlled runtime Java addon development.",
        "Fabric research mod for authorized server and plugin testing on Minecraft 26.3.",
    ),
    "projects/bagley.html": (
        "/projects/bagley",
        "Bagley, AI chat addon for the Beacon Minecraft mod | IDI",
        "Bagley is a free, opt-in AI chat assistant addon for the Beacon Minecraft mod, with "
        "local provider configuration and optional conversation memory.",
        "Opt-in AI chat assistant addon for the Beacon Minecraft mod. Free and open source.",
    ),
    "projects/zonedout.html": (
        "/projects/zonedout",
        "ZonedOut, Fabric seed-analysis mod for Minecraft | IDI",
        "ZonedOut is a free Fabric client mod for Minecraft 26.3 with combat and utility "
        "features, a Metro-style UI and a 36-module world-generation analysis suite.",
        "Fabric client mod for Minecraft 26.3 with a 36-module seed and world analysis suite.",
    ),
    "baritone/dashboard.html": (
        "/baritone/dashboard",
        "Baritone dashboard: watch the LLMs build live | IDI",
        "Follow Baritone's LLM agents live: the active roster with working, stalled and done states, "
        "and every timestamped claim and handoff as it lands in AGENTS.md.",
        "Baritone's LLM agents, live: roster states and every claim as it lands.",
    ),
    "projects/baritone.html": (
        "/projects/baritone",
        "Baritone, Minecraft pathfinder fork for Minecraft 26.x | IDI",
        "IDI's GitLab fork of the Baritone Minecraft pathfinder: branches for Minecraft 26.1, 26.2 and 26.3, look-and-aim behaviour work, and Bagley's navigation layer.",
        "IDI's fork of the Baritone pathfinder, kept current for Minecraft 26.x and wired into Bagley.",
    ),
    "projects/idi-assets.html": (
        "/projects/idi-assets",
        "IDI Assets, the organization's pictures and videos | IDI",
        "idi-assets is International Duck's public media bundle: icons, logos, banners, screenshots, UI icons, member art and 4K video clips, one copy per asset.",
        "The organization's public media tree: 69 unique files in 11 directories, catalogued and deduplicated.",
    ),
    "projects/website.html": (
        "/projects/website",
        "This website: how idi-official.pages.dev works | IDI",
        "How this site is built: committed static HTML with generated WebP assets, live GitLab "
        "data, no framework and no build server.",
        "How this site is built: static HTML, generated assets and live GitLab data.",
    ),
    "members/index.html": (
        "/members/",
        "The International Duck team: public members | IDI",
        "The public members of International Duck Incorporated - developers, testers and "
        "writers behind the group's free Minecraft mods on GitLab.",
        "The developers, testers and writers behind International Duck's Minecraft mods.",
    ),
    "members/0xffshell.html": (
        "/members/0xffshell",
        "0xFFshell - International Duck member profile | IDI",
        "0xFFshell is the main writer at International Duck Incorporated, contributing to the "
        "Venomous Meteor addon and the group's other Minecraft projects on GitLab.",
        "Main writer at International Duck Incorporated.",
    ),
    "members/3spress0.html": (
        "/members/3spress0",
        "espress0 - International Duck member profile | IDI",
        "espress0 is a backend developer and the backbone of most International Duck projects, "
        "working across security research tooling and Minecraft client mods.",
        "Backend developer and project backbone at International Duck Incorporated.",
    ),
    "members/e-vdv-hu.html": (
        "/members/e-vdv-hu",
        "E-VDV-HU - International Duck member profile | IDI",
        "E-VDV-HU is a public member of International Duck Incorporated, handling backend "
        "services and hosting for the group's Minecraft mod projects on GitLab.",
        "Backend and hosting at International Duck Incorporated.",
    ),
    "members/superivar.html": (
        "/members/superivar",
        "Xx-superIvar-xX - IDI member profile | IDI",
        "Xx-superIvar-xX is a public member of International Duck Incorporated and tests the "
        "group's Fabric client mods and Minecraft releases before they ship.",
        "Product tester at International Duck Incorporated.",
    ),
    "members/midas735.html": (
        "/members/midas735",
        "midas735 - International Duck member profile | IDI",
        "midas735 is a public member of International Duck Incorporated, taking part in the "
        "group's free Minecraft mod projects and their GitLab activity.",
        "Public member of International Duck Incorporated.",
    ),
    "members/jojo-8002.html": (
        "/members/jojo-8002",
        "Jojo-8002 - International Duck member profile | IDI",
        "Jojo-8002 is a public member of International Duck Incorporated, active around the "
        "group's free Minecraft mod projects on GitLab.",
        "Public member of International Duck Incorporated.",
    ),
    "activity.html": (
        "/activity",
        "Live GitLab commit activity | International Duck",
        "Live commit activity for every International Duck project, read from the public GitLab "
        "API: recent commits, authors and which repository each one landed in.",
        "Live GitLab commit activity for every International Duck project.",
    ),
    "migration.html": (
        "/migration",
        "GitHub to GitLab migration, Sep–Oct 2026 | IDI",
        "Why International Duck moved to GitLab, plus a dated timeline and the October 20 GitHub Support decision to keep @3spress0 restricted.",
        "A sourced timeline of the GitHub-to-GitLab move and the October 20 decision to keep @3spress0 restricted.",
    ),
    "noosphere.html": (
        "/noosphere",
        "IDI Noosphere: Autonomous AI division & projects | IDI",
        "IDI Noosphere is International Duck's fully autonomous AI division for LLM agents, "
        "neural experiments and the Agentarium social platform.",
        "Autonomous AI division & agent projects from International Duck Incorporated.",
    ),
    "changelog.html": (
        "/changelog",
        "Changelog: Beacon, Venomous, NullTrace releases | IDI",
        "Every release from every International Duck project - Beacon, Venomous, NullTrace, "
        "ChampionsCode and Bagley - transcribed from each repository's CHANGELOG.md.",
        "Release history for every International Duck project, newest first.",
    ),
    "glyphsmith.html": (
        "/glyphsmith",
        "Glyphsmith: Unicode transformation lab | IDI",
        "Glyphsmith is a free, 100% client-side Unicode workbench: homoglyph substitution, "
        "zero-width injection, bidi controls, normalization and a Minecraft chat mode.",
        "A 100% client-side Unicode transformation lab with a Minecraft chat mode.",
    ),
}

OWNED_META = re.compile(
    r"""\s*<meta\b
       (?=
            [^>]*\bname\s*=\s*["'](?:description|twitter:(?:card|title|description))["']
          | [^>]*\bproperty\s*=\s*["']og:(?:type|title|description|url|site_name|locale)["']
       )
       [^>]*?/?>""",
    re.S | re.I | re.X,
)
TITLE = re.compile(r"<title\b[^>]*>.*?</title\s*>", re.S | re.I)
CANONICAL = re.compile(
    r"""\s*<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*?/?>""",
    re.S | re.I | re.X,
)
OWNED_META_KEYS = {
    "description",
    "og:type",
    "og:title",
    "og:description",
    "og:url",
    "og:site_name",
    "og:locale",
    "twitter:card",
    "twitter:title",
    "twitter:description",
}


class HeadMetadataParser(HTMLParser):
    """Read owned head metadata without depending on its whitespace/layout."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title_parts: list[str] = []
        self.title_count = 0
        self.in_title = False
        self.meta: dict[str, list[str | None]] = {}
        self.canonicals: list[str | None] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        attributes = {name.lower(): value for name, value in attrs}
        if tag == "title":
            self.title_count += 1
            self.in_title = True
        elif tag == "meta":
            key = attributes.get("name") or attributes.get("property")
            if key in OWNED_META_KEYS:
                self.meta.setdefault(key, []).append(attributes.get("content"))
        elif tag == "link" and "canonical" in (attributes.get("rel") or "").lower().split():
            self.canonicals.append(attributes.get("href"))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title_parts.append(data)


def metadata_matches(
    head: str, url: str, title: str, description: str, og_description: str
) -> bool:
    parser = HeadMetadataParser()
    parser.feed(head)
    parser.close()
    share_title = og_title(title)
    expected = {
        "description": description,
        "og:type": "website",
        "og:title": share_title,
        "og:description": og_description,
        "og:url": f"{SITE}{url}",
        "og:site_name": "International Duck Incorporated",
        "og:locale": "en_US",
        "twitter:card": "summary_large_image",
        "twitter:title": share_title,
        "twitter:description": og_description,
    }
    return (
        parser.title_count == 1
        and "".join(parser.title_parts).strip() == title
        and parser.canonicals == [f"{SITE}{url}"]
        and parser.meta == {key: [value] for key, value in expected.items()}
    )


def og_title(title: str) -> str:
    """The link-preview title: the page title without the brand suffix."""
    return re.sub(r"\s*\|\s*IDI$", "", title).strip()


def build_block(url: str, title: str, description: str, og_description: str) -> str:
    quoted = html.escape(description, quote=True)
    preview = html.escape(og_description, quote=True)
    share = html.escape(og_title(title), quote=True)
    return "\n".join(
        [
            f'  <meta name="description" content="{quoted}">',
            f'  <link rel="canonical" href="{SITE}{url}">',
            '  <meta property="og:type" content="website">',
            f'  <meta property="og:title" content="{share}">',
            f'  <meta property="og:description" content="{preview}">',
            f'  <meta property="og:url" content="{SITE}{url}">',
            '  <meta property="og:site_name" content="International Duck Incorporated">',
            '  <meta property="og:locale" content="en_US">',
            '  <meta name="twitter:card" content="summary_large_image">',
            f'  <meta name="twitter:title" content="{share}">',
            f'  <meta name="twitter:description" content="{preview}">',
        ]
    )


def apply(
    page: Path, url: str, title: str, description: str, og_description: str, check: bool
) -> bool:
    source = page.read_text(encoding="utf-8")
    head_start = source.index("<head>") + len("<head>")
    head_end = source.index("</head>")
    head = source[head_start:head_end]
    if metadata_matches(head, url, title, description, og_description):
        return False

    head = TITLE.sub(f"<title>{html.escape(title)}</title>", head, count=1)
    head = CANONICAL.sub("", head)
    head = OWNED_META.sub("", head)
    block = build_block(url, title, description, og_description)

    title_match = TITLE.search(head)
    if title_match:
        head = head[: title_match.end()] + "\n" + block + head[title_match.end() :]
    else:
        head = "\n" + block + head

    # Collapse the blank lines the removals leave behind.
    head = re.sub(r"\n{3,}", "\n\n", head)
    updated = source[:head_start] + head + source[head_end:]
    if updated == source:
        return False
    if check:
        return True
    page.write_text(updated, encoding="utf-8")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify only, do not write")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent

    problems = []
    titles, descriptions = {}, {}
    for name, (url, title, description, og_description) in PAGES.items():
        if len(title) > 60:
            problems.append(f"{name}: title is {len(title)} chars (limit 60): {title}")
        if len(description) > 160:
            problems.append(f"{name}: description is {len(description)} chars (limit 160)")
        if title in titles:
            problems.append(f"{name}: title duplicates {titles[title]}")
        if description in descriptions:
            problems.append(f"{name}: description duplicates {descriptions[description]}")
        titles[title] = name
        descriptions[description] = name
        if len(og_description) > 120:
            problems.append(f"{name}: og description is {len(og_description)} chars (limit 120)")

    changed, missing = [], []
    for name, (url, title, description, og_description) in PAGES.items():
        page = root / name
        if not page.is_file():
            missing.append(name)
            continue
        if apply(page, url, title, description, og_description, args.check):
            changed.append(name)

    for problem in problems:
        print(f"error: {problem}", file=sys.stderr)
    if missing:
        print(f"error: missing pages: {', '.join(missing)}", file=sys.stderr)

    verb = "would update" if args.check else "updated"
    print(f"{verb} {len(changed)} of {len(PAGES)} pages")
    if args.check and changed:
        print(f"  out of date: {', '.join(changed)}", file=sys.stderr)
    return 1 if (problems or missing or (args.check and changed)) else 0


if __name__ == "__main__":
    raise SystemExit(main())
