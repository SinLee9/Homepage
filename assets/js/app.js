const state = {
  lang: "en",
  profile: null,
  publications: [],
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
    filterManuscript: "Manuscript",
    selected: "Selected",
    updated: "Updated",
    noResults: "No publications match the current view.",
    loadError: "Could not load homepage data.",
    affiliation: "Affiliation",
    location: "Location",
    email: "Email",
    profiles: "Profiles",
    citations: "citations",
    citationSource: "Citation metrics use indexed records when available.",
    typeLabels: {
      journal: "Journal",
      conference: "Conference",
      preprint: "Preprint",
      manuscript: "Manuscript",
      other: "Other"
    }
  },
  zh: {
    navResearch: "研究",
    navPublications: "论文",
    navEducation: "教育背景",
    navContact: "联系",
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
    filterManuscript: "稿件",
    selected: "代表作",
    updated: "更新于",
    noResults: "当前条件下没有匹配的论文。",
    loadError: "主页数据加载失败。",
    affiliation: "单位",
    location: "地点",
    email: "邮箱",
    profiles: "主页",
    citations: "次引用",
    citationSource: "引用指标来自可检索记录；Google Scholar 个人主页 ID 可后续接入。",
    typeLabels: {
      journal: "期刊",
      conference: "会议",
      preprint: "预印本",
      manuscript: "稿件",
      other: "其他"
    }
  }
};

const stopwords = new Set([
  "the", "and", "for", "with", "from", "over", "under", "into", "using", "based",
  "codes", "code", "coding", "class", "classes", "note", "new", "some", "related",
  "method", "methods", "system", "systems", "channel", "channels", "error", "errors",
  "single", "one", "two", "length", "bounded", "zhen", "li"
]);

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
    pub.status,
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

function authorMarkup(authors) {
  return authors
    .map(author => author === "Zhen Li" ? `<strong>${esc(author)}</strong>` : esc(author))
    .join(", ");
}

function scholarSearchUrl(title) {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(title)}`;
}

function publicationLinks(pub) {
  const links = (pub.links || [])
    .filter(link => link.label !== "PDF")
    .map(link => ({ label: link.label.replace("Journal / DOI", "DOI"), url: link.url }));
  if (!links.some(link => link.label === "Scholar")) {
    links.push({ label: "Scholar", url: scholarSearchUrl(pub.title) });
  }
  return links;
}

function primaryPublicationUrl(pub) {
  const links = publicationLinks(pub);
  const preferred = links.find(link => ["DOI", "DBLP", "Scholar"].includes(link.label));
  return (preferred || links[0] || {}).url || "";
}

function renderPublications() {
  const list = $("#publication-list");
  const pubs = state.publications
    .filter(pub => matchesFilter(pub) && matchesQuery(pub))
    .sort((a, b) => (b.year - a.year) || a.title.localeCompare(b.title));

  if (!pubs.length) {
    list.innerHTML = `<div class="empty-state">${esc(t("noResults"))}</div>`;
    return;
  }

  list.innerHTML = pubs.map((pub, index) => {
    const titleUrl = primaryPublicationUrl(pub);
    const officialLinks = publicationLinks(pub);
    const selected = pub.selected ? `<span class="pill selected">${esc(t("selected"))}</span>` : "";
    const citationCount = Number.isFinite(Number(pub.citationCount)) ? Number(pub.citationCount) : null;
    const citationText = citationCount === null ? "" : `<span class="pub-citations">${citationCount} ${esc(t("citations"))}</span>`;
    const titleMarkup = titleUrl
      ? `<a class="pub-title-link" href="${esc(titleUrl)}" target="_blank" rel="noreferrer">${esc(pub.title)}</a>`
      : esc(pub.title);

    return `
      <article class="publication-row">
        <div class="pub-index">${index + 1}</div>
        <div class="pub-main">
          <h3>${titleMarkup}</h3>
          <p class="authors">${authorMarkup(pub.authors || [])}</p>
          <p class="venue">${esc(pub.venue)} · ${esc(pub.year)}</p>
          <div class="pub-meta compact">
            <span class="pill">${esc(typeLabel(pub.type))}</span>
            ${selected}
            ${citationText}
            <span class="pub-links-inline">${inlineLinks(officialLinks)}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function computeMetrics() {
  const citations = state.publications
    .map(pub => Number(pub.citationCount))
    .filter(value => Number.isFinite(value));
  if (!citations.length) {
    return { total: null, h: null, i10: null };
  }
  const sorted = citations.slice().sort((a, b) => b - a);
  const h = sorted.reduce((acc, value, index) => value >= index + 1 ? index + 1 : acc, 0);
  return {
    total: sorted.reduce((sum, value) => sum + value, 0),
    h,
    i10: sorted.filter(value => value >= 10).length
  };
}

function normalizeKeyword(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+/\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordTokens(pub) {
  const explicit = (pub.keywords || [])
    .map(normalizeKeyword)
    .filter(keyword => keyword.length >= 3);
  if (explicit.length) return explicit;

  const title = (pub.title || "")
    .replace(/[+/:_-]/g, " ")
    .split(/\s+/);
  return title
    .map(token => token.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(token => token.length >= 3 && !stopwords.has(token));
}

function renderKeywordTrends() {
  const currentYear = new Date().getFullYear();
  const scores = new Map();
  for (const pub of state.publications) {
    const year = Number(pub.year) || currentYear;
    const recency = Math.max(0.35, 1 + (year - currentYear + 5) * 0.18);
    const citations = Number(pub.citationCount);
    const citeBoost = Number.isFinite(citations) ? Math.log1p(citations) * 0.08 : 0;
    const weight = recency + citeBoost;
    const seen = new Set(keywordTokens(pub));
    for (const token of seen) {
      scores.set(token, (scores.get(token) || 0) + weight);
    }
  }
  const items = Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const max = Math.max(...items.map(([, value]) => value), 1);
  $("#keyword-list").innerHTML = items.map(([keyword, score], index) => `
    <div class="keyword-row">
      <div class="keyword-rank">${String(index + 1).padStart(2, "0")}</div>
      <div class="keyword-body">
        <div class="keyword-topline">
          <span>${esc(keyword)}</span>
          <span>${score.toFixed(1)}</span>
        </div>
        <div class="keyword-bar"><span style="width:${Math.max(8, (score / max) * 100).toFixed(1)}%"></span></div>
      </div>
    </div>
  `).join("");
}

function renderMetrics(meta) {
  const metrics = computeMetrics();
  $("#metric-publications").textContent = state.publications.length;
  $("#metric-citations").textContent = metrics.total === null ? "--" : metrics.total;
  $("#metric-hindex").textContent = metrics.h === null ? "--" : metrics.h;
  $("#metric-i10").textContent = metrics.i10 === null ? "--" : metrics.i10;
  $("#footer-year").textContent = `${t("updated")} ${meta.updated || state.profile.updated}`;
  $("#updated-note").textContent = `${t("updated")} ${meta.updated || state.profile.updated} · ${t("citationSource")}`;
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
  state.publications = publicationData.items || [];
  applyStaticText();
  renderProfile(profile);
  renderMetrics(publicationData.meta || {});
  renderKeywordTrends();
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
