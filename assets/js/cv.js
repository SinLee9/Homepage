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
    profile: "Profile",
    education: "Academic Qualifications",
    research: "Research Keywords",
    publications: "Publications",
    updated: "Updated",
    citations: "citations",
    email: "Email",
    profiles: "Profiles",
    sourceNote: "This CV is generated from the homepage data and updates when the publication metadata is refreshed."
  },
  zh: {
    cv: "个人学术简历",
    back: "返回主页",
    print: "打印 / 另存为 PDF",
    profile: "个人简介",
    education: "教育背景",
    research: "研究关键词",
    publications: "学术论文",
    updated: "更新于",
    citations: "次引用",
    email: "邮箱",
    profiles: "学术主页",
    sourceNote: "本 CV 由主页数据自动生成；论文元数据每周更新后，CV 内容会同步更新。"
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

function authorMarkup(authors) {
  return (authors || [])
    .map(author => author === "Zhen Li" ? `<strong>${esc(author)}</strong>` : esc(author))
    .join(", ");
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

  const title = (pub.title || "").replace(/[+/:_-]/g, " ").split(/\s+/);
  return title
    .map(token => token.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(token => token.length >= 3 && !stopwords.has(token));
}

function keywordItems() {
  const currentYear = new Date().getFullYear();
  const scores = new Map();
  for (const pub of state.publications) {
    const year = Number(pub.year) || currentYear;
    const recency = Math.max(0.35, 1 + (year - currentYear + 5) * 0.18);
    const citations = Number(pub.citationCount);
    const citeBoost = Number.isFinite(citations) ? Math.log1p(citations) * 0.08 : 0;
    const seen = new Set(keywordTokens(pub));
    for (const token of seen) {
      scores.set(token, (scores.get(token) || 0) + recency + citeBoost);
    }
  }
  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
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

function renderKeywords() {
  const items = keywordItems();
  const max = Math.max(...items.map(([, value]) => value), 1);
  return items.map(([keyword, score]) => `
    <div class="cv-keyword">
      <span>${esc(keyword)}</span>
      <i style="width:${Math.max(8, (score / max) * 100).toFixed(1)}%"></i>
    </div>
  `).join("");
}

function renderPublications() {
  return state.publications
    .slice()
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || a.title.localeCompare(b.title))
    .map((pub, index) => {
      const url = primaryPublicationUrl(pub);
      const title = url
        ? `<a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(pub.title)}</a>`
        : esc(pub.title);
      const citations = Number(pub.citationCount);
      const citationText = Number.isFinite(citations) ? ` · ${citations} ${t("citations")}` : "";
      return `
        <div class="cv-publication">
          <div class="cv-pub-number">${index + 1}</div>
          <div>
            <strong>${title}</strong>
            <div>${authorMarkup(pub.authors)}</div>
            <div>${esc(pub.venue)} · ${esc(pub.year)}${citationText}</div>
            <div class="cv-pub-links">${inlineLinks(publicationLinks(pub))}</div>
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
      <h2>${esc(t("profile"))}</h2>
      <p>${esc(state.profile.summary)}</p>
    </section>

    <section class="cv-section">
      <h2>${esc(t("education"))}</h2>
      <div class="cv-list">${renderEducation()}</div>
    </section>

    <section class="cv-section">
      <h2>${esc(t("research"))}</h2>
      <div class="cv-keywords">${renderKeywords()}</div>
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
