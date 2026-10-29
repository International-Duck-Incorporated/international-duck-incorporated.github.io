/* Live GitLab commit feed for member pages.
 * GitLab is the active source of truth. GitHub is intentionally not queried
 * while the organization and its API data are unavailable; GitHub handles are
 * shown as plain profile links only.
 */
(function () {
  "use strict";

  var MEMBERS = {
    superivar: { label: "Xx-superIvar-xX", gitlab: "Xx-superIvar-xX", github: "Xx-superIvar-xX" },
    "0xffshell": { label: "0xFFshell", gitlab: "0xFFshell" },
    // espress0 now has a public GitLab profile; load activity from that account.
    "3spress0": { label: "espress0", gitlab: "3spress0" },
    // E-VDV-HU's personal GitHub account is public; only the IDI organization is hidden.
    "e-vdv-hu": {
      label: "E-VDV-HU",
      gitlab: null,
      github: "E-VDV-HU",
      githubNote: "GitHub is E-VDV-HU's only public account.",
    },
    midas735: { label: "midas735", gitlab: "midas735", github: "midas735" },
    "jojo-8002": {
      label: "Jojo-8002",
      gitlab: null,
      github: "Jojo-8002",
      githubNote: "GitHub is Jojo-8002's only public account.",
    },
  };

  var GL_API = "https://gitlab.com/api/v4";
  var MAX_COMMITS = 8;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function timeAgo(iso) {
    var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 90) return "just now";
    var m = s / 60;
    if (m < 90) return Math.round(m) + "m ago";
    var h = m / 60;
    if (h < 36) return Math.round(h) + "h ago";
    var d = h / 24;
    if (d < 14) return Math.round(d) + "d ago";
    return new Date(iso).toLocaleDateString();
  }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status + " for " + url);
      return response.json();
    });
  }

  /* Resolve a GitLab username to pushed events, then resolve each project so
   * the rendered links remain useful without any GitHub dependency. */
  var glProjectCache = {};
  function glProject(id) {
    if (!glProjectCache[id]) {
      glProjectCache[id] = getJSON(GL_API + "/projects/" + id).catch(function () {
        return { path_with_namespace: "project #" + id, web_url: null };
      });
    }
    return glProjectCache[id];
  }

  function fetchGitLabCommits(username) {
    return getJSON(GL_API + "/users?username=" + encodeURIComponent(username))
      .then(function (users) {
        if (!users || !users.length) throw new Error("GitLab user not found: " + username);
        return getJSON(GL_API + "/users/" + users[0].id + "/events?action=pushed&per_page=30");
      })
      .then(function (events) {
        var pushes = (events || [])
          .filter(function (event) {
            return event.push_data && event.push_data.commit_to;
          })
          .slice(0, MAX_COMMITS);
        return Promise.all(
          pushes.map(function (event) {
            return glProject(event.project_id).then(function (project) {
              var sha = event.push_data.commit_to;
              return {
                title:
                  event.push_data.commit_title ||
                  "(" + event.push_data.action + " " + event.push_data.ref + ")",
                repo: project.path_with_namespace,
                url: project.web_url ? project.web_url + "/-/commit/" + sha : null,
                sha: sha.slice(0, 7),
                date: event.created_at,
                extra:
                  event.push_data.commit_count > 1
                    ? "+" + (event.push_data.commit_count - 1) + " more in push"
                    : null,
              };
            });
          })
        );
      });
  }

  function renderList(el, commits, emptyText) {
    if (!commits.length) {
      el.innerHTML = '<p class="cf-note">' + esc(emptyText) + "</p>";
      return;
    }
    el.innerHTML =
      '<ul class="cf-list">' +
      commits
        .map(function (commit) {
          var title = commit.url
            ? '<a href="' +
              esc(commit.url) +
              '" target="_blank" rel="noreferrer">' +
              esc(commit.title) +
              "</a>"
            : esc(commit.title);
          return (
            "<li><b>" +
            title +
            "</b><small><code>" +
            esc(commit.sha) +
            "</code> · " +
            esc(commit.repo) +
            " · " +
            esc(timeAgo(commit.date)) +
            (commit.extra ? " · " + esc(commit.extra) : "") +
            "</small></li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function column(host, heading) {
    var div = document.createElement("div");
    div.className = "cf-col";
    div.innerHTML = "<h3>" + esc(heading) + '</h3><p class="cf-note">Loading\u2026</p>';
    host.appendChild(div);
    return div;
  }

  function loadMemberActivity(member, cols) {
    cols.replaceChildren();
    if (member.github) {
      var github = column(cols, "GitHub · @" + member.github);
      github.innerHTML =
        "<h3>GitHub · @" +
        esc(member.github) +
        "</h3>" +
        '<p class="cf-note"><a href="https://github.com/' +
        encodeURIComponent(member.github) +
        '" target="_blank" rel="noreferrer">@' +
        esc(member.github) +
        " ↗</a>" +
        (member.githubNote ? ". " + esc(member.githubNote) : "") +
        "</p>";
    }
    if (!member.gitlab) {
      column(cols, "GitLab").innerHTML =
        '<h3>GitLab</h3><p class="cf-note">No public GitLab account on record for ' +
        esc(member.label) +
        ".</p>";
      return;
    }

    var gitlab = column(cols, "GitLab · @" + member.gitlab);
    fetchGitLabCommits(member.gitlab)
      .then(function (commits) {
        gitlab.innerHTML = "<h3>GitLab · @" + esc(member.gitlab) + "</h3>";
        var box = document.createElement("div");
        gitlab.appendChild(box);
        renderList(box, commits, "No pushed commits in the recent event feed.");
      })
      .catch(function (error) {
        gitlab.innerHTML =
          "<h3>GitLab · @" +
          esc(member.gitlab) +
          "</h3>" +
          '<p class="cf-note">Could not load GitLab activity (' +
          esc(error.message) +
          ").</p>";
      });
  }

  function init() {
    var key = document.body.getAttribute("data-member");
    var member = key && MEMBERS[key];
    var grid = document.querySelector(".detail-grid");
    if (!member || !grid) return;

    var style = document.createElement("style");
    style.textContent =
      ".cf-panel{grid-column:1/-1;}" +
      ".cf-cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1.5rem;margin-top:1rem;}" +
      ".cf-col h3{margin:0 0 .75rem;font-size:1rem;opacity:.85;}" +
      ".cf-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.7rem;}" +
      ".cf-list li{padding:.65rem .8rem;border:1px solid rgba(140,180,255,.16);border-radius:10px;background:rgba(10,16,28,.4);}" +
      ".cf-list b{display:block;font-size:.92rem;font-weight:650;overflow-wrap:anywhere;}" +
      ".cf-list small{display:block;margin-top:.25rem;opacity:.65;}" +
      ".cf-list code{font-size:.78rem;}" +
      ".cf-note{opacity:.6;font-size:.9rem;margin:.25rem 0 0;}";
    document.head.appendChild(style);

    var panel = document.createElement("article");
    panel.className = "detail-panel glass-card reveal visible cf-panel";
    panel.innerHTML =
      '<span class="eyebrow">Live public activity</span>' +
      "<h2>Recent public activity by " +
      esc(member.label) +
      ".</h2>" +
      "<p>GitLab history comes from the public GitLab API. GitHub is not queried while the organization is hidden; GitHub handles appear as plain profile links.</p>";
    var cols = document.createElement("div");
    cols.className = "cf-cols";
    panel.appendChild(cols);
    grid.appendChild(panel);

    if (window.IDI_LOW_END) {
      var notice = document.createElement("div");
      notice.className = "cf-col cf-low-power";
      notice.innerHTML =
        '<h3>Live history paused</h3><p class="cf-note">Fetch recent public GitLab commits only when you choose to load them.</p>';
      var loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.className = "button button-glass";
      loadButton.textContent = "Load recent commits";
      loadButton.addEventListener(
        "click",
        function () {
          loadButton.disabled = true;
          loadButton.textContent = "Loading commits…";
          loadMemberActivity(member, cols);
        },
        { once: true }
      );
      notice.appendChild(loadButton);
      cols.appendChild(notice);
    } else {
      loadMemberActivity(member, cols);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
