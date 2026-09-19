# International Duck Incorporated

Static GitHub Pages site for [International Duck Incorporated](https://github.com/International-Duck-Incorporated), centered on [Venomous](https://github.com/International-Duck-Incorporated/Venomous).

## Live GitHub data

The site uses the public GitHub API and raw repository source to keep these areas current automatically:

- Organization logo and repository count
- Venomous stars, forks, language, and last push
- Stable and nightly releases with direct JAR links
- Registered modules parsed from `ModuleRegistry.java`
- Recent commits and contributors
- Organization repositories

Checked-in fallback data and images keep the page usable if the API is unavailable.

## Local preview

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Deploy

No build step is required. Enable GitHub Pages for the `main` branch at `/ (root)`.
