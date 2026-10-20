#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

format_prettier() {
  npx --yes prettier@3.6.2 --write \
    "**/*.{html,js,css,json,jsonc,md,yml,yaml}" \
    ".gitlab-ci.yml" \
    --ignore-path .prettierignore
}

# Format source files before rebuilding the committed generated artifacts.
format_prettier
python3 -m ruff format tools
python3 tools/build.py

# Keep generated HTML readable after the build has rewritten it.
format_prettier
