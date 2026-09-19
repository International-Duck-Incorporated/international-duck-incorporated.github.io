# International Duck Incorporated

Static GitHub Pages site for [International Duck Incorporated](https://github.com/International-Duck-Incorporated), designed as a responsive premium-glass product dashboard.

## Pages

- `index.html` — organization overview and live GitHub metrics
- `projects.html` — standalone project and repository directory
- `people.html` — standalone public-members directory
- `venomous.html` — complete Venomous experience with features, module browser, releases, installation, activity, and contributors
- `404.html` — matching not-found page

## Live GitHub data

Client-side synchronization uses the public GitHub API and raw repository source to keep these areas current automatically:

- Organization identity, repository count, followers, projects, and public members
- Venomous stars, forks, language, and latest push
- Stable and nightly releases with direct JAR downloads
- Registered modules parsed from `ModuleRegistry.java`
- Recent commits and project contributors

Checked-in content and authentic local images keep both pages useful if the API is unavailable or rate-limited. When public organization membership is unavailable, the people section falls back to project contributors.

## Local preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. No build step or external front-end dependency is required.

## Deploy

Enable GitHub Pages for the `main` branch at `/ (root)`.
