const API = "";

const state = {
  charts: {},
  searchTimer: null,
  searchAbort: null,
  analysisAbort: null,
  suggestions: [],
  activeSuggestionIndex: -1,
  selectedUser: null,
  activePage: "overview",
};

const elements = {
  searchInput: document.getElementById("searchInput"),
  searchButton: document.getElementById("searchButton"),
  demoButton: document.getElementById("demoButton"),
  searchDropdown: document.getElementById("searchDropdown"),
  searchHint: document.getElementById("searchHint"),
  statusBar: document.getElementById("statusBar"),
  heroState: document.getElementById("heroState"),
  loadingSkeleton: document.getElementById("loadingSkeleton"),
  dashboardRoot: document.getElementById("dashboardRoot"),
  toast: document.getElementById("toast"),
  topAvatar: document.getElementById("topAvatar"),
  profileAvatar: document.getElementById("profileAvatar"),
  profileName: document.getElementById("profileName"),
  profileBio: document.getElementById("profileBio"),
  profileRepos: document.getElementById("profileRepos"),
  profileFollowers: document.getElementById("profileFollowers"),
  profileFollowing: document.getElementById("profileFollowing"),
  profileLink: document.getElementById("profileLink"),
  scoreValue: document.getElementById("scoreValue"),
  scoreRing: document.getElementById("scoreRing"),
  stateBadge: document.getElementById("stateBadge"),
  recommendationBadge: document.getElementById("recommendationBadge"),
  trendBadge: document.getElementById("trendBadge"),
  currentStateValue: document.getElementById("currentStateValue"),
  currentTrendValue: document.getElementById("currentTrendValue"),
  insightList: document.getElementById("insightList"),
  heatmap: document.getElementById("heatmap"),
  repoGrid: document.getElementById("repoGrid"),
  languageList: document.getElementById("languageList"),
  riskList: document.getElementById("riskList"),
  timelineList: document.getElementById("timelineList"),
  stateSequence: document.getElementById("stateSequence"),
  skillBadge: document.getElementById("skillBadge"),
  sidebarLinks: [...document.querySelectorAll(".sidebar-link[data-page]")],
  pages: {
    overview: document.getElementById("page-overview"),
    activity: document.getElementById("page-activity"),
    repos: document.getElementById("page-repos"),
    languages: document.getElementById("page-languages"),
    insights: document.getElementById("page-insights"),
  },
};

function setActivePage(pageName) {
  const target = elements.pages[pageName] ? pageName : "overview";
  state.activePage = target;
  Object.entries(elements.pages).forEach(([name, node]) => {
    if (!node) return;
    node.classList.toggle("active-page", name === target);
  });
  elements.sidebarLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.page === target);
  });
}

function initPageNavigation() {
  elements.sidebarLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const page = link.dataset.page || "overview";
      setActivePage(page);
      window.location.hash = page;
    });
  });
  const hash = (window.location.hash || "").replace("#", "").trim();
  setActivePage(hash || "overview");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => elements.toast.classList.add("hidden"), 3200);
}

function setStatus(message, tone = "info") {
  if (!elements.statusBar) return;
  elements.statusBar.textContent = message;
  elements.statusBar.classList.remove("hidden");
  elements.statusBar.style.background = tone === "error" ? "rgba(248, 81, 73, 0.12)" : "rgba(35, 134, 54, 0.12)";
  elements.statusBar.style.borderColor = tone === "error" ? "rgba(248, 81, 73, 0.25)" : "rgba(35, 134, 54, 0.25)";
}

function setLoading(isLoading) {
  if (!elements.loadingSkeleton || !elements.dashboardRoot) return;
  elements.loadingSkeleton.classList.toggle("hidden", !isLoading);
  elements.dashboardRoot.classList.toggle("hidden", isLoading);
}

function clearChart(name) {
  if (state.charts[name]) {
    state.charts[name].destroy();
    state.charts[name] = null;
  }
}

function userAvatar(user) {
  return user?.avatar_url || `https://github.com/${encodeURIComponent(user?.login || "octocat")}.png?size=160`;
}

function recommendationClass(value) {
  if (value === "Strong Hire") return "accent";
  if (value === "Hire") return "accent";
  if (value === "Needs Review") return "neutral";
  return "neutral";
}

