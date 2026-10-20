#!/usr/bin/env python3
"""Add crawler-visible static content to the three thinnest indexable pages.

The homepage previously had no links to any project or member page and almost no
text; /members/ and /activity were similarly thin. This injects static, JS-free
sections that reuse existing CSS classes and card markup (copied from the pages
that already render them), so the design language is unchanged and script.js
hydration is unaffected (the new markup deliberately carries no data-org-* hooks).

Idempotent: pages containing data-seo-enriched are skipped.
Run from repo root:  python3 tools/enrich_content.py
"""

from pathlib import Path

LAZY = ' loading="lazy" decoding="async"'

PROJECT_CARDS = """        <a class="project-card glass-card reveal" href="/projects/beacon">
          <div class="project-card-top"><span class="project-icon beacon"><img src="/assets/beacon-icon.png" alt="" width="64" height="64"%LAZY%></span><span class="project-status"><i></i> Release</span></div>
          <div><span class="card-label">Utility project</span><h3>Beacon</h3><p>A vanilla-server-safe, modular client-side utility mod for Minecraft 26.2 with 55 registered modules, persistent configuration, and an addon API.</p></div>
          <footer><span><i class="language-dot java"></i>Java</span><span>Open project <svg><use href="#i-arrow"/></svg></span></footer>
        </a>
        <a class="project-card featured glass-card reveal" href="/projects/venomous">
          <div class="project-card-top"><span class="project-icon venom"><img src="/assets/venomous-icon.png" alt="" width="64" height="64"%LAZY%></span><span class="project-status"><i></i> Active</span></div>
          <div><span class="card-label">Featured project</span><h3>Venomous</h3><p>Optimized &amp; refined Meteor Client addon for Minecraft 26.2.</p></div>
          <footer><span><i class="language-dot java"></i>Java</span><span>Open project <svg><use href="#i-arrow"/></svg></span></footer>
        </a>
        <a class="project-card glass-card reveal" href="/projects/nulltrace">
          <div class="project-card-top"><span class="project-icon privacy"><img src="/assets/nulltrace-icon.png" alt="" width="64" height="64"%LAZY%></span><span class="project-status"><i></i> Official release</span></div>
          <div><span class="card-label">Privacy project</span><h3>NullTrace</h3><p>A client-side Fabric privacy mod for Minecraft 1.21.11, 26.1, 26.2, and 26.3 covering client brand spoofing, fingerprint protection, tracking defenses, and safer server connections.</p></div>
          <footer><span><i class="language-dot java"></i>Java</span><span>Open project <svg><use href="#i-arrow"/></svg></span></footer>
        </a>
        <a class="project-card glass-card reveal" href="/projects/championscode">
          <div class="project-card-top"><span class="project-icon champion"><img src="/assets/championscode-icon.png" alt="" width="64" height="64"%LAZY%></span><span class="project-status"><i></i> First launch</span></div>
          <div><span class="card-label">Research project</span><h3>ChampionsCode</h3><p>A client-side Fabric mod for Minecraft 26.3 for authorized, defensive server and plugin research and controlled runtime Java addon development.</p></div>
          <footer><span><i class="language-dot java"></i>Java</span><span>Open project <svg><use href="#i-arrow"/></svg></span></footer>
        </a>
        <a class="project-card glass-card reveal" href="/projects/bagley">
          <div class="project-card-top"><span class="project-icon bagley"><img src="/assets/bagley-icon.png" alt="" width="64" height="64"%LAZY%></span><span class="project-status"><i></i> New</span></div>
          <div><span class="card-label">Beacon addon</span><h3>Bagley</h3><p>An opt-in, client-side AI chat assistant addon for Beacon with local provider configuration and optional memory.</p></div>
          <footer><span><i class="language-dot java"></i>Java</span><span>Open project <svg><use href="#i-arrow"/></svg></span></footer>
        </a>
        <a class="project-card glass-card reveal" href="/projects/zonedout">
          <div class="project-card-top"><span class="project-icon zonedout"><img src="/assets/zonedout-icon.png" alt="" width="64" height="64"%LAZY%></span><span class="project-status muted">In development</span></div>
          <div><span class="card-label">Client-side mod</span><h3>ZonedOut</h3><p>A client-side Minecraft 26.3 Fabric mod with combat/utility features, a Metro-style UI, and 36-module seed/world-generation analysis.</p></div>
          <footer><span><i class="language-dot java"></i>Java</span><span>Open project <svg><use href="#i-arrow"/></svg></span></footer>
        </a>""".replace("%LAZY%", LAZY)

