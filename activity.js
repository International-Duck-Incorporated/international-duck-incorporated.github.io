/* GitLab-only activity assembly: commits from every public IDI project,
 * attributed to the checked-in public member roster.
 * Runs only on /activity (data-page="activity"). GitHub is intentionally not
 * queried while the organization is hidden; GitLab is the active source of truth.
 */
(() => {
  if (document.body.dataset.page !== "activity") return;

  const GITLAB = "https://gitlab.com";
  const GL_API = `${GITLAB}/api/v4`;
  const GL_GROUP = `${GL_API}/groups/international-duck-incorporated`;
  const PER_REPO_COMMITS = 100;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  async function getJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  }

  function relativeDate(value) {
    if (!value) return "unknown";
    const seconds = (new Date(value).getTime() - Date.now()) / 1000;
    const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    for (const [unit, size] of [
      ["year", 31536000],
      ["month", 2592000],
      ["day", 86400],
      ["hour", 3600],
      ["minute", 60],
    ]) {
      if (Math.abs(seconds) >= size || unit === "minute")
        return format.format(Math.round(seconds / size), unit);
    }
    return "recently";
  }

  /* Public member aliases are checked in because GitLab does not expose group
   * membership through its public API. */
  const MEMBERS = [
    {
      key: "0xffshell",
      display: "0xFFshell",
      page: "/members/0xffshell",
      avatar: "/assets/member-0xffshell.webp?v=827f401e",
      aliases: [/0xff/i, /pieterr\.games@gmail\.com/i, /0xffshell/i],
    },
    {
      key: "3spress0",
      display: "espress0",
      page: "/members/3spress0",
      avatar: "/assets/contributor-3spress0.webp?v=a3c2db19",
      aliases: [/espress0/i, /3spress0/i, /vanderven/i, /166116795/],
    },
    {
      key: "e-vdv-hu",
      display: "E-VDV-HU",
      page: "/members/e-vdv-hu",
      avatar: "/assets/member-e-vdv-hu.webp?v=0774275d",
      aliases: [/e-?vdv-?hu/i],
    },
    {
      key: "superivar",
      display: "Xx-superIvar-xX",
      page: "/members/superivar",
      avatar: "/assets/member-xx-superivar-xx.webp?v=1c79d93d",
      aliases: [/superivar/i, /ivar\.boot@student\.hu\.nl/i],
    },
    {
      key: "midas735",
      display: "midas735",
      page: "/members/midas735",
      avatar: "/assets/member-midas735.webp?v=3700f4a4",
      aliases: [/midas735/i],
    },
    {
      key: "jojo-8002",
      display: "Jojo-8002",
      page: "/members/jojo-8002",
      avatar: "/assets/member-jojo-8002.webp?v=8c2a077e",
      aliases: [/jojo[-_ ]?8002/i],
    },
  ];
  const UPSTREAMS = [/aurick/i, /kaplayz/i];
  const BOTS = [/bot/i, /claude/i, /copilot/i, /dependabot/i, /agent@/i];

  const matchMember = (name, email) =>
    MEMBERS.find((member) => member.aliases.some((alias) => alias.test(name) || alias.test(email)));
  const isUpstream = (name, email) =>
    UPSTREAMS.some((alias) => alias.test(name) || alias.test(email));
  const isBot = (name, email) => BOTS.some((alias) => alias.test(name) || alias.test(email));

  const fromGL = (commit, project) => ({
    platform: "gitlab",
    project,
    title: (commit.title || "").split("\n")[0],
    name: commit.author_name || "unknown",
    email: commit.author_email || "",
    date: commit.committed_date || commit.authored_date,
    url: commit.web_url,
    hash: (commit.short_id || commit.id || "").slice(0, 8),
  });

  const PROJECT_LABEL = { home: "Website" };
  const projectLabel = (project) => PROJECT_LABEL[project] || project;
  const projectPath = (name) => `${GITLAB}/international-duck-incorporated/${name}`;

  function orgStatus(projects, commits, error) {
    const el = $("[data-activity-gitlab]");
    if (!el) return;
    if (error || !projects) {
      el.innerHTML = `<a href="${GITLAB}/international-duck-incorporated" target="_blank" rel="noreferrer"><i></i><span><b>GitLab API unavailable</b><small>Open the GitLab group directly</small></span><code>→</code></a>`;
      return;
    }
    const byProject = new Map();
    commits.forEach((commit) =>
      byProject.set(commit.project, (byProject.get(commit.project) || 0) + 1)
    );
    el.replaceChildren(
      ...projects.map((project) => {
        const a = document.createElement("a");
        const count = byProject.get(project) || 0;
        a.href = `${projectPath(project)}/-/commits/main`;
        a.target = "_blank";
        a.rel = "noreferrer";
        const dot = document.createElement("i");
        const span = document.createElement("span");
        const title = document.createElement("b");
        title.textContent = projectLabel(project);
        const small = document.createElement("small");
        small.textContent = count
          ? `${count} recent commit${count === 1 ? "" : "s"} loaded`
          : "no commits in window";
        span.append(title, small);
        const code = document.createElement("code");
        code.textContent = "main ✓";
        a.append(dot, span, code);
        return a;
      })
    );
  }

  function renderMembers(commits) {
    const grid = $("[data-activity-members]");
    if (!grid) return;
    const cards = MEMBERS.map((member) => {
      const mine = commits.filter(
        (commit) => matchMember(commit.name, commit.email)?.key === member.key
      );
      const link = document.createElement("a");
      link.className = "person-card glass-card reveal visible";
      link.href = member.page;
      link.dataset.memberCard = member.key;
      const img = document.createElement("img");
      img.src = member.avatar;
      img.alt = member.display;
      img.width = 96;
      img.height = 96;
      const copy = document.createElement("div");
      const label = document.createElement("span");
      label.textContent = mine.length
        ? `${mine.length} GitLab commit${mine.length === 1 ? "" : "s"} tracked`
        : "No GitLab commits in recent window";
      const heading = document.createElement("h3");
      heading.textContent = member.display;
      const summary = document.createElement("p");
      summary.textContent = mine.length ? `${mine.length} on GitLab · main` : "GitLab · main";
      copy.append(label, heading, summary);
      link.append(img, copy);
      link.insertAdjacentHTML(
        "beforeend",
        '<svg aria-hidden="true"><use href="#i-external"/></svg>'
      );
      return link;
    });

    const upstreamCount = commits.filter(
      (commit) => !matchMember(commit.name, commit.email) && isUpstream(commit.name, commit.email)
    ).length;
    const botCount = commits.filter(
      (commit) =>
        !matchMember(commit.name, commit.email) &&
        !isUpstream(commit.name, commit.email) &&
        isBot(commit.name, commit.email)
    ).length;
    const attributed = commits.filter((commit) => matchMember(commit.name, commit.email)).length;
    const otherCount = commits.length - attributed - upstreamCount - botCount;
    grid.replaceChildren(...cards);
    const summary = $("[data-activity-member-summary]");
    if (!summary) return;
    const parts = [];
    if (upstreamCount)
      parts.push(
        `${upstreamCount} upstream (OpSec) contributor${upstreamCount === 1 ? "" : "s"}' commits`
      );
    if (botCount) parts.push(`${botCount} automation`);
    if (otherCount) parts.push(`${otherCount} other`);
    summary.textContent = parts.length
      ? `Not attributed to members: ${parts.join(" · ")}.`
      : "Every tracked GitLab commit belongs to a public member.";
  }

  function renderFeed(commits) {
    const list = $("[data-activity-feed]");
    if (!list) return;
    const newest = commits
      .filter((commit) => commit.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
    if (!newest.length) {
      list.innerHTML =
        '<p class="activity-paused-note">No recent GitLab commits were returned.</p>';
      return;
    }
    list.replaceChildren(
      ...newest.map((commit) => {
        const a = document.createElement("a");
        a.href = commit.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        const dot = document.createElement("i");
        const span = document.createElement("span");
        const title = document.createElement("b");
        title.textContent = commit.title || "Commit";
        const small = document.createElement("small");
        const member = matchMember(commit.name, commit.email);
        small.textContent = `${projectLabel(commit.project)} · ${member ? member.display : commit.name} · ${relativeDate(commit.date)}`;
        span.append(title, small);
        const tag = document.createElement("em");
        tag.className = "platform-badge gitlab";
        tag.textContent = "main";
        const code = document.createElement("code");
        code.textContent = commit.hash || "•••••••";
        a.append(dot, span, tag, code);
        return a;
      })
    );
  }

  function setTotal(total, projects) {
    const totalNode = $("[data-activity-total]");
    if (totalNode) totalNode.textContent = total.toLocaleString();
    const countNode = $("[data-activity-projects]");
    if (countNode) countNode.textContent = projects;
  }

  async function loadGitLab() {
    const projects = await getJSON(`${GL_GROUP}/projects?per_page=100&include_subgroups=true`);
    const names = projects.map((project) => project.path).sort((a, b) => a.localeCompare(b));
    const settled = await Promise.allSettled(
      names.map((name) =>
        getJSON(
          `${GL_API}/projects/${encodeURIComponent(`international-duck-incorporated/${name}`)}/repository/commits?per_page=${PER_REPO_COMMITS}`
        ).then((commits) => commits.map((commit) => fromGL(commit, name)))
      )
    );
    return {
      names,
      commits: settled
        .filter((result) => result.status === "fulfilled")
        .flatMap((result) => result.value),
    };
  }

  async function loadActivity() {
    const loadButton = $("[data-activity-load]");
    if (loadButton) {
      loadButton.disabled = true;
      loadButton.textContent = "Loading live activity…";
    }
    try {
      const result = await loadGitLab();
      orgStatus(result.names, result.commits, false);
      renderMembers(result.commits);
      renderFeed(result.commits);
      setTotal(result.commits.length, result.names.length);
      const source = $("[data-sync-text]");
      if (source) source.textContent = "GitLab (main) live";
    } catch (error) {
      console.warn("GitLab activity sync failed", error);
      orgStatus(null, [], true);
      const source = $("[data-sync-text]");
      if (source) source.textContent = "GitLab unavailable · checked-in content shown";
    }
  }

  function pauseActivityForLowPower() {
    const total = $("[data-activity-total]");
    if (total) total.textContent = "…";
    const repositoryList = $("[data-activity-gitlab]");
    if (repositoryList) {
      const note = document.createElement("p");
      note.className = "activity-paused-note";
      note.textContent = "Live GitLab repository scan paused to save data and battery.";
      repositoryList.replaceChildren(note);
    }
    const feed = $("[data-activity-feed]");
    if (feed) {
      const note = document.createElement("p");
      note.className = "activity-paused-note";
      note.textContent = "The GitLab feed is available on request in low-power mode.";
      feed.replaceChildren(note);
    }
    const grid = $("[data-activity-members]");
    if (grid) {
      const notice = document.createElement("div");
      notice.className = "activity-low-power-card";
      const copy = document.createElement("p");
      copy.textContent =
        "This page can scan up to 100 recent GitLab commits per repository. The live scan is paused by default on this device.";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-glass";
      button.dataset.activityLoad = "";
      button.textContent = "Load live activity anyway";
      button.addEventListener("click", loadActivity, { once: true });
      notice.append(copy, button);
      grid.replaceChildren(notice);
    }
    const source = $("[data-sync-text]");
    if (source) source.textContent = "Low-power mode · GitLab scan paused";
  }

  if (window.IDI_LOW_END) pauseActivityForLowPower();
  else loadActivity();
})();
