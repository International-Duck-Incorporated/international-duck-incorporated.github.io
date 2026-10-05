const REPO = "Venomous";
const NULLTRACE = "NullTrace";
const BEACON = "Beacon";
const MEMBER_LOGIN = "3spress0";
const SHADOWBANNED_USERS = new Set([]);
const GITHUB_BANNED_USERS = new Set(["0xffshell", "3spress0"]);
const normalizeLogin = (login) => String(login || "").toLowerCase();
const isShadowbannedLogin = (login) => SHADOWBANNED_USERS.has(normalizeLogin(login));
const isGithubBannedLogin = (login) => GITHUB_BANNED_USERS.has(normalizeLogin(login));
const GITLAB = "https://gitlab.com";
const GITLAB_API = `${GITLAB}/api/v4`;
const GL_GROUP_PATH = "international-duck-incorporated";
const GL_GROUP = `${GITLAB}/groups/${GL_GROUP_PATH}`;
const GL_GROUP_API = `${GITLAB_API}/groups/${GL_GROUP_PATH}`;
const GL_PROJECT_PATH = `${GL_GROUP_PATH}/Venomous`;
const GL_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(GL_PROJECT_PATH)}`;
const GL_NULLTRACE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/${NULLTRACE}`)}`;
const GL_BEACON_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/${BEACON}`)}`;
const GL_CHAMPIONSCODE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/ChampionsCode`)}`;
const SITE_ROUTES = Object.freeze({
  home: "/", projects: "/projects", people: "/people", venomous: "/projects/venomous",
  nulltrace: "/projects/nulltrace", championscode: "/projects/championscode", zonedout: "/projects/zonedout", beacon: "/projects/beacon", bagley: "/projects/bagley",
  website: "/projects/website", migration: "/migration"
});
const GL_SITE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/home`)}`;
const fallbackModules = [{"name":"Aimbot","category":"combat"},{"name":"AntiProjectile","category":"combat"},{"name":"AutoClickerPlus","category":"combat"},{"name":"AutoPotion","category":"combat"},{"name":"AutoShield","category":"combat"},{"name":"CriticalsPlus","category":"combat"},{"name":"CrystalPvP","category":"combat"},{"name":"Hunt","category":"combat"},{"name":"MaceKill","category":"combat"},{"name":"ProjectilePuncher","category":"combat"},{"name":"SuperKnockback","category":"combat"},{"name":"SwordBlock","category":"combat"},{"name":"TargetObsidian","category":"combat"},{"name":"TickBase","category":"combat"},{"name":"TimerRange","category":"combat"},{"name":"TpAura","category":"combat"},{"name":"VAnchorMacro","category":"combat"},{"name":"VAntiTrap","category":"combat"},{"name":"VAutoCity","category":"combat"},{"name":"VAutoDoubleHand","category":"combat"},{"name":"VAutoInvTotem","category":"combat"},{"name":"VBreachSwap","category":"combat"},{"name":"VKeyPearl","category":"combat"},{"name":"VKillAura","category":"combat"},{"name":"VMaceKill","category":"combat"},{"name":"VPopCounter","category":"combat"},{"name":"VShieldBreaker","category":"combat"},{"name":"VShieldBypass","category":"combat"},{"name":"VSwordPlaceObsidian","category":"combat"},{"name":"VWindPearlMacro","category":"combat"},{"name":"VelocityPlus","category":"combat"},{"name":"AntiCheatDetect","category":"detection"},{"name":"AntiStaff","category":"detection"},{"name":"SpectatorAlert","category":"detection"},{"name":"VAntiVanish","category":"detection"},{"name":"VPlayerDetection","category":"detection"},{"name":"VInvisESP","category":"visual"},{"name":"VLightESP","category":"visual"},{"name":"VSkeletonESP","category":"visual"},{"name":"AbortBreaking","category":"exploit"},{"name":"AntiReducedDebugInfo","category":"exploit"},{"name":"ClickTp","category":"exploit"},{"name":"Damage","category":"exploit"},{"name":"Disabler","category":"exploit"},{"name":"Dupe","category":"exploit"},{"name":"ExtendedFirework","category":"exploit"},{"name":"Kick","category":"exploit"},{"name":"LbClip","category":"exploit"},{"name":"MoreCarry","category":"exploit"},{"name":"NameCollector","category":"exploit"},{"name":"NoPitchLimit","category":"exploit"},{"name":"PingSpoof","category":"exploit"},{"name":"PortalMenu","category":"exploit"},{"name":"ResetVL","category":"exploit"},{"name":"SleepWalker","category":"exploit"},{"name":"TimeShift","category":"exploit"},{"name":"VAntiHunger","category":"exploit"},{"name":"VBungeeCordSpoof","category":"exploit"},{"name":"VChorusExploit","category":"exploit"},{"name":"VGhostHand","category":"exploit"},{"name":"VNoPortalHitbox","category":"exploit"},{"name":"VPortalGodMode","category":"exploit"},{"name":"VVehicleOneHit","category":"exploit"},{"name":"DankBobbing","category":"utility"},{"name":"Derp","category":"utility"},{"name":"Twerk","category":"utility"},{"name":"Vomit","category":"utility"},{"name":"ArmorWarning","category":"utility"},{"name":"AutoChatGame","category":"utility"},{"name":"AutoPearl","category":"utility"},{"name":"Chat","category":"utility"},{"name":"ElytraSwap","category":"utility"},{"name":"FarmlandTremble","category":"utility"},{"name":"FlagCheck","category":"utility"},{"name":"GUICloser","category":"utility"},{"name":"InventoryTracker","category":"utility"},{"name":"ItemOrganizer","category":"utility"},{"name":"LagNotifier","category":"utility"},{"name":"MiddleClickAction","category":"utility"},{"name":"PearlTools","category":"utility"},{"name":"ProphuntESP","category":"utility"},{"name":"SafeLogout","category":"utility"},{"name":"SoundESP","category":"utility"},{"name":"Spammer","category":"utility"},{"name":"TNTTimer","category":"utility"},{"name":"TargetLock","category":"utility"},{"name":"Teams","category":"utility"},{"name":"TextFieldProtect","category":"utility"},{"name":"TrueSight","category":"utility"},{"name":"VAntiBot","category":"utility"},{"name":"VAutoEZ","category":"utility"},{"name":"VBookBot","category":"utility"},{"name":"VChoir","category":"utility"},{"name":"VCoordSnapper","category":"utility"},{"name":"VFreecamMining","category":"utility"},{"name":"VHideScoreboard","category":"utility"},{"name":"VNameProtect","category":"utility"},{"name":"VNoBlockInteract","category":"utility"},{"name":"VNotifier","category":"utility"},{"name":"VPacketLogger","category":"utility"},{"name":"AntiBounce","category":"movement"},{"name":"AssertDominance","category":"movement"},{"name":"Clip","category":"movement"},{"name":"Fly","category":"movement"},{"name":"NoPush","category":"movement"},{"name":"Phase","category":"movement"},{"name":"SnapTap","category":"movement"},{"name":"Speed","category":"movement"},{"name":"VBlink","category":"movement"},{"name":"VBoatPhase","category":"movement"},{"name":"VHoleSnap","category":"movement"},{"name":"VRoboWalk","category":"movement"},{"name":"GlobalNetworkInterceptor","category":"utility"},{"name":"NoFallPlus","category":"utility"},{"name":"AntiBlind","category":"visual"},{"name":"VNewChunks","category":"visual"},{"name":"AntiVoid","category":"utility"},{"name":"AutoBreakSelected","category":"utility"},{"name":"AutoToolPlus","category":"utility"},{"name":"NoSignScreen","category":"utility"},{"name":"Scaffold","category":"utility"},{"name":"TimerPlus","category":"utility"},{"name":"VAirPlace","category":"utility"},{"name":"VAutoFarm","category":"utility"}];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const page = document.body.dataset.page;

async function getJSON(url, accept = "application/json") {
  const response = await fetch(url, { headers: { Accept: accept } });
  if (!response.ok) throw new Error(`${response.status} at ${url}`);
  return response.json();
}

function setText(selector, value) {
  $$(selector).forEach((node) => { node.textContent = value; });
}

function relativeDate(value) {
  if (!value) return "recently";
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units = [["year",31536000],["month",2592000],["day",86400],["hour",3600],["minute",60]];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) if (Math.abs(seconds) >= size || unit === "minute") return format.format(Math.round(seconds / size), unit);
  return "recently";
}

function fullDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : "Latest release";
}

function fileSize(bytes) {
  if (!bytes) return "JAR";
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function icon(id) {
  return `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
}

