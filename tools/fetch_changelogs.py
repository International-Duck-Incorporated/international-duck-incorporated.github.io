#!/usr/bin/env python3
"""Snapshot every project's changelog into one checked-in JSON file.

Sources, per project:
  * `CHANGELOG.md` on the default branch - the curated "what changed" record.
  * the GitLab release that a version maps to (date + link), when one exists.

The parser understands the heading styles the projects actually use
(`## [7.0.0] - 2026-09-19`, `## 2.0.0-prerelease — Module fixes`,
`## [1.8.17] and earlier`) and keeps items, section headings and one level of
nested bullets intact. Wrapped lines are re-joined.

Run from the repo root:
    python3 tools/fetch_changelogs.py                # all projects
    python3 tools/fetch_changelogs.py --only beacon  # one project

Requires network access to the public GitLab API. On failure the existing
snapshot is left untouched (non-zero exit), so an offline build cannot wipe it.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.parse
from datetime import date
from pathlib import Path

PROJECTS = [
    # key, display name, project path, numeric id, repository URL
    ("beacon", "Beacon", "international-duck-incorporated/Beacon", "86908978"),
    ("venomous", "Venomous", "international-duck-incorporated/Venomous", "86851931"),
    ("nulltrace", "NullTrace", "international-duck-incorporated/NullTrace", "86854861"),
    ("championscode", "ChampionsCode", "international-duck-incorporated/ChampionsCode", "86855171"),
    ("bagley", "Bagley", "international-duck-incorporated/beacon-bagley", "87023038"),
]

DATE = re.compile(r"\b(20\d{2}-\d{2}-\d{2})\b")


def curl(url: str) -> str | None:
    result = subprocess.run(
        ["curl", "-sS", "--max-time", "60", "-w", "\n%{http_code}", url],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise SystemExit(f"network error fetching {url}: {result.stderr.strip()}")
    body, _, status = result.stdout.rpartition("\n")
    if status.strip() != "200":
        return None
    return body


def api_json(url: str):
    body = curl(url)
    return json.loads(body) if body else []


def normalise_version(text: str) -> str:
    """`[7.0.0] - 2026-09-19` -> `7.0.0`; `2.0.0-prerelease — Module fixes` -> `2.0.0-prerelease`."""
    text = text.strip()
    bracket = re.match(r"\[([^\]]+)\]", text)
    if bracket:
        return bracket.group(1).strip()
    text = DATE.sub("", text).strip(" -—–")
    return text.split(" — ")[0].split(" - ")[0].strip()


def split_heading(text: str) -> tuple[str, str | None, str | None]:
    """Return (version, date, title) for a `##` heading."""
    version = normalise_version(text)
    found = DATE.search(text)
    title = None
    remainder = text
    bracket = re.match(r"\[[^\]]+\]", remainder)
    if bracket:
        remainder = remainder[bracket.end():]
    remainder = DATE.sub("", remainder).strip(" -—–")
    if remainder:
        title = remainder
    if version.lower() == "unreleased":
        title = title or "in development"
    return version, (found.group(1) if found else None), title


def parse_changelog(text: str) -> list[dict]:
    """Parse a markdown changelog into versions with sections and items."""
    versions: list[dict] = []
    sections: list[dict] = []
    items: list[dict] = []          # stack; only one nesting level is kept
    current_section: dict | None = None
    buf: list[str] = []

    def flush() -> None:
        nonlocal current_section, buf
        if not buf:
            return
        line = " ".join(part.strip() for part in buf).strip()
        buf = []
        if not line:
            return
        target = items[-1] if items else None
        if target is None:
            if current_section is None:
                current_section = {"heading": "", "items": []}
                sections.append(current_section)
            current_section["items"].append({"text": line, "children": []})
            return
        if target["text"]:
            target["text"] = f"{target['text']} {line}"
        else:
            target["text"] = line

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if re.match(r"^#\s", line):          # document title
            continue
        if re.match(r"^##\s", line):
            flush()
            items = []
            version, when, title = split_heading(line[3:].strip())
            sections = []
            versions.append({"version": version, "date": when, "title": title, "sections": sections})
            current_section = None
            continue
        if re.match(r"^###\s", line):
            flush()
            items = []
            current_section = {"heading": line[4:].strip(), "items": []}
            sections.append(current_section)
            continue
        bullet = re.match(r"^(\s*)-\s+(.*)$", line)
        if bullet and versions:
            flush()
            depth = len(bullet.group(1))
            entry = {"text": bullet.group(2).strip(), "children": []}
            if depth >= 2 and items:
                items[-1]["children"].append(entry)
            else:
                items = [entry]
                if current_section is None:
                    current_section = {"heading": "", "items": []}
                    sections.append(current_section)
                current_section["items"].append(entry)
            continue
        # Prose inside a version block is content too (Beacon's "1.8.17 and earlier"
        # points at releases/, ChampionsCode's beta.3 explains the re-release).
        # Prose *before* the first ## heading (the file preamble) is not.
        if line.strip() and versions:
            buf.append(line)

    flush()

    # drop versions that ended up with nothing to say, and empty sections
    cleaned = []
    for version in versions:
        version["sections"] = [s for s in version["sections"] if s["items"]]
        if version["sections"]:
            cleaned.append(version)
    return cleaned


def releases_for(project_id: str) -> dict[str, dict]:
    releases = api_json(f"https://gitlab.com/api/v4/projects/{project_id}/releases?per_page=100")
    out = {}
    for release in releases:
        tag = release["tag_name"]
        normalised = tag.lstrip("v")
        out[normalised] = {
            "tag": tag,
            "date": (release.get("released_at") or "")[:10],
            "url": f"https://gitlab.com/{release['_links']['self'].split('/projects/')[0]}" if False else None,
            "release_url": None,
        }
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", action="append", help="limit to these project keys")
    parser.add_argument("--out", default="data/changelogs.json")
    args = parser.parse_args()

    projects = [p for p in PROJECTS if not args.only or p[0] in args.only]
    snapshot_projects = []
    for key, name, path, project_id in projects:
        changelog = curl(
            f"https://gitlab.com/api/v4/projects/{project_id}/repository/files/"
            f"{urllib.parse.quote('CHANGELOG.md', safe='')}/raw?ref=main"
        )
        if changelog is None:
            print(f"warning: {name} has no CHANGELOG.md on main - skipped", file=sys.stderr)
            continue

        releases = {r["tag_name"].lstrip("v"): r for r in
                    api_json(f"https://gitlab.com/api/v4/projects/{project_id}/releases?per_page=100")}
        versions = parse_changelog(changelog)
        for version in versions:
            release = releases.get(version["version"].lstrip("v"))
            version.setdefault("date", None)
            version["tag"] = None
            version["release_url"] = None
            version["downloads"] = []
            if release:
                version["release_url"] = release["_links"]["self"]
                version["date"] = version["date"] or (release.get("released_at") or "")[:10]
                version["tag"] = release["tag_name"]
                version["downloads"] = [a["name"] for a in release.get("assets", {}).get("links", [])]

        snapshot_projects.append(
            {
                "key": key,
                "name": name,
                "project_path": path,
                "url": f"https://gitlab.com/{path}",
                "changelog_url": f"https://gitlab.com/{path}/-/blob/main/CHANGELOG.md",
                "releases_url": f"https://gitlab.com/{path}/-/releases",
                "versions": versions,
            }
        )
        print(f"{name:15} {len(versions):3} version sections from CHANGELOG.md")

    snapshot = {
        "fetched": date.today().isoformat(),
        "source": "CHANGELOG.md + GitLab releases API",
        "projects": snapshot_projects,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{out}: {sum(len(p['versions']) for p in snapshot_projects)} version sections "
          f"across {len(snapshot_projects)} projects")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
