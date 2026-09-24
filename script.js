const ORG = "International-Duck-Incorporated";
const REPO = "Venomous";
const NULLTRACE = "NullTrace";
const MEMBER_LOGIN = "3spress0";
const API = "https://api.github.com";
const SHADOWBANNED_USERS = new Set(["3spress0", "espress0"]);
const isShadowbannedLogin = (login) => SHADOWBANNED_USERS.has(String(login || "").toLowerCase());
const RAW = "https://raw.githubusercontent.com";
const fallbackModules = [{"name":"Aimbot","category":"combat"},{"name":"AntiProjectile","category":"combat"},{"name":"AutoClickerPlus","category":"combat"},{"name":"AutoPotion","category":"combat"},{"name":"AutoShield","category":"combat"},{"name":"CriticalsPlus","category":"combat"},{"name":"CrystalPvP","category":"combat"},{"name":"Hunt","category":"combat"},{"name":"MaceKill","category":"combat"},{"name":"ProjectilePuncher","category":"combat"},{"name":"SuperKnockback","category":"combat"},{"name":"SwordBlock","category":"combat"},{"name":"TargetObsidian","category":"combat"},{"name":"TickBase","category":"combat"},{"name":"TimerRange","category":"combat"},{"name":"TpAura","category":"combat"},{"name":"VAnchorMacro","category":"combat"},{"name":"VAntiTrap","category":"combat"},{"name":"VAutoCity","category":"combat"},{"name":"VAutoDoubleHand","category":"combat"},{"name":"VAutoInvTotem","category":"combat"},{"name":"VBreachSwap","category":"combat"},{"name":"VKeyPearl","category":"combat"},{"name":"VKillAura","category":"combat"},{"name":"VMaceKill","category":"combat"},{"name":"VPopCounter","category":"combat"},{"name":"VShieldBreaker","category":"combat"},{"name":"VShieldBypass","category":"combat"},{"name":"VSwordPlaceObsidian","category":"combat"},{"name":"VWindPearlMacro","category":"combat"},{"name":"VelocityPlus","category":"combat"},{"name":"AntiCheatDetect","category":"detection"},{"name":"AntiStaff","category":"detection"},{"name":"SpectatorAlert","category":"detection"},{"name":"VAntiVanish","category":"detection"},{"name":"VPlayerDetection","category":"detection"},{"name":"VInvisESP","category":"visual"},{"name":"VLightESP","category":"visual"},{"name":"VSkeletonESP","category":"visual"},{"name":"AbortBreaking","category":"exploit"},{"name":"AntiReducedDebugInfo","category":"exploit"},{"name":"ClickTp","category":"exploit"},{"name":"Damage","category":"exploit"},{"name":"Disabler","category":"exploit"},{"name":"Dupe","category":"exploit"},{"name":"ExtendedFirework","category":"exploit"},{"name":"Kick","category":"exploit"},{"name":"LbClip","category":"exploit"},{"name":"MoreCarry","category":"exploit"},{"name":"NameCollector","category":"exploit"},{"name":"NoPitchLimit","category":"exploit"},{"name":"PingSpoof","category":"exploit"},{"name":"PortalMenu","category":"exploit"},{"name":"ResetVL","category":"exploit"},{"name":"SleepWalker","category":"exploit"},{"name":"TimeShift","category":"exploit"},{"name":"VAntiHunger","category":"exploit"},{"name":"VBungeeCordSpoof","category":"exploit"},{"name":"VChorusExploit","category":"exploit"},{"name":"VGhostHand","category":"exploit"},{"name":"VNoPortalHitbox","category":"exploit"},{"name":"VPortalGodMode","category":"exploit"},{"name":"VVehicleOneHit","category":"exploit"},{"name":"DankBobbing","category":"utility"},{"name":"Derp","category":"utility"},{"name":"Twerk","category":"utility"},{"name":"Vomit","category":"utility"},{"name":"ArmorWarning","category":"utility"},{"name":"AutoChatGame","category":"utility"},{"name":"AutoPearl","category":"utility"},{"name":"Chat","category":"utility"},{"name":"ElytraSwap","category":"utility"},{"name":"FarmlandTremble","category":"utility"},{"name":"FlagCheck","category":"utility"},{"name":"GUICloser","category":"utility"},{"name":"InventoryTracker","category":"utility"},{"name":"ItemOrganizer","category":"utility"},{"name":"LagNotifier","category":"utility"},{"name":"MiddleClickAction","category":"utility"},{"name":"PearlTools","category":"utility"},{"name":"ProphuntESP","category":"utility"},{"name":"SafeLogout","category":"utility"},{"name":"SoundESP","category":"utility"},{"name":"Spammer","category":"utility"},{"name":"TNTTimer","category":"utility"},{"name":"TargetLock","category":"utility"},{"name":"Teams","category":"utility"},{"name":"TextFieldProtect","category":"utility"},{"name":"TrueSight","category":"utility"},{"name":"VAntiBot","category":"utility"},{"name":"VAutoEZ","category":"utility"},{"name":"VBookBot","category":"utility"},{"name":"VChoir","category":"utility"},{"name":"VCoordSnapper","category":"utility"},{"name":"VFreecamMining","category":"utility"},{"name":"VHideScoreboard","category":"utility"},{"name":"VNameProtect","category":"utility"},{"name":"VNoBlockInteract","category":"utility"},{"name":"VNotifier","category":"utility"},{"name":"VPacketLogger","category":"utility"},{"name":"AntiBounce","category":"movement"},{"name":"AssertDominance","category":"movement"},{"name":"Clip","category":"movement"},{"name":"Fly","category":"movement"},{"name":"NoPush","category":"movement"},{"name":"Phase","category":"movement"},{"name":"SnapTap","category":"movement"},{"name":"Speed","category":"movement"},{"name":"VBlink","category":"movement"},{"name":"VBoatPhase","category":"movement"},{"name":"VHoleSnap","category":"movement"},{"name":"VRoboWalk","category":"movement"},{"name":"GlobalNetworkInterceptor","category":"utility"},{"name":"NoFallPlus","category":"utility"},{"name":"AntiBlind","category":"visual"},{"name":"VNewChunks","category":"visual"},{"name":"AntiVoid","category":"utility"},{"name":"AutoBreakSelected","category":"utility"},{"name":"AutoToolPlus","category":"utility"},{"name":"NoSignScreen","category":"utility"},{"name":"Scaffold","category":"utility"},{"name":"TimerPlus","category":"utility"},{"name":"VAirPlace","category":"utility"},{"name":"VAutoFarm","category":"utility"}];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const page = document.body.dataset.page;

