#!/usr/bin/env python3
"""Keep the site's own cross-links consistent across every page.

Two kinds of link exist only because a generated page needs to be reachable:

  1. the footer nav gains "Changelog" and a "Contact" mailto link on every
     page, so /changelog and the team address are one click from anywhere
     (search engines crawl them from every page as well);
  2. the Beacon project page gains a link to its module directory, so
     /projects/beacon/modules is not an orphan page.

Both are applied by string substitution against the markup the pages already
share, and both are idempotent: a page that already carries the link is left
alone. Run from the repo root:  python3 tools/apply_site_links.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

FOOTER_LINK = '<a href="/changelog">Changelog</a>'
CONTACT_LINK = '<a href="mailto:0xffshell@duck.com">Contact</a>'
FOOTER_LINKS = (FOOTER_LINK, CONTACT_LINK)
FOOTER = re.compile(r'<footer class="site-footer">.*?</footer>', re.S)

# On the Beacon page, alongside the existing action row.
MODULES_LINK = (
    '<a class="button button-glass" href="/projects/beacon/modules">'
    '<svg><use href="#i-arrow"/></svg>All {count} modules'
    "</a>"
)
MODULES_ANCHOR = re.compile(
    r'<a class="button button-glass" href="/projects/beacon/modules">.*?</a>', re.S
)
BEACON_ANCHOR = '<a class="button button-glass" data-beacon-release-link'


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    snapshot = root / "data/beacon-modules.json"
    count = json.loads(snapshot.read_text(encoding="utf-8"))["count"] if snapshot.is_file() else None
    footers = beacon = 0
    for page in sorted(root.rglob("*.html")):
        if ".git" in page.parts:
            continue
        source = page.read_text(encoding="utf-8")
        updated = source

        footer = FOOTER.search(updated)
        if footer:
            block = footer.group(0)
            if "<nav>" in block and "</nav>" in block:
                missing = [link for link in FOOTER_LINKS if link not in updated]
                if missing:
                    patched = block.replace("</nav>", "".join(missing) + "</nav>", 1)
                    updated = updated[: footer.start()] + patched + updated[footer.end():]
                    footers += 1

        if page.relative_to(root).as_posix() == "projects/beacon/index.html":
            link = MODULES_LINK.format(count=count)
            if MODULES_ANCHOR.search(updated):
                # Normalise an existing button: label and icon are regenerated too.
                updated = MODULES_ANCHOR.sub(link, updated, count=1)
            elif BEACON_ANCHOR in updated:
                updated = updated.replace(BEACON_ANCHOR, link + "\n            " + BEACON_ANCHOR, 1)
            if link in updated and link not in source:
                beacon += 1

        if updated != source:
            page.write_text(updated, encoding="utf-8")

    print(f"footer links (changelog, contact): {footers} page(s); Beacon modules link: {beacon} page(s)")


if __name__ == "__main__":
    main()
