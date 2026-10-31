const REPO = "Venomous";
const NULLTRACE = "NullTrace";
const BEACON = "Beacon";
const MEMBER_LOGIN = "3spress0";
const SHADOWBANNED_USERS = new Set([]);
const GITHUB_BANNED_USERS = new Set(["0xffshell"]);
const normalizeLogin = (login) => String(login || "").toLowerCase();
const isShadowbannedLogin = (login) => SHADOWBANNED_USERS.has(normalizeLogin(login));
const isGithubBannedLogin = (login) => GITHUB_BANNED_USERS.has(normalizeLogin(login));
const GITLAB = "https://gitlab.com";
const GITLAB_API = `${GITLAB}/api/v4`;
const GITHUB_API = "https://api.github.com";
const GH_ORG_PATH = "International-Duck-Incorporated";
const GH_ORG_API = `${GITHUB_API}/orgs/${GH_ORG_PATH}`;
const GL_GROUP_PATH = "international-duck-incorporated";
const GL_GROUP = `${GITLAB}/groups/${GL_GROUP_PATH}`;
const GL_GROUP_API = `${GITLAB_API}/groups/${GL_GROUP_PATH}`;
const GL_PROJECT_PATH = `${GL_GROUP_PATH}/Venomous`;
const GL_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(GL_PROJECT_PATH)}`;
const GL_NULLTRACE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/${NULLTRACE}`)}`;
const GL_BEACON_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/${BEACON}`)}`;
const GL_CHAMPIONSCODE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/ChampionsCode`)}`;
const GL_BARITONE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/Baritone`)}`;
const SITE_ROUTES = Object.freeze({
  home: "/",
  projects: "/projects",
  members: "/members",
  venomous: "/projects/venomous",
  nulltrace: "/projects/nulltrace",
  championscode: "/projects/championscode",
  zonedout: "/projects/zonedout",
  beacon: "/projects/beacon",
  bagley: "/projects/bagley",
  badegg: "/projects/badegg",
  website: "/projects/website",
  migration: "/migration",
  baritone: "/projects/baritone",
  idiAssets: "/projects/idi-assets",
  noosphere: "/noosphere",
  glyphsmith: "/glyphsmith",
  license: "/license",
});
const BEACON_CURSEFORGE_FILES_URL =
  "https://www.curseforge.com/minecraft/mc-mods/beacon-qol/files/all?page=1&pageSize=20&showAlphaFiles=show";
const NULLTRACE_CURSEFORGE_FILES_URL =
  "https://www.curseforge.com/minecraft/mc-mods/nulltrace/files/all?page=1&pageSize=20&showAlphaFiles=show";
const GL_SITE_PROJECT = `${GITLAB_API}/projects/${encodeURIComponent(`${GL_GROUP_PATH}/home`)}`;
const fallbackModules = [
  { name: "Aimbot", category: "combat" },
  { name: "AntiProjectile", category: "combat" },
  { name: "AutoClickerPlus", category: "combat" },
  { name: "AutoPotion", category: "combat" },
  { name: "AutoShield", category: "combat" },
  { name: "CriticalsPlus", category: "combat" },
  { name: "CrystalPvP", category: "combat" },
  { name: "Hunt", category: "combat" },
  { name: "MaceKill", category: "combat" },
  { name: "ProjectilePuncher", category: "combat" },
  { name: "SuperKnockback", category: "combat" },
  { name: "SwordBlock", category: "combat" },
  { name: "TargetObsidian", category: "combat" },
  { name: "TickBase", category: "combat" },
  { name: "TimerRange", category: "combat" },
  { name: "TpAura", category: "combat" },
  { name: "VAnchorMacro", category: "combat" },
  { name: "VAntiTrap", category: "combat" },
  { name: "VAutoCity", category: "combat" },
  { name: "VAutoDoubleHand", category: "combat" },
  { name: "VAutoInvTotem", category: "combat" },
  { name: "VBreachSwap", category: "combat" },
  { name: "VKeyPearl", category: "combat" },
  { name: "VKillAura", category: "combat" },
  { name: "VMaceKill", category: "combat" },
  { name: "VPopCounter", category: "combat" },
  { name: "VShieldBreaker", category: "combat" },
  { name: "VShieldBypass", category: "combat" },
  { name: "VSwordPlaceObsidian", category: "combat" },
  { name: "VWindPearlMacro", category: "combat" },
  { name: "VelocityPlus", category: "combat" },
  { name: "AntiCheatDetect", category: "detection" },
  { name: "AntiStaff", category: "detection" },
  { name: "SpectatorAlert", category: "detection" },
  { name: "VAntiVanish", category: "detection" },
  { name: "VPlayerDetection", category: "detection" },
  { name: "VInvisESP", category: "visual" },
  { name: "VLightESP", category: "visual" },
  { name: "VSkeletonESP", category: "visual" },
  { name: "AbortBreaking", category: "exploit" },
  { name: "AntiReducedDebugInfo", category: "exploit" },
  { name: "ClickTp", category: "exploit" },
  { name: "Damage", category: "exploit" },
  { name: "Disabler", category: "exploit" },
  { name: "Dupe", category: "exploit" },
  { name: "ExtendedFirework", category: "exploit" },
  { name: "Kick", category: "exploit" },
  { name: "LbClip", category: "exploit" },
  { name: "MoreCarry", category: "exploit" },
  { name: "NameCollector", category: "exploit" },
  { name: "NoPitchLimit", category: "exploit" },
  { name: "PingSpoof", category: "exploit" },
  { name: "PortalMenu", category: "exploit" },
  { name: "ResetVL", category: "exploit" },
  { name: "SleepWalker", category: "exploit" },
  { name: "TimeShift", category: "exploit" },
  { name: "VAntiHunger", category: "exploit" },
  { name: "VBungeeCordSpoof", category: "exploit" },
  { name: "VChorusExploit", category: "exploit" },
  { name: "VGhostHand", category: "exploit" },
  { name: "VNoPortalHitbox", category: "exploit" },
  { name: "VPortalGodMode", category: "exploit" },
  { name: "VVehicleOneHit", category: "exploit" },
  { name: "DankBobbing", category: "utility" },
  { name: "Derp", category: "utility" },
  { name: "Twerk", category: "utility" },
  { name: "Vomit", category: "utility" },
  { name: "ArmorWarning", category: "utility" },
  { name: "AutoChatGame", category: "utility" },
  { name: "AutoPearl", category: "utility" },
  { name: "Chat", category: "utility" },
  { name: "ElytraSwap", category: "utility" },
  { name: "FarmlandTremble", category: "utility" },
  { name: "FlagCheck", category: "utility" },
  { name: "GUICloser", category: "utility" },
  { name: "InventoryTracker", category: "utility" },
  { name: "ItemOrganizer", category: "utility" },
  { name: "LagNotifier", category: "utility" },
  { name: "MiddleClickAction", category: "utility" },
  { name: "PearlTools", category: "utility" },
  { name: "ProphuntESP", category: "utility" },
  { name: "SafeLogout", category: "utility" },
  { name: "SoundESP", category: "utility" },
  { name: "Spammer", category: "utility" },
  { name: "TNTTimer", category: "utility" },
  { name: "TargetLock", category: "utility" },
  { name: "Teams", category: "utility" },
  { name: "TextFieldProtect", category: "utility" },
  { name: "TrueSight", category: "utility" },
  { name: "VAntiBot", category: "utility" },
  { name: "VAutoEZ", category: "utility" },
  { name: "VBookBot", category: "utility" },
  { name: "VChoir", category: "utility" },
  { name: "VCoordSnapper", category: "utility" },
  { name: "VFreecamMining", category: "utility" },
  { name: "VHideScoreboard", category: "utility" },
  { name: "VNameProtect", category: "utility" },
  { name: "VNoBlockInteract", category: "utility" },
  { name: "VNotifier", category: "utility" },
  { name: "VPacketLogger", category: "utility" },
  { name: "AntiBounce", category: "movement" },
  { name: "AssertDominance", category: "movement" },
  { name: "Clip", category: "movement" },
  { name: "Fly", category: "movement" },
  { name: "NoPush", category: "movement" },
  { name: "Phase", category: "movement" },
  { name: "SnapTap", category: "movement" },
  { name: "Speed", category: "movement" },
  { name: "VBlink", category: "movement" },
  { name: "VBoatPhase", category: "movement" },
  { name: "VHoleSnap", category: "movement" },
  { name: "VRoboWalk", category: "movement" },
  { name: "GlobalNetworkInterceptor", category: "utility" },
  { name: "NoFallPlus", category: "utility" },
  { name: "AntiBlind", category: "visual" },
  { name: "VNewChunks", category: "visual" },
  { name: "AntiVoid", category: "utility" },
  { name: "AutoBreakSelected", category: "utility" },
  { name: "AutoToolPlus", category: "utility" },
  { name: "NoSignScreen", category: "utility" },
  { name: "Scaffold", category: "utility" },
  { name: "TimerPlus", category: "utility" },
  { name: "VAirPlace", category: "utility" },
  { name: "VAutoFarm", category: "utility" },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const page = document.body.dataset.page;

async function getJSON(url, accept = "application/json") {
  const response = await fetch(url, { headers: { Accept: accept } });
  if (!response.ok) throw new Error(`${response.status} at ${url}`);
  return response.json();
}

function setText(selector, value) {
  $$(selector).forEach((node) => {
    node.textContent = value;
  });
}

function relativeDate(value) {
  if (!value) return "recently";
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units)
    if (Math.abs(seconds) >= size || unit === "minute")
      return format.format(Math.round(seconds / size), unit);
  return "recently";
}

function fullDate(value) {
  return value
    ? new Intl.DateTimeFormat(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Latest release";
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
nav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) toggleMenu(false);
});
addEventListener("keydown", (event) => {
  if (event.key === "Escape") toggleMenu(false);
});

const revealItems = $$(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }),
    { threshold: 0.08, rootMargin: "0px 0px -30px" }
  );
  revealItems.forEach((item) => observer.observe(item));
  // Keep content available after rapid page jumps or full-page capture tools skip intersections.
  setTimeout(() => revealItems.forEach((item) => item.classList.add("visible")), 1200);
} else revealItems.forEach((item) => item.classList.add("visible"));

async function syncOrganization() {
  const [group, projects, subgroups] = await Promise.all([
    getJSON(GL_GROUP_API, "application/json"),
    getJSON(`${GL_GROUP_API}/projects?per_page=100&include_subgroups=false`, "application/json"),
    getJSON(`${GL_GROUP_API}/subgroups`, "application/json").catch(() => []),
  ]);
  $$("[data-org-avatar]").forEach((image) => {
    image.onerror = () => {
      image.onerror = null;
      image.src = "/assets/org-avatar.webp?v=fff479ce";
    };
    image.src = group.avatar_url || "/assets/org-avatar.webp?v=fff479ce";
  });
  setText("[data-org-name]", group.name || "International Duck Incorporated");
  setText("[data-org-repos]", projects.length);

  // Repository counts stay split by host; the stars tile shows their sum.
  const gitlabStars = projects.reduce((total, project) => total + (project.star_count || 0), 0);
  const githubRepos = await getJSON(
    `${GH_ORG_API}/repos?per_page=100&type=public`,
    "application/json"
  ).catch(() => null);
  if (Array.isArray(githubRepos)) {
    const githubStars = githubRepos.reduce(
      (total, repo) => total + (repo.stargazers_count || 0),
      0
    );
    setText("[data-org-repos-github]", githubRepos.length);
    setText("[data-org-stars]", gitlabStars + githubStars);
    const starsTile = $("[data-org-stars-tile]");
    if (starsTile) {
      starsTile.title = `Combined GitLab and GitHub stars: ${gitlabStars} on GitLab, ${githubStars} on GitHub`;
      starsTile.setAttribute("aria-label", starsTile.title);
    }
  }
  if (subgroups && subgroups.length) setText("[data-org-subgroups-count]", subgroups.length);
}

const GL_NOOSPHERE_PATH = `${GL_GROUP_PATH}/noosphere`;
const GL_NOOSPHERE_API = `${GITLAB_API}/groups/${encodeURIComponent(GL_NOOSPHERE_PATH)}`;

async function syncNoosphere() {
  try {
    const [group, projects] = await Promise.all([
      getJSON(GL_NOOSPHERE_API, "application/json"),
      getJSON(
        `${GL_NOOSPHERE_API}/projects?per_page=100&order_by=last_activity_at&sort=desc`,
        "application/json"
      ),
    ]);
    $$("[data-noosphere-avatar]").forEach((image) => {
      image.onerror = () => {
        image.onerror = null;
        image.src = "/assets/noosphere-avatar.webp?v=da95d789";
      };
      image.src = group.avatar_url || "/assets/noosphere-avatar.webp?v=da95d789";
    });
    setText("[data-noosphere-name]", group.name || "IDI Noosphere");
    setText("[data-noosphere-desc]", group.description || "");
    setText("[data-noosphere-repos]", projects.length);
    setText(
      "[data-noosphere-stars]",
      projects.reduce((total, p) => total + (p.star_count || 0), 0)
    );
  } catch {
    // Retain checked-in static values if API fails
  }
}

const languageColors = {
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
};

// <pixel-canvas> shimmer palettes, tuned to each surface's accent.
const pixelPalettes = {
  green: "#ddfbe4, #8cf77a, #4caf6d",
  blue: "#dcecff, #8ab8f6, #4a7fc0",
  amber: "#f9ecd4, #eec06a, #b98a2e",
  slate: "#e8edf2, #9aa7b4, #5f6d7c",
};

function pixelEffect(colors = pixelPalettes.slate, gap = 6, speed = 35) {
  const effect = document.createElement("pixel-canvas");
  effect.dataset.gap = gap;
  effect.dataset.speed = speed;
  effect.setAttribute("data-colors", colors);
  return effect;
}

async function latestReleaseTag(projectApiBase) {
  const releases = await getJSON(
    `${projectApiBase}/releases?per_page=20`,
    "application/json"
  ).catch(() => []);
  const stable = releases.find((release) => !release.upcoming_release);
  return stable ? (stable.tag_name || stable.name || "").replace(/^v/i, "") : null;
}

async function syncProjects() {
  const allGlProjects = await getJSON(
    `${GL_GROUP_API}/projects?per_page=100&order_by=last_activity_at&sort=desc&include_subgroups=false`,
    "application/json"
  );
  const glProjects = allGlProjects.filter(
    (project) => !project.namespace || project.namespace.full_path === GL_GROUP_PATH
  );
  setText("[data-org-repos]", glProjects.length);
  const directoryProjects = glProjects.filter((project) => project.path !== "gitlab-profile");
  const [beaconVersion, championscodeVersion] = await Promise.all([
    latestReleaseTag(GL_BEACON_PROJECT),
    latestReleaseTag(GL_CHAMPIONSCODE_PROJECT),
  ]);
  const languageByProject = new Map(
    await Promise.all(
      directoryProjects.map(async (project) => {
        const languages = await getJSON(
          `${GITLAB_API}/projects/${project.id}/languages`,
          "application/json"
        ).catch(() => ({}));
        return [
          project.path,
          Object.entries(languages).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
        ];
      })
    )
  );
  const repos = directoryProjects.map((project) => ({
    name: project.path,
    html_url: project.web_url,
    description: project.description,
    language: languageByProject.get(project.path),
  }));
  const knownProjects = [
    {
      name: "Beacon",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/Beacon`,
      description:
        "A vanilla-server-safe, modular client-side utility mod for Minecraft 26.2 with quality-of-life, rendering, world, utility, and fun features.",
      language: "Java",
    },
    {
      name: "NullTrace",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/NullTrace`,
      description:
        "A client-side Fabric privacy mod for Minecraft 1.21.11, 26.1, 26.2, and 26.3 covering client brand spoofing, fingerprint protection, tracking defenses, and safer server connections.",
      language: "Java",
    },
    {
      name: "ChampionsCode",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/ChampionsCode`,
      description:
        "A client-side Fabric mod for Minecraft 26.3 for authorized, defensive server and plugin research and controlled runtime Java addon development.",
      language: "Java",
    },
    {
      name: "beacon-bagley",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/beacon-bagley`,
      description:
        "An opt-in, client-side AI chat assistant addon for Beacon with local provider configuration and optional memory.",
      language: "Java",
    },
    {
      name: "badegg-v3",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/badegg-v3`,
      description:
        "A zero-dependency Python 3.10+ HTTP security gateway and reverse-proxy WAF with token-bucket rate limiting, secret-leak redaction, and explainable IP bans.",
      language: "Python",
    },
    {
      name: "zonedout",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/zonedout`,
      description:
        "An archived, read-only Minecraft 26.3 Fabric mod preserved for reference, with a Metro-style UI and a 36-module seed and world-generation analysis suite.",
      language: "Java",
    },
    {
      name: "Baritone",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/Baritone`,
      description:
        "IDI's GitLab fork of the Baritone Minecraft pathfinder, with releases and branches for Minecraft 26.1, 26.2, and 26.3 plus look-and-aim behaviour work.",
      language: "Java",
    },
    {
      name: "idi-assets",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/idi-assets`,
      description:
        "Shared media and edge-artifact repository: project logos, banners, 4K WebM hero clips, and the compiled hall-of-shame.v2 IPv4/IPv6 blocklist.",
      language: null,
    },
    {
      name: "Glyphsmith",
      html_url: `${GITLAB}/${GL_GROUP_PATH}/home`,
      description:
        "A 100% client-side Unicode workbench: homoglyph substitution, zero-width injection, bidi controls, normalization and a Minecraft chat mode.",
      language: "HTML",
    },
  ];
  knownProjects.forEach((project) => {
    const existing = repos.find((repo) => repo.name === project.name);
    if (existing)
      Object.assign(existing, {
        description: project.description,
        language: existing.language || project.language,
      });
    else repos.push(project);
  });
  const grid = $("[data-org-projects]");
  if (!grid) return;
  const projectPages = {
    Venomous: SITE_ROUTES.venomous,
    Beacon: SITE_ROUTES.beacon,
    "beacon-bagley": SITE_ROUTES.bagley,
    "badegg-v3": SITE_ROUTES.badegg,
    NullTrace: SITE_ROUTES.nulltrace,
    ChampionsCode: SITE_ROUTES.championscode,
    zonedout: SITE_ROUTES.zonedout,
    Baritone: SITE_ROUTES.baritone,
    "idi-assets": SITE_ROUTES.idiAssets,
    Glyphsmith: SITE_ROUTES.glyphsmith,
    home: SITE_ROUTES.website,
    "International-Duck-Incorporated.github.io": SITE_ROUTES.website,
  };
  const projectMeta = {
    Venomous: {
      label: "Featured project",
      icon: "venom",
      logo: "/assets/venomous-icon.webp?v=a2f98ad3",
      status: "Active",
      action: "Open project",
    },
    Beacon: {
      label: "Utility project",
      icon: "beacon",
      logo: "/assets/beacon-icon.webp?v=0f91708c",
      status: beaconVersion ? `Release ${beaconVersion}` : "Release",
      action: "Open project",
    },
    "beacon-bagley": {
      title: "Bagley",
      label: "Beacon addon",
      icon: "bagley",
      logo: "/assets/bagley-icon.webp?v=f22db4e3",
      status: "Active",
      action: "Open project",
    },
    "badegg-v3": {
      title: "BadEgg v3",
      label: "Security gateway",
      icon: "badegg",
      logo: "/assets/badegg-icon.webp?v=91df0dcf",
      status: "MVP",
      action: "Open project",
    },
    NullTrace: {
      label: "Privacy project",
      icon: "privacy",
      logo: "/assets/nulltrace-icon.webp?v=956d0879",
      status: "Official release",
      action: "Open project",
    },
    ChampionsCode: {
      label: "Research project",
      icon: "champion",
      logo: "/assets/championscode-icon.webp?v=636bb343",
      status: championscodeVersion ? `Beta · ${championscodeVersion}` : "Public beta",
      action: "Open project",
    },
    zonedout: {
      title: "ZonedOut",
      label: "Archived mod",
      icon: "zonedout",
      logo: "/assets/zonedout-icon.webp?v=71a190d8",
      status: "Archived",
      statusMuted: true,
      action: "Open project",
    },
    Baritone: {
      title: "Baritone",
      label: "Pathfinding fork",
      icon: "web",
      status: "Active",
      action: "Open project",
    },
    "idi-assets": {
      title: "IDI Assets",
      label: "Media & blocklists",
      icon: "web",
      logo: "/assets/idi-assets-icon.webp?v=c18e5e66",
      status: "Media",
      action: "Open project",
    },
    home: {
      title: "Website source",
      label: "Website project",
      icon: "web",
      status: "Live",
      action: "Open page",
    },
    "International-Duck-Incorporated.github.io": {
      title: "Website source",
      label: "Website project",
      icon: "web",
      status: "Live",
      action: "Open page",
    },
    Glyphsmith: {
      title: "Glyphsmith",
      label: "Unicode lab",
      icon: "glyph",
      symbol: "i-glyph",
      status: "Live",
      action: "Open tool",
    },
  };
  grid.replaceChildren(
    ...repos.map((repo, index) => {
      const link = document.createElement("a");
      const isVenomous = repo.name === REPO;
      const meta = projectMeta[repo.name];
      link.className = `project-card glass-card reveal visible${isVenomous ? " featured" : ""}`;
      link.dataset.projectCard = repo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.href = projectPages[repo.name] || repo.html_url;
      if (!projectPages[repo.name]) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }

      const top = document.createElement("div");
      top.className = "project-card-top";
      const projectIcon = document.createElement("span");
      projectIcon.className = `project-icon ${meta ? meta.icon : "web"}`;
      if (meta && meta.logo) {
        const image = document.createElement("img");
        image.src = meta.logo;
        image.alt = "";
        image.width = 64;
        image.height = 64;
        image.loading = "lazy";
        image.decoding = "async";
        projectIcon.append(image);
      } else projectIcon.innerHTML = icon((meta && meta.symbol) || "i-code");
      if (meta && meta.status) {
        const status = document.createElement("span");
        status.className = `project-status${meta.statusMuted ? " muted" : ""}`;
        status.innerHTML = meta.statusMuted ? meta.status : `<i></i> ${meta.status}`;
        top.append(projectIcon, status);
      } else {
        const external = document.createElement("span");
        external.innerHTML = icon("i-external");
        top.append(projectIcon, external);
      }

      const copy = document.createElement("div");
      const label = document.createElement("span");
      label.className = "card-label";
      label.textContent = (meta && meta.label) || "Repository";
      const title = document.createElement("h3");
      title.textContent = (meta && meta.title) || repo.name;
      const description = document.createElement("p");
      description.textContent =
        repo.description ||
        (isVenomous
          ? "Optimized & refined Meteor Client addon for Minecraft 26.2."
          : repo.name === "home"
            ? "Organization website and project directory."
            : "Public International Duck Incorporated repository on GitLab.");
      copy.append(label, title, description);

      const footer = document.createElement("footer");
      const language = document.createElement("span");
      const dot = document.createElement("i");
      dot.className = "language-dot";
      dot.style.background = languageColors[repo.language] || "#6e7681";
      language.append(dot, document.createTextNode(repo.language || "Repository"));
      const action = document.createElement("span");
      action.append(document.createTextNode(`${(meta && meta.action) || "View repository"} `));
      action.insertAdjacentHTML("beforeend", icon("i-arrow"));
      footer.append(language, action);
      link.append(top, copy, footer);
      const palette =
        repo.name === REPO
          ? pixelPalettes.green
          : repo.name === NULLTRACE || repo.name === BEACON || repo.name === "beacon-bagley"
            ? pixelPalettes.blue
            : repo.name === "ChampionsCode" || repo.name === "badegg-v3" || repo.name === "zonedout"
              ? pixelPalettes.amber
              : pixelPalettes.slate;
      link.append(pixelEffect(palette));
      return link;
    })
  );
}

async function syncMembers() {
  // GitLab does not expose group membership through its public API, so the directory renders the checked-in member roster.
  const members = [
    { login: "0xFFshell", display: "0xFFshell", type: "User" },
    { login: "3spress0", display: "espress0", type: "User" },
    { login: "E-VDV-HU", display: "E-VDV-HU", type: "User" },
    { login: "Xx-superIvar-xX", display: "Xx-superIvar-xX", type: "User" },
    { login: "midas735", display: "midas735", type: "User" },
    { login: "Jojo-8002", display: "Jojo-8002", type: "User" },
  ];
  const role = "Public member";
  setText("[data-org-members-count]", members.length);
  const grid = $("[data-org-members]");
  if (!grid || !members.length) return;
  grid.replaceChildren(
    ...members.map((person) => {
      const link = document.createElement("a");
      link.className = "person-card glass-card reveal visible";
      link.dataset.memberCard = normalizeLogin(person.login);
      const memberPages = {
        "3spress0": "/members/3spress0",
        "E-VDV-HU": "/members/e-vdv-hu",
        "0xFFshell": "/members/0xffshell",
        "Xx-superIvar-xX": "/members/superivar",
        midas735: "/members/midas735",
        "Jojo-8002": "/members/jojo-8002",
      };
      link.href = memberPages[person.login] || person.html_url;
      if (!memberPages[person.login]) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
      const image = document.createElement("img");
      const localMemberImages = {
        "3spress0": "/assets/contributor-3spress0.webp?v=a3c2db19",
        "0xFFshell": "/assets/member-0xffshell.webp?v=827f401e",
        "E-VDV-HU": "/assets/member-e-vdv-hu.webp?v=2a0764ef",
        "Xx-superIvar-xX": "/assets/member-xx-superivar-xx.webp?v=1c79d93d",
        midas735: "/assets/member-midas735.webp?v=3700f4a4",
        "Jojo-8002": "/assets/member-jojo-8002.webp?v=8c2a077e",
      };
      image.src =
        localMemberImages[person.login] ||
        (person.avatar_url ? person.avatar_url : "/assets/org-avatar.webp?v=fff479ce");
      image.alt = person.display;
      image.width = 96;
      image.height = 96;
      image.loading = "lazy";
      image.decoding = "async";
      const copy = document.createElement("div");
      const label = document.createElement("span");
      const hasGithubRestriction =
        isShadowbannedLogin(person.login) || isGithubBannedLogin(person.login);
      label.className = hasGithubRestriction ? "shadowban-label" : "";
      label.textContent = isGithubBannedLogin(person.login)
        ? "Active member · GitHub banned"
        : isShadowbannedLogin(person.login)
          ? "Currently shadowbanned 😢"
          : person.type === "Bot"
            ? "Automation"
            : role;
      const name = document.createElement("h3");
      name.textContent = person.display || person.login;
      const handle = document.createElement("p");
      const summaries = {
        "0xFFshell": "Main writer",
        "3spress0": "Backend developer · project backbone",
        "E-VDV-HU": "Backend & hosting manager",
        "Xx-superIvar-xX": "Product tester",
        midas735: "Just happy to be here",
        "Jojo-8002": "Here for shit n giggles",
      };
      handle.textContent = summaries[person.login] || `@${person.login}`;
      copy.append(label, name, handle);
      link.append(image, copy);
      link.insertAdjacentHTML("beforeend", icon("i-external"));
      if (page === "organization") link.append(pixelEffect(pixelPalettes.slate));
      return link;
    })
  );
}

function initAtmosphere(canvas) {
  if (window.IDI_LOW_END) {
    canvas.hidden = true;
    return;
  }
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
  let width = 1,
    height = 1,
    dpr = 1,
    particles = [],
    frame = 0,
    last = performance.now();
  let pointerX = 0.5,
    pointerY = 0.5,
    targetX = 0.5,
    targetY = 0.5,
    pointerActive = false;
  let flash = 0,
    nextFlash = performance.now() + 2800 + Math.random() * 3800;
  const random = (min, max) => min + Math.random() * (max - min);

  function makeParticle() {
    const large = Math.random() < (storm ? 0.2 : network ? 0.18 : 0.24);
    const speed = storm
      ? random(0.012, 0.026)
      : network
        ? random(0.004, 0.012)
        : random(0.0015, 0.007);
    const angle = storm ? random(Math.PI * 0.42, Math.PI * 0.58) : random(0, Math.PI * 2);
    return {
      x: random(0, width),
      y: random(0, height),
      r: large
        ? random(1.2, network ? 2.8 : storm ? 2.2 : 3.8)
        : random(0.35, network ? 1.7 : storm ? 1.1 : 1.65),
      a: random(network ? 0.22 : storm ? 0.12 : 0.2, network ? 0.72 : storm ? 0.32 : 0.82),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      phase: random(0, Math.PI * 2),
      pulse: random(storm ? 0.00012 : 0.0005, storm ? 0.00052 : 0.0018),
      trail: random(storm ? 24 : 10, storm ? 52 : 32),
    };
  }

  function populate() {
    const area = width * height;
    const count = storm
      ? Math.round(Math.max(130, Math.min(230, area / 6500)))
      : network
        ? Math.round(Math.max(100, Math.min(170, area / 9000)))
        : Math.round(Math.max(210, Math.min(360, area / 5000)));
    particles = Array.from(
      { length: reduceMotion ? Math.round(count * 0.72) : count },
      makeParticle
    );
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
    const seconds = time * 0.001;
    pointerX += (targetX - pointerX) * 0.08;
    pointerY += (targetY - pointerY) * 0.08;
    const cursorX = pointerX * width,
      cursorY = pointerY * height;
    for (const particle of particles) {
      if (delta && !reduceMotion) {
        particle.phase += particle.pulse * delta;
        particle.x +=
          particle.vx * delta +
          Math.sin(particle.phase) * (network ? 0.012 : storm ? 0.004 : 0.025) * delta;
        particle.y +=
          particle.vy * delta +
          Math.cos(particle.phase * 0.8) * (network ? 0.009 : storm ? 0.006 : 0.018) * delta;
        if (pointerActive) {
          const dx = particle.x - cursorX,
            dy = particle.y - cursorY;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const radius = network ? 235 : 190;
          if (distance < radius) {
            const force = (1 - distance / radius) * (network ? 0.014 : 0.02) * delta;
            particle.x += (dx / distance) * force;
            particle.y += (dy / distance) * force;
          }
        }
        if (storm && particle.x < -8) particle.x = random(0, width);
        else if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = storm ? -random(0, height * 0.45) : -8;
      }
    }

    if (storm) {
      const moonX = width * 0.76,
        moonY = height * 0.2;
      const moon = context.createRadialGradient(
        moonX,
        moonY,
        0,
        moonX,
        moonY,
        Math.max(width, height) * 0.33
      );
      moon.addColorStop(0, "rgba(229, 236, 249, .17)");
      moon.addColorStop(0.35, "rgba(180, 194, 221, .07)");
      moon.addColorStop(1, "rgba(38, 58, 87, 0)");
      context.fillStyle = moon;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "rgba(7, 13, 22, .82)";
      context.beginPath();
      context.moveTo(0, height * 0.82);
      context.lineTo(width * 0.2, height * 0.63);
      context.lineTo(width * 0.38, height * 0.76);
      context.lineTo(width * 0.58, height * 0.57);
      context.lineTo(width * 0.82, height * 0.72);
      context.lineTo(width, height * 0.61);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      context.fill();
      context.fillStyle = "rgba(10, 18, 30, .92)";
      context.beginPath();
      context.moveTo(0, height * 0.9);
      context.lineTo(width * 0.18, height * 0.74);
      context.lineTo(width * 0.34, height * 0.84);
      context.lineTo(width * 0.48, height * 0.7);
      context.lineTo(width * 0.64, height * 0.86);
      context.lineTo(width * 0.86, height * 0.76);
      context.lineTo(width, height * 0.82);
      context.lineTo(width, height);
      context.lineTo(0, height);
      context.closePath();
      context.fill();
      context.save();
      context.strokeStyle = "rgba(198, 214, 238, .26)";
      context.lineWidth = 1.05;
      for (const particle of particles) {
        const length = particle.trail * (1 + Math.sin(particle.phase) * 0.15);
        context.globalAlpha = particle.a;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(particle.x - particle.vx * length, particle.y - particle.vy * length * 2.2);
        context.stroke();
      }
      context.restore();
    } else if (network) {
      const maxDistance = Math.min(220, Math.max(118, width * 0.14));
      context.lineWidth = 0.7;
      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const first = particles[i],
            second = particles[j];
          const dx = first.x - second.x,
            dy = first.y - second.y;
          const distance = Math.hypot(dx, dy);
          if (distance >= maxDistance) continue;
          const alpha = (1 - distance / maxDistance) * 0.22;
          context.strokeStyle = `rgba(${palette.line.join(",")},${alpha})`;
          context.beginPath();
          context.moveTo(first.x, first.y);
          context.lineTo(second.x, second.y);
          context.stroke();
        }
      }
    }

    if (!network) {
      if (!storm) {
        const warm = context.createRadialGradient(
          width * 0.72,
          height * 0.2,
          0,
          width * 0.72,
          height * 0.2,
          Math.max(width, height) * 0.65
        );
        warm.addColorStop(0, "rgba(255, 183, 86, .13)");
        warm.addColorStop(0.42, "rgba(224, 139, 49, .045)");
        warm.addColorStop(1, "rgba(224, 139, 49, 0)");
        context.fillStyle = warm;
        context.fillRect(0, 0, width, height);
        context.save();
        context.globalCompositeOperation = "lighter";
        context.lineWidth = 0.55;
        for (const particle of particles) {
          if (particle.r < 1.35) continue;
          const speed = Math.max(0.001, Math.hypot(particle.vx, particle.vy));
          const length = particle.trail * (0.7 + Math.sin(particle.phase) * 0.3);
          context.globalAlpha = particle.a * 0.38;
          context.strokeStyle = `rgba(${palette.line.join(",")},${context.globalAlpha})`;
          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(
            particle.x - (particle.vx / speed) * length,
            particle.y - (particle.vy / speed) * length
          );
          context.stroke();
        }
        context.restore();
      }
    }

    if (pointerActive) {
      const radius = network ? 230 : storm ? 250 : 190;
      const glow = context.createRadialGradient(cursorX, cursorY, 0, cursorX, cursorY, radius);
      glow.addColorStop(
        0,
        `rgba(${palette.glow.join(",")},${network ? 0.1 : storm ? 0.13 : 0.08})`
      );
      glow.addColorStop(1, `rgba(${palette.glow.join(",")},0)`);
      context.fillStyle = glow;
      context.fillRect(cursorX - radius, cursorY - radius, radius * 2, radius * 2);
    }

    if (storm) {
      if (!reduceMotion && time >= nextFlash) {
        flash = random(0.22, 0.44);
        nextFlash = time + random(2500, 6300);
      }
      flash = Math.max(0, flash - delta * 0.0018);
      if (flash > 0) {
        context.fillStyle = `rgba(222,236,255,${flash})`;
        context.fillRect(0, 0, width, height);
      }
    }

    context.save();
    context.globalCompositeOperation = storm ? "screen" : "lighter";
    for (const particle of particles) {
      const pulse = 0.72 + Math.sin(particle.phase + seconds) * 0.28;
      context.globalAlpha = particle.a * (storm ? 0.6 : pulse);
      context.fillStyle = `rgb(${palette.dot.join(",")})`;
      context.shadowColor = `rgba(${palette.glow.join(",")},${storm ? 0.42 : 0.7})`;
      context.shadowBlur =
        particle.r > 1.1 ? (network ? 14 : storm ? 6 : 18) : network ? 6 : storm ? 2 : 8;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function animate(time) {
    const delta = Math.min(32, time - last);
    last = time;
    draw(time, delta);
    frame = document.hidden ? 0 : requestAnimationFrame(animate);
  }
  function start() {
    if (!frame && !reduceMotion && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  addEventListener("resize", resize, { passive: true });
  addEventListener(
    "pointermove",
    (event) => {
      targetX = event.clientX / width;
      targetY = event.clientY / height;
      pointerActive = true;
    },
    { passive: true }
  );
  addEventListener("pointerleave", () => {
    pointerActive = false;
    targetX = 0.5;
    targetY = 0.5;
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  resize();
  if (!reduceMotion) start();
}
let modules = fallbackModules.slice().sort((a, b) => a.name.localeCompare(b.name));
let activeCategory = "all",
  searchTerm = "",
  showEverything = false;

function counts() {
  return modules.reduce((all, item) => {
    all[item.category] = (all[item.category] || 0) + 1;
    return all;
  }, {});
}
function updateModuleCounts() {
  const total = counts();
  setText("[data-module-total]", modules.length);
  $$("[data-category-count]").forEach((node) => {
    node.textContent = total[node.dataset.categoryCount] || 0;
  });
  $$("[data-filter]").forEach((button) => {
    const badge = $("b", button);
    if (badge)
      badge.textContent =
        button.dataset.filter === "all" ? modules.length : total[button.dataset.filter] || 0;
  });
}
function renderModules() {
  const grid = $("[data-module-grid]");
  if (!grid) return;
  const filtered = modules.filter(
    (item) =>
      (activeCategory === "all" || item.category === activeCategory) &&
      item.name.toLowerCase().includes(searchTerm)
  );
  const limited = !showEverything && !searchTerm && filtered.length > 24,
    visible = limited ? filtered.slice(0, 24) : filtered;
  grid.replaceChildren(
    ...visible.map((item, index) => {
      const card = document.createElement("span"),
        label = document.createElement("small");
      card.append(document.createTextNode(item.name), label);
      label.textContent = item.category;
      card.style.animationDelay = `${Math.min(index * 12, 180)}ms`;
      return card;
    })
  );
  $("[data-results-label]").textContent =
    activeCategory === "all" ? "All modules" : `${activeCategory} modules`;
  $("[data-results-count]").textContent = limited
    ? `${filtered.length} results · showing ${visible.length}`
    : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`;
  $("[data-empty]").hidden = filtered.length !== 0;
  const more = $("[data-show-all]");
  more.hidden = !limited;
  if (limited) {
    more.textContent = `Show all ${filtered.length} modules `;
    more.insertAdjacentHTML("beforeend", icon("i-arrow"));
  }
}
function setupModules() {
  $$("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      activeCategory = button.dataset.filter;
      showEverything = false;
      $$("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderModules();
    })
  );
  $("[data-module-search]")?.addEventListener("input", (event) => {
    searchTerm = event.target.value.trim().toLowerCase();
    renderModules();
  });
  $("[data-show-all]")?.addEventListener("click", () => {
    showEverything = true;
    renderModules();
  });
  updateModuleCounts();
  renderModules();
}
function parseRegistry(source) {
  const imports = {},
    importPattern = /import net\.venomous\.meteoraddon\.modules\.(\w+)\.(\w+);/g,
    addPattern = /Modules\.get\(\)\.add\(new (\w+)\(\)\)/g;
  let match;
  while ((match = importPattern.exec(source))) imports[match[2]] = match[1];
  const group = (folder) =>
      ({
        combat: "combat",
        exploit: "exploit",
        movement: "movement",
        detection: "detection",
        esp: "visual",
        render: "visual",
      })[folder] || "utility",
    result = [];
  while ((match = addPattern.exec(source)))
    result.push({ name: match[1], category: group(imports[match[1]]) });
  return result;
}
async function syncModules() {
  const response = await fetch(
    `${GITLAB}/${GL_PROJECT_PATH}/-/raw/main/src/main/java/net/venomous/meteoraddon/modules/ModuleRegistry.java`,
    { cache: "no-store" }
  );
  if (!response.ok) throw new Error("Module source unavailable");
  const parsed = parseRegistry(await response.text());
  if (!parsed.length) throw new Error("No modules found");
  modules = parsed.sort((a, b) => a.name.localeCompare(b.name));
  updateModuleCounts();
  renderModules();
  setText("[data-module-source]", "Live from ModuleRegistry.java");
}

