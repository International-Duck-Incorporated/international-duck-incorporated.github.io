#!/usr/bin/env python3
"""Generate the Beacon module directory page (`/projects/beacon/modules`).

Input: `data/beacon-modules.json`, the snapshot taken straight from Beacon's
`ModuleManager.java` registration list plus each module's own constructor (see
tools/fetch_beacon_modules.py). Nothing about the module list, the count or the
category breakdown is written by hand here - it all comes from that snapshot, so
the page cannot state a count the source does not back up.

Every module gets a stable `id` anchor, its one-line description from the source,
a screenshot slot and links out (source file always; the download link comes
from DOWNLOAD below).

Run from the repo root:  python3 tools/gen_module_page.py
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
URL_PATH = "/projects/beacon/modules"

# Where "Download" points for every module, and the two facts the page states
# about it. The CurseForge listing ("Beacon QoL", project 1720579) is public, so
# it is the primary download for the whole page; GitLab keeps the tagged stable
# releases. Change these constants in one place and re-run the generator.
CURSEFORGE_URL = (
    "https://www.curseforge.com/minecraft/mc-mods/beacon-qol/files/all"
    "?page=1&pageSize=20&showAlphaFiles=show"
)
CURSEFORGE_NAME = "Beacon QoL"
RELEASES_URL = "https://gitlab.com/international-duck-incorporated/Beacon/-/releases"
DOWNLOAD_URL = CURSEFORGE_URL

CATEGORY_BLURB = {
    "Utility": "Tools that speed up the things you do every session: eating, sorting, "
    "reconnecting, keeping track of where you died.",
    "Render": "Client-side presentation: HUD elements, overlays, camera and viewmodel tweaks. "
    "Nothing here changes what the server sees.",
    "World": "Information about the world around you - crops, light levels, structures, items and entities.",
    "Misc": "Everything that does not belong in a lane: chat hygiene, notifications, scoreboard and team display.",
    "Fun": "Cosmetics and toys kept deliberately separate from the functional modules.",
}


def module_card(module: dict, download_url: str) -> str:
    initials = re.sub(r"[^A-Za-z]", "", module["name"])[:2].upper()
    return f"""        <article class="module-card glass-card reveal category-{module["category"].lower()}" id="{module["id"]}">
          <div class="module-shot" data-shot-for="{module["id"]}">
            <span class="module-shot-tile" aria-hidden="true">{html.escape(initials)}</span>
            <span class="module-shot-label">{html.escape(module["name"])}</span>
          </div>
          <div class="module-body">
            <h3><a href="#{module["id"]}">{html.escape(module["name"])}</a></h3>
            <p>{html.escape(module["description"])}</p>
            <p class="module-source"><code>{html.escape(module["class"])}.java</code></p>
          </div>
          <footer class="module-links">
            <a class="module-link" href="{html.escape(download_url, quote=True)}" target="_blank" rel="noreferrer">Download <svg><use href="#i-download"/></svg></a>
            <a class="module-link muted" href="{html.escape(module["source_url"], quote=True)}" target="_blank" rel="noreferrer">Source <svg><use href="#i-external"/></svg></a>
          </footer>
        </article>"""


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    data = json.loads((root / "data/beacon-modules.json").read_text(encoding="utf-8"))
    modules = data["modules"]
    counts = data["categories"]
    total = data["count"]

    shells = sitegen.read_shell(root)
    sections = []
    for category, count in counts.items():
        members = [m for m in modules if m["category"] == category]
        cards = "\n".join(module_card(module, DOWNLOAD_URL) for module in members)
        blurb = CATEGORY_BLURB.get(category, "")
        sections.append(f"""      <section class="module-section reveal" id="category-{category.lower()}" aria-labelledby="heading-{category.lower()}">
        <header class="section-heading">
          <div>
            <span class="eyebrow">{count} module{"s" if count != 1 else ""}</span>
            <h2 id="heading-{category.lower()}">{html.escape(category)}</h2>
          </div>
          <p>{html.escape(blurb)}</p>
        </header>
        <div class="module-directory">
{cards}
        </div>
      </section>""")

    category_nav = "".join(
        f'<a class="chip" href="#category-{category.lower()}">{html.escape(category)} <b>{count}</b></a>'
        for category, count in counts.items()
    )

    verification = (
        f"List generated from Beacon's own registration list "
        f"(<code>{html.escape(data['registration_source'].split('/')[-1])}</code>, "
        f"<code>{total}</code> <code>register()</code> calls) at "
        f'<a href="{data["project_url"]}/-/commit/{data["commit"]}" target="_blank" rel="noreferrer">{data["commit_short"]}</a> '
        f"on {data['commit_date']}; each description is the string the module passes to "
        f"<code>Module</code> in its own constructor. Snapshot taken {data['fetched']}."
    )

    body = f"""  <main id="main" class="directory-page">
    <div class="shell">
      <div class="breadcrumbs"><a href="/">International Duck</a><span>/</span><a href="/projects">Projects</a><span>/</span><a href="/projects/beacon">Beacon</a><span>/</span><b>Modules</b></div>

      <section class="directory-hero glass-card reveal">
        <span class="eyebrow">Module directory</span>
        <h1>Beacon modules.</h1>
        <p class="lead">Every module Beacon registers, grouped by category - {total} client-side, vanilla-server-safe modules across {len(counts)} categories.</p>
        <div class="action-row">
          <a class="button button-blue" href="{html.escape(CURSEFORGE_URL, quote=True)}" target="_blank" rel="noreferrer"><svg><use href="#i-curseforge"/></svg>Download {CURSEFORGE_NAME} on CurseForge</a>
          <a class="button button-glass" href="{html.escape(RELEASES_URL, quote=True)}" target="_blank" rel="noreferrer"><svg><use href="#i-gitlab"/></svg>GitLab release notes</a>
        </div>
        <div class="chip-row">{category_nav}</div>
      </section>

