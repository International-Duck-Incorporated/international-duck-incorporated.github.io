const ORG = "International-Duck-Incorporated";
const REPO = "Venomous";
const API = "https://api.github.com";
const RAW = "https://raw.githubusercontent.com";

const fallbackModules = [{"name":"AntiVoid","category":"utility"},{"name":"AutoBreakSelected","category":"utility"},{"name":"AutoToolPlus","category":"utility"},{"name":"ArmorWarning","category":"utility"},{"name":"LagNotifier","category":"utility"},{"name":"PearlTools","category":"utility"},{"name":"ProphuntESP","category":"utility"},{"name":"SafeLogout","category":"utility"},{"name":"SoundESP","category":"utility"},{"name":"TNTTimer","category":"utility"},{"name":"TrueSight","category":"utility"},{"name":"VAntiBot","category":"utility"},{"name":"AutoChatGame","category":"utility"},{"name":"AutoPearl","category":"utility"},{"name":"VBookBot","category":"utility"},{"name":"VCoordSnapper","category":"utility"},{"name":"VHideScoreboard","category":"utility"},{"name":"VNameProtect","category":"utility"},{"name":"VNoBlockInteract","category":"utility"},{"name":"VNotifier","category":"utility"},{"name":"VPacketLogger","category":"utility"},{"name":"Chat","category":"utility"},{"name":"Spammer","category":"utility"},{"name":"TargetLock","category":"utility"},{"name":"Teams","category":"utility"},{"name":"TextFieldProtect","category":"utility"},{"name":"NoFallPlus","category":"utility"},{"name":"AssertDominance","category":"movement"},{"name":"VBoatPhase","category":"movement"},{"name":"Clip","category":"movement"},{"name":"Fly","category":"movement"},{"name":"Phase","category":"movement"},{"name":"VRoboWalk","category":"movement"},{"name":"AntiBounce","category":"movement"},{"name":"VBlink","category":"movement"},{"name":"NoPush","category":"movement"},{"name":"SnapTap","category":"movement"},{"name":"Speed","category":"movement"},{"name":"VelocityPlus","category":"combat"},{"name":"VBungeeCordSpoof","category":"exploit"},{"name":"VChorusExploit","category":"exploit"},{"name":"PingSpoof","category":"exploit"},{"name":"VPortalGodMode","category":"exploit"},{"name":"AbortBreaking","category":"exploit"},{"name":"VAntiHunger","category":"exploit"},{"name":"AntiReducedDebugInfo","category":"exploit"},{"name":"ClickTp","category":"exploit"},{"name":"LbClip","category":"exploit"},{"name":"Damage","category":"exploit"},{"name":"Disabler","category":"exploit"},{"name":"Dupe","category":"exploit"},{"name":"ExtendedFirework","category":"exploit"},{"name":"VGhostHand","category":"exploit"},{"name":"Kick","category":"exploit"},{"name":"MoreCarry","category":"exploit"},{"name":"NameCollector","category":"exploit"},{"name":"NoPitchLimit","category":"exploit"},{"name":"PortalMenu","category":"exploit"},{"name":"ResetVL","category":"exploit"},{"name":"SleepWalker","category":"exploit"},{"name":"TimeShift","category":"exploit"},{"name":"VVehicleOneHit","category":"exploit"},{"name":"AntiCheatDetect","category":"detection"},{"name":"AntiStaff","category":"detection"},{"name":"VAntiVanish","category":"detection"},{"name":"SpectatorAlert","category":"detection"},{"name":"VPlayerDetection","category":"detection"},{"name":"AntiProjectile","category":"combat"},{"name":"AutoPotion","category":"combat"},{"name":"AutoShield","category":"combat"},{"name":"Hunt","category":"combat"},{"name":"VShieldBypass","category":"combat"},{"name":"Aimbot","category":"combat"},{"name":"VAnchorMacro","category":"combat"},{"name":"VAntiTrap","category":"combat"},{"name":"VAutoInvTotem","category":"combat"},{"name":"VBreachSwap","category":"combat"},{"name":"CrystalPvP","category":"combat"},{"name":"VKeyPearl","category":"combat"},{"name":"VShieldBreaker","category":"combat"},{"name":"VSwordPlaceObsidian","category":"combat"},{"name":"VWindPearlMacro","category":"combat"},{"name":"VMaceKill","category":"combat"},{"name":"SwordBlock","category":"combat"},{"name":"SuperKnockback","category":"combat"},{"name":"TickBase","category":"combat"},{"name":"TimerRange","category":"combat"},{"name":"TpAura","category":"combat"},{"name":"VKillAura","category":"combat"},{"name":"ProjectilePuncher","category":"combat"},{"name":"CriticalsPlus","category":"combat"},{"name":"AutoClickerPlus","category":"combat"},{"name":"MaceKill","category":"combat"},{"name":"TargetObsidian","category":"combat"},{"name":"VInvisESP","category":"visual"},{"name":"VLightESP","category":"visual"},{"name":"VSkeletonESP","category":"visual"},{"name":"AntiBlind","category":"visual"},{"name":"VNewChunks","category":"visual"},{"name":"DankBobbing","category":"utility"},{"name":"Derp","category":"utility"},{"name":"Twerk","category":"utility"},{"name":"Vomit","category":"utility"},{"name":"Scaffold","category":"utility"},{"name":"VAutoFarm","category":"utility"},{"name":"TimerPlus","category":"utility"},{"name":"GlobalNetworkInterceptor","category":"utility"},{"name":"ItemOrganizer","category":"utility"},{"name":"NoSignScreen","category":"utility"},{"name":"VChoir","category":"utility"},{"name":"FarmlandTremble","category":"utility"}];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