async function syncRepository() {
  const [repo, languages] = await Promise.all([
    getJSON(`${GL_PROJECT}`, "application/json"),
    getJSON(`${GL_PROJECT}/languages`, "application/json"),
  ]);
  setText("[data-stars]", repo.star_count.toLocaleString());
  setText("[data-forks]", repo.forks_count.toLocaleString());
  const topLanguage = Object.entries(languages).sort((a, b) => b[1] - a[1])[0];
  setText("[data-language]", topLanguage?.[0] || "Code");
  setText("[data-last-push]", relativeDate(repo.last_activity_at));
}
async function syncNullTraceRelease() {
  const releases = await getJSON(`${GL_NULLTRACE_PROJECT}/releases?per_page=20`);
  const stable = releases.find((release) => !release.upcoming_release);
  if (!stable) return;
  const semanticVersion = stable.name?.match(/v?\d+\.\d+\.\d+/)?.[0] || stable.tag_name;
  setText("[data-nulltrace-version]", semanticVersion);
  setText(
    "[data-nulltrace-release-note]",
    stable.description?.split("\n").find(Boolean) || "First official release"
  );
  setText("[data-nulltrace-date]", fullDate(stable.released_at));
  setText("[data-nulltrace-release-label]", `Download ${semanticVersion}`);
  $$("[data-nulltrace-download]").forEach((link) => {
    link.href = NULLTRACE_CURSEFORGE_FILES_URL;
  });
  $$("[data-nulltrace-release-link]").forEach((link) => {
    link.href = stable._links?.self || `${GITLAB}/${GL_GROUP_PATH}/${NULLTRACE}/-/releases`;
  });
}