async function getJSON(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
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
  const org = await getJSON(`${API}/orgs/${ORG}`);
  $$('[data-org-avatar]').forEach((image) => {
    image.onerror = () => { image.onerror = null; image.src = "assets/org-avatar.png"; };
    image.src = `${org.avatar_url}&size=460`;
  });
  setText("[data-org-name]", org.name || "International Duck Incorporated");
  setText("[data-org-repos]", org.public_repos);
  setText("[data-org-followers]", org.followers);
}

const languageColors = { Java: "#b07219", HTML: "#e34c26", CSS: "#563d7c", JavaScript: "#f1e05a", Python: "#3572A5" };

async function syncProjects() {
  const repos = await getJSON(`${API}/orgs/${ORG}/repos?per_page=100&sort=updated`);
  const knownProjects = [
    { name: "NullTrace", html_url: `https://github.com/${ORG}/NullTrace`, description: "A client-side Fabric privacy mod for Minecraft 1.21.11, 26.1, 26.2, and 26.3 covering client brand spoofing, fingerprint protection, tracking defenses, and safer server connections.", language: "Java" },
    { name: "ChampionsCode", html_url: `https://github.com/${ORG}/ChampionsCode`, description: "A client-side Fabric mod for Minecraft 26.3 for authorized, defensive server and plugin research and controlled runtime Java addon development.", language: "Java" }
  ];
  knownProjects.forEach((project) => { if (!repos.some((repo) => repo.name === project.name)) repos.push(project); });
  const grid = $("[data-org-projects]");
  if (!grid) return;
  const projectPages = { Venomous: "venomous.html", NullTrace: "nulltrace.html", ChampionsCode: "championscode.html", "International-Duck-Incorporated.github.io": "website.html" };
  const projectMeta = {
    Venomous: { label: "Featured project", icon: "venom", logo: "assets/venomous-icon.png", status: "Active", action: "Open project" },
    NullTrace: { label: "Privacy project", icon: "privacy", logo: "assets/nulltrace-icon.png", status: "Official release", action: "Open project" },
    ChampionsCode: { label: "Research project", icon: "champion", logo: "assets/championscode-icon.png", status: "Alpha", statusMuted: true, action: "Open project" },
    "International-Duck-Incorporated.github.io": { label: "Website project", icon: "web", status: "Live", action: "Open page" }
  };
  grid.replaceChildren(...repos.map((repo, index) => {
    const link = document.createElement("a");
    const isVenomous = repo.name === REPO;
    const meta = projectMeta[repo.name];
    link.className = `project-card glass-card reveal visible${isVenomous ? " featured" : ""}`;
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
    const title = document.createElement("h3"); title.textContent = repo.name;
    const description = document.createElement("p"); description.textContent = repo.description || (isVenomous ? "Optimized & refined Meteor Client addon for Minecraft 26.2." : "Organization website and project directory.");
    copy.append(label, title, description);

    const footer = document.createElement("footer");
    const language = document.createElement("span");
    const dot = document.createElement("i"); dot.className = "language-dot"; dot.style.background = languageColors[repo.language] || "#6e7681";
    language.append(dot, document.createTextNode(repo.language || "Repository"));
    const action = document.createElement("span"); action.append(document.createTextNode(`${(meta && meta.action) || "View repository"} `)); action.insertAdjacentHTML("beforeend", icon("i-arrow"));
    footer.append(language, action);
    link.append(top, copy, footer);
    return link;
  }));
}