async function getJSON(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`${response.status} at ${url}`);
  return response.json();
}

function setText(selector, value) {
  $$(selector).forEach((node) => { node.textContent = value; });
}

function shortVersion(tag = "v7.0.0") {
  return tag.replace(/^v/i, "");
}

function fileSize(bytes) {
  if (!bytes) return "JAR";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function fullDate(value) {
  if (!value) return "Latest release";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function relativeDate(value) {
  if (!value) return "recently";
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size || unit === "minute") return formatter.format(Math.round(seconds / size), unit);
  }
  return "recently";
}

// Navigation and motion
const header = $("[data-header]");
const menu = $("[data-menu]");
const nav = $("[data-nav]");
const updateHeader = () => header?.classList.toggle("scrolled", scrollY > 20);
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
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  }), { threshold: .1, rootMargin: "0px 0px -35px" });
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

// Live module index from the repository source
let modules = fallbackModules.slice().sort((a, b) => a.name.localeCompare(b.name));
let activeCategory = "all";
let searchTerm = "";
let showEverything = false;
const moduleGrid = $("[data-module-grid]");
const showAllButton = $("[data-show-all]");

function moduleCounts() {
  return modules.reduce((counts, module) => {
    counts[module.category] = (counts[module.category] || 0) + 1;
    return counts;
  }, {});
}

function updateModuleCounts() {
  const counts = moduleCounts();
  setText("[data-module-total]", modules.length);
  $$('[data-category-count]').forEach((node) => { node.textContent = counts[node.dataset.categoryCount] || 0; });
  $$('[data-filter]').forEach((button) => {
    const count = button.dataset.filter === "all" ? modules.length : counts[button.dataset.filter] || 0;
    const badge = $("b", button);
    if (badge) badge.textContent = count;
  });
}

