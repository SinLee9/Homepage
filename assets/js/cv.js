const state = {
  lang: "en",
  profile: null,
  publications: []
};

const $ = (selector) => document.querySelector(selector);

const strings = {
  en: {
    cv: "Curriculum Vitae",
    back: "Homepage",
    print: "Print / Save PDF",
    education: "Education Background",
    research: "Research Areas",
    publications: "Publications",
    updated: "Updated",
    email: "Email",
    profiles: "Profiles",
    citations: "citations",
    sourceNote: "This CV is generated from the homepage data and updates when the publication metadata is refreshed."
  },
  zh: {
    cv: "个人学术简历",
    back: "返回主页",
    print: "打印 / 另存为 PDF",
    education: "教育背景",
    research: "研究方向",
    publications: "学术论文",
    updated: "更新于",
    email: "邮箱",
    profiles: "学术主页",
    citations: "次引用",
    sourceNote: "本 CV 由主页数据自动生成；论文元数据每周更新后，CV 内容会同步更新。"
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

function detectLanguage() {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (["en", "zh"].includes(queryLang)) return queryLang;
  const saved = localStorage.getItem("homepage-language");
  if (["en", "zh"].includes(saved)) return saved;
  return navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(key) {
  return strings[state.lang][key] || strings.en[key] || key;
}

async function loadProfile(lang) {
  try {
    return await loadJson(`data/profile.${lang}.json`);
  } catch (_) {
    return loadJson("data/profile.json");
  }
}

function targetAttr(url) {
  return url && url.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
}

function inlineLinks(links) {
  return links
    .map(link => `<a href="${esc(link.url)}"${targetAttr(link.url)}>${esc(link.label)}</a>`)
    .join(" <span class=\"link-dot\">/</span> ");
}

function linkList(pub) {
  if (pub.links && pub.links.length) return pub.links;
  return [{ label: "Scholar", url: `https://scholar.google.com/scholar?q=${encodeURIComponent(pub.title)}` }];
}

function primaryPublicationUrl(pub) {
  const links = linkList(pub);
  const preferred = links.find(link => ["DOI", "DBLP", "Scholar"].includes(link.label));
  return (preferred || links[0] || {}).url || "";
}

function authorMarkup(authors) {
  return (authors || [])
    .map(author => author === "Zhen Li" ? `<strong>${esc(author)}</strong>` : esc(author))
    .join(", ");
}

function renderEducation() {
  return state.profile.education.map(item => `
    <div class="cv-row">
      <div class="cv-date">${esc(item.years)}</div>
      <div>
        <strong>${esc(item.degree)}</strong>
        <div>${esc(item.school)}</div>
      </div>
    </div>
  `).join("");
}

function renderResearchAreas() {
  return (state.profile.researchAreas || []).map(item => `
    <div class="cv-area">
      <strong>${esc(item.title)}</strong>
      <span>${esc(item.description)}</span>
    </div>
  `).join("");
}

function chronologicalPublications() {
  return state.publications
    .slice()
    .filter(pub => pub.type !== "manuscript")
    .sort((a, b) => {
      const yearDiff = (Number(a.year) || 0) - (Number(b.year) || 0);
      if (yearDiff) return yearDiff;
      return a.title.localeCompare(b.title);
    });
}

function publicationNumberMap() {
  const labels = new Map();
  chronologicalPublications().forEach((pub, index) => {
    labels.set(pub.id, index + 1);
  });
  return labels;
}

function renderPublications() {
  const labels = publicationNumberMap();
  return state.publications
    .slice()
    .filter(pub => pub.type !== "manuscript")
    .sort((a, b) => {
      const yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
      if (yearDiff) return yearDiff;
      return (labels.get(b.id) || 0) - (labels.get(a.id) || 0);
    })
    .map((pub) => {
      const url = primaryPublicationUrl(pub);
      const title = url
        ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(pub.title)}</a>`
        : esc(pub.title);
      const detail = pub.venueDetail ? `, ${esc(pub.venueDetail)}` : "";
      return `
        <div class="cv-publication">
          <div class="cv-pub-number">${labels.get(pub.id) || ""}</div>
          <div>
            <strong>${title}</strong>
            <div>${authorMarkup(pub.authors)}</div>
            <div><em>${esc(pub.venue)}</em>${detail}, ${esc(pub.year)}</div>
          </div>
        </div>
      `;
    }).join("");
}

function renderCv(meta) {
  document.documentElement.lang = state.lang === "zh" ? "zh-CN" : "en";
  document.title = `${state.profile.name} | CV`;
  $("#cv-root").innerHTML = `
    <header class="cv-header">
      <div>
        <p class="cv-kicker">${esc(t("cv"))}</p>
        <h1>${esc(state.profile.name)}</h1>
        <p class="cv-title">${esc(state.profile.title)}</p>
      </div>
      <div class="cv-actions">
        <a class="button-link" href="index.html?lang=${esc(state.lang)}">${esc(t("back"))}</a>
        <button class="button-link primary" type="button" id="print-cv">${esc(t("print"))}</button>
      </div>
    </header>

    <div class="cv-contact">
      <span>${esc(state.profile.affiliation.full)}</span>
      <span>${esc(t("email"))}: <a href="mailto:${esc(state.profile.email)}">${esc(state.profile.email)}</a></span>
      <span>${esc(t("profiles"))}: ${inlineLinks(state.profile.externalProfiles)}</span>
    </div>

    <p class="cv-note">${esc(t("updated"))} ${esc(meta.updated || state.profile.updated)}. ${esc(t("sourceNote"))}</p>

    <section class="cv-section">
      <h2>${esc(t("education"))}</h2>
      <div class="cv-list">${renderEducation()}</div>
    </section>

    <section class="cv-section">
      <h2>${esc(t("research"))}</h2>
      <div class="cv-areas">${renderResearchAreas()}</div>
    </section>

    <section class="cv-section">
      <h2>${esc(t("publications"))}</h2>
      <div class="cv-list">${renderPublications()}</div>
    </section>
  `;
  $("#print-cv").addEventListener("click", () => window.print());
}

async function init() {
  try {
    state.lang = detectLanguage();
    const [profile, publicationData] = await Promise.all([
      loadProfile(state.lang),
      loadJson("data/publications.json")
    ]);
    state.profile = profile;
    state.publications = publicationData.items || [];
    renderCv(publicationData.meta || {});
  } catch (error) {
    $("#cv-root").innerHTML = `<div class="cv-loading">Could not load CV data.</div>`;
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", init);