async function syncPeople() {
  let people = await getJSON(`${API}/orgs/${ORG}/public_members?per_page=100`);
  let role = "Public member";
  if (!people.length) {
    people = await getJSON(`${API}/repos/${ORG}/${REPO}/contributors?per_page=100`);
    role = "Project contributor";
  }
  const restoredMember = { login: "3spress0", html_url: "https://github.com/3spress0", avatar_url: "", type: "User" };
  if (!people.some((person) => isShadowbannedLogin(person.login))) people.push(restoredMember);
  setText("[data-org-people-count]", people.length);
  const grid = $("[data-org-people]");
  if (!grid || !people.length) return;
  grid.replaceChildren(...people.map((person) => {
    const link = document.createElement("a");
    link.className = "person-card glass-card reveal visible";
    const memberPages = { "3spress0": "3spress0.html", "E-VDV-HU": "e-vdv-hu.html", "0xFFshell": "0xffshell.html", "Xx-superIvar-xX": "superivar.html", "midas735": "midas735.html" };
    link.href = memberPages[person.login] || person.html_url;
    if (!memberPages[person.login]) { link.target = "_blank"; link.rel = "noreferrer"; }
    const image = document.createElement("img");
    const localMemberImages = { "3spress0": "assets/contributor-3spress0.png", "0xFFshell": "assets/member-0xffshell.png", "E-VDV-HU": "assets/member-e-vdv-hu.png", "Xx-superIvar-xX": "assets/member-xx-superivar-xx.png", "midas735": "assets/member-midas735.png" };
    image.src = localMemberImages[person.login] || (person.avatar_url ? `${person.avatar_url}&size=192` : "assets/org-avatar.png");
    image.alt = person.login; image.width = 96; image.height = 96;
    const copy = document.createElement("div");
    const label = document.createElement("span");
    label.className = isShadowbannedLogin(person.login) ? "shadowban-label" : "";
    label.textContent = isShadowbannedLogin(person.login) ? "Currently shadowbanned 😢" : (person.type === "Bot" ? "Automation" : role);
    const name = document.createElement("h3"); name.textContent = person.login;
    const handle = document.createElement("p");
    const summaries = {
      "0xFFshell": "Venomous writer",
      "E-VDV-HU": "Applied software · Python projects",
      "Xx-superIvar-xX": "New member · GitHub profile",
      "midas735": "New member · GitHub profile"
    };
    handle.textContent = summaries[person.login] || `@${person.login}`;
    copy.append(label, name, handle);
    link.append(image, copy); link.insertAdjacentHTML("beforeend", icon("i-external"));
    return link;
  }));
}

