#!/usr/bin/env python3
"""Snapshot Beacon's registered module list from its source of truth.

Beacon's modules are registered in one place -
`src/main/java/net/beacon/module/ModuleManager.java`, `this.register(new X())` -
and every module passes its display name, one-line description and category to
`Module.super(...)` in its own constructor. This tool reads both and writes a
checked-in snapshot (`data/beacon-modules.json`) that the modules directory page
is generated from.

Why a snapshot and not a runtime fetch: the site ships checked-in content and
only uses GitLab for live *activity* (see README). The snapshot also pins the
commit it was taken from, so the page can state when the list was verified and
the count is reproducible instead of a claim.

The registered count is whatever the file says - it is deliberately not
hardcoded anywhere in the site copy, so it cannot silently drift again.

Run from the repo root:
    python3 tools/fetch_beacon_modules.py                 # default branch
    python3 tools/fetch_beacon_modules.py --ref 62d569a2  # pin a commit/tag

Requires network access to the public GitLab API. If the API is unreachable the
existing snapshot is left untouched and the tool exits non-zero, so a build in a
sandbox without network cannot replace a good snapshot with an empty one.
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

PROJECT = "international-duck-incorporated/Beacon"
PROJECT_ID = "86908978"  # numeric id keeps the API path simple and stable
API = f"https://gitlab.com/api/v4/projects/{PROJECT_ID}"
MODULE_ROOT = "src/main/java/net/beacon/modules"
MANAGER = "src/main/java/net/beacon/module/ModuleManager.java"
CATEGORY_ORDER = ["Utility", "Render", "World", "Misc", "Fun"]


def curl(url: str) -> str:
    result = subprocess.run(
        ["curl", "-sS", "--max-time", "60", url], capture_output=True, text=True
    )
    if result.returncode != 0:
        raise SystemExit(f"network error fetching {url}: {result.stderr.strip()}")
    return result.stdout


def api_json(url: str):
    body = curl(url)
    try:
        return json.loads(body)
    except json.JSONDecodeError as error:
        raise SystemExit(f"unexpected response from {url}: {body[:200]}") from error


def raw(ref: str, path: str) -> str:
    return curl(f"{API}/repository/files/{urllib.parse.quote(path, safe='')}/raw?ref={ref}")


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ref", default="main", help="branch, tag or commit to read (default: main)")
    parser.add_argument("--out", default="data/beacon-modules.json")
    args = parser.parse_args()

    manager = raw(args.ref, MANAGER)
    registered = re.findall(r"this\.register\(new (\w+)\(\)\);", manager)
    if not registered:
        raise SystemExit("no registered modules found in ModuleManager.java - layout changed?")

    paths: dict[str, str] = {}
    for folder in {c.lower() for c in CATEGORY_ORDER}:
        listing = api_json(
            f"{API}/repository/tree?ref={urllib.parse.quote(args.ref)}&per_page=100"
            f"&path={urllib.parse.quote(f'{MODULE_ROOT}/{folder}')}"
        )
        for item in listing:
            if item["type"] == "blob" and item["name"].endswith(".java"):
                paths[item["name"][:-5]] = item["path"]

    modules, unresolved = [], []
    for class_name in registered:
        path = paths.get(class_name)
        if not path:
            unresolved.append(class_name)
            continue
        source = raw(args.ref, path)
        # super("Name", "One-line description", Category.X)
        match = re.search(
            r'super\(\s*([^,]+?)\s*,\s*"([^"]+)"\s*,\s*Category\.(\w+)', source, re.S
        )
        if not match:
            unresolved.append(class_name)
            continue
        name = match.group(1).strip()
        if name.startswith('"'):
            name = name.strip('"')
        else:  # a NAME constant declared in the file
            constant = re.search(rf'String\s+{re.escape(name)}\s*=\s*"([^"]+)"', source)
            name = constant.group(1) if constant else class_name
        modules.append(
            {
                "id": slugify(name),
                "name": name,
                "class": class_name,
                "description": re.sub(r"\s+", " ", match.group(2)).strip(),
                "category": match.group(3).capitalize(),
                "source_path": path,
                "source_url": f"https://gitlab.com/{PROJECT}/-/blob/{args.ref}/{path}",
            }
        )

    if unresolved:
        raise SystemExit(f"could not read a name/description for: {', '.join(unresolved)}")

    commit = api_json(f"{API}/repository/commits/{urllib.parse.quote(args.ref)}")
    counts: dict[str, int] = {}
    for module in modules:
        counts[module["category"]] = counts.get(module["category"], 0) + 1

    snapshot = {
        "project": PROJECT,
        "project_url": f"https://gitlab.com/{PROJECT}",
        "ref": args.ref,
        "commit": commit["id"],
        "commit_short": commit["short_id"],
        "commit_date": commit["created_at"][:10],
        "fetched": date.today().isoformat(),
        "registration_source": MANAGER,
        "registration_url": f"https://gitlab.com/{PROJECT}/-/blob/{args.ref}/{MANAGER}",
        "count": len(modules),
        "categories": {c: counts[c] for c in CATEGORY_ORDER if c in counts},
        "modules": sorted(modules, key=lambda m: (CATEGORY_ORDER.index(m["category"]), m["name"].lower())),
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        f"{out}: {snapshot['count']} registered modules "
        f"({', '.join(f'{c} {n}' for c, n in snapshot['categories'].items())}) "
        f"@ {PROJECT} {snapshot['commit_short']} ({snapshot['commit_date']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
