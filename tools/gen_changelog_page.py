#!/usr/bin/env python3
"""Generate the combined changelog page (`/changelog`).

Input: `data/changelogs.json` - the snapshot of every project's CHANGELOG.md plus
the GitLab release each version maps to (see tools/fetch_changelogs.py). Version
sections, dates, links and change entries all come from that file; nothing is
typed by hand, so the page cannot claim a release the repositories do not have.

Layout: projects newest-first, each with its versions newest-first. The newest
two versions of each project are expanded; older ones collapse into <details> so
the page stays readable - the markup is in the HTML either way, so crawlers see
the whole history.

Run from the repo root:  python3 tools/gen_changelog_page.py
"""

from __future__ import annotations

import html
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sitegen  # noqa: E402

SITE = "https://idi-official.pages.dev"
URL_PATH = "/changelog"
EXPANDED_PER_PROJECT = 2


def version_block(project: dict, version: dict, index: int) -> str:
    version_label = version["version"]
    title = version.get("title")
    # Most CHANGELOG headings already lead with the version ("1.9.0 - ..."), so only
    # add the version prefix when the title does not carry it.
    if not title:
        heading = version_label
    elif title.lower().startswith(version_label.lower()):
        heading = title
    else:
        heading = f"{version_label} — {title}"

    meta = []
    if version["date"]:
        meta.append(f'<time datetime="{version["date"]}">{version["date"]}</time>')
    if version["tag"] and version["release_url"]:
        meta.append(
            f'<a href="{version["release_url"]}" target="_blank" rel="noreferrer">release {html.escape(version["tag"])}</a>'
        )
    else:
        meta.append(f'<span class="changelog-unreleased">no tagged release yet</span>')
    if version["downloads"]:
        meta.append(
            f"{len(version['downloads'])} artifact{'' if len(version['downloads']) == 1 else 's'}"
        )

    sections = []
    for section in version["sections"]:
        items = sitegen.render_items(section["items"], base_url=f"{project['url']}/-/blob/main/")
        # NB: do not reassign `heading` here - it holds the version label used by
        # the <summary> below.
        section_heading = (
            f"<h3>{html.escape(section['heading'])}</h3>" if section["heading"] else ""
        )
        sections.append(f"{section_heading}{items}")

    anchor = f"{project['key']}-{version_label.lower().replace('.', '-').replace(' ', '-')}-{index}"
    open_by_default = index < EXPANDED_PER_PROJECT
    tag_open = " open" if open_by_default else ""
    return f"""        <details class="changelog-version" id="{anchor}"{tag_open}>
          <summary>
            <span class="changelog-version-name">{html.escape(heading)}</span>
            <span class="changelog-meta">{" · ".join(meta)}</span>
          </summary>
          <div class="changelog-body">
{"".join(sections)}
          </div>
        </details>"""


def project_section(project: dict) -> str:
    versions = "\n".join(
        version_block(project, version, index) for index, version in enumerate(project["versions"])
    )
    entries = sum(len(s["items"]) for v in project["versions"] for s in v["sections"])
    latest = project["versions"][0]
    latest_label = html.escape(latest["version"])
    latest_date = latest["date"] or "unreleased"
    return f"""      <section class="changelog-project glass-card reveal" id="{project["key"]}" aria-labelledby="changelog-{project["key"]}">
        <header class="changelog-head">
          <div>
            <span class="eyebrow">Changelog</span>
            <h2 id="changelog-{project["key"]}">{html.escape(project["name"])}</h2>
          </div>
          <p class="changelog-summary">{len(project["versions"])} version sections · {entries} entries · latest <b>{latest_label}</b> ({latest_date})</p>
        </header>
        <p class="changelog-links">
          <a href="{project["changelog_url"]}" target="_blank" rel="noreferrer">CHANGELOG.md on GitLab <svg><use href="#i-external"/></svg></a>
          <a href="{project["releases_url"]}" target="_blank" rel="noreferrer">All releases <svg><use href="#i-external"/></svg></a>
          <a href="{project["url"]}" target="_blank" rel="noreferrer">Repository <svg><use href="#i-external"/></svg></a>
        </p>
{versions}
      </section>"""


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    data = json.loads((root / "data/changelogs.json").read_text(encoding="utf-8"))
    projects = data["projects"]
    total_versions = sum(len(p["versions"]) for p in projects)
    total_entries = sum(
        len(s["items"]) for p in projects for v in p["versions"] for s in v["sections"]
    )

    shells = sitegen.read_shell(root)
    sections = "\n".join(project_section(project) for project in projects)
    jump = "".join(
        f'<a class="chip" href="#{p["key"]}">{html.escape(p["name"])} <b>{len(p["versions"])}</b></a>'
        for p in projects
    )

    body = f"""  <main id="main" class="changelog-page">
    <div class="shell">
      <div class="breadcrumbs"><a href="/">International Duck</a><span>/</span><b>Changelog</b></div>

      <section class="changelog-hero glass-card reveal">
        <span class="eyebrow">Release history</span>
        <h1>Changelog.</h1>
        <p class="lead">Everything each International Duck project has shipped: {total_versions} version sections and {total_entries} individual entries, transcribed from the <code>CHANGELOG.md</code> each repository maintains, in the order that file lists them, and linked back to the matching GitLab release.</p>
        <div class="chip-row">{jump}</div>
        <p class="directory-note">Snapshot taken {data["fetched"]} from {html.escape(data["source"])}. Where a version has no tagged release the entry says so rather than guessing a date.</p>
      </section>

{sections}
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
                            "name": "Changelog",
                            "item": f"{SITE}{URL_PATH}",
                        },
                    ],
                },
                {
                    "@type": "CollectionPage",
                    "@id": f"{SITE}{URL_PATH}#changelog",
                    "name": "International Duck Incorporated changelog",
                    "description": (
                        f"Release history for every International Duck project: {total_versions} version "
                        f"sections across {len(projects)} projects, straight from each repository's CHANGELOG.md."
                    ),
                    "about": [
                        {
                            "@type": "SoftwareApplication",
                            "name": project["name"],
                            "applicationCategory": "GameApplication",
                            "operatingSystem": "Windows, macOS, Linux",
                            "url": f"{SITE}/projects/{project['key']}"
                            if project["key"] != "bagley"
                            else f"{SITE}/projects/bagley",
                            "softwareVersion": project["versions"][0]["version"],
                            "releaseNotes": project["changelog_url"],
                            "sameAs": project["url"],
                        }
                        for project in projects
                    ],
                },
            ],
        },
        indent=2,
    )

    page = sitegen.assemble(
        shells=shells,
        url_path=URL_PATH,
        title=f"Changelog — {total_versions} release sections | IDI",
        description=(
            "Every release from every International Duck project - Beacon, Venomous, NullTrace, "
            f"ChampionsCode and Bagley - {total_versions} version sections from each CHANGELOG.md."
        ),
        body=body,
        scripts=["/script.js"],
        jsonld=f'  <script type="application/ld+json">\n{jsonld}\n  </script>',
        active_nav=None,
        body_attrs='data-page="changelog"',
    )

    out = root / "changelog.html"
    out.write_text(page, encoding="utf-8")
    print(
        f"wrote {out.relative_to(root)}: {total_versions} versions, {total_entries} entries, {len(projects)} projects"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