function initAmbient(canvas) {
  const context = canvas.getContext("2d");
  const host = canvas.parentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let width = 1, height = 1, dpr = 1, particles = [], frame = 0, visible = true, last = performance.now();
  let px = .5, py = .45, tx = .5, ty = .45;
  const random = (min, max) => min + Math.random() * (max - min);

  function particle(type) {
    const set = { small:[[.5,1.3],[.1,.36],[.04,.14]], medium:[[2,4.2],[.05,.18],[.02,.08]], large:[[8,18],[.015,.045],[.008,.03]] }[type];
    const angle = random(0, Math.PI * 2), speed = random(...set[2]);
    return { type, x:random(0,width), y:random(height*.08,height*.92), r:random(...set[0]), a:random(...set[1]), phase:random(0,Math.PI*2), ps:random(.00035,.0011), vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed };
  }

  function populate() {
    const scale = Math.max(.7, Math.min(1.2, width * height / 280000));
    const counts = reduceMotion ? [28,7,1] : [Math.round(76*scale),Math.round(18*scale),Math.round(2*scale)];
    particles = [...Array.from({length:counts[0]},()=>particle("small")),...Array.from({length:counts[1]},()=>particle("medium")),...Array.from({length:counts[2]},()=>particle("large"))];
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const nextW = Math.max(1,Math.round(rect.width)), nextH = Math.max(1,Math.round(rect.height));
    if (nextW === width && nextH === height) return;
    width = nextW; height = nextH; dpr = Math.min(devicePixelRatio || 1,1.75);
    canvas.width = Math.round(width*dpr); canvas.height = Math.round(height*dpr); context.setTransform(dpr,0,0,dpr,0,0); populate(); draw(performance.now(),0);
  }

  function glow(x,y,rx,ry,alpha) {
    context.save(); context.translate(x,y); context.scale(1,ry/rx);
    const gradient = context.createRadialGradient(0,0,0,0,0,rx);
    gradient.addColorStop(0,`rgba(140,247,122,${alpha})`); gradient.addColorStop(.4,`rgba(88,217,85,${alpha*.42})`); gradient.addColorStop(1,"rgba(44,174,62,0)");
    context.fillStyle = gradient; context.beginPath(); context.arc(0,0,rx,0,Math.PI*2); context.fill(); context.restore();
  }

  function draw(time,delta) {
    context.clearRect(0,0,width,height); px += (tx-px)*.025; py += (ty-py)*.025;
    const wave = time*.00016;
    glow(width*(.44+px*.1)+Math.sin(wave)*width*.08,height*(.38+py*.11),width*.43,height*.16,.12);
    glow(width*.34+Math.cos(wave*.8)*width*.1,height*.62,width*.25,height*.2,.055);
    context.save(); context.globalCompositeOperation = "lighter";
    for (const p of particles) {
      if (delta) { p.phase += p.ps*delta; p.x += p.vx*delta+Math.sin(p.phase)*.016*delta; p.y += p.vy*delta+Math.cos(p.phase*.8)*.011*delta; if(p.x<-p.r)p.x=width+p.r;if(p.x>width+p.r)p.x=-p.r;if(p.y<-p.r)p.y=height+p.r;if(p.y>height+p.r)p.y=-p.r; }
      context.globalAlpha = p.a*(.72+Math.sin(p.phase*2)*.28); context.beginPath(); context.arc(p.x,p.y,p.r,0,Math.PI*2);
      if (p.type === "small") { context.strokeStyle="rgb(140,247,122)";context.lineWidth=.7;context.stroke(); }
      else { context.fillStyle=p.type==="large"?"rgb(102,231,98)":"rgb(158,255,139)";context.shadowColor="rgba(140,247,122,.6)";context.shadowBlur=p.type==="large"?22:8;context.fill();context.shadowBlur=0; }
    }
    context.restore(); context.globalAlpha=1;
  }

  function animate(time) { const delta=Math.min(32,time-last);last=time;draw(time,delta);frame=visible&&!document.hidden?requestAnimationFrame(animate):0; }
  function start(){if(!frame&&!reduceMotion&&visible&&!document.hidden){last=performance.now();frame=requestAnimationFrame(animate);}}
  function stop(){if(frame)cancelAnimationFrame(frame);frame=0;}
  host.addEventListener("pointermove",(event)=>{const rect=host.getBoundingClientRect();tx=(event.clientX-rect.left)/rect.width;ty=(event.clientY-rect.top)/rect.height;},{passive:true});
  host.addEventListener("pointerleave",()=>{tx=.5;ty=.45;}); document.addEventListener("visibilitychange",()=>document.hidden?stop():start());
  if("IntersectionObserver"in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;visible?start():stop();},{rootMargin:"100px"}).observe(host);
  if("ResizeObserver"in window)new ResizeObserver(resize).observe(host);else addEventListener("resize",resize,{passive:true});
  resize(); if(reduceMotion)draw(performance.now(),0);else start();
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
  const response=await fetch(`${RAW}/${ORG}/${REPO}/main/src/main/java/net/venomous/meteoraddon/modules/ModuleRegistry.java`,{cache:"no-store"});if(!response.ok)throw new Error("Module source unavailable");
  const parsed=parseRegistry(await response.text());if(!parsed.length)throw new Error("No modules found");modules=parsed.sort((a,b)=>a.name.localeCompare(b.name));updateModuleCounts();renderModules();setText("[data-module-source]","Live from ModuleRegistry.java");
}