// The badge follows the newest release, but Beacon bumps mod_version in
// gradle.properties ahead of the tag. Show whichever is newer so the site says
// 2.0.1 the moment the repo does; downloads keep serving the newest published
// jar until that release exists, then the release API takes over.
function compareVersions(a, b) {
  const parse = (value) =>
    String(value)
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);
  const [left, right] = [parse(a), parse(b)];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    if ((left[index] || 0) !== (right[index] || 0)) return (left[index] || 0) - (right[index] || 0);
  }
  return 0;
}
async function syncBeaconRelease() {
  const [releases, properties] = await Promise.all([
    getJSON(`${GL_BEACON_PROJECT}/releases?per_page=100`),
    fetch(`${GL_BEACON_PROJECT}/repository/files/gradle.properties/raw?ref=main`)
      .then((response) => (response.ok ? response.text() : ""))
      .catch(() => ""),
  ]);
  const stable = releases.find((release) => !release.upcoming_release);
  if (!stable) return;
  const published = stable.tag_name || stable.name || "1.8.16";
  const sourceVersion = properties.match(/^mod_version\s*=\s*(\S+)/m)?.[1];
  const version =
    sourceVersion && compareVersions(sourceVersion, published) > 0 ? sourceVersion : published;
  const releaseUrl =
    stable._links?.self ||
    `${GITLAB}/${GL_GROUP_PATH}/${BEACON}/-/releases/${encodeURIComponent(published)}`;
  setText("[data-beacon-version]", version);
  setText("[data-beacon-date]", fullDate(stable.released_at));
  setText("[data-beacon-release-count]", releases.length.toLocaleString());
  setText("[data-beacon-download-label]", `Download ${published}`);
  $$("[data-beacon-release-link]").forEach((link) => {
    link.href = releaseUrl;
  });
  $$("[data-beacon-download]").forEach((link) => {
    link.href = BEACON_CURSEFORGE_FILES_URL;
  });
}

