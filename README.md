# International Duck Incorporated

Static GitLab Pages site for [International Duck Incorporated](https://gitlab.com/international-duck-incorporated), designed as a responsive premium-glass product dashboard.

**Platform policy:** wherever this site or this organization references both GitLab and GitHub, **GitLab is IDI's main platform** and GitHub the legacy mirror. The GitHub organization remains publicly visible as a backup, but active development, releases, and all source-of-truth links point to GitLab.

## Pages

- `index.html` - organization overview and live GitLab group metrics
- `projects/index.html` - public project directory, including the in-development ZonedOut project
- `Website` - a small page about the source repository for this website (`website.html`)
- `people.html` - member directory
- `activity.html` - cross-platform live commit feed: every project on both organizations, per-member attribution, and a merged timeline, marking GitLab as **main** and GitHub as legacy
- `migration.html` - sourced GitHub-to-GitLab migration timeline
- `venomous.html` - complete Venomous experience with features, module browser, releases, installation, activity, and contributors
- `beacon.html` - Beacon project page with module categories, safety policy, configuration, addon API, engineering notes, and current release status
- `nulltrace.html` - NullTrace project page with protection surface, scope, the v2.0.0 official release on GitLab and CurseForge, nightly downloads, and diagnostics
- `championscode.html` - ChampionsCode project page with research console, modules, safety model, and development status
- `404.html` - matching not-found page

## Live GitLab + GitHub data

Client-side synchronization uses the public **GitLab API** (main) and, since September 2026, the public **GitHub API** (legacy mirror) to keep these areas current automatically:

- Group identity, avatar, and project directory from the GitLab group (main)
- Cross-platform commit activity on `/activity`: per-project repositories from both organizations (`GET /groups/:id/projects` on GitLab, `GET /orgs/:org/repos` on GitHub) and the newest 100 commits per repository per platform, attributed to members with a checked-in alias table (`activity.js`)
- Per-member commit cards with GitLab (main) and GitHub (legacy) splits; upstream OpSec contributors (aurickk, KaPlayz) and automation accounts are bucketed separately instead of counted as members
- Venomous stars, forks, language, and latest activity
- Beacon and NullTrace release versions, dates, counts, and download destinations
- Recent commits and project contributors with GitLab profile links
- Registered modules parsed from `ModuleRegistry.java`

GitHub's anonymous API is rate-limited (60 requests/hour per visitor IP) and after the September 2026 account actions it intermittently returns 404 for individual repository endpoints. The activity page therefore fetches each platform independently and degrades panel-by-panel: if GitHub commits are unreachable, the GitHub panel falls back to mirrored `pushed_at` metadata; if a platform is entirely unavailable, the other still renders, and the footer sync state reports which sources answered.

GitLab does not expose group membership through its public API, so the people directory renders the checked-in member roster. All seven public project repositories are in the GitLab group (main): Beacon, Venomous, NullTrace, ChampionsCode, Beacon-Bagley, ZonedOut, and `home` (this website). The project directory links ZonedOut to its source repository while it is in development. Beacon and NullTrace release data is pulled from the GitLab releases API. 0xFF remains an active member and now links to his GitLab profile because his GitHub account is unavailable. Other personal profiles keep their original destinations where available. Checked-in content and authentic local images keep the pages useful if the API is unavailable or rate-limited.

Open `http://localhost:8080`. No build step or external front-end dependency is required.

## Stylesheets

Styles are split into focused files under `css/`. Pages using the shared site theme link them in this order to preserve the original cascade:

1. `site.css` — shared theme, navigation, homepage, directories, and Venomous
2. `profiles.css` — glass-card treatment and shared project/member profile styles
3. `project-atmospheres.css` — project backgrounds and Beacon styling
4. `migration.css` — migration timeline and status page
5. `profile-themes.css` — Starry Night and Matrix member themes
6. `page-layouts.css` — extended project content and bespoke page layouts
7. `bagley.css` — Bagley theme and animated background
8. `overrides.css` — shared layout fixes; keep this last

Image URLs inside these stylesheets are relative to the `css/` directory and point back to `assets/`.

## Deploy

GitLab Pages deploys from `main` via `.gitlab-ci.yml`.