async function syncRepository() {
  const repo=await getJSON(`${API}/repos/${ORG}/${REPO}`);setText("[data-stars]",repo.stargazers_count.toLocaleString());setText("[data-forks]",repo.forks_count.toLocaleString());setText("[data-language]",repo.language||"Code");setText("[data-last-push]",relativeDate(repo.pushed_at));
}
async function syncNullTraceRelease() {
  const releases = await getJSON(`${API}/repos/${ORG}/${NULLTRACE}/releases?per_page=20`);
  const stable = releases.find((release) => !release.draft && !release.prerelease);
  if (!stable) return;
  const semanticVersion = stable.name?.match(/v?\d+\.\d+\.\d+/)?.[0] || stable.tag_name;
  setText("[data-nulltrace-version]", semanticVersion);
  setText("[data-nulltrace-release-note]", stable.body?.split("\n").find(Boolean) || "First official release");
  setText("[data-nulltrace-date]", fullDate(stable.published_at));
  setText("[data-nulltrace-release-label]", `Download ${semanticVersion}`);
  $$('[data-nulltrace-release-link]').forEach((link) => { link.href = stable.html_url; });
}

async function syncMemberContributions() {
  const query = (value, options = "") => getJSON(`${API}/search/commits?q=${encodeURIComponent(value)}&per_page=100${options}`);
  const orgQuery = `author:${MEMBER_LOGIN} org:${ORG}`;
  const [orgResults, venomousResults, championsResults, siteResults] = await Promise.all([
    query(orgQuery),
    query(`author:${MEMBER_LOGIN} repo:${ORG}/${REPO}`),
    query(`author:${MEMBER_LOGIN} repo:${ORG}/ChampionsCode`),
    query(`author:${MEMBER_LOGIN} repo:${ORG}/${ORG}.github.io`)
  ]);
  setText("[data-member-contributions]", orgResults.total_count);
  setText("[data-member-venomous-contributions]", venomousResults.total_count);
  setText("[data-member-champions-contributions]", championsResults.total_count);
  setText("[data-member-site-contributions]", siteResults.total_count);

  const recent = await query(orgQuery, "&sort=committer-date&order=desc");
  const list = $("[data-member-commits]");
  if (!list || !recent.items?.length) return;
  list.replaceChildren(...recent.items.slice(0, 8).map((item) => {
    const link = document.createElement("a");
    const dot = document.createElement("i");
    const copy = document.createElement("span");
    const title = document.createElement("b");
    const meta = document.createElement("small");
    const hash = document.createElement("code");
    const date = item.commit?.author?.date || item.commit?.committer?.date;
    link.href = item.html_url; link.target = "_blank"; link.rel = "noreferrer";
    title.textContent = item.commit?.message?.split("\n")[0] || "Commit";
    meta.textContent = `${item.repository?.name || "GitHub"} · ${relativeDate(date)}`;
    hash.textContent = item.sha.slice(0, 7);
    copy.append(title, meta); link.append(dot, copy, hash);
    return link;
  }));
}