function renderModules() {
  if (!moduleGrid) return;
  const filtered = modules.filter((module) => {
    const categoryMatch = activeCategory === "all" || module.category === activeCategory;
    return categoryMatch && module.name.toLowerCase().includes(searchTerm);
  });
  const shouldLimit = !showEverything && !searchTerm && filtered.length > 24;
  const visible = shouldLimit ? filtered.slice(0, 24) : filtered;
  moduleGrid.replaceChildren(...visible.map((module, index) => {
    const item = document.createElement("span");
    const label = document.createElement("small");
    item.append(document.createTextNode(module.name), label);
    label.textContent = module.category;
    item.style.animationDelay = `${Math.min(index * 12, 180)}ms`;
    return item;
  }));
  $("[data-results-label]").textContent = activeCategory === "all" ? "All modules" : `${activeCategory} modules`;
  $("[data-results-count]").textContent = shouldLimit ? `${filtered.length} results · showing ${visible.length}` : `${filtered.length} ${filtered.length === 1 ? "result" : "results"}`;
  $("[data-empty]").hidden = filtered.length !== 0;
  showAllButton.hidden = !shouldLimit;
  showAllButton.textContent = "";
  if (shouldLimit) {
    showAllButton.append(document.createTextNode(`Show all ${filtered.length} modules `));
    showAllButton.insertAdjacentHTML("beforeend", icon("i-arrow"));
  }
}

$$("[data-filter]").forEach((button) => button.addEventListener("click", () => {
  activeCategory = button.dataset.filter;
  showEverything = false;
  $$('[data-filter]').forEach((item) => item.classList.toggle("active", item === button));
  renderModules();
}));
$("[data-module-search]")?.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderModules();
});
showAllButton?.addEventListener("click", () => { showEverything = true; renderModules(); });
updateModuleCounts();
renderModules();

function parseRegistry(source) {
  const imports = {};
  const importPattern = /import net\.venomous\.meteoraddon\.modules\.(\w+)\.(\w+);/g;
  const addPattern = /Modules\.get\(\)\.add\(new (\w+)\(\)\)/g;
  let match;
  while ((match = importPattern.exec(source))) imports[match[2]] = match[1];
  const grouped = (folder) => ({ combat: "combat", exploit: "exploit", movement: "movement", detection: "detection", esp: "visual", render: "visual" })[folder] || "utility";
  const result = [];
  while ((match = addPattern.exec(source))) result.push({ name: match[1], category: grouped(imports[match[1]]) });
  return result;
}

async function syncModules() {
  const url = `${RAW}/${ORG}/${REPO}/main/src/main/java/net/venomous/meteoraddon/modules/ModuleRegistry.java`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("Module source unavailable");
  const parsed = parseRegistry(await response.text());
  if (!parsed.length) throw new Error("No modules found");
  modules = parsed.sort((a, b) => a.name.localeCompare(b.name));
  updateModuleCounts();
  renderModules();
  $("[data-module-source]").textContent = "Live from ModuleRegistry.java";
}

// GitHub organization and repository metadata
async function syncOrganization() {
  const org = await getJSON(`${API}/orgs/${ORG}`);
  $$('[data-org-avatar]').forEach((image) => {
    image.onerror = () => { image.onerror = null; image.src = "assets/org-avatar.png"; };
    image.src = `${org.avatar_url}&size=160`;
  });
  setText("[data-repo-count]", org.public_repos);
}

async function syncRepository() {
  const repo = await getJSON(`${API}/repos/${ORG}/${REPO}`);
  setText("[data-stars]", repo.stargazers_count.toLocaleString());
  setText("[data-forks]", repo.forks_count.toLocaleString());
  setText("[data-language]", repo.language || "Code");
  setText("[data-last-push]", relativeDate(repo.pushed_at));
}

async function syncReleases() {
  const releases = await getJSON(`${API}/repos/${ORG}/${REPO}/releases?per_page=20`);
  const stable = releases.find((release) => !release.draft && !release.prerelease && release.tag_name !== "nightly");
  const nightly = releases.find((release) => release.tag_name === "nightly" || release.prerelease);
  if (stable) {
    const asset = stable.assets?.find((item) => item.name.toLowerCase().endsWith(".jar"));
    setText("[data-release-version]", stable.tag_name);
    setText("[data-release-short]", shortVersion(stable.tag_name));
    setText("[data-stable-date]", fullDate(stable.published_at));
    setText("[data-stable-size]", fileSize(asset?.size));
    if (asset) $$('[data-stable-download]').forEach((link) => { link.href = asset.browser_download_url; });
  }
  if (nightly) {
    const asset = nightly.assets?.find((item) => item.name.toLowerCase().endsWith(".jar"));
    setText("[data-nightly-version]", asset?.name?.replace(/\.jar$/i, "") || nightly.name || "Latest main");
    setText("[data-nightly-date]", fullDate(nightly.published_at));
    setText("[data-nightly-size]", fileSize(asset?.size));
    if (asset) $$('[data-nightly-download]').forEach((link) => { link.href = asset.browser_download_url; });
  }
}