{chr(10).join(sections)}

      <section class="directory-foot glass-card reveal">
        <h2>Where this list comes from</h2>
        <p>{verification}</p>
        <p>Every Download link on this page goes to <b><a href="{html.escape(CURSEFORGE_URL, quote=True)}" target="_blank" rel="noreferrer">{CURSEFORGE_NAME} on CurseForge</a></b> (all release and alpha builds). Release notes and tagged source history live on <a href="{html.escape(RELEASES_URL, quote=True)}" target="_blank" rel="noreferrer">GitLab</a>, and the <a href="https://gitlab.com/international-duck-incorporated/Beacon" target="_blank" rel="noreferrer">source repository</a> is public.</p>
        <p>Every module heading is linkable - for example <code>/projects/beacon/modules#{modules[0]["id"]}</code> - and each card links to that module's source file.</p>
      </section>
    </div>
  </main>"""

    jsonld = json.dumps(
        {
            "@context": "https://schema.org",
            "@graph": [
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
                            "name": "Projects",
                            "item": f"{SITE}/projects/",
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": "Beacon",
                            "item": f"{SITE}/projects/beacon",
                        },
                        {
                            "@type": "ListItem",
                            "position": 4,
                            "name": "Modules",
                            "item": f"{SITE}{URL_PATH}",
                        },
                    ],
                },
                {
                    "@type": "ItemList",
                    "@id": f"{SITE}{URL_PATH}#modules",
                    "name": "Beacon modules",
                    "description": f"All {total} modules registered by Beacon, a client-side Fabric utility mod for Minecraft.",
                    "numberOfItems": total,
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": index,
                            "name": module["name"],
                            "description": module["description"],
                            "url": f"{SITE}{URL_PATH}#{module['id']}",
                        }
                        for index, module in enumerate(modules, start=1)
                    ],
                },
            ],
        },
        indent=2,
    )

    page = sitegen.assemble(
        shells=shells,
        url_path=URL_PATH,
        title=f"Beacon modules: {total} client-side Fabric utilities | IDI",
        description=(
            f"All {total} modules in Beacon, the free client-side Fabric utility mod for Minecraft - "
            "what each one does, grouped by category, with source links."
        ),
        body=body,
        scripts=["/js/main/script.js"],
        jsonld=f'  <script type="application/ld+json">\n{jsonld}\n  </script>',
        active_nav="/projects",
        body_attrs='data-page="directory"',
    )

    out = root / "projects/beacon/modules.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(page, encoding="utf-8")
    print(f"wrote {out.relative_to(root)}: {total} modules in {len(counts)} categories")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