HOME_BLOCK = f"""
    <section class="shell home-directory reveal" aria-labelledby="home-projects-heading" data-seo-enriched>
      <header class="section-heading">
        <div><span class="eyebrow">Public repositories</span><h2 id="home-projects-heading">Projects.</h2></div>
        <p>Client-side Fabric mods and Meteor Client addons for Minecraft, developed in public and released for free. Every card links to a project overview page with features, release status and download destinations.</p>
      </header>
      <div class="project-grid directory-grid">
{PROJECT_CARDS}
      </div>
      <div class="action-row">
        <a class="button button-glass" href="/projects">All projects and release destinations <svg><use href="#i-arrow"/></svg></a>
      </div>
    </section>

    <section class="shell home-directory reveal" aria-labelledby="home-about-heading">
      <header class="section-heading">
        <div><span class="eyebrow">About</span><h2 id="home-about-heading">What International Duck builds.</h2></div>
      </header>
      <p>International Duck Incorporated is an open-source collective publishing Minecraft mods, client utilities and developer tools. The work is client-side Java on Fabric and Meteor Client, released for free under GPL licences, with sources, releases and issue trackers on GitLab. The former GitHub organization is currently hidden from public view, so GitLab is the active source of truth. NullTrace and Beacon are additionally listed on CurseForge.</p>
      <p>Everything is built in public: commit history, release notes and module registries are open, and this website mirrors the organization's live GitLab data so project status never goes stale. Read <a href="/migration">why the organization moved from GitHub to GitLab</a> in September 2026, or follow the <a href="/activity">GitLab commit activity feed</a>.</p>
    </section>
"""

MEMBERS_BLOCK = """
    <section class="shell home-directory reveal" aria-labelledby="members-about-heading" data-seo-enriched>
      <header class="section-heading">
        <div><span class="eyebrow">About the roster</span><h2 id="members-about-heading">Who we are.</h2></div>
      </header>
      <p>International Duck Incorporated has six public members. GitLab does not expose group membership through its public API, so this directory is a checked-in roster. Each card links to a profile page with the member's public account and, where available, project or activity details.</p>
      <p>Commit attribution from the active GitLab source lives on the <a href="/activity">activity page</a>. The former GitHub organization is currently hidden/private, so its API and mirror data are not used. Upstream contributors to forked projects and automation accounts are listed separately and are not counted as members.</p>
    </section>
"""

ACTIVITY_BLOCK = """
    <section class="shell activity-section-block reveal" aria-labelledby="activity-about-heading" data-seo-enriched>
      <header class="section-heading">
        <div><span class="eyebrow">Scope</span><h2 id="activity-about-heading">What this page tracks.</h2></div>
        <p>Every public repository in the GitLab group, and the newest 100 commits per repository.</p>
      </header>
      <div class="activity-note reveal">
        <p>The GitLab feed covers <a href="/projects/beacon">Beacon</a>, <a href="/projects/venomous">Venomous</a>, <a href="/projects/nulltrace">NullTrace</a>, <a href="/projects/championscode">ChampionsCode</a>, <a href="/projects/bagley">Bagley</a>, <a href="/projects/zonedout">ZonedOut</a> and <a href="/projects/website">this website</a>. Commits are attributed to the six public members where the author identity matches a checked-in alias table; upstream OpSec contributors and automation accounts are bucketed separately.</p>
        <p>The former GitHub organization is currently hidden/private, so GitHub API and mirror data are intentionally excluded. If GitLab's API is unavailable, the page keeps its checked-in member roster and explanatory content while showing a source-status notice.</p>
      </div>
    </section>
"""


def _indent(block: str, spaces: int) -> str:
    pad = " " * spaces
    return "\n".join(pad + line if line.strip() else line for line in block.split("\n"))


def insert(path: Path, block: str) -> bool:
    src = path.read_text(encoding="utf-8", errors="replace")
    if "data-seo-enriched" in src:
        return False
    if path.name == "index.html" and 'class="below-fold"' in src:
        # Post-79f8a01 layout: hero + a solid ".below-fold > .shell" panel.
        # Nest the sections inside that shell (without their own .shell class)
        # so they inherit the panel's width and background.
        nested = _indent(block.replace('class="shell home-directory', 'class="home-directory'), 2)
        anchor = "        </section>\n      </div>\n    </section>"
        assert anchor in src, f"{path}: below-fold closing anchor not found"
        src = src.replace(
            anchor, "        </section>\n" + nested + "      </div>\n    </section>", 1
        )
    else:
        assert src.count("</main>") == 1, f"{path}: unexpected </main> count"
        src = src.replace("  </main>", block + "  </main>", 1)
    path.write_text(src, encoding="utf-8")
    return True


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    for rel, block in [
        ("index.html", HOME_BLOCK),
        ("members/index.html", MEMBERS_BLOCK),
        ("activity.html", ACTIVITY_BLOCK),
    ]:
        print(f"{rel}: {'updated' if insert(root / rel, block) else 'already enriched'}")


if __name__ == "__main__":
    main()