async function syncChampionsCodeRelease() {
  const releases = await getJSON(`${GL_CHAMPIONSCODE_PROJECT}/releases?per_page=100`);
  const stable = releases.find((release) => !release.upcoming_release);
  if (!stable) return;
  const version = (stable.tag_name || stable.name || "v0.1.0-beta.1").replace(/^v/i, "");
  const jar = stable.assets?.links?.find(
    (asset) =>
      `${asset.name || ""} ${asset.url || ""}`.toLowerCase().includes(".jar") &&
      !`${asset.name || ""}`.toLowerCase().includes("sources")
  );
  const releaseUrl =
    stable._links?.self ||
    `${GITLAB}/${GL_GROUP_PATH}/ChampionsCode/-/releases/${encodeURIComponent(stable.tag_name)}`;
  const downloadUrl = jar?.direct_asset_url || jar?.url || releaseUrl;
  setText("[data-championscode-version]", version);
  setText("[data-championscode-date]", fullDate(stable.released_at));
  setText("[data-championscode-download-label]", `Download ${version}`);
  $$("[data-championscode-release-link]").forEach((link) => {
    link.href = releaseUrl;
  });
  $$("[data-championscode-download]").forEach((link) => {
    link.href = downloadUrl;
  });
}

async function syncMemberContributions() {
  // Contribution counts come from the GitLab group's mirrored repositories plus espress0's
  // personal Confluence OS and Fingerprint Damper repositories (shown only on /members/3spress0).
  const isMemberCommit = (commit) =>
    /espervanderven|3spress0|espress0|166116795/i.test(
      `${commit.author_name || ""} ${commit.author_email || ""}`
    );
  const confluenceProject = `${GITLAB_API}/projects/${encodeURIComponent("3spress0/confluence-os-final")}`;
  const fingerprintProject = `${GITLAB_API}/projects/${encodeURIComponent("3spress0/fingerprint-damper")}`;
  const [
    venomousCommits,
    siteCommits,
    confluenceCommits,
    confluenceReleases,
    fingerprintCommits,
    fingerprintTags,
  ] = await Promise.all([
    getJSON(`${GL_PROJECT}/repository/commits?per_page=100`, "application/json"),
    getJSON(`${GL_SITE_PROJECT}/repository/commits?per_page=100`, "application/json"),
    getJSON(`${confluenceProject}/repository/commits?per_page=100`, "application/json").catch(
      () => []
    ),
    getJSON(`${confluenceProject}/releases?per_page=10`, "application/json").catch(() => []),
    getJSON(`${fingerprintProject}/repository/commits?per_page=100`, "application/json").catch(
      () => []
    ),
    getJSON(`${fingerprintProject}/repository/tags?per_page=10`, "application/json").catch(
      () => []
    ),
  ]);
  const venomous = venomousCommits.filter(isMemberCommit),
    site = siteCommits.filter(isMemberCommit);
  const champions = Number($("[data-member-champions-contributions]")?.textContent) || 0;
  setText("[data-member-venomous-contributions]", venomous.length);
  setText("[data-member-site-contributions]", site.length);
  setText("[data-member-contributions]", venomous.length + site.length + champions);
  if (confluenceCommits.length) {
    setText("[data-confluence-commits]", confluenceCommits.length);
  }
  if (fingerprintCommits.length) {
    setText("[data-fingerprint-commits]", fingerprintCommits.length);
  }
  const latestConfluence = confluenceReleases.find((release) => !release.upcoming_release);
  if (latestConfluence) {
    const tag = latestConfluence.tag_name || latestConfluence.name;
    if (tag) setText("[data-confluence-version]", tag);
    if (latestConfluence._links?.self) {
      $$("[data-confluence-release-link]").forEach((link) => {
        link.href = latestConfluence._links.self;
      });
    }
  }
  if (fingerprintTags[0]?.name) {
    setText("[data-fingerprint-version]", fingerprintTags[0].name);
  }

  const list = $("[data-member-commits]");
  if (!list) return;
  const recent = [...venomous, ...site, ...confluenceCommits, ...fingerprintCommits]
    .sort((a, b) => new Date(b.committed_date) - new Date(a.committed_date))
    .slice(0, 8);
  if (!recent.length) return;
  list.replaceChildren(
    ...recent.map((item) => {
      const link = document.createElement("a");
      const dot = document.createElement("i");
      const copy = document.createElement("span");
      const title = document.createElement("b");
      const meta = document.createElement("small");
      const hash = document.createElement("code");
      const repoSegment = item.web_url.split("/-/")[0].split("/").pop();
      const repoName =
        repoSegment === "International-Duck-Incorporated.github.io" || repoSegment === "home"
          ? "Website"
          : repoSegment === "confluence-os-final"
            ? "Confluence OS"
            : repoSegment === "fingerprint-damper"
              ? "Fingerprint Damper"
              : repoSegment;
      link.href = item.web_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      title.textContent = item.title?.split("\n")[0] || "Commit";
      meta.textContent = `${repoName} · ${relativeDate(item.committed_date)}`;
      hash.textContent = (item.short_id || item.id).slice(0, 7);
      copy.append(title, meta);
      link.append(dot, copy, hash);
      return link;
    })
  );
}