// Header, mobile navigation, and reveal motion.
const header = $("[data-header]");
const menu = $("[data-menu]");
const nav = $("[data-nav]");
const updateHeader = () => header?.classList.toggle("scrolled", scrollY > 18);
updateHeader();
addEventListener("scroll", updateHeader, { passive: true });

function toggleMenu(open) {
  menu?.setAttribute("aria-expanded", String(open));
  menu?.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  nav?.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
}
menu?.addEventListener("click", () => toggleMenu(menu.getAttribute("aria-expanded") !== "true"));
nav?.addEventListener("click", (event) => { if (event.target.closest("a")) toggleMenu(false); });
addEventListener("keydown", (event) => { if (event.key === "Escape") toggleMenu(false); });

const revealItems = $$(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("visible");
    observer.unobserve(entry.target);
  }), { threshold: .08, rootMargin: "0px 0px -30px" });
  revealItems.forEach((item) => observer.observe(item));
  // Keep content available after rapid page jumps or full-page capture tools skip intersections.
  setTimeout(() => revealItems.forEach((item) => item.classList.add("visible")), 1200);
} else revealItems.forEach((item) => item.classList.add("visible"));

async function syncOrganization() {
  const [group, projects] = await Promise.all([
    getJSON(GL_GROUP_API, "application/json"),
    getJSON(`${GL_GROUP_API}/projects?per_page=100&include_subgroups=true`, "application/json")
  ]);
  $$('[data-org-avatar]').forEach((image) => {
    image.onerror = () => { image.onerror = null; image.src = "/assets/org-avatar.png"; };
    image.src = group.avatar_url || "/assets/org-avatar.png";
  });
  setText("[data-org-name]", group.name || "International Duck Incorporated");
  setText("[data-org-repos]", projects.length);
  setText("[data-org-stars]", projects.reduce((total, project) => total + (project.star_count || 0), 0));
}

const languageColors = { Java: "#b07219", HTML: "#e34c26", CSS: "#563d7c", JavaScript: "#f1e05a", Python: "#3572A5" };

// <pixel-canvas> shimmer palettes, tuned to each surface's accent.
const pixelPalettes = {
  green: "#ddfbe4, #8cf77a, #4caf6d",
  blue: "#dcecff, #8ab8f6, #4a7fc0",
  amber: "#f9ecd4, #eec06a, #b98a2e",
  slate: "#e8edf2, #9aa7b4, #5f6d7c"
};

function pixelEffect(colors = pixelPalettes.slate, gap = 6, speed = 35) {
  const effect = document.createElement("pixel-canvas");
  effect.dataset.gap = gap;
  effect.dataset.speed = speed;
  effect.setAttribute("data-colors", colors);
  return effect;
}

