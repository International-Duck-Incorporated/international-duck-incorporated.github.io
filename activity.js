/* Cross-platform activity assembly: commits from every IDI project on
 * GitLab (main) and GitHub (legacy mirror), attributed to public members.
 * Runs only on /activity (data-page="activity"). Degrades gracefully:
 * partial API failures never blank the whole page - each panel falls
 * back to a link-and-status row.
 */
(() => {
  if (document.body.dataset.page !== "activity") return;

  const GITLAB = "https://gitlab.com";
  const GL_API = `${GITLAB}/api/v4`;
  const GL_GROUP = `${GL_API}/groups/international-duck-incorporated`;
  const GH_ORG = "International-Duck-Incorporated";
  const GH = "https://github.com";
  const GH_API = `https://api.github.com/orgs/${GH_ORG}`;
  const PER_REPO_COMMITS = 100;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const svgUse = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  function relativeDate(value) {
    if (!value) return "unknown";
    const s = (new Date(value).getTime() - Date.now()) / 1000;
    const f = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    for (const [u, z] of [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]])
      if (Math.abs(s) >= z || u === "minute") return f.format(Math.round(s / z), u);
    return "recently";
  }

  /* Public members with cross-platform alias lists (checked-in roster;
   * gitlab.com/Name links come from the people directory). */
  const MEMBERS = [
    {
      key: "0xffshell", display: "0xFFshell", page: "/people/0xffshell",
      avatar: "/assets/member-0xffshell.png",
      aliases: [/0xff/i, /pieterr\.games@gmail\.com/i, /0xffshell/i],
      gitlab: `${GITLAB}/0xFFshell`, github: `${GH}`
    },
    {
      key: "3spress0", display: "espress0", page: "/people/3spress0",
      avatar: "/assets/contributor-3spress0.png",
      aliases: [/espress0/i, /3spress0/i, /vanderven/i, /166116795/],
      gitlab: null, github: `${GH}/3spress0`
    },
    {
      key: "e-vdv-hu", display: "E-VDV-HU", page: "/people/e-vdv-hu",
      avatar: "/assets/member-e-vdv-hu.png",
      aliases: [/e-?vdv-?hu/i],
      gitlab: null, github: `${GH}/E-VDV-HU`
    },
    {
      key: "superivar", display: "Xx-superIvar-xX", page: "/people/superivar",
      avatar: "/assets/member-xx-superivar-xx.png",
      aliases: [/superivar/i, /ivar\.boot@student\.hu\.nl/i],
      gitlab: null, github: `${GH}/Xx-superIvar-xX`
    },
    {
      key: "midas735", display: "midas735", page: "/people/midas735",
      avatar: "/assets/member-midas735.png",
      aliases: [/midas735/i],
      gitlab: null, github: `${GH}/midas735`
    },
    {
      key: "jojo-8002", display: "Jojo-8002", page: "/people/jojo-8002",
      avatar: "/assets/member-jojo-8002.png",
      aliases: [/jojo[-_ ]?8002/i],
      gitlab: null, github: `${GH}/Jojo-8002`
    }
  ];
  const UPSTREAMS = [/aurick/i, /kaplayz/i];
  const BOTS = [/bot/i, /claude/i, /copilot/i, /github-actions/i, /dependabot/i, /agent@/i];

  const matchMember = (name, email) =>
    MEMBERS.find((m) => m.aliases.some((a) => a.test(name) || a.test(email)));
  const isUpstream = (n, e) => UPSTREAMS.some((a) => a.test(n) || a.test(e));
  const isBot = (n, e) => BOTS.some((a) => a.test(n) || a.test(e));

  /* Normalize a commit from either API into one shape. */
  const fromGL = (c, project) => ({
    platform: "gitlab",
    project,
    title: (c.title || "").split("\n")[0],
    name: c.author_name || "unknown",
    email: c.author_email || "",
    date: c.committed_date || c.authored_date,
    url: c.web_url,
    hash: (c.short_id || c.id || "").slice(0, 8)
  });
  const fromGH = (c, project) => ({
    platform: "github",
    project,
    title: (c.commit?.message || "").split("\n")[0],
    name: c.commit?.author?.name || c.author?.login || "unknown",
    email: c.commit?.author?.email || "",
    date: c.commit?.author?.date,
    url: c.html_url,
    hash: (c.sha || "").slice(0, 8)
  });

  const PROJECT_LABEL = {
    home: "Website",
    "International-Duck-Incorporated.github.io": "Website"
  };
  const projectLabel = (p) => PROJECT_LABEL[p] || p;
  const projectPath = (platform, name) =>
    platform === "gitlab"
      ? `${GITLAB}/international-duck-incorporated/${name}`
      : `${GH}/${GH_ORG}/${name}`;

  /* Source status lines under each org card. */
  function orgStatus(kind, projects, commits, error) {
    const el = $(`[data-activity-${kind}]`);
    if (!el) return;
    if (error || !projects) {
      el.innerHTML = `<a href="${kind === "gitlab" ? "https://gitlab.com/international-duck-incorporated" : "https://github.com/International-Duck-Incorporated"}" target="_blank" rel="noreferrer"><i></i><span><b>API rate-limited or unavailable</b><small>Open the organization directly</small></span><code>→</code></a>`;
      return;
    }
    const byProject = new Map();
    commits.forEach((c) => byProject.set(c.project, (byProject.get(c.project) || 0) + 1));
    el.replaceChildren(...projects.map((p) => {
      const a = document.createElement("a");
      const count = byProject.get(p) || 0;
      a.href = `${projectPath(kind, p)}/${kind === "gitlab" ? "-" : ""}/commits/main`;
      a.target = "_blank"; a.rel = "noreferrer";
      const dot = document.createElement("i");
      const span = document.createElement("span");
      const b = document.createElement("b"); b.textContent = projectLabel(p);
      const small = document.createElement("small"); small.textContent = count
        ? `${count} recent commit${count === 1 ? "" : "s"} loaded`
        : "no commits in window";
      span.append(b, small);
      const code = document.createElement("code");
      code.textContent = kind === "gitlab" ? "main ✓" : "mirror";
      a.append(dot, span, code);
      return a;
    }));
  }

  /* Member cards. */
  function renderMembers(commits, extras) {
    const grid = $("[data-activity-members]");
    if (!grid) return;
    const cards = [];
    for (const member of MEMBERS) {
      const mine = commits.filter((c) => {
        const m = matchMember(c.name, c.email);
        return m && m.key === member.key;
      });
      const gl = mine.filter((c) => c.platform === "gitlab").length;
      const gh = mine.length - gl;
      const link = document.createElement("a");
      link.className = "person-card glass-card reveal visible";
      link.href = member.page;
      link.dataset.memberCard = member.key;
      const img = document.createElement("img");
      img.src = member.avatar; img.alt = member.display; img.width = 96; img.height = 96;
      const div = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = mine.length
        ? `${mine.length} commit${mine.length === 1 ? "" : "s"} tracked`
        : "No commits in recent window";
      const h3 = document.createElement("h3"); h3.textContent = member.display;
      const p = document.createElement("p");
      p.innerHTML = mine.length
        ? [`${gl} on <b class="platform-inline gitlab">GitLab · main</b>`, `${gh} on <b class="platform-inline github">GitHub · legacy</b>`].join(" · ")
        : "GitLab · main / GitHub · legacy";
      div.append(label, h3, p);
      link.append(img, div);
      link.insertAdjacentHTML("beforeend", svgUse("i-external"));
      cards.push(link);
    }
    /* Upstream + automation buckets, so the math is transparent. */
    const upstreamCount = commits.filter((c) => !matchMember(c.name, c.email) && isUpstream(c.name, c.email)).length;
    const botCount = commits.filter((c) => !matchMember(c.name, c.email) && !isUpstream(c.name, c.email) && isBot(c.name, c.email)).length;
    const otherCount = commits.length - commits.filter((c) => matchMember(c.name, c.email)).length - upstreamCount - botCount;
    grid.replaceChildren(...cards);
    const summary = $("[data-activity-member-summary]");
    if (summary) {
      const parts = [];
      if (upstreamCount) parts.push(`${upstreamCount} upstream (OpSec) contributor${upstreamCount === 1 ? "" : "s"}' commits`);
      if (botCount) parts.push(`${botCount} automation`);
      if (otherCount) parts.push(`${otherCount} other`);
      summary.textContent = parts.length ? `Not attributed to members: ${parts.join(" · ")}.` : "Every tracked commit belongs to a public member.";
    }
  }

  /* Unified newest-first feed. */
  function renderFeed(commits) {
    const list = $("[data-activity-feed]");
    if (!list) return;
    const newest = [...commits]
      .filter((c) => c.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
    if (!newest.length) return;
    list.replaceChildren(...newest.map((c) => {
      const a = document.createElement("a");
      a.href = c.url; a.target = "_blank"; a.rel = "noreferrer";
      const dot = document.createElement("i");
      const span = document.createElement("span");
      const b = document.createElement("b"); b.textContent = c.title || "Commit";
      const small = document.createElement("small");
      const member = matchMember(c.name, c.email);
      const who = member ? member.display : c.name;
      small.textContent = `${projectLabel(c.project)} · ${who} · ${relativeDate(c.date)}`;
      span.append(b, small);
      const tag = document.createElement("em");
      tag.className = `platform-badge ${c.platform}`;
      tag.textContent = c.platform === "gitlab" ? "main" : "legacy";
      const code = document.createElement("code"); code.textContent = c.hash || "•••••••";
      a.append(dot, span, tag, code);
      return a;
    }));
  }

  function setTotal(n, projects) {
    const total = $("[data-activity-total]");
    if (total) total.textContent = n.toLocaleString();
    const count = $("[data-activity-projects]");
    if (count) count.textContent = projects;
  }

  async function loadGitLab() {
    const projects = await getJSON(`${GL_GROUP}/projects?per_page=100&include_subgroups=true`);
    const names = projects.map((p) => p.path).sort((a, b) => a.localeCompare(b));
    const settled = await Promise.allSettled(names.map((name) =>
      getJSON(`${GL_API}/projects/${encodeURIComponent(`international-duck-incorporated/${name}`)}/repository/commits?per_page=${PER_REPO_COMMITS}`)
        .then((cs) => cs.map((c) => fromGL(c, name)))));
    return { names, commits: settled.filter((s) => s.status === "fulfilled").flatMap((s) => s.value) };
  }

  async function loadGitHub() {
    const repos = await getJSON(`${GH_API}/repos?per_page=100&sort=pushed`);
    const names = repos.map((r) => r.name);
    /* Per-repo commits through api.github.com/repos/{org}/{name}/commits,
     * tolerating the current per-repo anonymous 404s by returning []. */
    const commitFetches = await Promise.allSettled(repos.map((r) =>
      fetch(`https://api.github.com/repos/${GH_ORG}/${r.name}/commits?sha=${encodeURIComponent(r.default_branch || "main")}&per_page=${PER_REPO_COMMITS}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : []))
        .then((cs) => cs.map((c) => fromGH(c, r.name)))));
    let commits = commitFetches.filter((s) => s.status === "fulfilled").flatMap((s) => s.value);
    /* No commit data reachable at all (the flaky post-ban visibility)?
     * Fall back to repo push timestamps so GitHub still appears honestly. */
    if (!commits.length) {
      commits = repos.map((r) => ({
        platform: "github", project: r.name,
        title: `Last mirrored push to ${r.name}`,
        name: "International Duck Incorporated", email: "",
        date: r.pushed_at, url: r.html_url, hash: "mirror", mirror: true
      }));
    }
    return { names, commits };
  }

  async function loadActivity() {
    const loadButton = $("[data-activity-load]");
    if (loadButton) {
      loadButton.disabled = true;
      loadButton.textContent = "Loading live activity…";
    }
    try {
      const [glRes, ghRes] = await Promise.allSettled([loadGitLab(), loadGitHub()]);
      const gl = glRes.status === "fulfilled" ? glRes.value : null;
      const gh = ghRes.status === "fulfilled" ? ghRes.value : null;

      orgStatus("gitlab", gl?.names, gl?.commits || [], glRes.status !== "fulfilled");
      orgStatus("github", gh?.names, gh?.commits || [], ghRes.status !== "fulfilled");

      const all = [...(gl?.commits || []), ...(gh?.commits || []).filter((c) => !c.mirror)];
      const allNames = [...new Set([...(gl?.names || []), ...(gh?.names || [])])];
      renderMembers(all, {});
      renderFeed([...all, ...(gh?.commits || []).filter((c) => c.mirror)]);
      setTotal(all.length, allNames.length);

      const src = $("[data-sync-text]");
      if (src) {
        const glOk = glRes.status === "fulfilled";
        const ghOk = ghRes.status === "fulfilled";
        src.textContent = glOk && ghOk
          ? "GitLab (main) + GitHub synced live"
          : glOk ? "GitLab (main) live · GitHub unavailable"
          : ghOk ? "GitHub live · GitLab unavailable" : "Both APIs unavailable";
      }
    } catch (err) {
      console.warn("activity sync failed", err);
      const src = $("[data-sync-text]");
      if (src) src.textContent = "Live sync unavailable";
    }
  }

  function pauseActivityForLowPower() {
    const total = $("[data-activity-total]");
    if (total) total.textContent = "—";

    for (const kind of ["gitlab", "github"]) {
      const list = $(`[data-activity-${kind}]`);
      if (!list) continue;
      const note = document.createElement("p");
      note.className = "activity-paused-note";
      note.textContent = "Live repository scan paused to save data and battery.";
      list.replaceChildren(note);
    }

    const feed = $("[data-activity-feed]");
    if (feed) {
      const note = document.createElement("p");
      note.className = "activity-paused-note";
      note.textContent = "The cross-platform feed is available on request in low-power mode.";
      feed.replaceChildren(note);
    }

    const grid = $("[data-activity-members]");
    if (grid) {
      const notice = document.createElement("div");
      notice.className = "activity-low-power-card";
      const copy = document.createElement("p");
      copy.textContent = "This page can scan up to 100 recent commits per repository on both platforms. The live scan is paused by default on this device.";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-glass";
      button.dataset.activityLoad = "";
      button.textContent = "Load live activity anyway";
      button.addEventListener("click", loadActivity, { once: true });
      notice.append(copy, button);
      grid.replaceChildren(notice);
    }

    const src = $("[data-sync-text]");
    if (src) src.textContent = "Low-power mode · live activity paused";
  }

  if (window.IDI_LOW_END) pauseActivityForLowPower();
  else loadActivity();
})();
