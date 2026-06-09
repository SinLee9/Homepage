const state = {
  lang: "en",
  profile: null,
  publications: [],
  meta: {},
  filters: {
    type: "all",
    coauthor: "",
    venue: ""
  },
  query: ""
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const strings = {
  en: {
    navBio: "Bio",
    navResearch: "Research",
    navPublications: "Publications",
    navEducation: "Education",
    navContact: "Contact",
    navCv: "CV",
    bioKicker: "Biography",
    bioHeading: "Bio",
    metricsKicker: "Impact",
    metricsHeading: "Citation Overview",
    metricPublications: "Publications",
    metricCitations: "Citations",
    metricHindex: "h-index",
    metricI10: "i10-index",
    researchKicker: "Research",
    publicationsKicker: "Publications",
    educationKicker: "Education",
    contactKicker: "Contact",
    searchLabel: "Refine by search term",
    searchPlaceholder: "title, author, venue",
    updated: "Updated",
    noResults: "No indexed publications match the current view.",
    loadError: "Could not load homepage data.",
    affiliation: "Affiliation",
    email: "Email",
    profiles: "Profiles",
    citations: "citations",
    citationSource: "Citation data follows the public Google Scholar profile when available.",
    refineType: "Refine by type",
    coauthorsHeading: "Co-authors",
    refineVenue: "Refine by venue",
    allTypes: "show all",
    dismissAll: "clear filter",
    typeLabels: {
      journal: "Journal Articles",
      conference: "Conference and Workshop Papers",
      preprint: "Informal and Other Publications",
      other: "Other"
    }
  },
  zh: {
    navBio: "个人简介",
    navResearch: "研究方向",
    navPublications: "学术论文",
    navEducation: "教育背景",
    navContact: "联系方式",
    navCv: "简历",
    bioKicker: "个人简介",
    bioHeading: "个人简介",
    metricsKicker: "学术影响",
    metricsHeading: "引文概览",
    metricPublications: "论文",
    metricCitations: "引用",
    metricHindex: "h-index",
    metricI10: "i10-index",
    researchKicker: "研究方向",
    publicationsKicker: "学术论文",
    educationKicker: "教育背景",
    contactKicker: "联系方式",
    searchLabel: "按检索词筛选",
    searchPlaceholder: "标题、作者、期刊或会议",
    updated: "更新于",
    noResults: "当前条件下没有匹配的公开索引论文。",
    loadError: "主页数据加载失败。",
    affiliation: "单位",
    email: "邮箱",
    profiles: "学术主页",
    citations: "次引用",
    citationSource: "引文数据优先采用公开 Google Scholar 主页。",
    refineType: "按类型筛选",
    coauthorsHeading: "合作作者",
    refineVenue: "按刊物筛选",
    allTypes: "显示全部",
    dismissAll: "清除筛选",
    typeLabels: {
      journal: "期刊论文",
      conference: "会议论文",
      preprint: "非正式与其他出版物",
      other: "其他"
    }
  }
};

const authorDirectory = {
  "Zhen Li": "https://dblp.org/pid/74/2397-76.html",
  "Xuan He": "https://dblp.org/search/author?q=Xuan%20He",
  "Xiaohu Tang": "https://dblp.org/pid/70/2644.html",
  "Jian Li": "https://dblp.org/search/author?q=Jian%20Li",
  "Haode Yan": "https://dblp.org/pid/139/0689.html",
  "Cuiling Fan": "https://dblp.org/pid/73/9133.html",
  "Wei Su": "https://dblp.org/pid/50/4091-1.html",
  "Yanfeng Qi": "https://dblp.org/pid/83/9369.html",
  "Zongduo Song": "https://dblp.org/search/author?q=Zongduo%20Song",
  "Rongquan Feng": "https://dblp.org/search/author?q=Rongquan%20Feng",
  "Zhengbang Zhang": "https://dblp.org/search/author?q=Zhengbang%20Zhang",
  "Dongchun Han": "https://dblp.org/pid/145/0396.html"
};

const typeCode = {
  journal: "j",
  conference: "c",
  preprint: "i",
  other: "o"
};

const typeOrder = {
  journal: 0,
  conference: 1,
  preprint: 2,
  other: 3
};

const venueAbbreviations = {
  "IEEE Transactions on Communications": "IEEE Trans. Commun.",
  "Advances in Mathematics of Communications": "Adv. Math. Commun.",
  "Cryptography and Communications": "Cryptogr. Commun.",
  "Finite Fields and Their Applications": "Finite Fields Appl.",
  "2024 10th International Conference on Computer and Communications (ICCC)": "ICCC 2024",
  "2022 10th International Workshop on Signal Design and Its Applications in Communications (IWSDA)": "IWSDA 2022"
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
  $$(".language-toggle button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === state.lang);
  });
}