async function latestReleaseTag(projectApiBase) {
  const releases = await getJSON(`${projectApiBase}/releases?per_page=20`, "application/json").catch(() => []);
  const stable = releases.find((release) => !release.upcoming_release);
  return stable ? (stable.tag_name || stable.name || "").replace(/^v/i, "") : null;
}

async function syncProjects() {
  const glProjects = await getJSON(`${GL_GROUP_API}/projects?per_page=100&order_by=last_activity_at&sort=desc&include_subgroups=true`, "application/json");
  const [beaconVersion, championscodeVersion] = await Promise.all([
    latestReleaseTag(GL_BEACON_PROJECT),
    latestReleaseTag(GL_CHAMPIONSCODE_PROJECT)
  ]);
  const languageByProject = new Map(await Promise.all(glProjects.map(async (project) => {
    const languages = await getJSON(`${GITLAB_API}/projects/${project.id}/languages`, "application/json").catch(() => ({}));
    return [project.path, Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || null];
  })));
  const repos = glProjects.map((project) => ({ name: project.path, html_url: project.web_url, description: project.description, language: languageByProject.get(project.path) }));
  const knownProjects = [
    { name: "Beacon", html_url: `${GITLAB}/${GL_GROUP_PATH}/Beacon`, description: "A vanilla-server-safe, modular client-side utility mod for Minecraft 26.2 with quality-of-life, rendering, world, utility, and fun features.", language: "Java" },
    { name: "NullTrace", html_url: `${GITLAB}/${GL_GROUP_PATH}/NullTrace`, description: "A client-side Fabric privacy mod for Minecraft 1.21.11, 26.1, 26.2, and 26.3 covering client brand spoofing, fingerprint protection, tracking defenses, and safer server connections.", language: "Java" },
    { name: "ChampionsCode", html_url: `${GITLAB}/${GL_GROUP_PATH}/ChampionsCode`, description: "A client-side Fabric mod for Minecraft 26.3 for authorized, defensive server and plugin research and controlled runtime Java addon development.", language: "Java" },
    { name: "beacon-bagley", html_url: `${GITLAB}/${GL_GROUP_PATH}/beacon-bagley`, description: "An opt-in, client-side AI chat assistant addon for Beacon with local provider configuration and optional memory.", language: "Java" },
    { name: "zonedout", html_url: `${GITLAB}/${GL_GROUP_PATH}/zonedout`, description: "A client-side Minecraft 26.3 Fabric mod with modular combat and utility features, a Metro-style UI, and a 36-module seed-analysis and world-generation suite.", language: "Java" }
  ];
  knownProjects.forEach((project) => {
    const existing = repos.find((repo) => repo.name === project.name);
    if (existing) Object.assign(existing, { description: project.description, language: existing.language || project.language });
    else repos.push(project);
  });
  const grid = $("[data-org-projects]");
  if (!grid) return;
  const projectPages = {
    Venomous: SITE_ROUTES.venomous,
    Beacon: SITE_ROUTES.beacon,
    "beacon-bagley": SITE_ROUTES.bagley,
    NullTrace: SITE_ROUTES.nulltrace,
    ChampionsCode: SITE_ROUTES.championscode,
    zonedout: SITE_ROUTES.zonedout,
    home: SITE_ROUTES.website,
    "International-Duck-Incorporated.github.io": SITE_ROUTES.website
  };
  const projectMeta = {
    Venomous: { label: "Featured project", icon: "venom", logo: "/assets/venomous-icon.png", status: "Active", action: "Open project" },
    Beacon: { label: "Utility project", icon: "beacon", logo: "/assets/beacon-icon.png", status: beaconVersion ? `Release ${beaconVersion}` : "Release", action: "Open project" },
    "beacon-bagley": { title: "Bagley", label: "Beacon addon", icon: "bagley", logo: "/assets/bagley-icon.png", status: "New", action: "Open project" },
    NullTrace: { label: "Privacy project", icon: "privacy", logo: "/assets/nulltrace-icon.png", status: "Official release", action: "Open project" },
    ChampionsCode: { label: "Research project", icon: "champion", logo: "/assets/championscode-icon.png", status: championscodeVersion ? `First launch · ${championscodeVersion}` : "First launch", action: "Open project" },
    zonedout: { title: "ZonedOut", label: "Client-side mod", icon: "zonedout", logo: "/assets/zonedout-icon.png", status: "In development", statusMuted: true, action: "Open project" },
    home: { title: "Website source", label: "Website project", icon: "web", status: "Live", action: "Open page" },
    "International-Duck-Incorporated.github.io": { title: "Website source", label: "Website project", icon: "web", status: "Live", action: "Open page" }
  };
  grid.replaceChildren(...repos.map((repo, index) => {
    const link = document.createElement("a");
    const isVenomous = repo.name === REPO;
    const meta = projectMeta[repo.name];
    link.className = `project-card glass-card reveal visible${isVenomous ? " featured" : ""}`;
    link.dataset.projectCard = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.href = projectPages[repo.name] || repo.html_url;
    if (!projectPages[repo.name]) { link.target = "_blank"; link.rel = "noreferrer"; }

    const top = document.createElement("div");
    top.className = "project-card-top";
    const projectIcon = document.createElement("span");
    projectIcon.className = `project-icon ${meta ? meta.icon : "web"}`;
    if (meta && meta.logo) {
      const image = document.createElement("img");
      image.src = meta.logo; image.alt = ""; image.width = 64; image.height = 64;
      projectIcon.append(image);
    } else projectIcon.innerHTML = icon("i-code");
    if (meta && meta.status) {
      const status = document.createElement("span");
      status.className = `project-status${meta.statusMuted ? " muted" : ""}`;
      status.innerHTML = meta.statusMuted ? meta.status : `<i></i> ${meta.status}`;
      top.append(projectIcon, status);
    } else {
      const external = document.createElement("span"); external.innerHTML = icon("i-external");
      top.append(projectIcon, external);
    }

    const copy = document.createElement("div");
    const label = document.createElement("span"); label.className = "card-label"; label.textContent = (meta && meta.label) || "Repository";
    const title = document.createElement("h3"); title.textContent = (meta && meta.title) || repo.name;
    const description = document.createElement("p"); description.textContent = repo.description || (isVenomous ? "Optimized & refined Meteor Client addon for Minecraft 26.2." : "Organization website and project directory.");
    copy.append(label, title, description);

    const footer = document.createElement("footer");
    const language = document.createElement("span");
    const dot = document.createElement("i"); dot.className = "language-dot"; dot.style.background = languageColors[repo.language] || "#6e7681";
    language.append(dot, document.createTextNode(repo.language || "Repository"));
    const action = document.createElement("span"); action.append(document.createTextNode(`${(meta && meta.action) || "View repository"} `)); action.insertAdjacentHTML("beforeend", icon("i-arrow"));
    footer.append(language, action);
    link.append(top, copy, footer);
    const palette = repo.name === REPO ? pixelPalettes.green : repo.name === NULLTRACE || repo.name === BEACON || repo.name === "beacon-bagley" ? pixelPalettes.blue : repo.name === "ChampionsCode" || repo.name === "zonedout" ? pixelPalettes.amber : pixelPalettes.slate;
    link.append(pixelEffect(palette));
    return link;
  }));
}

