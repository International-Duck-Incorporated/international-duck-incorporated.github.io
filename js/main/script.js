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
  { name: "AbortBreaking", category: "movement" },
  { name: "AutoJumpReset", category: "movement" },
  { name: "AutoSprint", category: "movement" },
  { name: "AutoWalk", category: "movement" },
  { name: "BunnyHop", category: "movement" },
  { name: "ElytraBoost", category: "movement" },
  { name: "FastClimb", category: "movement" },
  { name: "FastSwim", category: "movement" },
  { name: "Fly", category: "movement" },
  { name: "Gravity", category: "movement" },
  { name: "HighJump", category: "movement" },
  { name: "Jesus", category: "movement" },
  { name: "LongJump", category: "movement" },
  { name: "NoFall", category: "movement" },
  { name: "NoSlow", category: "movement" },
  { name: "Phase", category: "movement" },
  { name: "SafeWalk", category: "movement" },
  { name: "Scaffold", category: "movement" },
  { name: "Speed", category: "movement" },
  { name: "Step", category: "movement" },
  { name: "Timer", category: "movement" },
  { name: "VNoFall", category: "movement" },
  { name: "VSafeWalk", category: "movement" },
  { name: "VSpider", category: "movement" },
  { name: "AutoEat", category: "player" },
  { name: "AutoTool", category: "player" },
  { name: "ChestStealer", category: "player" },
  { name: "InventoryManager", category: "player" },
  { name: "MiddleClickPearl", category: "player" },
  { name: "VInventoryManager", category: "player" },
  { name: "AutoCrystal", category: "combat" },
  { name: "AutoGap", category: "player" },
  { name: "AutoTotem", category: "player" },
  { name: "AutoArmor", category: "player" },
  { name: "Aura", category: "combat" },
  { name: "AutoAnchor", category: "combat" },
  { name: "AutoMace", category: "combat" },
  { name: "AutoSword", category: "combat" },
  { name: "AutoWeapon", category: "combat" },
  { name: "BlockOverlap", category: "combat" },
  { name: "BreakSpeed", category: "movement" },
  { name: "CriticalPower", category: "combat" },
  { name: "ExplosionTP", category: "movement" },
  { name: "FastBreak", category: "movement" },
  { name: "FastPlace", category: "movement" },
  { name: "MultiTask", category: "player" },
  { name: "OffhandSwap", category: "player" },
  { name: "PearlThrow", category: "movement" },
  { name: "Reach", category: "combat" },
  { name: "SwapDelay", category: "player" },
  { name: "SwitchMode", category: "player" },
  { name: "Tap", category: "movement" },
  { name: "TriggerBot", category: "combat" },
  { name: "VAutoAnchor", category: "combat" },
  { name: "VAutoCrystal", category: "combat" },
  { name: "VBreakSpeed", category: "movement" },
  { name: "VFastBreak", category: "movement" },
  { name: "VFastPlace", category: "movement" },
  { name: "VOffhandSwap", category: "player" },
  { name: "VPearlThrow", category: "movement" },
  { name: "VReach", category: "combat" },
  { name: "VSwapDelay", category: "player" },
  { name: "VTap", category: "movement" },
  { name: "VTriggerBot", category: "combat" },
  { name: "AutoFish", category: "player" },
  { name: "AutoReconnect", category: "player" },
  { name: "AutoRespawn", category: "player" },
  { name: "Blink", category: "movement" },
  { name: "Freecam", category: "movement" },
  { name: "Killaura", category: "combat" },
  { name: "MobAura", category: "combat" },
  { name: "NoHitDelay", category: "combat" },
  { name: "NoSwing", category: "combat" },
  { name: "RapidBreak", category: "movement" },
  { name: "Rotation", category: "combat" },
  { name: "Sneak", category: "movement" },
  { name: "VBlink", category: "movement" },
  { name: "VFreecam", category: "movement" },
  { name: "VKillaura", category: "combat" },
  { name: "VMobAura", category: "combat" },
  { name: "VNoHitDelay", category: "combat" },
  { name: "VNoSwing", category: "combat" },
  { name: "VRapidBreak", category: "movement" },
  { name: "VRotation", category: "combat" },
  { name: "VSneak", category: "movement" },
  { name: "ChatSuffix", category: "chat" },
  { name: "ClearChat", category: "chat" },
  { name: "MentionNotify", category: "chat" },
  { name: "VChatSuffix", category: "chat" },
  { name: "VClearChat", category: "chat" },
  { name: "VMentionNotify", category: "chat" },
  { name: "AntiBlind", category: "player" },
  { name: "AntiFire", category: "player" },
  { name: "AntiHunger", category: "player" },
  { name: "AntiKnockback", category: "player" },
  { name: "AntiPotion", category: "player" },
  { name: "AutoArmor", category: "player" },
  { name: "AutoEat", category: "player" },
  { name: "AutoGap", category: "player" },
  { name: "AutoHeal", category: "player" },
  { name: "AutoSprint", category: "movement" },
  { name: "AutoTotem", category: "player" },
  { name: "AutoWalk", category: "movement" },
  { name: "BedNuker", category: "world" },
  { name: "BlockESP", category: "visual" },
  { name: "ChestESP", category: "visual" },
  { name: "EntityESP", category: "visual" },
  { name: "HoleESP", category: "visual" },
  { name: "PlayerESP", category: "visual" },
  { name: "StorageESP", category: "visual" },
  { name: "Tracer", category: "visual" },
  { name: "VBlockESP", category: "visual" },
  { name: "VChestESP", category: "visual" },
  { name: "VEntityESP", category: "visual" },
  { name: "VHoleESP", category: "visual" },
  { name: "VPlayerESP", category: "visual" },
  { name: "VStorageESP", category: "visual" },
  { name: "VTracer", category: "visual" },
  { name: "AutoConfig", category: "utility" },
  { name: "AutoGG", category: "utility" },
  { name: "AutoLog", category: "utility" },
  { name: "AutoReconnect", category: "player" },
  { name: "AutoRespawn", category: "player" },
  { name: "AutoTip", category: "utility" },
  { name: "AutoTrade", category: "utility" },
  { name: "Command", category: "utility" },
  { name: "ConfigManager", category: "utility" },
  { name: "Crasher", category: "utility" },
  { name: "Disabler", category: "utility" },
  { name: "FakePlayer", category: "utility" },
  { name: "GodMode", category: "player" },
  { name: "InventoryCleaner", category: "utility" },
  { name: "KeepSprint", category: "movement" },
  { name: "Middleware", category: "utility" },
  { name: "NameProtect", category: "utility" },
  { name: "PacketLogger", category: "utility" },
  { name: "PingSpoof", category: "utility" },
  { name: "ResourcePackManager", category: "utility" },
  { name: "Scheduler", category: "utility" },
  { name: "SelfDestruct", category: "utility" },
  { name: "SessionInfo", category: "utility" },
  { name: "Spammer", category: "chat" },
  { name: "StaffAlert", category: "detection" },
  { name: "VAutoConfig", category: "utility" },
  { name: "VAutoGG", category: "utility" },
  { name: "VAutoLog", category: "utility" },
  { name: "VAutoTip", category: "utility" },
  { name: "VCommand", category: "utility" },
  { name: "VConfigManager", category: "utility" },
  { name: "VCrasher", category: "utility" },
  { name: "VFakePlayer", category: "utility" },
  { name: "VGodMode", category: "player" },
  { name: "VInventoryCleaner", category: "utility" },
  { name: "VKeepSprint", category: "movement" },
  { name: "VMiddleware", category: "utility" },
  { name: "VNameProtect", category: "utility" },
  { name: "VPacketLogger", category: "utility" },
  { name: "VPingSpoof", category: "utility" },
  { name: "VResourcePackManager", category: "utility" },
  { name: "VScheduler", category: "utility" },
  { name: "VSelfDestruct", category: "utility" },
  { name: "VSessionInfo", category: "utility" },
  { name: "VSpammer", category: "chat" },
  { name: "VStaffAlert", category: "detection" },
];
const moduleCategories = Object.freeze({
  combat: "Combat",
  movement: "Movement",
  player: "Player",
  visual: "Visual",
  chat: "Chat",
  detection: "Detection",
  world: "World",
  utility: "Utility",
});
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
    status: "Release",
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
    status: "Public beta",
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
    logo: "/assets/glyphsmith-icon.webp?v=3b98e8c4",
    status: "Active",
    action: "Open project",
  },
};

