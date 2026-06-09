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
    navProjects: "Projects",
    navEducation: "Education",
    navContact: "Contact",
    metricPublications: "Publications and manuscripts",
    metricSelected: "Selected recent works",
    metricYear: "Current year",
    researchKicker: "Research",
    publicationsKicker: "Publications",
    projectsKicker: "Projects",
    educationKicker: "Background",
    contactKicker: "Contact",
    searchLabel: "Search",
    searchPlaceholder: "Title, author, keyword",
    filterAll: "All",
    filterSelected: "Selected",
    filterJournal: "Journal",
    filterConference: "Conference",
    filterPreprint: "Preprint",
    filterManuscript: "Manuscript",
    filterOther: "Other",
    selected: "Selected",
    updated: "Data updated",
    noResults: "No publications match the current view.",
    loadError: "Could not load homepage data. Start a local static server or deploy the folder to a web server.",
    affiliation: "Affiliation",
    location: "Location",
    email: "Email",
    profiles: "Profiles",
    sources: "Sources",
    linkTitle: "Title link",
    typeLabels: {
      journal: "Journal",
      conference: "Conference",
      preprint: "Preprint",
      manuscript: "Manuscript",
      book: "Book",
      other: "Other"
    }
  },
  zh: {
    navResearch: "研究方向",
    navPublications: "论文",
    navProjects: "项目",
    navEducation: "教育背景",
    navContact: "联系方式",
    metricPublications: "论文与稿件",
    metricSelected: "代表性工作",
    metricYear: "当前年份",
    researchKicker: "研究方向",
    publicationsKicker: "学术论文",
    projectsKicker: "研究项目",
    educationKicker: "教育背景",
    contactKicker: "联系方式",
    searchLabel: "检索",
    searchPlaceholder: "标题、作者、关键词",
    filterAll: "全部",
    filterSelected: "代表作",
    filterJournal: "期刊",
    filterConference: "会议",
    filterPreprint: "预印本",
    filterManuscript: "稿件",
    filterOther: "其他",
    selected: "代表作",
    updated: "数据更新时间",
    noResults: "当前条件下没有匹配的论文。",
    loadError: "主页数据加载失败。请启动本地静态服务器或部署到 Web 服务器。",
    affiliation: "单位",
    location: "地点",
    email: "邮箱",
    profiles: "学术主页",
    sources: "数据源",
    linkTitle: "题名链接",
    typeLabels: {
      journal: "期刊",
      conference: "会议",
      preprint: "预印本",
      manuscript: "稿件",
      book: "图书",
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
  if (!response.ok) {
    throw new Error(`Could not load ${path}`);
  }
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
  if (persist) {
    localStorage.setItem("homepage-language", state.lang);
  }
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

function linkMarkup(link, index = 0) {
  const classes = index === 0 ? "button-link primary" : "button-link";
  const target = link.url.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
  return `<a class="${classes}" href="${esc(link.url)}"${target}>${esc(link.label)}</a>`;
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
    [t("affiliation"), profile.affiliation.full],
    [t("location"), profile.location],
    [t("email"), profile.email],
    [t("profiles"), profile.externalProfiles.map(item => item.label).join(" / ")]
  ];
  $("#quick-facts").innerHTML = facts
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join("");

  $("#research-interests").innerHTML = profile.researchInterests
    .map((item, index) => `
      <article class="research-card">
        <span class="research-index">${String(index + 1).padStart(2, "0")}</span>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
      </article>
    `)
    .join("");

  $("#project-list").innerHTML = profile.projects
    .map(item => `
      <article class="project-card">
        <div class="project-period">${esc(item.period)}</div>
        <h3>${esc(item.title)}</h3>
        <p>${esc(item.description)}</p>
      </article>
    `)
    .join("");

  $("#education-list").innerHTML = profile.education
    .map(item => `
      <li class="timeline-item">
        <div class="timeline-years">${esc(item.years)}</div>
        <div>
          <div class="timeline-degree">${esc(item.degree)}</div>
          <div class="timeline-place">${esc(item.school)}</div>
          ${item.description ? `<div class="timeline-desc">${esc(item.description)}</div>` : ""}
        </div>
      </li>
    `)
    .join("");

  const contactLinks = [
    { label: t("email"), url: `mailto:${profile.email}` },
    { label: "ORCID", url: "https://orcid.org/0000-0002-7947-9004" },
    { label: "DBLP", url: "https://dblp.org/pid/74/2397-76.html" },
    { label: profile.links[0].label, url: "assets/cv.pdf" }
  ];
  $("#contact-links").innerHTML = contactLinks.map(linkMarkup).join("");
}

function publicationText(pub) {
  return [
    pub.title,
    pub.venue,
    pub.status,
    pub.abstract,
    pub.abstractZh,
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
  if (!state.query) return true;
  return publicationText(pub).includes(state.query);
}

function authorMarkup(authors) {
  return authors
    .map(author => author === "Zhen Li" ? `<strong>${esc(author)}</strong>` : esc(author))
    .join(", ");
}

function primaryPublicationUrl(pub) {
  const preferred = (pub.links || []).find(link => ["Journal / DOI", "DBLP", "Search"].includes(link.label));
  const fallback = (pub.links || [])[0];
  return (preferred || fallback || {}).url || "";
}

function typeLabel(type) {
  return strings[state.lang].typeLabels[type] || strings[state.lang].typeLabels.other;
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

  list.innerHTML = pubs.map(pub => {
    const links = (pub.links || [])
      .map(link => {
        const target = link.url.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
        return `<a href="${esc(link.url)}"${target}>${esc(link.label)}</a>`;
      })
      .join("");
    const selected = pub.selected ? `<span class="pill selected">${esc(t("selected"))}</span>` : "";
    const keywords = (pub.keywords || []).slice(0, 4)
      .map(keyword => `<span class="pill">${esc(keyword)}</span>`)
      .join("");
    const summary = state.lang === "zh" && pub.abstractZh ? pub.abstractZh : pub.abstract;
    const titleUrl = primaryPublicationUrl(pub);
    const titleMarkup = titleUrl
      ? `<a class="pub-title-link" href="${esc(titleUrl)}" target="_blank" rel="noreferrer">${esc(pub.title)}</a>`
      : esc(pub.title);

    return `
      <article class="publication-card">
        <div class="pub-year">${esc(pub.year)}</div>
        <div>
          <h3>${titleMarkup}</h3>
          <p class="authors">${authorMarkup(pub.authors || [])}</p>
          <p class="venue">${esc(pub.venue)}${pub.status ? ` · ${esc(pub.status)}` : ""}</p>
          ${summary ? `<p class="abstract">${esc(summary)}</p>` : ""}
          <div class="pub-meta">
            <span class="pill">${esc(typeLabel(pub.type))}</span>
            ${selected}
            ${keywords}
          </div>
          ${links ? `<div class="pub-links">${links}</div>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

function renderMetrics(meta) {
  const selectedCount = state.publications.filter(pub => pub.selected).length;
  $("#metric-publications").textContent = state.publications.length;
  $("#metric-selected").textContent = selectedCount;
  $("#metric-year").textContent = new Date().getFullYear();
  $("#footer-year").textContent = `${t("updated")} ${meta.updated || state.profile.updated}`;
  $("#updated-note").textContent = `${t("updated")} ${meta.updated || state.profile.updated}`;
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
