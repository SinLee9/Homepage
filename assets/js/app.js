const state = {
  lang: "en",
  profile: null,
  publications: [],
  meta: {},
  filter: "all",
  query: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const strings = {
  en: {
    navResearch: "Research",
    navPublications: "Publications",
    navEducation: "Education",
    navContact: "Contact",
    metricsKicker: "Impact",
    metricsHeading: "Citation Overview",
    metricPublications: "Publications",
    metricCitations: "Citations",
    metricHindex: "h-index",
    metricI10: "i10-index",
    researchKicker: "Research",
    publicationsKicker: "Publications",
    projectsKicker: "Projects",
    educationKicker: "Education",
    contactKicker: "Contact",
    searchLabel: "Search",
    searchPlaceholder: "Title, author, venue",
    filterAll: "All",
    filterSelected: "Selected",
    filterJournal: "Journal",
    filterConference: "Conference",
    filterPreprint: "Preprint",
    selected: "Selected",
    updated: "Updated",
    noResults: "No indexed publications match the current view.",
    loadError: "Could not load homepage data.",
    affiliation: "Affiliation",
    email: "Email",
    profiles: "Profiles",
    citations: "citations",
    citationSource: "Citation data follows the public Google Scholar profile when available.",
    journalArticles: "Journal Articles",
    conferencePapers: "Conference Papers",
    preprints: "Preprints",
    typeLabels: {
      journal: "Journal",
      conference: "Conference",
      preprint: "Preprint",
      other: "Other"
    }
  },
  zh: {
    navResearch: "研究",
    navPublications: "论文",
    navEducation: "教育背景",
    navContact: "联系",
    metricsKicker: "学术影响",
    metricsHeading: "引用概览",
    metricPublications: "论文",
    metricCitations: "引用",
    metricHindex: "h-index",
    metricI10: "i10-index",
    researchKicker: "研究",
    publicationsKicker: "学术论文",
    projectsKicker: "项目",
    educationKicker: "教育背景",
    contactKicker: "联系方式",
    searchLabel: "检索",
    searchPlaceholder: "标题、作者、期刊/会议",
    filterAll: "全部",
    filterSelected: "代表作",
    filterJournal: "期刊",
    filterConference: "会议",
    filterPreprint: "预印本",
    selected: "代表作",
    updated: "更新于",
    noResults: "当前条件下没有匹配的公开索引论文。",
    loadError: "主页数据加载失败。",
    affiliation: "单位",
    email: "邮箱",
    profiles: "主页",
    citations: "次引用",
    citationSource: "引用数据优先采用公开 Google Scholar 个人主页。",
    journalArticles: "期刊论文",
    conferencePapers: "会议论文",
    preprints: "预印本",
    typeLabels: {
      journal: "期刊",
      conference: "会议",
      preprint: "预印本",
      other: "其他"
    }
  }
};

const esc = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

async function loadJson(path) {
  const response = await fetch(`${path}?t=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function t(key) {
  return strings[state.lang][key] || strings.en[key] || key;
}

function detectLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (["en", "zh"].includes(queryLang)) return queryLang;
  const saved = localStorage.getItem("homepage-language");
  if (["en", "zh"].includes(saved)) return saved;
  return navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function setLanguage(lang, persist = true) {
  state.lang = ["en", "zh"].includes(lang) ? lang : "en";
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  if (persist) localStorage.setItem("homepage-language", state.lang);
  $$(".language-toggle button").forEach(button => {
    button.classList.toggle("is-active", button.dataset.lang === state.lang);
  });
}

function applyStaticText() {
  $$("[data-i18n]").forEach(node => {
    node.textContent = t(node.dataset.i18n);
  });
  $("#publication-search").placeholder = t("searchPlaceholder");
}

function targetAttr(url) {
  return url && url.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
}

function linkMarkup(link, index = 0) {
  const classes = index === 0 ? "button-link primary" : "button-link";
  return `<a class="${classes}" href="${esc(link.url)}"${targetAttr(link.url)}>${esc(link.label)}</a>`;
}

function inlineLinks(links) {
  return links
    .map(link => `<a href="${esc(link.url)}"${targetAttr(link.url)}>${esc(link.label)}</a>`)
    .join(" <span class=\"link-dot\">/</span> ");
}

function scholarProfile(profile) {
  return (profile.externalProfiles || []).find(item => item.label === "Google Scholar");
}

function renderProfile(profile) {
  document.title = `${profile.name} | Academic Homepage`;
  $("#profile-affiliation").textContent = profile.affiliation.short;
  $("#profile-name").textContent = profile.name;
  $("#profile-title").textContent = profile.title;
  $("#profile-summary").textContent = profile.summary;
  $("#profile-photo").src = profile.photo.src;
  $("#profile-photo").alt = profile.photo.alt;
  $("#brand-name").textContent = profile.name;
  $("#footer-name").textContent = profile.name;
  $("#research-heading").textContent = profile.sectionHeadings.research;
  $("#publications-heading").textContent = profile.sectionHeadings.publications;
  $("#projects-heading").textContent = profile.sectionHeadings.projects;
  $("#education-heading").textContent = profile.sectionHeadings.education;
  $("#contact-heading").textContent = profile.sectionHeadings.contact;

  const scholar = scholarProfile(profile);
  if (scholar) {
    $("#scholar-profile-link").href = scholar.url;
  }

  $("#profile-links").innerHTML = profile.links.map(linkMarkup).join("");

  const facts = [
    [t("affiliation"), esc(profile.affiliation.full)],
    [t("email"), `<a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>`],
    [t("profiles"), inlineLinks(profile.externalProfiles)]
  ];
  $("#quick-facts").innerHTML = facts
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`)
    .join("");

  $("#education-list").innerHTML = profile.education
    .map(item => `
      <li class="timeline-item">
        <div class="timeline-years">${esc(item.years)}</div>
        <div>
          <div class="timeline-degree">${esc(item.degree)}</div>
          <div class="timeline-place">${esc(item.school)}</div>
        </div>
      </li>
    `)
    .join("");

  $("#research-area-list").innerHTML = (profile.researchAreas || [])
    .map(item => `
      <article class="research-area">
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
      </article>
    `)
    .join("");

  const projectsSection = $("#projects");
  if (profile.projects && profile.projects.length) {
    projectsSection.hidden = false;
    $("#project-list").innerHTML = profile.projects
      .map(item => `
        <article class="project-card">
          <div class="project-period">${esc(item.period)}</div>
          <h3>${esc(item.title)}</h3>
          <p>${esc(item.description)}</p>
        </article>
      `)
      .join("");
  } else {
    projectsSection.hidden = true;
  }

  const contactLinks = [
    { label: t("email"), url: `mailto:${profile.email}` },
    ...profile.externalProfiles,
    { label: "CV", url: `cv.html?lang=${state.lang}` }
  ];
  $("#contact-links").innerHTML = contactLinks.map(linkMarkup).join("");
}

function publicationText(pub) {
  return [
    pub.title,
    pub.venue,
    pub.venueDetail,
    pub.venueGroup,
    ...(pub.authors || []),
    ...(pub.keywords || [])
  ].join(" ").toLowerCase();
}

function matchesFilter(pub) {
  if (state.filter === "all") return true;
  if (state.filter === "selected") return Boolean(pub.selected);
  return pub.type === state.filter;
}

function matchesQuery(pub) {
  return !state.query || publicationText(pub).includes(state.query);
}

function typeLabel(type) {
  return strings[state.lang].typeLabels[type] || strings[state.lang].typeLabels.other;
}

function groupLabel(value) {
  if (value === "Journal Articles") return t("journalArticles");
  if (value === "Conference Papers") return t("conferencePapers");
  if (value === "Preprints") return t("preprints");
  return value || t("journalArticles");
}

function authorText(authors) {
  return (authors || []).join(", ");
}

function linkList(pub) {
  const links = pub.links || [];
  if (links.length) return links;
  return [{ label: "Scholar", url: `https://scholar.google.com/scholar?q=${encodeURIComponent(pub.title)}` }];
}

function primaryPublicationUrl(pub) {
  const links = linkList(pub);
  const preferred = links.find(link => ["DOI", "DBLP", "Scholar"].includes(link.label));
  return (preferred || links[0] || {}).url || "";
}

function citationText(pub) {
  const value = Number(pub.citationCount);
  return Number.isFinite(value) ? `${value} ${t("citations")}` : "";
}

function referenceMarkup(pub, index) {
  const url = primaryPublicationUrl(pub);
  const title = url
    ? `<a class="pub-title-link" href="${esc(url)}" target="_blank" rel="noreferrer">${esc(pub.title)}</a>`
    : esc(pub.title);
  const detail = pub.venueDetail ? `, ${esc(pub.venueDetail)}` : "";
  const selected = pub.selected ? `<span class="pill selected">${esc(t("selected"))}</span>` : "";
  const cite = citationText(pub) ? `<span class="pub-citations">${esc(citationText(pub))}</span>` : "";
  return `
    <li class="reference-item">
      <div class="reference-index">[${index}]</div>
      <div class="reference-body">
        <p>${esc(authorText(pub.authors))}. ${title}. <em>${esc(pub.venue)}</em>${detail}, ${esc(pub.year)}.</p>
        <div class="pub-meta compact">
          <span class="pill">${esc(typeLabel(pub.type))}</span>
          ${selected}
          ${cite}
          <span class="pub-links-inline">${inlineLinks(linkList(pub))}</span>
        </div>
      </div>
    </li>
  `;
}

function renderPublications() {
  const list = $("#publication-list");
  const pubs = state.publications
    .filter(pub => matchesFilter(pub) && matchesQuery(pub))
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || a.title.localeCompare(b.title));

  if (!pubs.length) {
    list.innerHTML = `<div class="empty-state">${esc(t("noResults"))}</div>`;
    return;
  }

  let index = 1;
  const groups = new Map();
  for (const pub of pubs) {
    const group = pub.venueGroup || (pub.type === "conference" ? "Conference Papers" : "Journal Articles");
    const venue = pub.type === "journal" ? pub.venue : groupLabel(group);
    const key = `${group}::${venue}`;
    if (!groups.has(key)) {
      groups.set(key, { group, venue, items: [] });
    }
    groups.get(key).items.push(pub);
  }

  list.innerHTML = Array.from(groups.values()).map(group => {
    const heading = group.group === "Journal Articles"
      ? `${groupLabel(group.group)} / ${esc(group.venue)}`
      : groupLabel(group.group);
    const items = group.items.map(pub => referenceMarkup(pub, index++)).join("");
    return `
      <section class="publication-group">
        <h3>${heading}</h3>
        <ol>${items}</ol>
      </section>
    `;
  }).join("");
}