async function syncReleases() {
  const releases=await getJSON(`${API}/repos/${ORG}/${REPO}/releases?per_page=20`),stable=releases.find((r)=>!r.draft&&!r.prerelease&&r.tag_name!=="nightly"),nightly=releases.find((r)=>r.tag_name==="nightly"||r.prerelease);
  if(stable){const asset=stable.assets?.find((a)=>a.name.toLowerCase().endsWith(".jar"));setText("[data-release-version]",stable.tag_name);setText("[data-release-short]",stable.tag_name.replace(/^v/i,""));setText("[data-stable-date]",fullDate(stable.published_at));setText("[data-stable-size]",fileSize(asset?.size));if(asset)$$('[data-stable-download]').forEach((link)=>{link.href=asset.browser_download_url;});}
  if(nightly){const asset=nightly.assets?.find((a)=>a.name.toLowerCase().endsWith(".jar"));setText("[data-nightly-version]",asset?.name?.replace(/\.jar$/i,"")||nightly.name||"Latest main");setText("[data-nightly-date]",fullDate(nightly.published_at));setText("[data-nightly-size]",fileSize(asset?.size));if(asset)$$('[data-nightly-download]').forEach((link)=>{link.href=asset.browser_download_url;});}
}
async function syncCommits() {
  const commits=await getJSON(`${API}/repos/${ORG}/${REPO}/commits?per_page=5`);
  const list=$("[data-commits]");if(!list)return;
  list.replaceChildren(...commits.map((item)=>{const link=document.createElement("a"),dot=document.createElement("i"),copy=document.createElement("span"),title=document.createElement("b"),meta=document.createElement("small"),hash=document.createElement("code");link.href=item.html_url;link.target="_blank";link.rel="noreferrer";title.textContent=item.commit.message.split("\n")[0];meta.textContent=`${item.author?.login||item.commit.author.name} · ${relativeDate(item.commit.author.date)}`;hash.textContent=item.sha.slice(0,7);copy.append(title,meta);link.append(dot,copy,hash);return link;}));
}
async function syncContributors() {
  const people=await getJSON(`${API}/repos/${ORG}/${REPO}/contributors?per_page=30`);
  const list=$("[data-contributors]");if(!list || !people.length)return;
  list.replaceChildren(...people.map((person)=>{const link=document.createElement("a"),image=document.createElement("img"),copy=document.createElement("span"),name=document.createElement("b"),role=document.createElement("small"),total=document.createElement("strong");link.href=person.html_url;link.target="_blank";link.rel="noreferrer";image.src=`${person.avatar_url}&size=96`;image.alt=person.login;name.textContent=person.login;role.textContent=person.type==="Bot"?"Bot":"Contributor";total.textContent=`${person.contributions} contributions`;copy.append(name,role);link.append(image,copy,total);return link;}));
}

$$('[data-background]').forEach(initAtmosphere);
const tasks = [syncOrganization()];
if (page === "organization") tasks.push(syncPeople());
if (page === "projects") tasks.push(syncProjects());
if (page === "people") tasks.push(syncPeople());
if (page === "project" && document.body.dataset.project === "nulltrace") tasks.push(syncNullTraceRelease());
if (page === "member" && document.body.dataset.member === MEMBER_LOGIN) tasks.push(syncMemberContributions());
if (page === "venomous") {
  setupModules();$$('[data-ambient]').forEach(initAmbient);
  tasks.push(syncRepository(),syncReleases(),syncCommits(),syncContributors(),syncModules());
}
Promise.allSettled(tasks).then((results)=>{const done=results.filter((result)=>result.status==="fulfilled").length;setText("[data-sync-text]",done===results.length?"GitHub data synced live":`GitHub data synced (${done}/${results.length})`);});