async function syncPeople() {
  // GitLab does not expose group membership through its public API, so the directory renders the checked-in member roster.
  const people = [
    { login: "0xFFshell", display: "0xFFshell", type: "User" },
    { login: "3spress0", display: "espress0", type: "User" },
    { login: "E-VDV-HU", display: "E-VDV-HU", type: "User" },
    { login: "Xx-superIvar-xX", display: "Xx-superIvar-xX", type: "User" },
    { login: "midas735", display: "midas735", type: "User" },
    { login: "Jojo-8002", display: "Jojo-8002", type: "User" }
  ];
  const role = "Public member";
  setText("[data-org-people-count]", people.length);
  const grid = $("[data-org-people]");
  if (!grid || !people.length) return;
  grid.replaceChildren(...people.map((person) => {
    const link = document.createElement("a");
    link.className = "person-card glass-card reveal visible";
    link.dataset.memberCard = normalizeLogin(person.login);
    const memberPages = {
      "3spress0": "/people/3spress0", "E-VDV-HU": "/people/e-vdv-hu", "0xFFshell": "/people/0xffshell",
      "Xx-superIvar-xX": "/people/superivar", "midas735": "/people/midas735",
      "Jojo-8002": "/people/jojo-8002"
    };
    link.href = memberPages[person.login] || person.html_url;
    if (!memberPages[person.login]) { link.target = "_blank"; link.rel = "noreferrer"; }
    const image = document.createElement("img");
    const localMemberImages = { "3spress0": "/assets/contributor-3spress0.png", "0xFFshell": "/assets/member-0xffshell.png", "E-VDV-HU": "/assets/member-e-vdv-hu.png", "Xx-superIvar-xX": "/assets/member-xx-superivar-xx.png", "midas735": "/assets/member-midas735.png", "Jojo-8002": "/assets/member-jojo-8002.png" };
    image.src = localMemberImages[person.login] || (person.avatar_url ? person.avatar_url : "/assets/org-avatar.png");
    image.alt = person.display; image.width = 96; image.height = 96;
    const copy = document.createElement("div");
    const label = document.createElement("span");
    const hasGithubRestriction = isShadowbannedLogin(person.login) || isGithubBannedLogin(person.login);
    label.className = hasGithubRestriction ? "shadowban-label" : "";
    label.textContent = isGithubBannedLogin(person.login)
      ? "Active member · GitHub banned"
      : isShadowbannedLogin(person.login)
        ? "Currently shadowbanned 😢"
        : (person.type === "Bot" ? "Automation" : role);
    const name = document.createElement("h3"); name.textContent = person.display || person.login;
    const handle = document.createElement("p");
    const summaries = {
      "0xFFshell": "Venomous writer · GitLab operations",
      "3spress0": "Security tooling · Minecraft development",
      "E-VDV-HU": "Applied software · Python projects",
      "Xx-superIvar-xX": "New member · GitHub profile",
      "midas735": "New member · GitHub profile",
      "Jojo-8002": "New member · GitHub profile"
    };
    handle.textContent = summaries[person.login] || `@${person.login}`;
    copy.append(label, name, handle);
    link.append(image, copy); link.insertAdjacentHTML("beforeend", icon("i-external"));
    if (page === "organization") link.append(pixelEffect(pixelPalettes.slate));
    return link;
  }));
}

