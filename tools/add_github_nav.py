#!/usr/bin/env python3
"""Add GitHub icon and link to all HTML files with main-navigation."""

import re
from pathlib import Path

GITHUB_ICON = '''      <symbol id="i-github" viewBox="0 0 24 24">
        <path
          fill="currentColor"
          stroke="none"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </symbol>'''

GITHUB_LINK = '''          <a
            class="icon-link"
            href="https://github.com/international-duck-incorporated"
            target="_blank"
            rel="noreferrer"
            aria-label="International Duck Incorporated on GitHub"
            ><svg><use href="#i-github" /></svg
          ></a>'''

def process_file(path: Path) -> bool:
    content = path.read_text(encoding="utf-8", errors="replace")
    if "main-navigation" not in content:
        return False

    # Add GitHub icon after GitLab icon
    if 'id="i-github"' not in content:
        content = content.replace(
            '<symbol id="i-gitlab"',
            GITHUB_ICON + '\n      <symbol id="i-gitlab"'
        )

    # Add GitHub link before GitLab link in nav
    if 'href="https://github.com/international-duck-incorporated"' not in content:
        content = content.replace(
            '<a\n            class="icon-link"\n            href="https://gitlab.com/international-duck-incorporated"',
            GITHUB_LINK + '\n          <a\n            class="icon-link"\n            href="https://gitlab.com/international-duck-incorporated"'
        )

    path.write_text(content, encoding="utf-8")
    return True

def main():
    root = Path(__file__).resolve().parent.parent
    changed = 0
    for html in root.rglob("*.html"):
        if ".git" in html.parts:
            continue
        if process_file(html):
            changed += 1
            print(f"Updated: {html.relative_to(root)}")
    print(f"\nTotal updated: {changed}")

if __name__ == "__main__":
    main()