function stateTone(value) {
  if (value === "High Performer") return "#3fb950";
  if (value === "Consistent") return "#58a6ff";
  if (value === "Inconsistent") return "#d29922";
  return "#f85149";
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function setSelectedAvatar(url) {
  const safeUrl = url || userAvatar({ login: "octocat" });
  if (elements.topAvatar) elements.topAvatar.src = safeUrl;
  if (elements.profileAvatar) elements.profileAvatar.src = safeUrl;
}

function hideSuggestions() {
  if (!elements.searchDropdown) return;
  elements.searchDropdown.classList.add("hidden");
  elements.searchDropdown.innerHTML = "";
  state.activeSuggestionIndex = -1;
}

function renderSuggestions(items, query) {
  const dropdown = elements.searchDropdown;
  if (!dropdown) return;
  dropdown.innerHTML = "";
  state.suggestions = items;
  state.activeSuggestionIndex = -1;

  if (!query || query.length < 2) {
    dropdown.innerHTML = '<div class="search-dropdown-empty">Type 2 or more characters to search GitHub users.</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  if (!items.length) {
    dropdown.innerHTML = '<div class="search-dropdown-empty">No users found.</div>';
    dropdown.classList.remove("hidden");
    return;
  }

  items.forEach((user, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion-card";
    button.setAttribute("role", "option");
    button.dataset.index = String(index);
    button.innerHTML = `
      <img class="suggestion-avatar" src="${escapeHtml(userAvatar(user))}" alt="${escapeHtml(user.login)} avatar" />
      <div>
        <div class="suggestion-name">${escapeHtml(user.login)}${user.name ? ` <span class="text-muted">${escapeHtml(user.name)}</span>` : ""}</div>
        <div class="suggestion-bio">${escapeHtml(user.bio || "No bio available.")}</div>
      </div>
    `;
    button.addEventListener("mouseenter", () => setActiveSuggestion(index));
    button.addEventListener("click", () => selectUser(user));
    dropdown.appendChild(button);
  });

  dropdown.classList.remove("hidden");
}

function setActiveSuggestion(index) {
  if (!elements.searchDropdown) return;
  state.activeSuggestionIndex = index;
  const cards = [...elements.searchDropdown.querySelectorAll(".suggestion-card")];
  cards.forEach((card, itemIndex) => {
    card.classList.toggle("active", itemIndex === index);
  });
}

async function searchUsers(query) {
  if (state.searchAbort) {
    state.searchAbort.abort();
  }

  if (!query || query.length < 2) {
    hideSuggestions();
    elements.searchHint.textContent = "Type 2 or more characters to search GitHub users.";
    return;
  }

  const controller = new AbortController();
  state.searchAbort = controller;
  elements.searchHint.textContent = "Searching GitHub users...";

  try {
    const response = await fetch(`${API}/search-users?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Search failed");
    }
    renderSuggestions(payload.results || [], query);
    elements.searchHint.textContent = payload.results?.length ? "Use arrow keys to navigate suggestions." : "No matching users found.";
  } catch (error) {
    if (error.name === "AbortError") return;
    elements.searchHint.textContent = error.message;
    hideSuggestions();
  }
}

function queueSearch(query) {
  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => searchUsers(query.trim()), 260);
}

function renderHeatmap(items) {
  const container = elements.heatmap;
  if (!container) return;
  container.innerHTML = "";
  const points = items?.length ? items : Array.from({ length: 98 }, (_, index) => ({ date: String(index), count: 0 }));
  const maxCount = Math.max(...points.map((item) => item.count), 1);
  points.slice(-98).forEach((item) => {
    const cell = document.createElement("div");
    const ratio = item.count / maxCount;
    let level = 0;
    if (ratio > 0.8) level = 4;
    else if (ratio > 0.55) level = 3;
    else if (ratio > 0.25) level = 2;
    else if (ratio > 0) level = 1;
    cell.className = `heatmap-cell level-${level}`;
    cell.title = `${item.date}: ${item.count} commits`;
    container.appendChild(cell);
  });
}

function renderLanguageList(languages) {
  if (!elements.languageList) return;
  const entries = Object.entries(languages || {}).sort((a, b) => b[1] - a[1]);
  elements.languageList.innerHTML = "";
  if (!entries.length) {
    elements.languageList.innerHTML = '<div class="stack-item">No language data available.</div>';
    return;
  }
  entries.forEach(([name, value]) => {
    const item = document.createElement("div");
    item.className = "stack-item";
    item.innerHTML = `<div class="repo-top"><strong>${escapeHtml(name)}</strong><span>${Math.round(value)}%</span></div>`;
    elements.languageList.appendChild(item);
  });
}

function renderInsights(insights) {
  if (!elements.insightList) return;
  elements.insightList.innerHTML = "";
  (insights || []).forEach((insight) => {
    const item = document.createElement("div");
    item.className = "stack-item";
    item.textContent = insight;
    elements.insightList.appendChild(item);
  });
}

function renderRisk(risks) {
  if (!elements.riskList) return;
  elements.riskList.innerHTML = "";
  const items = risks?.length ? risks : ["No major risk flags detected."];
  items.forEach((risk) => {
    const item = document.createElement("div");
    item.className = "risk-card";
    item.textContent = risk;
    elements.riskList.appendChild(item);
  });
}

function renderTimeline(items) {
  if (!elements.timelineList) return;
  elements.timelineList.innerHTML = "";
  const entries = items || [];
  if (!entries.length) {
    elements.timelineList.innerHTML = '<div class="stack-item">No repository activity timeline available.</div>';
    return;
  }
  entries.slice(0, 6).forEach((entry) => {
    const item = document.createElement("div");
    item.className = "timeline-card";
    item.innerHTML = `
      <div class="timeline-top">
        <div>
          <div class="timeline-name">${escapeHtml(entry.name)}</div>
          <div class="timeline-meta">Updated ${escapeHtml(formatDate(entry.updated_at))}</div>
        </div>
        <span class="tag green">${Number(entry.quality_score || 0).toFixed(1)}</span>
      </div>
      <div class="timeline-meta">Pushed ${escapeHtml(formatDate(entry.pushed_at))}</div>
    `;
    elements.timelineList.appendChild(item);
  });
}

function renderRepoGrid(repos) {
  if (!elements.repoGrid) return;
  elements.repoGrid.innerHTML = "";
  const entries = repos || [];
  if (!entries.length) {
    elements.repoGrid.innerHTML = '<div class="stack-item">No repositories available.</div>';
    return;
  }
  entries.slice(0, 6).forEach((repo) => {
    const card = document.createElement("article");
    card.className = "repo-card";
    card.innerHTML = `
      <div class="repo-top">
        <div>
          <div class="repo-name">${escapeHtml(repo.name)}</div>
          <div class="repo-meta">${escapeHtml(repo.description || "No description provided.")}</div>
        </div>
        <span class="tag green">${Number(repo.quality_score || 0).toFixed(1)}</span>
      </div>
      <div class="repo-tags">
        <span class="tag blue">${escapeHtml(repo.language || "Mixed")}</span>
        <span class="tag">★ ${repo.stars}</span>
        <span class="tag">⑂ ${repo.forks}</span>
      </div>
    `;
    elements.repoGrid.appendChild(card);
  });
}

function renderCharts(analysis) {
  const weekly = analysis.analytics.commits_per_week || [];
  const languages = analysis.analytics.languages || {};
  const hiddenStates = analysis.analytics.hidden_state_probabilities || {};

  clearChart("commits");
  clearChart("languages");
  clearChart("states");

  state.charts.commits = new Chart(document.getElementById("commitsChart"), {
    type: "line",
    data: {
      labels: weekly.map((_, index) => `W${index + 1}`),
      datasets: [{
        label: "Commits",
        data: weekly,
        borderColor: "#3fb950",
        backgroundColor: "rgba(63, 185, 80, 0.08)",
        fill: true,
        tension: 0.35,
        pointRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1000 },
      scales: {
        x: { ticks: { color: "#8b949e" }, grid: { color: "rgba(48, 54, 61, 0.55)" } },
        y: { ticks: { color: "#8b949e" }, grid: { color: "rgba(48, 54, 61, 0.55)" } },
      },
      plugins: { legend: { labels: { color: "#c9d1d9" } } },
    },
  });

  state.charts.languages = new Chart(document.getElementById("languagesChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(languages),
      datasets: [{
        data: Object.values(languages),
        backgroundColor: ["#3fb950", "#58a6ff", "#8b949e", "#d29922", "#f85149", "#a371f7"],
        borderColor: "#161b22",
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { color: "#c9d1d9" } } },
    },
  });

  state.charts.states = new Chart(document.getElementById("stateChart"), {
    type: "bar",
    data: {
      labels: Object.keys(hiddenStates),
      datasets: [{
        label: "Probability",
        data: Object.values(hiddenStates),
        backgroundColor: "#3fb950",
        borderRadius: 10,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: "#8b949e" }, grid: { color: "rgba(48, 54, 61, 0.55)" } },
        y: { ticks: { color: "#8b949e" }, grid: { color: "rgba(48, 54, 61, 0.55)" }, suggestedMax: 1 },
      },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (context) => `${(context.raw * 100).toFixed(1)}%` } },
      },
    },
  });
}

function animatePanels() {
  gsap.fromTo(".panel-reveal", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.07, ease: "power2.out" });
}

function renderDashboard(data) {
  if (!elements.dashboardRoot || !elements.heroState) return;
  state.selectedUser = data;
  elements.heroState.classList.add("hidden");
  elements.dashboardRoot.classList.remove("hidden");
  setActivePage("overview");

  const profile = data.profile;
  const avatar = userAvatar(profile);
  setSelectedAvatar(avatar);

  elements.profileName.textContent = profile.name || profile.login;
  elements.profileBio.textContent = profile.bio || "No biography available.";
  elements.profileRepos.textContent = profile.public_repos;
  elements.profileFollowers.textContent = profile.followers;
  elements.profileFollowing.textContent = profile.following;
  elements.profileLink.href = profile.html_url;

  elements.scoreValue.textContent = data.hire_score;
  elements.scoreRing.style.borderColor = `${stateTone(data.state)}33`;
  elements.stateBadge.textContent = data.state;
  elements.stateBadge.style.color = stateTone(data.state);
  elements.stateBadge.style.borderColor = `${stateTone(data.state)}55`;
  elements.recommendationBadge.textContent = data.recommendation;
  elements.recommendationBadge.className = `badge-pill ${recommendationClass(data.recommendation)}`;
  elements.recommendationBadge.style.borderColor = "rgba(35, 134, 54, 0.4)";
  elements.trendBadge.textContent = data.trend;
  elements.currentStateValue.textContent = data.state;
  elements.currentTrendValue.textContent = data.trend;

  const skillLabel = data.insights?.[0]?.replace("Primary skill profile suggests ", "") || "Balanced";
  elements.skillBadge.textContent = skillLabel;

  renderInsights(data.insights || []);
  renderHeatmap(data.analytics.activity_heatmap || []);
  renderRepoGrid(data.analytics.repo_stats || []);
  renderLanguageList(data.analytics.languages || {});
  renderRisk(data.risks || []);
  renderTimeline(data.analytics.repo_timeline || []);
  renderCharts(data);

  elements.stateSequence.innerHTML = "";
  (data.analytics.state_transitions?.sequence || []).forEach((value) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = value;
    elements.stateSequence.appendChild(chip);
  });

  animatePanels();
}

async function loadAnalysis(username) {
  if (!username) {
    showToast("Enter a GitHub username.");
    return;
  }

  if (state.analysisAbort) {
    state.analysisAbort.abort();
  }

  const controller = new AbortController();
  state.analysisAbort = controller;

  hideSuggestions();
  setLoading(true);
  setStatus(`Loading ${username}...`);

  try {
    const response = await fetch(`${API}/analyze-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.detail || "Analysis failed");
    }
    renderDashboard(payload);
    setStatus(`Loaded ${payload.profile.login}.`, "success");
  } catch (error) {
    if (error.name === "AbortError") return;
    setStatus(error.message, "error");
    showToast(error.message);
  } finally {
    setLoading(false);
  }
}