function initAtmosphere(canvas) {
  const context = canvas.getContext("2d");
  const mode = canvas.dataset.background || "dust";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const network = mode === "network";
  const storm = mode === "storm";
  const palette = network
    ? { dot: [111, 221, 255], glow: [69, 166, 255], line: [91, 203, 255] }
    : storm
      ? { dot: [173, 196, 225], glow: [229, 239, 255], line: [149, 170, 201] }
      : { dot: [232, 200, 148], glow: [255, 177, 84], line: [185, 203, 224] };
  let width = 1, height = 1, dpr = 1, particles = [], frame = 0, last = performance.now();
  let pointerX = .5, pointerY = .5, targetX = .5, targetY = .5, pointerActive = false;
  let flash = 0, nextFlash = performance.now() + 2800 + Math.random() * 3800;
  const random = (min, max) => min + Math.random() * (max - min);

  function makeParticle() {
    const large = Math.random() < (storm ? .2 : (network ? .18 : .24));
    const speed = storm ? random(.012, .026) : (network ? random(.004, .012) : random(.0015, .007));
    const angle = storm ? random(Math.PI * .42, Math.PI * .58) : random(0, Math.PI * 2);
    return {
      x: random(0, width), y: random(0, height),
      r: large ? random(1.2, network ? 2.8 : (storm ? 2.2 : 3.8)) : random(.35, network ? 1.7 : (storm ? 1.1 : 1.65)),
      a: random(network ? .22 : (storm ? .12 : .2), network ? .72 : (storm ? .32 : .82)),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      phase: random(0, Math.PI * 2), pulse: random(storm ? .00012 : .0005, storm ? .00052 : .0018), trail: random(storm ? 24 : 10, storm ? 52 : 32)
    };
  }

  function populate() {
    const area = width * height;
    const count = storm
      ? Math.round(Math.max(130, Math.min(230, area / 6500)))
      : network
        ? Math.round(Math.max(100, Math.min(170, area / 9000)))
        : Math.round(Math.max(210, Math.min(360, area / 5000)));
    particles = Array.from({ length: reduceMotion ? Math.round(count * .72) : count }, makeParticle);
  }

  function resize() {
    width = Math.max(1, innerWidth);
    height = Math.max(1, innerHeight);
    dpr = Math.min(devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    populate();
    draw(performance.now(), 0);
  }

  function draw(time, delta) {
    context.clearRect(0, 0, width, height);
    const seconds = time * .001;
    pointerX += (targetX - pointerX) * .08;
    pointerY += (targetY - pointerY) * .08;
    const cursorX = pointerX * width, cursorY = pointerY * height;
    for (const particle of particles) {
      if (delta && !reduceMotion) {
        particle.phase += particle.pulse * delta;
        particle.x += particle.vx * delta + Math.sin(particle.phase) * (network ? .012 : (storm ? .004 : .025)) * delta;
        particle.y += particle.vy * delta + Math.cos(particle.phase * .8) * (network ? .009 : (storm ? .006 : .018)) * delta;
        if (pointerActive) {
          const dx = particle.x - cursorX, dy = particle.y - cursorY;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const radius = network ? 235 : 190;
          if (distance < radius) {
            const force = (1 - distance / radius) * (network ? .014 : .02) * delta;
            particle.x += (dx / distance) * force;
            particle.y += (dy / distance) * force;
          }
        }
        if (storm && particle.x < -8) particle.x = random(0, width);
        else if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = storm ? -random(0, height * .45) : -8;
      }
    }

    if (storm) {
      const moonX = width * .76, moonY = height * .2;
      const moon = context.createRadialGradient(moonX, moonY, 0, moonX, moonY, Math.max(width, height) * .33);
      moon.addColorStop(0, "rgba(229, 236, 249, .17)");
      moon.addColorStop(.35, "rgba(180, 194, 221, .07)");
      moon.addColorStop(1, "rgba(38, 58, 87, 0)");
      context.fillStyle = moon; context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(7, 13, 22, .82)";
      context.beginPath(); context.moveTo(0, height * .82); context.lineTo(width * .2, height * .63); context.lineTo(width * .38, height * .76); context.lineTo(width * .58, height * .57); context.lineTo(width * .82, height * .72); context.lineTo(width, height * .61); context.lineTo(width, height); context.lineTo(0, height); context.closePath(); context.fill();
      context.fillStyle = "rgba(10, 18, 30, .92)";
      context.beginPath(); context.moveTo(0, height * .9); context.lineTo(width * .18, height * .74); context.lineTo(width * .34, height * .84); context.lineTo(width * .48, height * .7); context.lineTo(width * .64, height * .86); context.lineTo(width * .86, height * .76); context.lineTo(width, height * .82); context.lineTo(width, height); context.lineTo(0, height); context.closePath(); context.fill();
      context.save();
      context.strokeStyle = "rgba(198, 214, 238, .26)";
      context.lineWidth = 1.05;
      for (const particle of particles) {
        const length = particle.trail * (1 + Math.sin(particle.phase) * .15);
        context.globalAlpha = particle.a;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x - particle.vx * length, particle.y - particle.vy * length * 2.2);
        context.stroke();
      }
      context.restore();
    } else if (network) {
      const maxDistance = Math.min(220, Math.max(118, width * .14));
      context.lineWidth = .7;
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const first = particles[i], second = particles[j];
          const dx = first.x - second.x, dy = first.y - second.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= maxDistance) continue;
          const alpha = (1 - distance / maxDistance) * .22;
          context.strokeStyle = `rgba(${palette.line.join(",")},${alpha})`;
          context.beginPath(); context.moveTo(first.x, first.y); context.lineTo(second.x, second.y); context.stroke();
        }
      }
    }

    if (!network) {
      if (!storm) {
        const warm = context.createRadialGradient(width * .72, height * .2, 0, width * .72, height * .2, Math.max(width, height) * .65);
        warm.addColorStop(0, "rgba(255, 183, 86, .13)"); warm.addColorStop(.42, "rgba(224, 139, 49, .045)"); warm.addColorStop(1, "rgba(224, 139, 49, 0)");
        context.fillStyle = warm; context.fillRect(0, 0, width, height);
        context.save(); context.globalCompositeOperation = "lighter"; context.lineWidth = .55;
        for (const particle of particles) {
          if (particle.r < 1.35) continue;
          const speed = Math.max(.001, Math.hypot(particle.vx, particle.vy));
          const length = particle.trail * (0.7 + Math.sin(particle.phase) * .3);
          context.globalAlpha = particle.a * .38;
          context.strokeStyle = `rgba(${palette.line.join(",")},${context.globalAlpha})`;
          context.beginPath(); context.moveTo(particle.x, particle.y); context.lineTo(particle.x - particle.vx / speed * length, particle.y - particle.vy / speed * length); context.stroke();
        }
        context.restore();
      }
    }

    if (pointerActive) {
      const radius = network ? 230 : (storm ? 250 : 190);
      const glow = context.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, radius);
      glow.addColorStop(0, `rgba(${palette.glow.join(",")},${network ? .1 : (storm ? .13 : .08)})`);
      glow.addColorStop(1, `rgba(${palette.glow.join(",")},0)`);
      context.fillStyle = glow; context.fillRect(cursorX - radius, cursorY - radius, radius * 2, radius * 2);
    }

    if (storm) {
      if (!reduceMotion && time >= nextFlash) {
        flash = random(.22, .44);
        nextFlash = time + random(2500, 6300);
      }
      flash = Math.max(0, flash - delta * .0018);
      if (flash > 0) {
        context.fillStyle = `rgba(222,236,255,${flash})`;
        context.fillRect(0, 0, width, height);
      }
    }

    context.save();
    context.globalCompositeOperation = storm ? "screen" : "lighter";
    for (const particle of particles) {
      const pulse = .72 + Math.sin(particle.phase + seconds) * .28;
      context.globalAlpha = particle.a * (storm ? .6 : pulse);
      context.fillStyle = `rgb(${palette.dot.join(",")})`;
      context.shadowColor = `rgba(${palette.glow.join(",")},${storm ? .42 : .7})`;
      context.shadowBlur = particle.r > 1.1 ? (network ? 14 : (storm ? 6 : 18)) : (network ? 6 : (storm ? 2 : 8));
      context.beginPath(); context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  }

  function animate(time) {
    const delta = Math.min(32, time - last); last = time; draw(time, delta);
    frame = document.hidden ? 0 : requestAnimationFrame(animate);
  }
  function start() { if (!frame && !reduceMotion && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(animate); } }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  addEventListener("resize", resize, { passive: true });
  addEventListener("pointermove", (event) => { targetX = event.clientX / width; targetY = event.clientY / height; pointerActive = true; }, { passive: true });
  addEventListener("pointerleave", () => { pointerActive = false; targetX = .5; targetY = .5; });
  document.addEventListener("visibilitychange", () => document.hidden ? stop() : start());
  resize();
  if (!reduceMotion) start();
}
let modules = fallbackModules.slice().sort((a,b)=>a.name.localeCompare(b.name));
let activeCategory = "all", searchTerm = "", showEverything = false;

