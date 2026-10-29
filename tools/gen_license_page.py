#!/usr/bin/env python3
"""Generate license.html from the root LICENSE.md file.

Reads the canonical All Rights Reserved Licence in LICENSE.md and renders it
inside the shared site shell so /license stays byte-faithful to LICENSE.md.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sitegen  # noqa: E402

SITE = "https://idi-official.pages.dev"
URL_PATH = "/license"
REPO_LICENSE_URL = "https://gitlab.com/international-duck-incorporated/home/-/blob/main/LICENSE.md"


def parse_license_md(source: str) -> tuple[str, str, list[tuple[str, list[str]]], str]:
    lines = [line.rstrip() for line in source.splitlines()]
    title = "All Rights Reserved Licence"
    lead = ""
    closing_notice = ""
    sections: list[tuple[str, list[str]]] = []
    current_heading: str | None = None
    current_blocks: list[str] = []
    paragraph_buf: list[str] = []
    list_buf: list[str] = []

    def flush_buffers() -> None:
        nonlocal paragraph_buf, list_buf
        if paragraph_buf:
            text = " ".join(paragraph_buf).strip()
            if current_heading is None:
                nonlocal lead
                if not lead:
                    lead = text
            else:
                current_blocks.append(f"<p>{sitegen.inline_md(text)}</p>")
            paragraph_buf = []
        if list_buf:
            items = "".join(f"<li>{sitegen.inline_md(item)}</li>" for item in list_buf)
            current_blocks.append(f"<ul>{items}</ul>")
            list_buf = []

    for raw in lines:
        stripped = raw.strip()
        if not stripped:
            flush_buffers()
            continue
        if stripped.startswith("# "):
            flush_buffers()
            title = stripped[2:].strip()
            continue
        if stripped.startswith("## "):
            flush_buffers()
            if current_heading is not None:
                sections.append((current_heading, current_blocks))
            current_heading = stripped[3:].strip()
            current_blocks = []
            continue
        if stripped.startswith("- "):
            if paragraph_buf:
                flush_buffers()
            list_buf.append(stripped[2:].strip())
            continue
        if list_buf:
            flush_buffers()
        paragraph_buf.append(stripped)

    flush_buffers()
    if current_heading is not None:
        if current_blocks and current_blocks[-1].startswith("<p><strong>Copyright"):
            closing_notice = current_blocks.pop()
        sections.append((current_heading, current_blocks))

    return title, lead, sections, closing_notice


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    license_path = root / "LICENSE.md"
    title, lead, sections, closing_notice = parse_license_md(
        license_path.read_text(encoding="utf-8")
    )

    shells = sitegen.read_shell(root)
    cards = []
    for heading, blocks in sections:
        slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
        inner = "\n            ".join(blocks)
        cards.append(
            f"""          <article class="detail-panel glass-card reveal" id="{slug}" style="min-height: auto">
            <h2>{html.escape(heading)}</h2>
            {inner}
          </article>"""
        )

    closing_html = (
        f'\n        <section class="project-callout glass-card reveal" style="margin-top: 2rem">\n'
        f"          <div>\n"
        f'            <span class="eyebrow">Reservation of rights</span>\n'
        f"            {closing_notice}\n"
        f"            <p>Individual International Duck Incorporated software repositories that carry their own licence file (such as GPL-3.0, LGPL-3.0, or MIT) are governed by the licence included in that repository.</p>\n"
        f"          </div>\n"
        f'          <a class="button button-glass" href="/LICENSE.md" target="_blank" rel="noreferrer">Raw LICENSE.md <svg><use href="#i-external"/></svg></a>\n'
        f"        </section>"
        if closing_notice
        else ""
    )

    body = f"""    <main id="main" class="subpage-main">
      <section class="shell">
        <header class="subpage-heading reveal">
          <div class="breadcrumbs">
            <a href="/">International Duck</a><span>/</span><b>Licence</b>
          </div>
          <span class="eyebrow">Repository &amp; website terms</span>
          <h1>{html.escape(title)}.</h1>
          <p>{html.escape(lead)}</p>
          <div class="action-row" style="margin-top: 1.25rem">
            <a class="button button-glass" href="/LICENSE.md" target="_blank" rel="noreferrer">View raw LICENSE.md <svg><use href="#i-external"/></svg></a>
            <a class="button button-glass" href="{REPO_LICENSE_URL}" target="_blank" rel="noreferrer"><svg><use href="#i-gitlab"/></svg>View on GitLab</a>
          </div>
        </header>

        <section class="detail-grid" aria-label="Licence terms">
{chr(10).join(cards)}
        </section>{closing_html}
      </section>
    </main>"""

    jsonld = json.dumps(
        {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "Organization",
                    "@id": f"{SITE}/#organization",
                    "name": "International Duck Incorporated",
                    "alternateName": "IDI",
                    "url": f"{SITE}/",
                    "logo": {
                        "@type": "ImageObject",
                        "url": f"{SITE}/assets/org-avatar.png",
                    },
                    "sameAs": ["https://gitlab.com/international-duck-incorporated"],
                },
                {
                    "@type": "WebSite",
                    "@id": f"{SITE}/#website",
                    "url": f"{SITE}/",
                    "name": "International Duck Incorporated",
                    "inLanguage": "en",
                    "publisher": {"@id": f"{SITE}/#organization"},
                },
                {
                    "@type": "WebPage",
                    "@id": f"{SITE}{URL_PATH}#webpage",
                    "url": f"{SITE}{URL_PATH}",
                    "name": f"{title} | International Duck Incorporated",
                    "description": lead,
                    "isPartOf": {"@id": f"{SITE}/#website"},
                    "about": {"@id": f"{SITE}/#organization"},
                    "inLanguage": "en",
                    "breadcrumb": {"@id": f"{SITE}{URL_PATH}#breadcrumb"},
                },
                {
                    "@type": "BreadcrumbList",
                    "@id": f"{SITE}{URL_PATH}#breadcrumb",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "International Duck Incorporated",
                            "item": f"{SITE}/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": title,
                            "item": f"{SITE}{URL_PATH}",
                        },
                    ],
                },
            ],
        },
        indent=2,
    )

    page = sitegen.assemble(
        shells=shells,
        url_path=URL_PATH,
        title=f"{title} | International Duck Incorporated",
        description=f"{lead} Full terms for International Duck Incorporated's All Rights Reserved repositories and website.",
        body=body,
        scripts=["/js/main/script.js"],
        jsonld=f'  <script type="application/ld+json">\n{jsonld}\n  </script>',
        active_nav=None,
        body_attrs='data-page="license"',
        favicon="/assets/org-avatar.png",
    )

    out = root / "license.html"
    out.write_text(page, encoding="utf-8")
    print(f"wrote {out.relative_to(root)}: {len(sections)} sections")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
