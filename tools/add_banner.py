#!/usr/bin/env python3
"""Add GitHub return announcement banner to all HTML pages."""

from pathlib import Path

BANNER_HTML = '''    <!-- Banner: IDI back on GitHub (show until 2026-11-05) -->
    <div class="announcement-banner" id="github-return-banner" aria-live="polite" hidden>
      <div class="shell announcement-inner">
        <svg class="announcement-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
        <div class="announcement-text">
          <strong>Welcome back to GitHub!</strong> International Duck Incorporated is now active on <a href="https://github.com/international-duck-incorporated" target="_blank" rel="noreferrer">GitHub</a> again. Development continues on <a href="https://gitlab.com/international-duck-incorporated" target="_blank" rel="noreferrer">GitLab</a> as our primary home.
        </div>
        <button class="announcement-dismiss" type="button" aria-label="Dismiss announcement" data-dismiss-banner>×</button>
      </div>
    </div>

'''

def process_file(path: Path) -> bool:
    content = path.read_text(encoding="utf-8", errors="replace")
    
    # Skip if already has banner
    if "github-return-banner" in content:
        return False

    # Insert banner after </header>
    if "</header>" in content:
        content = content.replace("</header>", "</header>\n" + BANNER_HTML, 1)
        path.write_text(content, encoding="utf-8")
        return True
    
    return False

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