function counts() { return modules.reduce((all,item)=>{all[item.category]=(all[item.category]||0)+1;return all;},{}); }
function updateModuleCounts() {
  const total = counts(); setText("[data-module-total]",modules.length);
  $$('[data-category-count]').forEach((node)=>{node.textContent=total[node.dataset.categoryCount]||0;});
  $$('[data-filter]').forEach((button)=>{const badge=$("b",button);if(badge)badge.textContent=button.dataset.filter==="all"?modules.length:total[button.dataset.filter]||0;});
}
function renderModules() {
  const grid=$("[data-module-grid]");if(!grid)return;
  const filtered=modules.filter((item)=>(activeCategory==="all"||item.category===activeCategory)&&item.name.toLowerCase().includes(searchTerm));
  const limited=!showEverything&&!searchTerm&&filtered.length>24, visible=limited?filtered.slice(0,24):filtered;
  grid.replaceChildren(...visible.map((item,index)=>{const card=document.createElement("span"),label=document.createElement("small");card.append(document.createTextNode(item.name),label);label.textContent=item.category;card.style.animationDelay=`${Math.min(index*12,180)}ms`;return card;}));
  $("[data-results-label]").textContent=activeCategory==="all"?"All modules":`${activeCategory} modules`;$("[data-results-count]").textContent=limited?`${filtered.length} results · showing ${visible.length}`:`${filtered.length} ${filtered.length===1?"result":"results"}`;$("[data-empty]").hidden=filtered.length!==0;
  const more=$("[data-show-all]");more.hidden=!limited;if(limited){more.textContent=`Show all ${filtered.length} modules `;more.insertAdjacentHTML("beforeend",icon("i-arrow"));}
}
function setupModules() {
  $$('[data-filter]').forEach((button)=>button.addEventListener("click",()=>{activeCategory=button.dataset.filter;showEverything=false;$$('[data-filter]').forEach((item)=>item.classList.toggle("active",item===button));renderModules();}));
  $("[data-module-search]")?.addEventListener("input",(event)=>{searchTerm=event.target.value.trim().toLowerCase();renderModules();});
  $("[data-show-all]")?.addEventListener("click",()=>{showEverything=true;renderModules();});updateModuleCounts();renderModules();
}
function parseRegistry(source) {
  const imports={}, importPattern=/import net\.venomous\.meteoraddon\.modules\.(\w+)\.(\w+);/g, addPattern=/Modules\.get\(\)\.add\(new (\w+)\(\)\)/g;let match;
  while((match=importPattern.exec(source)))imports[match[2]]=match[1];
  const group=(folder)=>({combat:"combat",exploit:"exploit",movement:"movement",detection:"detection",esp:"visual",render:"visual"})[folder]||"utility",result=[];
  while((match=addPattern.exec(source)))result.push({name:match[1],category:group(imports[match[1]])});return result;
}
async function syncModules() {
  const response=await fetch(`${GITLAB}/${GL_PROJECT_PATH}/-/raw/main/src/main/java/net/venomous/meteoraddon/modules/ModuleRegistry.java`,{cache:"no-store"});if(!response.ok)throw new Error("Module source unavailable");
  const parsed=parseRegistry(await response.text());if(!parsed.length)throw new Error("No modules found");modules=parsed.sort((a,b)=>a.name.localeCompare(b.name));updateModuleCounts();renderModules();setText("[data-module-source]","Live from ModuleRegistry.java");
}

