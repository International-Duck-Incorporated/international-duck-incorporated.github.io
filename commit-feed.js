/* Live commit feed for member pages.
 * Reads each member's recent commits straight from the public GitHub and
 * GitLab REST APIs (no tokens, no build step) and renders them as a panel
 * appended to the member page's detail grid.
 */
(function () {
  "use strict";

  var MEMBERS = {
    "superivar":  { label: "Xx-superIvar-xX", github: "Xx-superIvar-xX", gitlab: "Xx-superIvar-xX" },
    "0xffshell":  { label: "0xFFshell",       github: null,              gitlab: "0xFFshell" },
    "3spress0":   { label: "3spress0",        github: null,              gitlab: "espress0" },
    "e-vdv-hu":   { label: "E-VDV-HU",        github: "E-VDV-HU",        gitlab: null },
    "midas735":   { label: "midas735",        github: "midas735",        gitlab: null },
    "jojo-8002":  { label: "Jojo-8002",       github: "Jojo-8002",       gitlab: false }
  };

  var GH_API = "https://api.github.com";
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
    var m = s / 60; if (m < 90) return Math.round(m) + "m ago";
    var h = m / 60; if (h < 36) return Math.round(h) + "h ago";
    var d = h / 24; if (d < 14) return Math.round(d) + "d ago";
    return new Date(iso).toLocaleDateString();
  }

  function getJSON(url) {
    return fetch(url, { headers: { Accept: "application/json" } }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status + " for " + url);
      return r.json();
    });
  }

  /* ---- GitHub: commit search API (events API no longer includes commit
   * payloads). Note: search only indexes default branches, so commits that
   * live exclusively on unmerged branches will not appear. ---- */
  function fetchGitHubCommits(username) {
    return getJSON(GH_API + "/search/commits?q=author:" + encodeURIComponent(username) +
      "&sort=author-date&order=desc&per_page=" + MAX_COMMITS)
      .then(function (data) {
        return (data.items || []).map(function (c) {
          return {
            title: (c.commit.message || "").split("\n")[0],
            repo: c.repository && c.repository.full_name,
            url: c.html_url,
            sha: c.sha.slice(0, 7),
            date: c.commit.author.date
          };
        });
      });
  }

  /* ---- GitLab: resolve username -> id -> pushed events ---- */
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
        var pushes = (events || []).filter(function (ev) {
          return ev.push_data && ev.push_data.commit_to;
        }).slice(0, MAX_COMMITS);
        return Promise.all(pushes.map(function (ev) {
          return glProject(ev.project_id).then(function (proj) {
            var sha = ev.push_data.commit_to;
            return {
              title: ev.push_data.commit_title || "(" + ev.push_data.action + " " + ev.push_data.ref + ")",
              repo: proj.path_with_namespace,
              url: proj.web_url ? proj.web_url + "/-/commit/" + sha : null,
              sha: sha.slice(0, 7),
              date: ev.created_at,
              extra: ev.push_data.commit_count > 1 ? "+" + (ev.push_data.commit_count - 1) + " more in push" : null
            };
          });
        }));
      });
  }

  /* ---- rendering ---- */
  function renderList(el, commits, emptyText) {
    if (!commits.length) {
      el.innerHTML = '<p class="cf-note">' + esc(emptyText) + "</p>";
      return;
    }
    el.innerHTML = "<ul class=\"cf-list\">" + commits.map(function (c) {
      var title = c.url
        ? '<a href="' + esc(c.url) + '" target="_blank" rel="noreferrer">' + esc(c.title) + "</a>"
        : esc(c.title);
      return "<li><b>" + title + "</b><small><code>" + esc(c.sha) + "</code> · " +
        esc(c.repo) + " · " + esc(timeAgo(c.date)) +
        (c.extra ? " · " + esc(c.extra) : "") + "</small></li>";
    }).join("") + "</ul>";
  }

  function column(host, heading) {
    var div = document.createElement("div");
    div.className = "cf-col";
    div.innerHTML = "<h3>" + esc(heading) + "</h3><p class=\"cf-note\">Loading\u2026</p>";
    host.appendChild(div);
    return div;
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
    var sources = [];
    if (member.github) sources.push("GitHub");
    if (member.gitlab) sources.push("GitLab");
    panel.innerHTML = '<span class="eyebrow">Live public activity</span>' +
      "<h2>Recent commits by " + esc(member.label) + ".</h2>" +
      '<p>Loaded from the public ' + esc(sources.join(" and ")) + " API" + (sources.length > 1 ? "s" : "") + ' when you opened this page.</p>';
    var cols = document.createElement("div");
    cols.className = "cf-cols";
    panel.appendChild(cols);
    grid.appendChild(panel);

    if (member.github) {
      var gh = column(cols, "GitHub \u00b7 @" + member.github);
      fetchGitHubCommits(member.github).then(function (commits) {
        gh.innerHTML = "<h3>GitHub \u00b7 @" + esc(member.github) + "</h3>";
        var box = document.createElement("div");
        gh.appendChild(box);
        renderList(box, commits, "No public commits indexed. (Commits hiding on unmerged branches don't count.)");
      }).catch(function (err) {
        gh.innerHTML = "<h3>GitHub \u00b7 @" + esc(member.github) + "</h3>" +
          '<p class="cf-note">Could not load GitHub activity (' + esc(err.message) + "). API rate limits or a hidden profile can cause this.</p>";
      });
    } else {
      column(cols, "GitHub").innerHTML = "<h3>GitHub</h3><p class=\"cf-note\">No public GitHub account on record for " + esc(member.label) + ".</p>";
    }

    if (member.gitlab) {
      var gl = column(cols, "GitLab \u00b7 @" + member.gitlab);
      fetchGitLabCommits(member.gitlab).then(function (commits) {
        gl.innerHTML = "<h3>GitLab \u00b7 @" + esc(member.gitlab) + "</h3>";
        var box = document.createElement("div");
        gl.appendChild(box);
        renderList(box, commits, "No pushed commits in the recent event feed.");
      }).catch(function (err) {
        gl.innerHTML = "<h3>GitLab \u00b7 @" + esc(member.gitlab) + "</h3>" +
          '<p class="cf-note">Could not load GitLab activity (' + esc(err.message) + ").</p>";
      });
    } else if (member.gitlab !== false) {
      column(cols, "GitLab").innerHTML = "<h3>GitLab</h3><p class=\"cf-note\">No public GitLab account on record for " + esc(member.label) + ".</p>";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