function computedMetrics() {
  const scholar = state.meta.scholarMetrics || {};
  if (Number.isFinite(Number(scholar.citations))) {
    return {
      citations: Number(scholar.citations),
      h: Number(scholar.hIndex),
      i10: Number(scholar.i10Index)
    };
  }
  const citations = state.publications
    .map(pub => Number(pub.citationCount))
    .filter(value => Number.isFinite(value));
  const sorted = citations.slice().sort((a, b) => b - a);
  const h = sorted.reduce((acc, value, index) => value >= index + 1 ? index + 1 : acc, 0);
  return {
    citations: sorted.reduce((sum, value) => sum + value, 0),
    h,
    i10: sorted.filter(value => value >= 10).length
  };
}

function renderCitationChart() {
  const items = state.meta.citationsByYear || [];
  if (!items.length) {
    $("#citation-year-chart").innerHTML = "";
    return;
  }
  const max = Math.max(...items.map(item => Number(item.count) || 0), 1);
  $("#citation-year-chart").innerHTML = `
    <div class="chart-bars">
      ${items.map(item => `
        <div class="chart-bar">
          <span class="chart-value">${esc(item.count)}</span>
          <i style="height:${Math.max(12, (Number(item.count) / max) * 100).toFixed(1)}%"></i>
          <span class="chart-year">${esc(item.year)}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMetrics(meta) {
  state.meta = meta || {};
  const metrics = computedMetrics();
  $("#metric-publications").textContent = state.publications.length;
  $("#metric-citations").textContent = Number.isFinite(metrics.citations) ? metrics.citations : "--";
  $("#metric-hindex").textContent = Number.isFinite(metrics.h) ? metrics.h : "--";
  $("#metric-i10").textContent = Number.isFinite(metrics.i10) ? metrics.i10 : "--";
  $("#footer-year").textContent = `${t("updated")} ${meta.updated || state.profile.updated}`;
  $("#updated-note").textContent = `${t("updated")} ${meta.updated || state.profile.updated} · ${t("citationSource")}`;
  renderCitationChart();
}

function bindControls() {
  $("#publication-search").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderPublications();
  });

  $$(".segmented-control button").forEach(button => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      $$(".segmented-control button").forEach(item => item.classList.toggle("is-active", item === button));
      renderPublications();
    });
  });

  $$(".language-toggle button").forEach(button => {
    button.addEventListener("click", async () => {
      if (button.dataset.lang === state.lang) return;
      setLanguage(button.dataset.lang);
      await loadAndRender();
    });
  });
}

async function loadProfile(lang) {
  try {
    return await loadJson(`data/profile.${lang}.json`);
  } catch (_) {
    return loadJson("data/profile.json");
  }
}

async function loadAndRender() {
  const [profile, publicationData] = await Promise.all([
    loadProfile(state.lang),
    loadJson("data/publications.json")
  ]);

  state.profile = profile;
  state.publications = (publicationData.items || []).filter(pub => pub.type !== "manuscript");
  applyStaticText();
  renderProfile(profile);
  renderMetrics(publicationData.meta || {});
  renderPublications();
}

async function init() {
  try {
    setLanguage(detectLanguage(), false);
    bindControls();
    await loadAndRender();
  } catch (error) {
    $("#publication-list").innerHTML = `<div class="empty-state">${esc(t("loadError"))}</div>`;
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", init);
