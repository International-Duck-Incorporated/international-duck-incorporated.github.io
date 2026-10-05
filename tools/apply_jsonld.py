#!/usr/bin/env python3
"""Inject schema.org JSON-LD into every indexable page.

Every page gets Organization + WebSite + WebPage + BreadcrumbList. Project pages
add SoftwareApplication, member pages add ProfilePage + Person, and the two
directory pages add ItemList. Values are limited to facts that also appear in
the page's static HTML (versions, release dates, licences, repository URLs).

Idempotent: pages that already contain application/ld+json are skipped.
Run from repo root:  python3 tools/apply_jsonld.py
"""
import json
import re
from pathlib import Path

SITE = "https://idi-official.pages.dev"
OG_IMAGE = SITE + "/assets/og-default.png"
ORG_ID = SITE + "/#organization"
WEB_ID = SITE + "/#website"
GITLAB = "https://gitlab.com/international-duck-incorporated"

ORG = {
    "@type": "Organization",
    "@id": ORG_ID,
    "name": "International Duck Incorporated",
    "alternateName": "IDI",
    "url": SITE + "/",
    "logo": {"@type": "ImageObject", "url": SITE + "/assets/org-avatar.png"},
    "image": OG_IMAGE,
    "description": ("Open-source collective building Minecraft mods, tools and experiments "
                    "in public. Source of truth is GitLab; GitHub is a legacy mirror."),
    "sameAs": [GITLAB, "https://github.com/International-Duck-Incorporated"],
    "knowsAbout": ["Minecraft mods", "Fabric modding", "Minecraft client utilities",
                   "open source"],
}
WEB = {
    "@type": "WebSite",
    "@id": WEB_ID,
    "url": SITE + "/",
    "name": "International Duck Incorporated",
    "inLanguage": "en",
    "publisher": {"@id": ORG_ID},
}

PROJECTS = {
    "projects/beacon.html": {
        "url": "/projects/beacon", "name": "Beacon",
        "desc": ("Modular, client-side utility mod for Minecraft 26.2 with 55 registered "
                 "modules, persistent configuration and an addon API. Vanilla-server-safe."),
        "version": "1.8.16", "date": "2026-09-25", "os": "Minecraft 26.2",
        "repo": GITLAB + "/Beacon",
        "download": GITLAB + "/Beacon/-/releases/1.8.16/downloads/Beacon-1.8.16.jar",
        "license": "https://spdx.org/licenses/GPL-3.0-only.html",
    },
    "projects/venomous.html": {
        "url": "/projects/venomous", "name": "Venomous",
        "desc": ("Optimized and refined Meteor Client addon for Minecraft 26.2 with 124 "
                 "modules. Stable release v7.0.0."),
        "version": "7.0.0", "date": None, "os": "Minecraft 26.2",
        "repo": GITLAB + "/Venomous",
        "download": GITLAB + "/Venomous/-/releases/v7.0.0",
        "license": None,
    },
    "projects/nulltrace.html": {
        "url": "/projects/nulltrace", "name": "NullTrace",
        "desc": ("Client-side Fabric privacy and anti-fingerprinting mod for Minecraft "
                 "1.21.11, 26.1, 26.2 and 26.3: client brand spoofing, fingerprint "
                 "protection, tracking defenses and safer server connections."),
        "version": "2.0.0", "date": "2026-09-24",
        "os": "Minecraft 1.21.11 / 26.1 / 26.2 / 26.3",
        "repo": GITLAB + "/NullTrace",
        "download": GITLAB + "/NullTrace/-/releases/v2.0.0",
        "license": "https://spdx.org/licenses/GPL-3.0.html",
    },
    "projects/championscode.html": {
        "url": "/projects/championscode", "name": "ChampionsCode",
        "desc": ("Client-side Fabric mod for Minecraft 26.3 for authorized, defensive server "
                 "and plugin research and controlled runtime Java addon development."),
        "version": "0.1.0-beta.1", "date": "2026-09-25", "os": "Minecraft 26.3",
        "repo": GITLAB + "/ChampionsCode",
        "download": GITLAB + "/ChampionsCode/-/releases/v0.1.0-beta.1",
        "license": None,
    },
    "projects/bagley.html": {
        "url": "/projects/bagley", "name": "Bagley",
        "desc": ("Opt-in, client-side AI chat assistant addon for Beacon with local provider "
                 "configuration and optional memory. Requires Beacon 1.9.0 or newer."),
        "version": None, "date": None, "os": "Minecraft (via Beacon)",
        "repo": GITLAB + "/beacon-bagley",
        "download": None,
        "license": "https://spdx.org/licenses/GPL-3.0-only.html",
    },
    "projects/zonedout.html": {
        "url": "/projects/zonedout", "name": "ZonedOut",
        "desc": ("In-development client-side Minecraft 26.3 Fabric mod with combat and utility "
                 "features, a Metro-style UI and 36-module seed/world-generation analysis."),
        "version": "0.1.0", "date": None, "os": "Minecraft 26.3",
        "repo": GITLAB + "/zonedout",
        "download": None,
        "license": "https://spdx.org/licenses/GPL-3.0-only.html",
    },
}

