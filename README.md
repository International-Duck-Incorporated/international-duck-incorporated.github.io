# International Duck Incorporated

Static GitLab Pages site for [International Duck Incorporated](https://gitlab.com/international-duck-incorporated), designed as a responsive premium-glass product dashboard.

## Pages

- `index.html` - organization overview and live GitLab group metrics
- `projects.html` - standalone project and repository directory
- `website.html` - a small page about the source repository for this website
- `people.html` - member directory
- `migration.html` - sourced GitHub-to-GitLab migration timeline
- `venomous.html` - complete Venomous experience with features, module browser, releases, installation, activity, and contributors
- `beacon.html` - Beacon project page with module categories, safety policy, configuration, addon API, engineering notes, and current release status
- `nulltrace.html` - NullTrace project page with protection surface, scope, the v2.0.0 official release, nightly downloads, and diagnostics
- `championscode.html` - ChampionsCode project page with research console, modules, safety model, and development status
- `404.html` - matching not-found page

## Live GitLab data

Client-side synchronization uses the public GitLab API and raw repository source to keep these areas current automatically:

- Group identity, avatar, and project directory from the GitLab group
- Venomous stars, forks, language, and latest activity
- Recent commits and project contributors with GitLab profile links
- Registered modules parsed from `ModuleRegistry.java`

GitLab does not expose group membership through its public API, so the people directory renders the checked-in member roster. All five public project repositories (Beacon, Venomous, NullTrace, ChampionsCode, and this website) live in the GitLab group, and NullTrace release data is pulled from the GitLab releases API. 0xFF remains an active member and now links to his GitLab profile because his GitHub account is unavailable. Other personal profiles keep their original destinations where available. Checked-in content and authentic local images keep the pages useful if the API is unavailable or rate-limited.

Open `http://localhost:8080`. No build step or external front-end dependency is required.

## Deploy

GitLab Pages deploys from `main` via `.gitlab-ci.yml`.
