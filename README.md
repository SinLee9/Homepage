# Zhen Li Academic Homepage

This is a bilingual static academic homepage designed for GitHub Pages.

It supports:

- English / Chinese language switching.
- Automatically generated publication metadata.
- Weekly publication updates through GitHub Actions.
- Classification by journal, conference, preprint, and selected work.
- DOI / DBLP / OpenAlex / Google Scholar links for publication discovery.
- Citation metrics including total citations, h-index, and i10-index when indexed records are available.
- A dynamic CV page generated from the same homepage data: `cv.html`.
- Education, research areas, grouped publications, and contact sections.

## Data Sources

The automated updater uses:

- ORCID: `0000-0002-7947-9004`
- DBLP: `Zhen Li 0076`, resolved as `https://dblp.org/pid/74/2397-76.html`
- Google Scholar profile: `https://scholar.google.com/citations?user=4eH9QNMAAAAJ&hl=zh-CN&oi=ao`
- Crossref DOI metadata
- OpenAlex citation counts
- Curated overrides in `data/manual_publications.json`

`data/manual_publications.json` is intentionally kept as an override layer only. It can refine keywords, selected-paper flags, DOI links, and venue names for records already found through DBLP / ORCID / Google Scholar. It should not be used to add local unfinished manuscripts to the public publication list.

Google Scholar does not provide a stable public API. The updater attempts to parse the public profile page on a best-effort basis; DBLP, ORCID, Crossref, and OpenAlex remain the more stable metadata sources.

## GitHub Pages Deployment

Upload the contents of this folder to a GitHub repository. Then:

1. Open the repository on GitHub.
2. Go to `Settings -> Pages`.
3. Set `Build and deployment -> Source` to `GitHub Actions`.
4. Push to the `main` branch.
5. The workflow `.github/workflows/pages.yml` will publish the site.

The workflow `.github/workflows/update-publications.yml` runs every Monday at `00:00 UTC`, which is `08:00` in China, and can also be started manually from the Actions tab.

## Preview Locally

```powershell
cd "C:\Users\lizhe\Dropbox\迁移\简历相关\学术主页"
powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8010
```

Open:

```text
http://127.0.0.1:8010/
```

Chinese view:

```text
http://127.0.0.1:8010/?lang=zh
```

Dynamic CV:

```text
http://127.0.0.1:8010/cv.html?lang=en
http://127.0.0.1:8010/cv.html?lang=zh
```

English view:

```text
http://127.0.0.1:8010/?lang=en
```

## Manual Update

On GitHub Actions, the script runs with Python automatically:

```bash
python scripts/update_publications.py
```

If Python is available locally, the same command can be run from the homepage folder.

## Edit Content

- English profile: `data/profile.en.json`
- Chinese profile: `data/profile.zh.json`
- Curated indexed-record overrides: `data/manual_publications.json`
- Generated publications: `data/publications.json`
- Styles: `assets/css/styles.css`
- Page behavior: `assets/js/app.js`
- Dynamic CV behavior: `assets/js/cv.js`