async function syncMemberProjectPage() {
  const slug = document.body.dataset.memberProject;
  const isConfluence = slug === "confluence";
  const repoPath = isConfluence ? "3spress0/confluence-os-final" : "3spress0/fingerprint-damper";
  const label = isConfluence ? "Confluence OS" : "Fingerprint Damper";
  const apiBase = `${GITLAB_API}/projects/${encodeURIComponent(repoPath)}`;

  const [commits, releases, tags] = await Promise.all([
    getJSON(`${apiBase}/repository/commits?per_page=100`, "application/json").catch(() => []),
    isConfluence
      ? getJSON(`${apiBase}/releases?per_page=10`, "application/json").catch(() => [])
      : Promise.resolve([]),
    !isConfluence
      ? getJSON(`${apiBase}/repository/tags?per_page=10`, "application/json").catch(() => [])
      : Promise.resolve([]),
  ]);

  if (commits.length) {
    setText(
      isConfluence ? "[data-confluence-commits]" : "[data-fingerprint-commits]",
      commits.length
    );
  }
  if (isConfluence) {
    const latest = releases.find((r) => !r.upcoming_release);
    if (latest) {
      const tag = latest.tag_name || latest.name;
      if (tag) setText("[data-confluence-version]", tag);
      if (latest._links?.self) {
        $$("[data-confluence-release-link]").forEach((link) => {
          link.href = latest._links.self;
        });
      }
    }
  } else if (tags[0]?.name) {
    setText("[data-fingerprint-version]", tags[0].name);
  }

  const list = $(isConfluence ? "[data-confluence-commit-list]" : "[data-fingerprint-commit-list]");
  if (!list || !commits.length) return;
  list.replaceChildren(
    ...commits.slice(0, 8).map((item) => {
      const link = document.createElement("a");
      const dot = document.createElement("i");
      const copy = document.createElement("span");
      const title = document.createElement("b");
      const meta = document.createElement("small");
      const hash = document.createElement("code");
      link.href = item.web_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      title.textContent = item.title?.split("\n")[0] || "Commit";
      meta.textContent = `${label} · ${relativeDate(item.committed_date)}`;
      hash.textContent = (item.short_id || item.id).slice(0, 7);
      copy.append(title, meta);
      link.append(dot, copy, hash);
      return link;
    })
  );
}