PROJECTS["projects/website.html"] = {
    "url": "/projects/website", "name": "IDI website",
    "desc": ("The static, dependency-free source repository for this website: an open-source "
             "organization dashboard synchronized live with the GitLab API and deployed on "
             "Cloudflare Pages."),
    "version": None, "date": None, "os": "Web",
    "repo": GITLAB + "/home",
    "download": None,
    "license": None,
    "category": "WebApplication",
    "lang": "HTML",
}

PEOPLE = {
    "people/0xffshell.html": {"url": "/people/0xffshell", "name": "0xFFshell",
        "desc": "International Duck's main writer.",
        "sameAs": ["https://gitlab.com/0xFFshell"]},
    "people/3spress0.html": {"url": "/people/3spress0", "name": "espress0",
        "desc": "Backend developer and backbone of most International Duck projects.",
        "sameAs": ["https://gitlab.com/espress0"]},
    "people/e-vdv-hu.html": {"url": "/people/e-vdv-hu", "name": "E-VDV-HU",
        "desc": "Backend and hosting manager for International Duck.",
        "sameAs": ["https://github.com/E-VDV-HU"]},
    "people/midas735.html": {"url": "/people/midas735", "name": "midas735",
        "desc": "Just happy to be here at International Duck Incorporated.",
        "sameAs": ["https://github.com/midas735", "https://gitlab.com/midas735"]},
    "people/superivar.html": {"url": "/people/superivar", "name": "Xx-superIvar-xX",
        "desc": "Product tester for International Duck Incorporated.",
        "sameAs": ["https://github.com/Xx-superIvar-xX", "https://gitlab.com/Xx-superIvar-xX"]},
    "people/jojo-8002.html": {"url": "/people/jojo-8002", "name": "Jojo-8002",
        "desc": "Here for shit n giggles at International Duck Incorporated.",
        "sameAs": ["https://github.com/Jojo-8002"]},
}

CRUMBS = {
    "/": [("International Duck Incorporated", "/")],
    "/activity": [("International Duck Incorporated", "/"), ("Activity", "/activity")],
    "/migration": [("International Duck Incorporated", "/"), ("Migration", "/migration")],
    "/projects/": [("International Duck Incorporated", "/"), ("Projects", "/projects/")],
    "/people/": [("International Duck Incorporated", "/"), ("Members", "/people/")],
}
for _rel, _p in PROJECTS.items():
    CRUMBS[_p["url"]] = [("International Duck Incorporated", "/"), ("Projects", "/projects/"),
                         (_p["name"], _p["url"])]
for _rel, _m in PEOPLE.items():
    CRUMBS[_m["url"]] = [("International Duck Incorporated", "/"), ("Members", "/people/"),
                         (_m["name"], _m["url"])]


def breadcrumbs(url: str):
    trail = CRUMBS.get(url, [("International Duck Incorporated", "/")])
    return {
        "@type": "BreadcrumbList",
        "@id": SITE + url + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE + u}
            for i, (n, u) in enumerate(trail)
        ],
    }