function $ (sel, root = document) {
  return root.querySelector(sel);
}

function $$ (sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function setText (sel, text, root = document) {
  const el = $(sel, root);
  if (el) el.textContent = text;
}

function setHTML (sel, html, root = document) {
  const el = $(sel, root);
  if (el) el.innerHTML = html;
}

function formatRelativeTime (date) {
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

function formatTimestamp (iso) {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return time;
  const day = date.toLocaleDateString([], { month: "short", day: "numeric" });
  return `${day} ${time}`;
}

const page = document.body.dataset.page;
const lowPowerMode = document.documentElement.classList.contains("low-end") ||
  (typeof navigator !== "undefined" && navigator.connection &&
   (navigator.connection.saveData || navigator.connection.effectiveType === "slow-2g" || navigator.connection.effectiveType === "2g"));

const tasks = [];
const liveTasks = [];

function addLiveTask (promise) {
  liveTasks.push(promise);
}

/* ---- IntersectionObserver for reveal animations ---- */
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -50px 0px", threshold: 0.1 });
  $$(".reveal").forEach((el) => revealObserver.observe(el));
}

/* ---- Topbar scroll state ---- */
const topbar = document.querySelector(".topbar");
if (topbar) {
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (y > 8) topbar.classList.add("scrolled");
    else topbar.classList.remove("scrolled");
    if (y > lastY + 20 && y > 100) topbar.classList.add("hidden");
    else if (y < lastY - 20) topbar.classList.remove("hidden");
    lastY = y;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---- Mobile navigation ---- */
const menuBtn = $("[data-menu]");
const nav = $("#main-navigation");
if (menuBtn && nav) {
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  $$("a", nav).forEach((a) => a.addEventListener("click", () => {
    nav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
  }));
}

/* ---- Live GitLab data sync ---- */
async function syncOrgProfile () {
  try {
    const [orgRes, projectsRes] = await Promise.all([
      fetch(`${GL_GROUP_API}?statistics=true`),
      fetch(`${GL_GROUP_API}/projects?per_page=100&order_by=last_activity_at&sort=desc&statistics=true`)
    ]);
    if (!orgRes.ok || !projectsRes.ok) throw new Error("GitLab API error");
    const org = await orgRes.json();
    const projects = await projectsRes.json();
    const avatar = $("#org-avatar");
    if (avatar && org.avatar_url) avatar.src = org.avatar_url;
    const name = $("#org-name");
    if (name) name.textContent = org.name || "International Duck Incorporated";
    const desc = $("#org-description");
    if (desc && org.description) desc.textContent = org.description;
    const visibility = $("#org-visibility");
    if (visibility) {
      const badge = visibility.querySelector(".status-pill");
      if (badge) {
        badge.className = "status-pill " + (org.visibility === "public" ? "green" : org.visibility === "private" ? "red" : "amber");
        badge.querySelector("i").style.background = org.visibility === "public" ? "#8cf77a" : org.visibility === "private" ? "#ff6b6b" : "#f2c45a";
        badge.querySelector("span").textContent = org.visibility.charAt(0).toUpperCase() + org.visibility.slice(1);
      }
    }
    const stats = $("#org-stats");
    if (stats) {
      const storage = org.statistics?.storage_size || 0;
      const storageMB = (storage / 1024 / 1024).toFixed(1);
      stats.innerHTML = `
        <span><i></i> ${org.projects_count || 0} projects</span>
        <span><i></i> ${org.members_count || 0} members</span>
        <span><i></i> ${storageMB} MB storage</span>
      `;
    }
    const roster = $("#org-roster");
    if (roster) {
      const membersRes = await fetch(`${GL_GROUP_API}/members?per_page=100`);
      if (membersRes.ok) {
        const members = await membersRes.json();
        roster.innerHTML = members.slice(0, 12).map((m) => `
          <a class="person-card" href="/members/${m.username}" aria-label="${m.name || m.username}">
            <img src="${m.avatar_url || '/assets/org-avatar.webp?v=fff479ce'}" alt="" width="40" height="40" loading="lazy" decoding="async" />
            <span>${m.name || m.username}</span>
          </a>
        `).join("");
      }
    }
  } catch (e) {
    console.warn("Org profile sync failed:", e);
  }
}

async function syncMembers () {
  try {
    const res = await fetch(`${GL_GROUP_API}/members?per_page=100`);
    if (!res.ok) throw new Error("GitLab API error");
    const members = await res.json();
    const grid = $(".members-grid");
    if (!grid) return;
    grid.innerHTML = members.map((m) => `
      <a class="person-card" href="/members/${m.username}">
        <img src="${m.avatar_url || '/assets/org-avatar.webp?v=fff479ce'}" alt="" width="56" height="56" loading="lazy" decoding="async" />
        <div>
          <b>${m.name || m.username}</b>
          <small>@${m.username}</small>
        </div>
        <span class="status-pill ${m.state === "active" ? "green" : "amber"}"><i></i>${m.state}</span>
      </a>
    `).join("");
  } catch (e) {
    console.warn("Members sync failed:", e);
  }
}

async function syncProjects () {
  try {
    const res = await fetch(`${GL_GROUP_API}/projects?per_page=100&order_by=last_activity_at&sort=desc&statistics=true`);
    if (!res.ok) throw new Error("GitLab API error");
    const projects = await res.json();
    const grid = $(".projects-grid");
    if (!grid) return;
    grid.innerHTML = projects.slice(0, 12).map((p) => {
      const meta = projectMeta[p.name] || {};
      return `
        <article class="project-card glass-card reveal">
          ${meta.logo ? `<img class="project-icon" src="${meta.logo}" alt="" width="32" height="32" loading="lazy" decoding="async" />` : ""}
          <div>
            <h3>${p.name}</h3>
            <p>${p.description || "No description"}</p>
          </div>
          <span class="status-pill ${p.archived ? "amber" : "green"}"><i></i>${p.archived ? "Archived" : "Active"}</span>
        </article>
      `;
    }).join("");
  } catch (e) {
    console.warn("Projects sync failed:", e);
  }
}

async function syncNoosphere () {
  try {
    const res = await fetch(`${GL_SITE_PROJECT}/repository/files/data%2Fnoosphere.json/raw?ref=main`);
    if (!res.ok) throw new Error("GitLab API error");
    const data = await res.json();
    const container = $("#noosphere-data");
    if (!container) return;
    container.innerHTML = Object.entries(data).map(([key, value]) => `
      <div class="noosphere-entry">
        <code>${key}</code>
        <span>${typeof value === "object" ? JSON.stringify(value) : value}</span>
      </div>
    `).join("");
  } catch (e) {
    console.warn("Noosphere sync failed:", e);
  }
}

async function syncMemberProjectPage () {
  const member = document.body.dataset.member;
  const project = document.body.dataset.project;
  if (!member || !project) return;
  try {
    const res = await fetch(`${GL_GROUP_API}/projects?search=${project}&per_page=1`);
    if (!res.ok) throw new Error("GitLab API error");
    const projects = await res.json();
    if (projects.length === 0) return;
    const projectData = projects[0];
    const container = $(`[data-project="${project}"]`);
    if (!container) return;
    container.innerHTML = `
      <h3>${projectData.name}</h3>
      <p>${projectData.description || "No description"}</p>
      <a href="${projectData.web_url}" target="_blank" rel="noreferrer" class="button button-glass">View on GitLab</a>
    `;
  } catch (e) {
    console.warn("Member project sync failed:", e);
  }
}

const BARITONE_AGENT_SOURCE = "https://gitlab.com/international-duck-incorporated/Baritone/-/raw/main/AGENTS.md";
const BARITONE_AGENT_POLL_MS = 5 * 60 * 1000;
let baritoneAgentHash = "";
let baritoneAgentLoaded = false;

function hashBaritoneSource (source) {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

function parseBaritoneAgents (source) {
  const agents = [];
  const lines = source.split("\n");
  let inActive = false;
  for (const line of lines) {
    if (line.trim() === "# Active Agents") { inActive = true; continue; }
    if (line.trim().startsWith("#") && inActive) break;
    if (!inActive) continue;
    const match = line.match(/^-\s+(\S+)\s+\((.+)\)/);
    if (match) agents.push({ name: match[1], role: match[2] });
  }
  return agents;
}

function parseBaritoneChat (source) {
  const messages = [];
  const lines = source.split("\n");
  let inChat = false;
  for (const line of lines) {
    if (line.trim() === "# Chat") { inChat = true; continue; }
    if (!inChat) continue;
    const match = line.match(/^-\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(\S+):\s*(.+)/);
    if (match) messages.push({ time: match[1], author: match[2], text: match[3] });
  }
  return messages.slice(-50);
}

function baritoneLastSeen (messages) {
  const seen = new Map();
  for (const msg of messages) {
    const ms = new Date(msg.time).getTime();
    if (!seen.has(msg.author) || ms > seen.get(msg.author)) seen.set(msg.author, ms);
  }
  return seen;
}

async function fetchBaritoneCommits () {
  const res = await fetch(`${GL_BARITONE_PROJECT}/repository/commits?per_page=100`);
  if (!res.ok) throw new Error("GitLab API error");
  return res.json();
}

function baritoneCommitStats (commits, agents) {
  const counts = new Map();
  const seen = new Map();
  for (const c of commits) {
    const author = c.author_name || c.committer_name;
    if (author && agents.some(a => a.name === author)) {
      counts.set(author, (counts.get(author) || 0) + 1);
      const ms = new Date(c.created_at).getTime();
      if (!seen.has(author) || ms > seen.get(author)) seen.set(author, ms);
    }
  }
  return { counts, seen };
}

function renderBaritoneAgents (agents, lastSeen, now, commitCounts) {
  const roster = $("[data-baritone-agent-roster]");
  if (!roster) return;
  roster.innerHTML = agents.map((a) => {
    const seen = lastSeen.get(a.name);
    const age = seen ? now - seen : null;
    const commits = commitCounts?.get(a.name) || 0;
    return `
      <div class="baritone-agent">
        <b>${a.name}</b>
        <span>${a.role}</span>
        <small>${age ? formatRelativeTime(new Date(seen)) : "never"} ${commits ? `· ${commits} commits` : ""}</small>
      </div>
    `;
  }).join("");
}

function renderBaritoneChat (messages) {
  const log = $("[data-baritone-agent-chat]");
  if (!log) return;
  log.innerHTML = messages.slice(-20).map((m) => `
    <div class="baritone-chat-msg">
      <time>${formatTimestamp(m.time)}</time>
      <b>${m.author}:</b>
      <span>${m.text}</span>
    </div>
  `).join("");
  log.scrollTop = log.scrollHeight;
}

function baritoneTimestamp () {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

/* ---- Page-specific live sync tasks ---- */
if (page === "organization") {
  tasks.push(syncOrgProfile());
}
if (page === "noosphere" && !lowPowerMode) addLiveTask(syncNoosphere());
if (page === "members") tasks.push(syncMembers());
if (page === "projects" && !lowPowerMode) addLiveTask(syncProjects());
if (page === "projects" && lowPowerMode) {
  setText("[data-projects-low-power]", "Live project list paused in low-power mode");
}
if (!lowPowerMode && page === "project" && document.body.dataset.project === "nulltrace") {
  tasks.push(syncOrgProfile());
}
if (!lowPowerMode && page === "project" && document.body.dataset.project === "beacon") {
  tasks.push(syncOrgProfile());
}
if (!lowPowerMode && page === "project" && document.body.dataset.project === "championscode") {
  tasks.push(syncOrgProfile());
}
if (!lowPowerMode && page === "member" && document.body.dataset.member === MEMBER_LOGIN) {
  addLiveTask(syncMemberProjectPage());
}
if (!lowPowerMode && page === "member-project") addLiveTask(syncMemberProjectPage());
if (page === "venomous") {
  tasks.push(syncOrgProfile());
}

if ((page === "project" && document.body.dataset.project === "baritone") || page === "dashboard") {
  if (lowPowerMode) {
    setText("[data-baritone-agent-live-label]", "Paused");
    setText("[data-baritone-agent-updated]", "Low-power mode");
    const roster = $("[data-baritone-agent-roster]");
    if (roster) {
      roster.replaceChildren(
        "Live updates are paused in low-power mode. Open AGENTS.md on GitLab for the current roster."
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