async function syncReleases() {
  const releases = await getJSON(`${GL_PROJECT}/releases?per_page=20`, "application/json"),
    stable = releases.find((r) => r.tag_name !== "nightly"),
    nightly = releases.find((r) => r.tag_name === "nightly");
  const jarAsset = (release) =>
    release.assets?.links?.find((a) =>
      `${a.name || ""} ${a.url || ""}`.toLowerCase().includes(".jar")
    );
  if (stable) {
    const asset = jarAsset(stable);
    setText("[data-release-version]", stable.tag_name);
    setText("[data-release-short]", stable.tag_name.replace(/^v/i, ""));
    setText("[data-stable-date]", fullDate(stable.released_at));
    if (asset)
      $$("[data-stable-download]").forEach((link) => {
        link.href = asset.url;
      });
  }
  if (nightly) {
    const asset = jarAsset(nightly);
    setText(
      "[data-nightly-version]",
      asset?.name?.replace(/\.jar$/i, "") || nightly.name || "Latest main"
    );
    setText("[data-nightly-date]", fullDate(nightly.released_at));
    if (asset)
      $$("[data-nightly-download]").forEach((link) => {
        link.href = asset.url;
      });
  }
}
async function syncCommits() {
  const commits = await getJSON(`${GL_PROJECT}/repository/commits?per_page=5`, "application/json");
  const list = $("[data-commits]");
  if (!list) return;
  list.replaceChildren(
    ...commits.map((item) => {
      const link = document.createElement("a"),
        dot = document.createElement("i"),
        copy = document.createElement("span"),
        title = document.createElement("b"),
        meta = document.createElement("small"),
        hash = document.createElement("code");
      link.href = item.web_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      title.textContent = item.title || item.message?.split("\n")[0] || "Commit";
      meta.textContent = `${item.author_name} · ${relativeDate(item.authored_date || item.committed_date)}`;
      hash.textContent = (item.short_id || item.id).slice(0, 7);
      copy.append(title, meta);
      link.append(dot, copy, hash);
      return link;
    })
  );
}
async function syncContributors() {
  const members = await getJSON(`${GL_PROJECT}/repository/contributors`, "application/json");
  const list = $("[data-contributors]");
  if (!list || !members.length) return;
  const known = [
    {
      test: (person) => person.name === "0xFF" || person.email === "pieterr.games@gmail.com",
      label: "0xFFshell",
      role: "Main writer",
      url: `${GITLAB}/0xFFshell`,
      avatar: "/assets/member-0xffshell.png?v=d8a12bec",
    },
    {
      test: (person) =>
        /espress0|3spress0|espervanderven|166116795/i.test(
          `${person.name || ""} ${person.email || ""}`
        ),
      label: "espress0",
      role: "Backend developer",
      url: "https://gitlab.com/3spress0",
      avatar: "/assets/contributor-3spress0.png?v=1e7edf44",
    },
  ];
  const merged = new Map();
  for (const person of members) {
    const profile = known.find((entry) => entry.test(person));
    const key = profile ? profile.label : person.name || "Contributor";
    const entry = merged.get(key) || {
      label: key,
      role: profile?.role || "Contributor",
      url: profile?.url || `${GITLAB}/${GL_PROJECT_PATH}/-/graphs/main`,
      avatar: profile?.avatar || "/assets/org-avatar.webp?v=fff479ce",
      commits: 0,
    };
    entry.commits += person.commits || 0;
    merged.set(key, entry);
  }
  list.replaceChildren(
    ...[...merged.values()]
      .sort((a, b) => b.commits - a.commits)
      .map((entry) => {
        const link = document.createElement("a"),
          image = document.createElement("img"),
          copy = document.createElement("span"),
          name = document.createElement("b"),
          role = document.createElement("small"),
          total = document.createElement("strong");
        link.href = entry.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        image.src = entry.avatar;
        image.alt = entry.label;
        name.textContent = entry.label;
        role.textContent = entry.role;
        total.textContent = `${entry.commits} ${entry.commits === 1 ? "contribution" : "contributions"}`;
        copy.append(name, role);
        link.append(image, copy, total);
        return link;
      })
  );
}

$$("[data-background]").forEach(initAtmosphere);
const lowPowerMode = Boolean(window.IDI_LOW_END);
if (
  page === "project" &&
  document.body.dataset.project === "beacon" &&
  !lowPowerMode &&
  !window.IDI_REDUCED_MOTION
) {
  const backgroundVideo = $("[data-beacon-background]");
  if (backgroundVideo) {
    backgroundVideo.autoplay = true;
    backgroundVideo.preload = "metadata";
    backgroundVideo.load();
    backgroundVideo.play().catch(() => {});
  }
}
const tasks = [];
const liveTasks = [];
const addLiveTask = (task) => {
  tasks.push(task);
  liveTasks.push(task);
};

// The public roster is checked in; only the overview needs the live group metrics.
if (page === "organization") {
  tasks.push(syncMembers());
  if (!lowPowerMode) addLiveTask(syncOrganization());
}
if (page === "noosphere" && !lowPowerMode) addLiveTask(syncNoosphere());
if (page === "members") tasks.push(syncMembers());
if (page === "projects" && !lowPowerMode) addLiveTask(syncProjects());
if (page === "projects" && lowPowerMode) {
  const source = $(".directory-status .source-chip");
  if (source) {
    const indicator = source.querySelector("i");
    source.replaceChildren(
      ...(indicator ? [indicator] : []),
      document.createTextNode(" Checked-in directory")
    );
  }
}
if (!lowPowerMode && page === "project" && document.body.dataset.project === "nulltrace")
  addLiveTask(syncNullTraceRelease());
if (!lowPowerMode && page === "project" && document.body.dataset.project === "beacon")
  addLiveTask(syncBeaconRelease());
if (!lowPowerMode && page === "project" && document.body.dataset.project === "championscode")
  addLiveTask(syncChampionsCodeRelease());
if (!lowPowerMode && page === "member" && document.body.dataset.member === MEMBER_LOGIN)
  addLiveTask(syncMemberContributions());
if (!lowPowerMode && page === "member-project") addLiveTask(syncMemberProjectPage());
if (page === "venomous") {
  setupModules(); // renders the checked-in module index when live data is paused
  if (lowPowerMode) setText("[data-module-source]", "Checked-in module index");
  if (!lowPowerMode) {
    addLiveTask(syncRepository());
    addLiveTask(syncReleases());
    addLiveTask(syncCommits());
    addLiveTask(syncContributors());
    addLiveTask(syncModules());
  }
}

// Baritone: live multi-agent coordination console (projects/baritone.html).
// Renders the Active Agents roster and the Chat from the Baritone repo's
// AGENTS.md on the 26.3 branch. Fetches through the GitLab API raw endpoint:
// the /-/raw/ URL sends no CORS headers, so browsers refuse it cross-origin.
// This block must stay above the footer sync-state resolution below so the
// initial fetch is counted in liveTasks like every other live sync.
// Avatars are Gravatar identicons hashed from the agent name, so every
// agent (and the human operator) gets a stable, recognizable identicon.
const BARITONE_AGENTS_REF = "26.3";
const BARITONE_AGENT_SOURCE = `${GL_BARITONE_PROJECT}/repository/files/AGENTS.md/raw?ref=${BARITONE_AGENTS_REF}`;
const BARITONE_AGENT_MESSAGE_LIMIT = 48;
const BARITONE_AGENT_POLL_MS = window.IDI_REDUCED_MOTION ? 120000 : 60000;
const BARITONE_AGENT_EXAMPLE = /^agent [a-z]$/i;
const BARITONE_ARCHIVE_URL =
  "https://gitlab.com/international-duck-incorporated/Baritone/-/blob/26.3/AGENTS-archive.md";
const BARITONE_COMMITS_URL = `${GL_BARITONE_PROJECT}/repository/commits?ref_name=${BARITONE_AGENTS_REF}&per_page=100`;
const BARITONE_COMMIT_PAGES = 3;
const BARITONE_COMMITS_WEB_URL =
  "https://gitlab.com/international-duck-incorporated/Baritone/-/commits/26.3";
const BARITONE_STAMP_GAP_MS = 30 * 60 * 1000;
let baritoneAgentHash = "";
let baritoneAgentLoaded = false;
let baritoneChatPinned = false;

function cleanBaritoneAgentText(value) {
  return String(value || "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function baritoneSection(markdown, heading) {
  const open = markdown.match(new RegExp(`^# ${heading}\\s*$`, "m"));
  if (!open || open.index === undefined) return "";
  const body = markdown.slice(open.index + open[0].length);
  const close = body.match(/^# [^\n]*$/m);
  return close && close.index !== undefined ? body.slice(0, close.index) : body;
}

function parseBaritoneAgents(markdown) {
  const section = baritoneSection(markdown, "Active Agents");
  // First table only: later tables in the section hold stale previous-session
  // rows (plus their own header/separator, which would parse as phantom agents).
  const rows = [];
  let inTable = false;
  for (const line of section.split(/\r?\n/)) {
    if (line.trim().startsWith("|")) {
      inTable = true;
      rows.push(line);
    } else if (inTable) {
      break;
    }
  }
  return rows
    .slice(2)
    .map((line) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      return {
        name: cleanBaritoneAgentText(cells[0]) || "Agent",
        task: cleanBaritoneAgentText(cells[1] || ""),
        status: cleanBaritoneAgentText(cells[3] || "Unknown"),
      };
    })
    .filter((agent) => agent.name && agent.status && !/^-+$/.test(agent.name));
}

function baritoneStripFences(markdown) {
  const lines = String(markdown).split("\n");
  const fenceAt = [];
  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) fenceAt.push(index);
  });
  // Pair openers with closers; a trailing unclosed opener is treated as text.
  const inside = new Set();
  for (let i = 0; i + 1 < fenceAt.length; i += 2) {
    for (let line = fenceAt[i] + 1; line < fenceAt[i + 1]; line++) inside.add(line);
  }
  return lines.filter((_, index) => !inside.has(index)).join("\n");
}