async function syncRepository() {
  const [repo,languages]=await Promise.all([getJSON(`${GL_PROJECT}`,"application/json"),getJSON(`${GL_PROJECT}/languages`,"application/json")]);
  setText("[data-stars]",repo.star_count.toLocaleString());setText("[data-forks]",repo.forks_count.toLocaleString());
  const topLanguage=Object.entries(languages).sort((a,b)=>b[1]-a[1])[0];setText("[data-language]",topLanguage?.[0]||"Code");
  setText("[data-last-push]",relativeDate(repo.last_activity_at));
}
async function syncNullTraceRelease() {
  const releases = await getJSON(`${GL_NULLTRACE_PROJECT}/releases?per_page=20`);
  const stable = releases.find((release) => !release.upcoming_release);
  if (!stable) return;
  const semanticVersion = stable.name?.match(/v?\d+\.\d+\.\d+/)?.[0] || stable.tag_name;
  setText("[data-nulltrace-version]", semanticVersion);
  setText("[data-nulltrace-release-note]", stable.description?.split("\n").find(Boolean) || "First official release");
  setText("[data-nulltrace-date]", fullDate(stable.released_at));
  setText("[data-nulltrace-release-label]", `Download ${semanticVersion}`);
  $$('[data-nulltrace-release-link]').forEach((link) => { link.href = stable._links?.self || `${GITLAB}/${GL_GROUP_PATH}/${NULLTRACE}/-/releases`; });
}

async function syncBeaconRelease() {
  const releases = await getJSON(`${GL_BEACON_PROJECT}/releases?per_page=100`);
  const stable = releases.find((release) => !release.upcoming_release);
  if (!stable) return;
  const version = stable.tag_name || stable.name || "1.8.16";
  const jar = stable.assets?.links?.find((asset) => `${asset.name || ""} ${asset.url || ""}`.toLowerCase().includes(".jar"));
  const releaseUrl = stable._links?.self || `${GITLAB}/${GL_GROUP_PATH}/${BEACON}/-/releases/${encodeURIComponent(version)}`;
  const downloadUrl = jar?.direct_asset_url || jar?.url || releaseUrl;
  setText("[data-beacon-version]", version);
  setText("[data-beacon-date]", fullDate(stable.released_at));
  setText("[data-beacon-release-count]", releases.length.toLocaleString());
  setText("[data-beacon-download-label]", `Download ${version}`);
  $$('[data-beacon-release-link]').forEach((link) => { link.href = releaseUrl; });
  $$('[data-beacon-download]').forEach((link) => { link.href = downloadUrl; });
}

async function syncChampionsCodeRelease() {
  const releases = await getJSON(`${GL_CHAMPIONSCODE_PROJECT}/releases?per_page=100`);
  const stable = releases.find((release) => !release.upcoming_release);
  if (!stable) return;
  const version = (stable.tag_name || stable.name || "v0.1.0-beta.1").replace(/^v/i, "");
  const jar = stable.assets?.links?.find((asset) => `${asset.name || ""} ${asset.url || ""}`.toLowerCase().includes(".jar") && !`${asset.name || ""}`.toLowerCase().includes("sources"));
  const releaseUrl = stable._links?.self || `${GITLAB}/${GL_GROUP_PATH}/ChampionsCode/-/releases/${encodeURIComponent(stable.tag_name)}`;
  const downloadUrl = jar?.direct_asset_url || jar?.url || releaseUrl;
  setText("[data-championscode-version]", version);
  setText("[data-championscode-date]", fullDate(stable.released_at));
  setText("[data-championscode-download-label]", `Download ${version}`);
  $$('[data-championscode-release-link]').forEach((link) => { link.href = releaseUrl; });
  $$('[data-championscode-download]').forEach((link) => { link.href = downloadUrl; });
}

async function syncMemberContributions() {
  // Contribution counts come from the GitLab group's mirrored repositories. ChampionsCode no longer has a
  // public home and its author is shadowbanned on GitHub, so that count keeps its checked-in value.
  const isMemberCommit = (commit) => /espervanderven|3spress0|espress0|166116795/i.test(`${commit.author_name || ""} ${commit.author_email || ""}`);
  const [venomousCommits, siteCommits] = await Promise.all([
    getJSON(`${GL_PROJECT}/repository/commits?per_page=100`, "application/json"),
    getJSON(`${GL_SITE_PROJECT}/repository/commits?per_page=100`, "application/json")
  ]);
  const venomous = venomousCommits.filter(isMemberCommit), site = siteCommits.filter(isMemberCommit);
  const champions = Number($("[data-member-champions-contributions]")?.textContent) || 0;
  setText("[data-member-venomous-contributions]", venomous.length);
  setText("[data-member-site-contributions]", site.length);
  setText("[data-member-contributions]", venomous.length + site.length + champions);

  const list = $("[data-member-commits]");
  if (!list) return;
  const recent = [...venomous, ...site].sort((a, b) => new Date(b.committed_date) - new Date(a.committed_date)).slice(0, 8);
  if (!recent.length) return;
  list.replaceChildren(...recent.map((item) => {
    const link = document.createElement("a");
    const dot = document.createElement("i");
    const copy = document.createElement("span");
    const title = document.createElement("b");
    const meta = document.createElement("small");
    const hash = document.createElement("code");
    const repoSegment = item.web_url.split("/-/")[0].split("/").pop();
    link.href = item.web_url; link.target = "_blank"; link.rel = "noreferrer";
    title.textContent = item.title?.split("\n")[0] || "Commit";
    meta.textContent = `${repoSegment === "International-Duck-Incorporated.github.io" ? "Website" : repoSegment} · ${relativeDate(item.committed_date)}`;
    hash.textContent = (item.short_id || item.id).slice(0, 7);
    copy.append(title, meta); link.append(dot, copy, hash);
    return link;
  }));
}