async function syncCommits() {
  const commits = await getJSON(`${API}/repos/${ORG}/${REPO}/commits?per_page=5`);
  const list = $("[data-commits]");
  list.replaceChildren(...commits.map((item) => {
    const link = document.createElement("a");
    const dot = document.createElement("i");
    const text = document.createElement("span");
    const title = document.createElement("b");
    const meta = document.createElement("small");
    const hash = document.createElement("code");
    link.href = item.html_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    title.textContent = item.commit.message.split("\n")[0];
    meta.textContent = `${item.author?.login || item.commit.author.name} · ${relativeDate(item.commit.author.date)}`;
    hash.textContent = item.sha.slice(0, 7);
    text.append(title, meta);
    link.append(dot, text, hash);
    return link;
  }));
}

async function syncContributors() {
  const contributors = await getJSON(`${API}/repos/${ORG}/${REPO}/contributors?per_page=30`);
  const list = $("[data-contributors]");
  list.replaceChildren(...contributors.map((person) => {
    const link = document.createElement("a");
    const image = document.createElement("img");
    const text = document.createElement("span");
    const name = document.createElement("b");
    const type = document.createElement("small");
    const total = document.createElement("strong");
    link.href = person.html_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    image.src = `${person.avatar_url}&size=96`;
    image.alt = person.login;
    image.width = 48;
    image.height = 48;
    name.textContent = person.login;
    type.textContent = person.type === "Bot" ? "Bot" : "Contributor";
    total.textContent = `${person.contributions} ${person.contributions === 1 ? "commit" : "commits"}`;
    text.append(name, type);
    link.append(image, text, total);
    return link;
  }));
}

const languageColors = { Java: "#b07219", HTML: "#e34c26", CSS: "#563d7c", JavaScript: "#f1e05a", Python: "#3572A5" };
async function syncRepositories() {
  const repos = await getJSON(`${API}/orgs/${ORG}/repos?per_page=100&sort=updated`);
  setText("[data-repo-count]", repos.length);
  const grid = $("[data-repositories]");
  grid.replaceChildren(...repos.map((repo) => {
    const link = document.createElement("a");
    link.className = "repo-card";
    link.href = repo.html_url;
    link.target = "_blank";
    link.rel = "noreferrer";
    const visibility = document.createElement("span");
    visibility.innerHTML = `${icon("i-code")} ${repo.visibility || "public"}`;
    const title = document.createElement("h3");
    title.textContent = repo.name;
    const description = document.createElement("p");
    description.textContent = repo.description || (repo.name.endsWith(".github.io") ? "Organization website." : "GitHub repository.");
    const footer = document.createElement("footer");
    const language = document.createElement("b");
    const dot = document.createElement("i");
    dot.style.background = languageColors[repo.language] || "#6e7681";
    language.append(dot, document.createTextNode(repo.language || "Repository"));
    footer.append(language);
    footer.insertAdjacentHTML("beforeend", icon("i-arrow"));
    link.append(visibility, title, description, footer);
    return link;
  }));
}

const syncTasks = [syncOrganization(), syncRepository(), syncReleases(), syncCommits(), syncContributors(), syncRepositories(), syncModules()];
Promise.allSettled(syncTasks).then((results) => {
  const successful = results.filter((result) => result.status === "fulfilled").length;
  const note = $(".sync-note");
  if (note) note.lastChild.textContent = successful === results.length ? " GitHub data synced live" : ` GitHub data synced (${successful}/${results.length})`;
});