function parseBaritoneChat(markdown) {
  // Whole-file scan: agents append new messages at the tail of other sections
  // (notably Next Tasks), so the # Chat section alone goes stale within hours.
  // Dated ### headers are self-identifying; fenced template copies are out.
  const section = baritoneStripFences(markdown);
  if (!section) return [];
  // Split on every ### header so untimestamped subsections (the recovered-message
  // digests) never leak into a neighboring message's body; keep dated ones only.
  const headers = [...section.matchAll(/^###\s+(.+?)\s*$/gm)];
  const sectionStarts = [...section.matchAll(/^# [^\n]*$/gm)].map((found) => found.index);
  const entries = [];
  headers.forEach((header, index) => {
    const stamp = header[1].match(
      /^(.*?)\s+-\s+(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?\s+UTC.*)$/
    );
    if (!stamp) return;
    const name = stamp[1].trim();
    if (BARITONE_AGENT_EXAMPLE.test(name)) return; // "Agent A/B" template examples
    const blockStart = header.index + header[0].length;
    const nextSection = sectionStarts.find((start) => start > blockStart) ?? section.length;
    const blockEnd = Math.min(headers[index + 1]?.index ?? section.length, nextSection);
    const block = section.slice(blockStart, blockEnd).trim();
    const status = block.match(/^Status:\s*(.+)$/m)?.[1]?.trim() || "";
    const taskPattern =
      /^Current task:\s*([\s\S]*?)(?=\r?\n(?:Message|Response to|Next action|Task|Subsystem|Files):|$)/m;
    const task = block.match(taskPattern)?.[1] || "";
    let message =
      block.match(/^Message:\s*([\s\S]*?)(?=\r?\n(?:Response to|Next action):|$)/m)?.[1] || "";
    if (!message.trim()) {
      // Claim-style (Task:/Subsystem:/Files:) and freeform messages carry no
      // Message: field; show the block minus the lines already in the meta row.
      message = block.replace(/^Status:\s*.+$/m, "").replace(taskPattern, "");
    }
    message = cleanBaritoneAgentText(message);
    entries.push({
      name,
      time: stamp[2].trim(),
      ms: baritoneInstantMs(stamp[2].trim()),
      status: cleanBaritoneAgentText(status),
      task: cleanBaritoneAgentText(task),
      message,
    });
  });
  entries.sort((a, b) => (a.ms ?? 0) - (b.ms ?? 0));
  return entries;
}

function md5Hex(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 0; i < 8; i++) bytes.push((bitLength / 2 ** (8 * i)) & 0xff);
  const K = Array.from(
    { length: 64 },
    (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0
  );
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const rol = (value, bits) => ((value << bits) | (value >>> (32 - bits))) >>> 0;
  let a0 = 0x67452301,
    b0 = 0xefcdab89,
    c0 = 0x98badcfe,
    d0 = 0x10325476;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const M = [];
    for (let i = 0; i < 16; i++) {
      M.push(
        (bytes[offset + i * 4] |
          (bytes[offset + i * 4 + 1] << 8) |
          (bytes[offset + i * 4 + 2] << 16) |
          (bytes[offset + i * 4 + 3] << 24)) >>>
          0
      );
    }
    let A = a0,
      B = b0,
      C = c0,
      D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rol(F, S[i])) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  return [a0, b0, c0, d0]
    .map((word) =>
      [0, 8, 16, 24]
        .map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, "0"))
        .join("")
    )
    .join("");
}

function baritoneAvatarUrl(name) {
  const digest = md5Hex(
    String(name || "agent")
      .trim()
      .toLowerCase()
  );
  return `https://www.gravatar.com/avatar/${digest}?s=96&d=identicon&f=y`;
}

function baritoneAvatar(name, displaySize) {
  const image = document.createElement("img");
  image.className = "baritone-agent-avatar";
  image.src = baritoneAvatarUrl(name);
  image.alt = "";
  image.width = displaySize;
  image.height = displaySize;
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.draggable = false;
  return image;
}

function baritoneInstantMs(time) {
  const match = String(time || "").match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}))?/);
  if (!match) return null;
  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4] || 0),
    Number(match[5] || 0)
  );
}

function baritoneStampLabel(ms) {
  const at = new Date(ms);
  const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
    at
  );
  const dayStart = (value) => {
    const day = new Date(value);
    day.setHours(0, 0, 0, 0);
    return day.getTime();
  };
  const daysAgo = Math.round((dayStart(Date.now()) - dayStart(ms)) / 86400000);
  if (daysAgo <= 0) return clock;
  if (daysAgo === 1) return `Yesterday ${clock}`;
  if (daysAgo < 7)
    return `${new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(at)} ${clock}`;
  const date = new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  }).format(at);
  return `${date}, ${clock}`;
}

const BARITONE_ACTIVE_WINDOW_MS = 60 * 60 * 1000;
const BARITONE_DONE_HIDE_MS = 2 * 60 * 60 * 1000;

function baritoneChatAuthorKey(author) {
  return String(author || "")
    .replace(/\s*\(.*\)$/, "")
    .trim()
    .toLowerCase();
}

function baritoneLastSeen(messages) {
  const seen = new Map();
  for (const entry of messages) {
    const ms = baritoneInstantMs(entry.time);
    if (ms === null) continue;
    const key = baritoneChatAuthorKey(entry.name);
    if (!seen.has(key) || ms > seen.get(key)) seen.set(key, ms);
  }
  return seen;
}

function baritoneStateClass(status) {
  // The whole status cell, not just its first word: rows accumulate phases
  // ("CLAIMED ...; CLOSED BY RECOVERY"), and the last word wins.
  const text = String(status || "").toLowerCase();
  if (/(^|[^a-z])(done|resting|closed|signed off)([^a-z]|$)/.test(text)) return "done";
  if (/(^|[^a-z])joining([^a-z]|$)/.test(text)) return "joining";
  if (/(^|[^a-z])blocked([^a-z]|$)/.test(text)) return "blocked";
  return "active";
}

function baritoneAgentState(agent, lastMs, nowMs) {
  const cls = baritoneStateClass(agent.status);
  if (cls === "done") return "done";
  if (cls === "joining") return "joining";
  if (cls === "blocked") return "blocked";
  if (lastMs !== null && nowMs - lastMs <= BARITONE_ACTIVE_WINDOW_MS) return "working";
  return "stalled";
}

