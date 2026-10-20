#!/usr/bin/env python3
"""Keep every "N registered modules" / "N across 5 categories" claim honest.

The count comes from `data/beacon-modules.json` - the snapshot of Beacon's own
registration list (tools/fetch_beacon_modules.py). Copy that states a number is
rewritten from that snapshot, so a module being added or removed upstream shows
up here as a diff instead of a stale claim on a page.

Run from the repo root:  python3 tools/apply_module_count.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

TEXT_FILES = ["*.html", "*.txt", "*.md"]
PATTERNS = [
    (re.compile(r"\b\d+ registered modules\b"), "{count} registered modules"),
    (re.compile(r"\b\d+ across \d+ categor(?:y|ies)\b"), "{count} across {categories} categories"),
    (re.compile(r"\ball \d+ modules\b", re.I), "all {count} modules"),
]


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    data = json.loads((root / "data/beacon-modules.json").read_text(encoding="utf-8"))
    count, categories = data["count"], len(data["categories"])

    touched = []
    for pattern in TEXT_FILES:
        for path in sorted(root.rglob(pattern)):
            if ".git" in path.parts:
                continue
            source = path.read_text(encoding="utf-8", errors="replace")
            updated = source
            for regex, template in PATTERNS:
                replacement = template.format(count=count, categories=categories)

                def fix(match: re.Match, replacement: str = replacement) -> str:
                    # "All 56 modules" must not come back lowercase.
                    return (
                        replacement[0].upper() + replacement[1:]
                        if match.group(0)[:1].isupper()
                        else replacement
                    )

                updated = regex.sub(fix, updated)
            if updated != source:
                path.write_text(updated, encoding="utf-8")
                touched.append(path.relative_to(root).as_posix())

    print(
        f"module count {count} across {categories} categories; updated: "
        f"{', '.join(touched) if touched else 'nothing (already in sync)'}"
    )


if __name__ == "__main__":
    main()