def webpage(url: str, title: str, desc: str, extra: str = "WebPage"):
    return {
        "@type": extra,
        "@id": SITE + url + "#webpage",
        "url": SITE + url,
        "name": title,
        "description": desc,
        "isPartOf": {"@id": WEB_ID},
        "about": {"@id": ORG_ID},
        "inLanguage": "en",
        "primaryImageOfPage": {"@type": "ImageObject", "url": OG_IMAGE},
        "breadcrumb": {"@id": SITE + url + "#breadcrumb"},
    }


def software_application(p: dict):
    app = {
        "@type": "SoftwareApplication",
        "@id": SITE + p["url"] + "#app",
        "name": p["name"],
        "description": p["desc"],
        "url": SITE + p["url"],
        "applicationCategory": p.get("category", "GameMod"),
        "operatingSystem": p["os"],
        "programmingLanguage": p.get("lang", "Java"),
        "isAccessibleForFree": True,
        "author": {"@id": ORG_ID},
        "publisher": {"@id": ORG_ID},
        "codeRepository": p["repo"],
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    }
    if p["version"]:
        app["softwareVersion"] = p["version"]
    if p["date"]:
        app["datePublished"] = p["date"]
    if p["download"]:
        app["downloadUrl"] = p["download"]
    if p["license"]:
        app["license"] = p["license"]
    return app


def build(rel: str, url: str, title: str, desc: str):
    graph = [ORG, WEB, webpage(url, title, desc), breadcrumbs(url)]
    if rel in PROJECTS:
        graph[2] = webpage(url, title, desc, "WebPage")
        graph.append(software_application(PROJECTS[rel]))
    elif rel in PEOPLE:
        m = PEOPLE[rel]
        person = {
            "@type": "Person",
            "@id": SITE + url + "#person",
            "name": m["name"],
            "description": m["desc"],
            "url": SITE + url,
            "memberOf": {"@id": ORG_ID},
            "sameAs": m["sameAs"],
        }
        graph[2] = webpage(url, title, desc, "ProfilePage")
        graph[2]["mainEntity"] = {"@id": SITE + url + "#person"}
        graph.append(person)
    elif url == "/projects/":
        graph[2] = webpage(url, title, desc, "CollectionPage")
        graph.append({"@type": "ItemList", "@id": SITE + url + "#list",
                      "name": "Public projects",
                      "numberOfItems": len(PROJECTS),
                      "itemListElement": [
                          {"@type": "ListItem", "position": i + 1,
                           "name": p["name"], "url": SITE + p["url"]}
                          for i, p in enumerate(PROJECTS.values())]})
    elif url == "/people/":
        graph[2] = webpage(url, title, desc, "CollectionPage")
        graph.append({"@type": "ItemList", "@id": SITE + url + "#list",
                      "name": "Public members",
                      "numberOfItems": len(PEOPLE),
                      "itemListElement": [
                          {"@type": "ListItem", "position": i + 1,
                           "name": m["name"], "url": SITE + m["url"]}
                          for i, m in enumerate(PEOPLE.values())]})
    return {"@context": "https://schema.org", "@graph": graph}


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    pages = {**{r: PROJECTS[r]["url"] for r in PROJECTS},
             **{r: PEOPLE[r]["url"] for r in PEOPLE},
             "index.html": "/", "activity.html": "/activity", "migration.html": "/migration",
             "projects/index.html": "/projects/", "people/index.html": "/people/"}
    done = 0
    for rel, url in pages.items():
        path = root / rel
        src = path.read_text(encoding="utf-8", errors="replace")
        if "application/ld+json" in src:
            continue
        title = (re.search(r"<title>(.*?)</title>", src, re.S) or [None, ""])[1].strip()
        desc = (re.search(r'<meta name="description" content="(.*?)"', src) or [None, ""])[1]
        desc = desc.replace("&amp;", "&")
        payload = json.dumps(build(rel, url, title, desc), ensure_ascii=False, indent=2)
        block = '  <script type="application/ld+json">\n' + payload + "\n  </script>\n"
        src = src.replace("</head>", block + "</head>", 1)
        path.write_text(src, encoding="utf-8")
        done += 1
    print(f"injected JSON-LD into {done} pages")


if __name__ == "__main__":
    main()