function baritoneAgoDur(lastMs, nowMs) {
  const mins = Math.max(0, Math.floor((nowMs - lastMs) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function baritoneStateLabel(state, lastMs, nowMs) {
  if (state === "done") return "Done";
  if (state === "blocked") return "Blocked";
  if (state === "joining") {
    if (lastMs === null) return "Joining";
    const ago = baritoneAgoDur(lastMs, nowMs);
    return ago === "just now" ? "Joining · just now" : `Joining · ${ago} ago`;
  }
  if (lastMs === null) return "Stalled · no messages yet";
  const ago = baritoneAgoDur(lastMs, nowMs);
  if (state === "working")
    return ago === "just now" ? "Working · just now" : `Working · ${ago} ago`;
  return `Stalled · quiet ${ago}`;
}

function baritoneAgentVisible(agent, lastMs, nowMs) {
  if (baritoneAgentState(agent, lastMs, nowMs) !== "done") return true;
  return lastMs !== null && nowMs - lastMs <= BARITONE_DONE_HIDE_MS;
}

function baritoneStatusClass(status) {
  const normalized = String(status || "").toLowerCase();
  return normalized.split(/\s+/)[0].replace(/[^a-z-]/g, "") || "unknown";
}

function baritoneEmptyLine(text) {
  const empty = document.createElement("p");
  empty.className = "baritone-agent-empty";
  empty.textContent = text;
  return empty;
}

function renderBaritoneAgents(
  agents,
  lastSeen = new Map(),
  nowMs = Date.now(),
  commitCounts = null
) {
  const roster = $("[data-baritone-agent-roster]");
  if (!roster) return;
  const shown = agents.filter((agent) =>
    baritoneAgentVisible(agent, lastSeen.get(baritoneChatAuthorKey(agent.name)) ?? null, nowMs)
  );
  setText("[data-baritone-agent-total]", shown.length);
  const faces = $("[data-baritone-agent-faces]");
  if (faces) {
    faces.replaceChildren(...shown.slice(0, 4).map((agent) => baritoneAvatar(agent.name, 24)));
    faces.hidden = !shown.length;
  }
  if (!shown.length) {
    roster.replaceChildren(
      baritoneEmptyLine(
        agents.length
          ? "All agents have finished; nobody left on the roster."
          : "No active-agent table could be parsed from AGENTS.md."
      )
    );
    renderBaritoneSummary([]);
    return;
  }
  const states = shown.map((agent) =>
    baritoneAgentState(agent, lastSeen.get(baritoneChatAuthorKey(agent.name)) ?? null, nowMs)
  );
  renderBaritoneSummary(states);
  roster.replaceChildren(
    ...shown.map((agent, index) => {
      const card = document.createElement("article");
      const pic = document.createElement("span");
      const copy = document.createElement("div");
      const head = document.createElement("div");
      const name = document.createElement("strong");
      const badge = document.createElement("span");
      const state = document.createElement("div");
      const dot = document.createElement("i");
      const label = document.createElement("span");
      const task = document.createElement("p");
      const commits = document.createElement("div");
      const commitsLink = document.createElement("a");
      const statusClass = baritoneStatusClass(agent.status);
      const statusWord = agent.status.split(/\s+/)[0] || agent.status;
      card.className = "baritone-agent";
      pic.className = `baritone-agent-pic is-${statusClass}`;
      copy.className = "baritone-agent-copy";
      head.className = "baritone-agent-head";
      name.className = "baritone-agent-name";
      badge.className = `baritone-agent-status ${statusClass}`;
      state.className = `baritone-agent-state is-${states[index]}`;
      task.className = "baritone-agent-task";
      name.textContent = agent.name;
      name.title = agent.name;
      badge.textContent = statusWord;
      badge.title = agent.status;
      label.textContent = baritoneStateLabel(
        states[index],
        lastSeen.get(baritoneChatAuthorKey(agent.name)) ?? null,
        nowMs
      );
      task.textContent = agent.task || "No current task recorded.";
      task.title = agent.task || "";
      pic.append(baritoneAvatar(agent.name, 32));
      head.append(name, badge);
      state.append(dot, label);
      copy.append(head, state, task);
      if (commitCounts) {
        const commitTotal = commitCounts.get(agent.name) || 0;
        commits.className = "baritone-agent-commits";
        commitsLink.href = BARITONE_COMMITS_WEB_URL;
        commitsLink.target = "_blank";
        commitsLink.rel = "noreferrer";
        commitsLink.textContent = `${commitTotal} ${commitTotal === 1 ? "commit" : "commits"}`;
        commitsLink.title = `Commits on ${BARITONE_AGENTS_REF} signed ${agent.name} (newest ${BARITONE_COMMIT_PAGES * 100}), opens the branch history`;
        commits.append(commitsLink);
        copy.append(commits);
      }
      card.append(pic, copy);
      return card;
    })
  );
}

function renderBaritoneSummary(states) {
  const summary = $("[data-baritone-agent-summary]");
  if (!summary) return;
  if (!states.length) {
    summary.hidden = true;
    return;
  }
  const counts = { working: 0, stalled: 0, done: 0, joining: 0 };
  for (const state of states) counts[state === "blocked" ? "stalled" : state] += 1;
  const nodes = [];
  ["working", "stalled", "joining", "done"].forEach((key, i) => {
    if (key === "joining" && !counts.joining) return;
    if (i) nodes.push(" · ");
    const part = document.createElement("span");
    const dot = document.createElement("i");
    part.className = `is-${key}`;
    part.append(dot, `${counts[key]} ${key}`);
    nodes.push(part);
  });
  summary.replaceChildren(...nodes);
  summary.hidden = false;
}
function renderBaritoneChat(messages) {
  const log = $("[data-baritone-agent-chat]");
  if (!log) return;
  const wasAtBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 90;
  const rendered = messages.filter((entry) => entry.message);
  const visible = rendered.slice(-BARITONE_AGENT_MESSAGE_LIMIT);
  setText("[data-baritone-message-total]", rendered.length.toLocaleString());
  const nodes = [];
  if (visible.length) {
    const sys = document.createElement("div");
    const lead = document.createElement("span");
    const link = document.createElement("a");
    sys.className = "baritone-chat-sys";
    lead.textContent = "Older messages live in ";
    link.href = BARITONE_ARCHIVE_URL;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "AGENTS-archive.md";
    sys.append(lead, link);
    nodes.push(sys);
  }
  const instants = visible.map((entry) => baritoneInstantMs(entry.time));
  const showStamp = (index) => {
    if (index === 0) return true;
    const at = instants[index],
      before = instants[index - 1];
    if (at === null || before === null || at < before) return true;
    if (at - before >= BARITONE_STAMP_GAP_MS) return true;
    const day = new Date(at),
      prev = new Date(before);
    return (
      day.getFullYear() !== prev.getFullYear() ||
      day.getMonth() !== prev.getMonth() ||
      day.getDate() !== prev.getDate()
    );
  };
  visible.forEach((entry, index) => {
    if (showStamp(index)) {
      const stamp = document.createElement("div");
      stamp.className = "baritone-chat-stamp";
      stamp.textContent =
        instants[index] === null ? entry.time : baritoneStampLabel(instants[index]);
      stamp.title = entry.time;
      nodes.push(stamp);
    }
    const first = index === 0 || visible[index - 1].name !== entry.name || showStamp(index);
    const last =
      index === visible.length - 1 ||
      visible[index + 1].name !== entry.name ||
      showStamp(index + 1);
    nodes.push(baritoneBubble(entry, first, last));
  });
  if (!nodes.length) nodes.push(baritoneEmptyLine("No timestamped messages found in AGENTS.md."));
  log.replaceChildren(...nodes);
  if (!baritoneChatPinned || wasAtBottom) log.scrollTop = log.scrollHeight;
  baritoneChatPinned = true;
}

function baritoneBubble(entry, first, last) {
  const outgoing = entry.name.toLowerCase().includes("0xff");
  const card = document.createElement("article");
  const main = document.createElement("div");
  card.className = `baritone-chat-${outgoing ? "out" : "in"}${first ? " is-first" : ""}${last ? " is-last" : ""}`;
  main.className = "baritone-chat-main";
  if (!outgoing) {
    const face = document.createElement("span");
    face.className = "baritone-chat-face";
    if (last) face.append(baritoneAvatar(entry.name, 30));
    card.append(face);
    if (first) {
      const name = document.createElement("span");
      name.className = "baritone-chat-name";
      name.textContent = entry.name;
      main.append(name);
    }
  }
  if (first) {
    const metaText = [entry.status, entry.task].filter(Boolean).join(" · ");
    if (metaText) {
      const meta = document.createElement("div");
      meta.className = "baritone-chat-meta";
      meta.textContent = metaText;
      meta.title = metaText;
      main.append(meta);
    }
  }
  const bubble = document.createElement("div");
  bubble.className = "baritone-chat-bubble";
  bubble.textContent = entry.message;
  main.append(bubble);
  card.append(main);
  return card;
}
async function fetchBaritoneCommits() {
  const commits = [];
  for (let page = 1; page <= BARITONE_COMMIT_PAGES; page++) {
    const response = await fetch(`${BARITONE_COMMITS_URL}&page=${page}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`GitLab returned ${response.status}`);
    const batch = await response.json();
    if (!Array.isArray(batch) || !batch.length) break;
    commits.push(...batch);
    if (batch.length < 100) break;
  }
  return commits;
}

function baritoneAttributeCommit(commit, known) {
  // Every box pushes under the operator's identity, so authorship comes only
  // from self-declaration: an `Agent:` trailer, a `Name:` title prefix, a
  // `Name joins` title, or a `Sign Name off` title. The name must be on the
  // roster; bare mentions ("Curlew's row") stay unattributed.
  const trailer = String(commit.message || "")
    .match(/^Agent:\s*(.+)$/im)?.[1]
    ?.trim()
    .toLowerCase();
  if (trailer && known.has(trailer)) return known.get(trailer);
  const title = String(commit.title || "");
  const prefixed =
    title.match(/^([A-Za-z][A-Za-z-]*)\s*:/)?.[1] ||
    title.match(/^([A-Za-z][A-Za-z-]*)\s+joins\b/i)?.[1] ||
    title.match(/^sign\s+(.+?)\s+off\b/i)?.[1];
  const key = (prefixed || "").trim().toLowerCase();
  return key && known.has(key) ? known.get(key) : null;
}

function baritoneCommitStats(commits, agents) {
  const known = new Map(agents.map((agent) => [baritoneChatAuthorKey(agent.name), agent.name]));
  const counts = new Map(),
    seen = new Map();
  for (const commit of commits) {
    const author = baritoneAttributeCommit(commit, known);
    if (!author) continue;
    counts.set(author, (counts.get(author) || 0) + 1);
    const ms = Date.parse(commit.created_at || "");
    if (!Number.isNaN(ms)) {
      const key = baritoneChatAuthorKey(author);
      if (!seen.has(key) || ms > seen.get(key)) seen.set(key, ms);
    }
  }
  return { counts, seen };
}

function hashBaritoneSource(source) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function baritoneTimestamp() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function syncBaritoneAgents() {
  const live = $("[data-baritone-agent-live]");
  const liveLabel = $("[data-baritone-agent-live-label]");
  const updated = $("[data-baritone-agent-updated]");
  if (liveLabel && !baritoneAgentLoaded) liveLabel.textContent = "Fetching branch";
  try {
    const response = await fetch(BARITONE_AGENT_SOURCE, { headers: { Accept: "text/plain" } });
    if (!response.ok) throw new Error(`GitLab returned ${response.status}`);
    const source = await response.text();
    if (!source.includes("# Active Agents") || !source.includes("# Chat")) {
      throw new Error("AGENTS.md structure not recognized");
    }
    const hash = hashBaritoneSource(source);
    if (baritoneAgentLoaded && hash === baritoneAgentHash) {
      live?.classList.remove("is-error");
      if (liveLabel) liveLabel.textContent = "Live";
      return; // Unchanged: leave the DOM (and screen readers) alone.
    }
    baritoneAgentHash = hash;
    const agents = parseBaritoneAgents(source);
    const messages = parseBaritoneChat(source);
    let commitCounts = null;
    const lastSeen = baritoneLastSeen(messages);
    try {
      const stats = baritoneCommitStats(await fetchBaritoneCommits(), agents);
      commitCounts = stats.counts;
      for (const [key, ms] of stats.seen) {
        if (!lastSeen.has(key) || ms > lastSeen.get(key)) lastSeen.set(key, ms);
      }
    } catch {
      // Commits are a bonus signal: a failed fetch leaves the roster and its
      // chat-derived states intact, and the next poll retries.
    }
    renderBaritoneAgents(agents, lastSeen, Date.now(), commitCounts);
    renderBaritoneChat(messages);
    baritoneAgentLoaded = true;
    live?.classList.remove("is-error");
    if (liveLabel) liveLabel.textContent = "Live";
    if (updated) updated.textContent = `Updated ${baritoneTimestamp()}`;
  } catch (error) {
    live?.classList.add("is-error");
    if (liveLabel) liveLabel.textContent = "GitLab unavailable";
    if (updated)
      updated.textContent = baritoneAgentLoaded
        ? "Showing last update · retrying"
        : "Retrying automatically";
    if (!baritoneAgentLoaded) {
      const roster = $("[data-baritone-agent-roster]");
      if (roster)
        roster.replaceChildren(
          baritoneEmptyLine("Could not load AGENTS.md from GitLab. Retrying automatically.")
        );
      const log = $("[data-baritone-agent-chat]");
      if (log && !log.hasChildNodes())
        log.replaceChildren(baritoneEmptyLine("Chat will appear here once GitLab responds."));
    }
  }
}

if ((page === "project" && document.body.dataset.project === "baritone") || page === "dashboard") {
  if (lowPowerMode) {
    setText("[data-baritone-agent-live-label]", "Paused");
    setText("[data-baritone-agent-updated]", "Low-power mode");
    const roster = $("[data-baritone-agent-roster]");
    if (roster) {
      roster.replaceChildren(
        baritoneEmptyLine(
          "Live updates are paused in low-power mode. Open AGENTS.md on GitLab for the current roster."
        )
      );
    }
  } else {
    addLiveTask(syncBaritoneAgents());
    setInterval(() => {
      if (!document.hidden) syncBaritoneAgents();
    }, BARITONE_AGENT_POLL_MS);
  }
}

if (lowPowerMode) {
  setText("[data-sync-text]", "Low-power mode · live updates paused");
} else if (liveTasks.length) {
  Promise.allSettled(liveTasks).then((results) => {
    const done = results.filter((result) => result.status === "fulfilled").length;
    setText(
      "[data-sync-text]",
      done === results.length
        ? "GitLab data synced live"
        : `GitLab data synced (${done}/${results.length})`
    );
  });
} else if (tasks.length) {
  Promise.allSettled(tasks).then(() => setText("[data-sync-text]", "Checked-in public content"));
} else if (page === "member") {
  setText("[data-sync-text]", "Profile activity loads separately");
} else {
  setText("[data-sync-text]", "Static content · no live sync needed");
}

/* ---- GitHub return announcement banner (auto-hide after 2026-11-05) ---- */
(function () {
  const BANNER_END = new Date("2026-11-05T00:00:00Z").getTime();
  const DISMISSED_KEY = "idi-github-banner-dismissed-v2";
  const banner = document.getElementById("github-return-banner");
  if (!banner) return;

  function hideBanner() {
    banner.hidden = true;
  }

  if (Date.now() >= BANNER_END) {
    hideBanner();
    return;
  }
  if (localStorage.getItem(DISMISSED_KEY) === "1") {
    hideBanner();
    return;
  }

  banner.hidden = false;

  const dismissBtn = banner.querySelector("[data-dismiss-banner]");
  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      localStorage.setItem(DISMISSED_KEY, "1");
      hideBanner();
    });
  }
})();