function applyStaticText() {
  $$("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  $("#publication-search").placeholder = t("searchPlaceholder");
  $("#nav-cv-link").textContent = t("navCv");
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
    .map((link) => `<a href="${esc(link.url)}"${targetAttr(link.url)}>${esc(link.label)}</a>`)
    .join(' <span class="link-dot">/</span> ');
}

function scholarProfile(profile) {
  return (profile.externalProfiles || []).find((item) => item.label === "Google Scholar");
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
  $("#education-heading").textContent = profile.sectionHeadings.education;
  $("#contact-heading").textContent = profile.sectionHeadings.contact;
  $("#bio-heading").textContent = t("bioHeading");
  $("#bio-copy").innerHTML = (profile.bio || []).map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");

  const scholar = scholarProfile(profile);
  if (scholar) {
    $("#scholar-profile-link").href = scholar.url;
  }

  $("#nav-cv-link").href = `cv.html?lang=${state.lang}`;
  $("#profile-links").innerHTML = (profile.externalProfiles || []).map(linkMarkup).join("");
  $("#quick-facts").innerHTML = "";

  $("#education-list").innerHTML = (profile.education || [])
    .map(
      (item) => `
        <li class="detail-item">
          <div class="detail-item-head">
            <span class="detail-bullet"></span>
            <span class="detail-item-title">${esc(item.degree)}</span>
          </div>
          <div class="detail-item-meta">${esc(item.years)}</div>
          <div class="detail-item-copy">${esc(item.school)}</div>
        </li>
      `
    )
    .join("");

  $("#research-area-list").innerHTML = (profile.researchAreas || [])
    .map(
      (item) => `
        <li class="detail-item">
          <div class="detail-item-head">
            <span class="detail-bullet"></span>
            <span class="detail-item-title">${esc(item.title)}</span>
          </div>
          <div class="detail-item-copy">${esc(item.description)}</div>
        </li>
      `
    )
    .join("");

  const contactBlocks = (profile.contactDetails || []).map((item) => {
    const value = item.url
      ? `<a href="${esc(item.url)}"${targetAttr(item.url)}>${esc(item.value)}</a>`
      : esc(item.value);
    return `
      <div class="contact-card">
        <div class="contact-label">${esc(item.label)}</div>
        <div class="contact-value">${value}</div>
      </div>
    `;
  });
  contactBlocks.push(`
    <div class="contact-card">
      <div class="contact-label">${esc(t("profiles"))}</div>
      <div class="contact-value">${inlineLinks(profile.externalProfiles || [])}</div>
    </div>
  `);
  $("#contact-links").innerHTML = contactBlocks.join("");
}

function publicationText(pub) {
  return [
    pub.title,
    pub.venue,
    pub.venueDetail,
    ...(pub.authors || []),
    ...(pub.keywords || [])
  ]
    .join(" ")
    .toLowerCase();
}

function matchesQuery(pub) {
  return !state.query || publicationText(pub).includes(state.query);
}

function matchesType(pub) {
  return state.filters.type === "all" || pub.type === state.filters.type;
}

function matchesCoauthor(pub) {
  return !state.filters.coauthor || (pub.authors || []).includes(state.filters.coauthor);
}

function matchesVenue(pub) {
  return !state.filters.venue || pub.venue === state.filters.venue;
}

function visiblePublications() {
  return state.publications
    .filter((pub) => matchesQuery(pub) && matchesType(pub) && matchesCoauthor(pub) && matchesVenue(pub))
    .sort((a, b) => {
      const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
      if (yearDiff) return yearDiff;
      const typeDiff = (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
      if (typeDiff) return typeDiff;
      return a.title.localeCompare(b.title);
    });
}

function typeLabel(type) {
  return strings[state.lang].typeLabels[type] || strings[state.lang].typeLabels.other;
}

function venueLabel(venue) {
  return venueAbbreviations[venue] || venue;
}

function authorLink(name) {
  return authorDirectory[name] || `https://dblp.org/search/author?q=${encodeURIComponent(name)}`;
}

function authorMarkup(authors) {
  return (authors || [])
    .map((name) => {
      const label = name === "Zhen Li" ? `<strong>${esc(name)}</strong>` : esc(name);
      return `<a href="${esc(authorLink(name))}" target="_blank" rel="noreferrer">${label}</a>`;
    })
    .join(", ");
}

function linkList(pub) {
  return pub.links && pub.links.length
    ? pub.links
    : [{ label: "Scholar", url: `https://scholar.google.com/scholar?q=${encodeURIComponent(pub.title)}` }];
}

function primaryPublicationUrl(pub) {
  const links = linkList(pub);
  const preferred = links.find((link) => ["DOI", "DBLP", "Scholar"].includes(link.label));
  return (preferred || links[0] || {}).url || "";
}

function computedMetrics() {
  const scholar = state.meta.scholarMetrics || {};
  return {
    citations: Number.isFinite(Number(scholar.citations)) ? Number(scholar.citations) : null,
    h: Number.isFinite(Number(scholar.hIndex)) ? Number(scholar.hIndex) : null,
    i10: Number.isFinite(Number(scholar.i10Index)) ? Number(scholar.i10Index) : null
  };
}

function renderCitationChart() {
  const items = state.meta.citationsByYear || [];
  if (!items.length) {
    $("#citation-year-chart").innerHTML = "";
    return;
  }

  const max = Math.max(...items.map((item) => Number(item.count) || 0), 1);
  $("#citation-year-chart").innerHTML = `
    <div class="chart-bars compact">
      ${items
        .map(
          (item) => `
            <div class="chart-bar">
              <span class="chart-value">${esc(item.count)}</span>
              <i style="height:${Math.max(12, (Number(item.count) / max) * 100).toFixed(1)}%"></i>
              <span class="chart-year">${esc(item.year)}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMetrics(meta) {
  state.meta = meta || {};
  const metrics = computedMetrics();
  const updatedAt = meta.updated || state.profile.updated;
  $("#metric-publications").textContent = state.publications.length;
  $("#metric-citations").textContent = metrics.citations ?? "--";
  $("#metric-hindex").textContent = metrics.h ?? "--";
  $("#metric-i10").textContent = metrics.i10 ?? "--";
  $("#footer-year").textContent = `${t("updated")} ${updatedAt}`;
  $("#updated-note").textContent = `${t("updated")} ${updatedAt}. ${t("citationSource")}`;
  renderCitationChart();
}

function venueText(pub) {
  return pub.venueDetail ? `${pub.venue}. ${pub.venueDetail}` : pub.venue;
}

function labelForPublication(pub, counts) {
  const code = typeCode[pub.type] || "o";
  counts[code] = (counts[code] || 0) + 1;
  return `${code}${counts[code]}`;
}

function yearGroupMarkup(year, items, counts) {
  const rows = items
    .map((pub) => {
      const label = labelForPublication(pub, counts);
      const colorClass = `type-${pub.type}`;
      const title = `<a class="pub-title-link" href="${esc(primaryPublicationUrl(pub))}" target="_blank" rel="noreferrer">${esc(pub.title)}</a>`;
      const citationText = Number.isFinite(Number(pub.citationCount))
        ? `<span class="dblp-citations">${pub.citationCount} ${esc(t("citations"))}</span>`
        : "";
      return `
        <article class="dblp-row">
          <div class="dblp-marker ${colorClass}"></div>
          <div class="dblp-label">[${label}]</div>
          <div class="dblp-entry">
            <div class="dblp-authors">${authorMarkup(pub.authors || [])}:</div>
            <div class="dblp-title">${title}</div>
            <div class="dblp-venue">
              <em>${esc(venueText(pub))}</em> (${esc(pub.year)}) ${citationText}
            </div>
            <div class="dblp-links">${inlineLinks(linkList(pub))}</div>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="dblp-year-group">
      <h3>${esc(year)}</h3>
      <div class="dblp-year-list">${rows}</div>
    </section>
  `;
}

function renderPublications() {
  const list = $("#publication-list");
  const pubs = visiblePublications();
  if (!pubs.length) {
    list.innerHTML = `<div class="empty-state">${esc(t("noResults"))}</div>`;
    return;
  }

  const grouped = new Map();
  for (const pub of pubs) {
    const year = String(pub.year || "");
    if (!grouped.has(year)) grouped.set(year, []);
    grouped.get(year).push(pub);
  }

  const counts = {};
  list.innerHTML = Array.from(grouped.entries())
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .map(([year, items]) => yearGroupMarkup(year, items, counts))
    .join("");
}

function aggregateValues(selectorFn) {
  const visible = state.publications.filter((pub) => matchesQuery(pub));
  const counts = new Map();
  for (const pub of visible) {
    const values = selectorFn(pub);
    for (const value of values) {
      if (!value) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderRefineSidebar() {
  const typeContainer = $("#refine-type");
  const coauthorContainer = $("#refine-coauthor");
  const venueContainer = $("#refine-venue");

  const types = aggregateValues((pub) => [pub.type]);
  typeContainer.innerHTML = [
    `<button class="refine-link${state.filters.type === "all" ? " is-active" : ""}" type="button" data-type="all">${esc(t("allTypes"))}</button>`,
    ...types.map(
      ([value, count]) =>
        `<button class="refine-link${state.filters.type === value ? " is-active" : ""}" type="button" data-type="${esc(value)}">${esc(typeLabel(value))} <span>(${count})</span></button>`
    )
  ].join("");

  const coauthors = aggregateValues((pub) => (pub.authors || []).filter((name) => name !== "Zhen Li"));
  coauthorContainer.innerHTML = coauthors
    .map(
      ([value, count]) =>
        `<a class="refine-link static-link" href="${esc(authorLink(value))}" target="_blank" rel="noreferrer">${esc(value)} <span>(${count})</span></a>`
    )
    .join("");

  const venues = aggregateValues((pub) => [pub.venue]);
  venueContainer.innerHTML = [
    `<button class="refine-link${!state.filters.venue ? " is-active" : ""}" type="button" data-venue="">${esc(t("dismissAll"))}</button>`,
    ...venues.map(
      ([value, count]) =>
        `<button class="refine-link${state.filters.venue === value ? " is-active" : ""}" type="button" data-venue="${esc(value)}">${esc(venueLabel(value))} <span>(${count})</span></button>`
    )
  ].join("");

  $$("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.type = button.dataset.type;
      renderRefineSidebar();
      renderPublications();
    });
  });
  $$("[data-venue]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filters.venue = button.dataset.venue;
      renderRefineSidebar();
      renderPublications();
    });
  });
}

function bindControls() {
  $("#publication-search").addEventListener("input", (event) => {
    state.query = event.target.value.trim().toLowerCase();
    renderRefineSidebar();
    renderPublications();
  });

  $$(".language-toggle button").forEach((button) => {
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
  const [profile, publicationData] = await Promise.all([loadProfile(state.lang), loadJson("data/publications.json")]);

  state.profile = profile;
  state.publications = (publicationData.items || []).filter((pub) => pub.type !== "manuscript");
  applyStaticText();
  renderProfile(profile);
  renderMetrics(publicationData.meta || {});
  renderRefineSidebar();
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