async function selectUser(user) {
  if (!user?.login) return;
  elements.searchInput.value = user.login;
  setSelectedAvatar(userAvatar(user));
  hideSuggestions();
  await loadAnalysis(user.login);
}

function openFromInput() {
  const value = elements.searchInput.value.trim();
  if (!value) {
    showToast("Type a GitHub username first.");
    return;
  }
  loadAnalysis(value);
}

function keyNavigate(event) {
  if (elements.searchDropdown.classList.contains("hidden")) return;
  const max = state.suggestions.length - 1;
  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.activeSuggestionIndex = Math.min(max, state.activeSuggestionIndex + 1);
    if (state.activeSuggestionIndex < 0) state.activeSuggestionIndex = 0;
    setActiveSuggestion(state.activeSuggestionIndex);
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    state.activeSuggestionIndex = Math.max(0, state.activeSuggestionIndex - 1);
    setActiveSuggestion(state.activeSuggestionIndex);
  }
  if (event.key === "Enter") {
    event.preventDefault();
    const active = state.suggestions[state.activeSuggestionIndex] || state.suggestions[0];
    if (active) {
      selectUser(active);
    } else {
      openFromInput();
    }
  }
  if (event.key === "Escape") {
    hideSuggestions();
  }
}

elements.searchInput.addEventListener("input", (event) => queueSearch(event.target.value));
elements.searchInput.addEventListener("keydown", keyNavigate);
elements.searchInput.addEventListener("focus", () => {
  if (state.suggestions.length && elements.searchInput.value.trim().length >= 2) {
    elements.searchDropdown.classList.remove("hidden");
  }
});
elements.searchButton.addEventListener("click", openFromInput);
if (elements.demoButton) {
  elements.demoButton.addEventListener("click", () => {
    elements.searchInput.value = "octocat";
    loadAnalysis("octocat");
  });
}

window.addEventListener("click", (event) => {
  if (!event.target.closest(".topbar-search-wrap")) {
    hideSuggestions();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initPageNavigation();
  if (elements.profileAvatar) elements.profileAvatar.src = userAvatar({ login: "octocat" });
  if (elements.topAvatar) elements.topAvatar.src = userAvatar({ login: "octocat" });
  setStatus("Search GitHub usernames to begin the analysis.");
  elements.searchInput.focus();
});