async function syncReleases() {
  const releases=await getJSON(`${GL_PROJECT}/releases?per_page=20`,"application/json"),stable=releases.find((r)=>r.tag_name!=="nightly"),nightly=releases.find((r)=>r.tag_name==="nightly");
  const jarAsset=(release)=>release.assets?.links?.find((a)=>`${a.name||""} ${a.url||""}`.toLowerCase().includes(".jar"));
  if(stable){const asset=jarAsset(stable);setText("[data-release-version]",stable.tag_name);setText("[data-release-short]",stable.tag_name.replace(/^v/i,""));setText("[data-stable-date]",fullDate(stable.released_at));if(asset)$$('[data-stable-download]').forEach((link)=>{link.href=asset.url;});}
  if(nightly){const asset=jarAsset(nightly);setText("[data-nightly-version]",asset?.name?.replace(/\.jar$/i,"")||nightly.name||"Latest main");setText("[data-nightly-date]",fullDate(nightly.released_at));if(asset)$$('[data-nightly-download]').forEach((link)=>{link.href=asset.url;});}
}
async function syncCommits() {
  const commits=await getJSON(`${GL_PROJECT}/repository/commits?per_page=5`,"application/json");
  const list=$("[data-commits]");if(!list)return;
  list.replaceChildren(...commits.map((item)=>{const link=document.createElement("a"),dot=document.createElement("i"),copy=document.createElement("span"),title=document.createElement("b"),meta=document.createElement("small"),hash=document.createElement("code");link.href=item.web_url;link.target="_blank";link.rel="noreferrer";title.textContent=item.title||item.message?.split("\n")[0]||"Commit";meta.textContent=`${item.author_name} · ${relativeDate(item.authored_date||item.committed_date)}`;hash.textContent=(item.short_id||item.id).slice(0,7);copy.append(title,meta);link.append(dot,copy,hash);return link;}));
}
async function syncContributors() {
  const people=await getJSON(`${GL_PROJECT}/repository/contributors`,"application/json");
  const list=$("[data-contributors]");if(!list || !people.length)return;
  const known=[
    {test:(person)=>person.name==="0xFF"||person.email==="pieterr.games@gmail.com",label:"0xFFshell",role:"Writer",url:`${GITLAB}/0xFFshell`,avatar:"/assets/member-0xffshell.png"},
    {test:(person)=>/espress0|3spress0|espervanderven|166116795/i.test(`${person.name||""} ${person.email||""}`),label:"espress0",role:"Writer",url:"https://gitlab.com/espress0",avatar:"/assets/contributor-3spress0.png"}
  ];
  const merged=new Map();
  for(const person of people){
    const profile=known.find((entry)=>entry.test(person));
    const key=profile?profile.label:(person.name||"Contributor");
    const entry=merged.get(key)||{label:key,role:profile?.role||"Contributor",url:profile?.url||`${GITLAB}/${GL_PROJECT_PATH}/-/graphs/main`,avatar:profile?.avatar||"/assets/org-avatar.png",commits:0};
    entry.commits+=person.commits||0;merged.set(key,entry);
  }
  list.replaceChildren(...[...merged.values()].sort((a,b)=>b.commits-a.commits).map((entry)=>{const link=document.createElement("a"),image=document.createElement("img"),copy=document.createElement("span"),name=document.createElement("b"),role=document.createElement("small"),total=document.createElement("strong");link.href=entry.url;link.target="_blank";link.rel="noreferrer";image.src=entry.avatar;image.alt=entry.label;name.textContent=entry.label;role.textContent=entry.role;total.textContent=`${entry.commits} ${entry.commits===1?"contribution":"contributions"}`;copy.append(name,role);link.append(image,copy,total);return link;}));
}

$$('[data-background]').forEach(initAtmosphere);
const tasks = [syncOrganization()];
if (page === "organization") tasks.push(syncPeople());
if (page === "projects") tasks.push(syncProjects());
if (page === "people") tasks.push(syncPeople());
if (page === "project" && document.body.dataset.project === "nulltrace") tasks.push(syncNullTraceRelease());
if (page === "project" && document.body.dataset.project === "beacon") tasks.push(syncBeaconRelease());
if (page === "project" && document.body.dataset.project === "championscode") tasks.push(syncChampionsCodeRelease());
if (page === "member" && document.body.dataset.member === MEMBER_LOGIN) tasks.push(syncMemberContributions());
if (page === "venomous") {
  setupModules();
  tasks.push(syncRepository(),syncReleases(),syncCommits(),syncContributors(),syncModules());
}
const syncProvider = "GitLab";
Promise.allSettled(tasks).then((results)=>{const done=results.filter((result)=>result.status==="fulfilled").length;setText("[data-sync-text]",done===results.length?`${syncProvider} data synced live`:`${syncProvider} data synced (${done}/${results.length})`);});
