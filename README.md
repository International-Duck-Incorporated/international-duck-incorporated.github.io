# International Duck Incorporated

Static GitLab Pages site for [International Duck Incorporated](https://gitlab.com/international-duck-incorporated)

**Platform policy:** GitLab is IDI's active platform and source of truth for development, releases, issues, and live activity. The former GitHub organization is currently hidden/private from public view, so this site does not call its APIs or link to its mirror. GitHub references are retained only where they explain the migration history or unavailable-data status.

Change notes live in `LIGHTHOUSE-FIXES.md` (round 1: performance and
accessibility) and `SEO-FIXES.md` (round 2: crawlability, page heads, the module
directory and the changelog). The module page's Download links, its hero button
and the two CurseForge references on the Beacon page point at the public
listing (Beacon QoL, project 1720579); the URL and name live in
`tools/gen_module_page.py` as `CURSEFORGE_URL` / `CURSEFORGE_NAME`.

## BadEgg v3 gateway, runtime config and operator endpoints

The dashboard UI ships with the gateway in
[`badegg-v3`](https://gitlab.com/international-duck-incorporated/badegg-v3)
(`feat/idi-pages-dashboard` branch). It is not deployed from this repo, so the
BadEgg page points at the project rather than at a console. What lives here is
the other half: the gateway in `functions/_badegg.js`, the settings schema it
resolves against, and the operator endpoints the dashboard talks to. The settings' bounds, defaults and help text all live in one place -
`badegg-config.js` - which the gateway imports, so a knob cannot exist on one
side only.

- **Schema** - `badegg-config.js` (`CONFIG_SCHEMA`, `resolveConfig`,
  `sanitizeConfigOverrides`). `resolveConfig` still accepts exactly the
  `BADEGG_*` env vars the site always used; those remain the baseline.
- **Storage** - settings saved from the dashboard go to the `IDI_BADEGG` KV
  namespace under `badegg:v3:config` and win over the env vars. Deleting the KV
  record returns the site to the env baseline.
- **API** - `GET|PUT|DELETE /api/badegg/config`, served by the gateway itself.
  It authenticates with `Authorization: Bearer $BADEGG_ADMIN_TOKEN` (16+
  characters) _or_ the dashboard session cookie, refuses to run at all when
  that secret is unset, is throttled after repeated bad tokens, and sits in
  front of the rate limiter so a too-tight limit can always be undone.
- **No KV?** The gateway still reports live telemetry (`?badegg-status=1`, now
  gated) and the dashboard exports the changed settings as `BADEGG_*` variables
  or a `wrangler.jsonc` `vars` block.

### Signing in

The console is password protected and the password is `BADEGG_ADMIN_TOKEN` -
one secret to configure, not two. The login flow is implemented here, on the
gateway, so the dashboard can be served from wherever it is built:

- `POST /api/badegg/login` with `{"password": "..."}` compares the password in
  constant time against the secret and sets an `HttpOnly`, `SameSite=Strict`,
  12-hour `badegg_session` cookie. It is throttled, and it answers 401 with
  `invalid_password` rather than revealing whether the secret exists.
- `GET /api/badegg/session` reports whether the current request is signed in;
  `POST /api/badegg/logout` clears the cookie.
- The console, the config API and the diagnostics endpoint all accept that
  cookie, so the operator endpoints work from a browser without a bearer header.

`GET /?badegg-status=1` used to be open, but it reports the whole effective
policy - the same information the login exists to protect, so it now requires
the same credentials. A signed-in console is unaffected.

### Banning

Two settings sit in the _limits_ group of the schema:

- **Ban always list** (`BADEGG_BAN_ALWAYS`) - IPs and CIDRs that are refused on
  every request, in monitor mode as much as enforce mode, and checked _before_
  the allowlist so it wins. It exists for addresses an operator wants off the
  site permanently, whatever the traffic looks like.
- **Ban forever** (`BADEGG_BAN_FOREVER`) - flips bans from "expire after
  `BADEGG_BAN_TTL_SECONDS`" to "never expire". A forever ban is stored in KV
  without a TTL and is not written into the module's internal table with an
  expiry, so nothing expires it - not even an isolate restart. When it is on,
  the console greys out the ban-length field and says so, rather than letting
  the value look editable and quietly do nothing.

Because a forever ban has no expiry to wait out, the gateway lists the bans the
isolate is currently holding (`GET /api/badegg/bans`) and can lift them one by
one (`POST /api/badegg/lift` with `{"ip": "..."}`). Lifting deletes the ban from
both the in-memory table and KV, and clears the address's rate-limiter strikes
so it is not re-banned a second later. `GET /api/badegg/bans` shows `forever:
true` and `expiresAt: null` for those bans; a finite ban shows its expiry.

### Address lists

`BADEGG_ALLOWLIST` and `BADEGG_BAN_ALWAYS` both accept single addresses and
CIDRs, IPv4 and IPv6, validated by `normalizeConfigValue` and matched by the
gateway's `matchIpList`. `127.0.0.1` and `::1` are always allowed and can
never be banned. The allowlist skips the blocklist, the rate limiter and the
WAF; the ban-always list is checked before it, so an address on both lists is
banned.

```sh
wrangler kv namespace create IDI_BADEGG     # then uncomment the binding
wrangler secret put BADEGG_ADMIN_TOKEN      # 16+ chars, never committed
```

Local development runs the real middleware, the real operator API and an
in-memory KV against the static files, so the login flow, the config API and the
ban endpoints can all be exercised without a deploy:

```sh
node tools/dev-server.js                      # gateway + operator API on :4173
node --test tools/test-badegg-v3.js \
            tools/test-badegg-config.js       # gateway + config suites
```

The repo deliberately has no `package.json`: the site itself has no npm
dependencies, and adding one with `"type": "module"` would change how Node reads
the CommonJS `tools/test-blockfield.js`.

The dev server prints an admin token for the local run; the blocklist download
is stubbed out so it stays offline.

One rule worth knowing: response **body** scanning skips static assets (JS, CSS,
images, fonts, `sitemap.xml`) by content type and extension. In `block` mode a
bundled script that merely mentions `authorization: Bearer ...` would otherwise
be blocked or redacted, which is how the dashboard itself first got a 502. Page
and JSON bodies are still scanned.

## Code formatting

HTML, CSS, JavaScript, JSON/JSONC, YAML and Markdown use Prettier 3.6.2; Python tools use Ruff's formatter. XML (including the generated sitemap) is excluded because Prettier has no XML parser here. The checked-in settings are `.editorconfig`, `.prettierrc.json` and `pyproject.toml`.

Install Ruff once with `python3 -m pip install ruff`. After editing sources, run the formatting/build script:

```sh
tools/format_code.sh
```

The script formats source files, rebuilds committed outputs, and formats generated HTML afterward. `css/bundle.css` is intentionally excluded from Prettier: it is generated from the formatted `css/*.css` source modules.

## Build steps

Handwritten sources are the page HTML, the `css/*.css` modules (in cascade
order) and the root `*.js` files. Four artifacts are generated from them and are
committed, because both Cloudflare Pages and GitLab Pages serve the repository
as-is. After editing a source, regenerate them so the `?v=` hashes in the HTML
keep matching:

```sh
python3 tools/build.py   # bundle CSS, WebP siblings, <picture> pairs, cache-bust hashes
```

Individual steps: `tools/bundle_css.py` (writes `css/bundle.css` from the ordered
modules), `tools/optimize_images.py` (writes the `assets/*.webp` siblings, needs
Pillow), `tools/apply_image_sources.py` (rewrites `<img>` to `<picture>` pairs),
`tools/bust_cache.py` (`?v=<content hash>` on every CSS/JS reference). Do not
hand-edit `css/bundle.css`, the `.webp` files or the hashes; edit the sources and
re-run the build.

### Generated pages and snapshots

Three pages are generated from committed files/snapshots rather than hand-written:

| Page                       | Generator                     | Data                       |
| -------------------------- | ----------------------------- | -------------------------- |
| `/projects/beacon/modules` | `tools/gen_module_page.py`    | `data/beacon-modules.json` |
| `/changelog`               | `tools/gen_changelog_page.py` | `data/changelogs.json`     |
| `/license`                 | `tools/gen_license_page.py`   | `LICENSE.md`               |

The snapshots come from the projects themselves and are refreshed on demand (they
need network access to the public GitLab API):

```sh
python3 tools/fetch_beacon_modules.py   # registered modules + their descriptions, from ModuleManager.java
python3 tools/fetch_changelogs.py       # every CHANGELOG.md, matched to GitLab releases
python3 tools/build.py                  # regenerate the pages from the snapshots
```

Snapshots are committed so the build itself never depends on GitLab being
reachable. The module count and the "N registered modules" copy on the site are
derived from `data/beacon-modules.json` by `tools/apply_module_count.py`, so the
number cannot go stale in the copy without the snapshot changing first.

Search and share metadata (title, description, canonical, Open Graph, Twitter) is
owned by `tools/apply_page_seo.py` for every page, including the generated ones -
edit the table there, not the tags in the HTML.
