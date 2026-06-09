#!/usr/bin/env python3
"""Update publication metadata for the academic homepage.

Sources:
- ORCID public API, keyed by ORCID iD.
- Crossref REST API, used to enrich DOI records.
- dblp author XML page, used as a complementary computer-science index.
- OpenAlex Works API, used for citation counts and citation-derived metrics.
- Google Scholar public profile, used on a best-effort basis for citation metrics and indexed records.
- data/manual_publications.json, used only as an override layer for already indexed records.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
OUTPUT_PATH = DATA_DIR / "publications.json"
MANUAL_PATH = DATA_DIR / "manual_publications.json"

ORCID_ID = "0000-0002-7947-9004"
DBLP_AUTHOR_NAME = "Zhen Li 0076"
DBLP_PERSON_XML = "https://dblp.org/pid/74/2397-76.xml"
SCHOLAR_PROFILE_URL = "https://scholar.google.com/citations?user=4eH9QNMAAAAJ&hl=zh-CN&oi=ao"
USER_AGENT = "SinLee9 academic homepage publication updater (mailto:lz-math@my.swjtu.edu.cn)"
OPENALEX_MAILTO = "lz-math@my.swjtu.edu.cn"


def fetch_text(url: str, accept: str = "application/json", retries: int = 3) -> str | None:
    headers = {
        "Accept": accept,
        "User-Agent": USER_AGENT,
    }
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        except (urllib.error.URLError, TimeoutError) as exc:
            wait = 2 ** attempt
            print(f"warning: fetch failed ({url}): {exc}; retrying in {wait}s", file=sys.stderr)
            time.sleep(wait)
    print(f"warning: skipped unavailable source: {url}", file=sys.stderr)
    return None


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\+", " plus ", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "publication"


def fingerprint(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def first(value: Any) -> Any:
    if isinstance(value, list):
        return value[0] if value else None
    return value


def normalize_doi(doi: str | None) -> str:
    if not doi:
        return ""
    doi = doi.strip()
    doi = re.sub(r"^https?://(dx\.)?doi\.org/", "", doi, flags=re.I)
    return doi.lower()


def scholar_url(title: str) -> str:
    return "https://scholar.google.com/scholar?q=" + urllib.parse.quote_plus(title)


def strip_html(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def add_unique_link(links: list[dict[str, str]], label: str, url: str) -> None:
    if not url:
        return
    marker = (label, url)
    if marker not in {(link.get("label"), link.get("url")) for link in links}:
        links.append({"label": label, "url": url})


def year_from_date_parts(value: Any) -> int | None:
    try:
        return int(value["date-parts"][0][0])
    except (TypeError, KeyError, IndexError, ValueError):
        return None


def classify(entry_type: str = "", venue: str = "", source: str = "") -> str:
    entry_type = (entry_type or "").lower()
    venue_l = (venue or "").lower()
    if "corr" == venue_l or "arxiv" in venue_l or "posted-content" in entry_type:
        return "preprint"
    if source == "scholar":
        if any(token in venue_l for token in ["conference", "workshop", "symposium", "iccc", "isit", "iwsda"]):
            return "conference"
        if "arxiv" in venue_l or "corr" in venue_l:
            return "preprint"
        return "journal"
    if entry_type in {"conference-paper", "proceedings-article", "inproceedings"}:
        return "conference"
    if "journal" in entry_type or entry_type == "article":
        return "journal"
    if source == "manual":
        return "manuscript"
    return "other"


def crossref_record(doi: str) -> dict[str, Any]:
    doi = normalize_doi(doi)
    if not doi:
        return {}
    url = f"https://api.crossref.org/works/{urllib.parse.quote(doi)}"
    text = fetch_text(url)
    if not text:
        return {}
    try:
        message = json.loads(text).get("message", {})
    except json.JSONDecodeError:
        return {}
    authors = []
    for author in message.get("author", []) or []:
        given = author.get("given", "")
        family = author.get("family", "")
        name = " ".join(part for part in [given, family] if part).strip()
        if name:
            authors.append(name)
    year = (
        year_from_date_parts(message.get("published-print"))
        or year_from_date_parts(message.get("published-online"))
        or year_from_date_parts(message.get("published"))
        or year_from_date_parts(message.get("created"))
    )
    venue = first(message.get("container-title")) or ""
    title = first(message.get("title")) or ""
    return {
        "title": title,
        "authors": authors,
        "year": year,
        "venue": venue,
        "type": classify(message.get("type", ""), venue),
        "doi": normalize_doi(message.get("DOI") or doi),
        "primaryUrl": message.get("URL") or f"https://doi.org/{doi}",
    }


def same_title(left: str, right: str) -> bool:
    left_fp = fingerprint(left)
    right_fp = fingerprint(right)
    return bool(left_fp and right_fp and left_fp == right_fp)


def openalex_record(doi: str = "", title: str = "") -> dict[str, Any]:
    """Return OpenAlex metadata when an exact DOI or title match is available."""
    doi = normalize_doi(doi)
    url = ""
    title_search = False
    if doi:
        openalex_id = f"https://doi.org/{doi}"
        url = "https://api.openalex.org/works/" + urllib.parse.quote(openalex_id, safe=":/")
        url += "?" + urllib.parse.urlencode({"mailto": OPENALEX_MAILTO})
    elif title:
        title_search = True
        query = urllib.parse.urlencode({
            "search": title,
            "per-page": "1",
            "mailto": OPENALEX_MAILTO,
        })
        url = f"https://api.openalex.org/works?{query}"
    if not url:
        return {}

    text = fetch_text(url)
    if not text:
        return {}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {}
    if title_search:
        results = data.get("results") or []
        if not results:
            return {}
        data = results[0]
        if not same_title(title, data.get("title") or data.get("display_name") or ""):
            return {}

    keywords = []
    for concept in data.get("concepts", []) or []:
        name = concept.get("display_name")
        if name and len(keywords) < 6:
            keywords.append(name)
    return {
        "citationCount": data.get("cited_by_count"),
        "openAlexUrl": data.get("id"),
        "openAlexKeywords": keywords,
    }


def parse_orcid() -> list[dict[str, Any]]:
    url = f"https://pub.orcid.org/v3.0/{ORCID_ID}/works"
    text = fetch_text(url, accept="application/vnd.orcid+json")
    if not text:
        return []
    data = json.loads(text)
    records = []
    for group in data.get("group", []) or []:
        summaries = group.get("work-summary", []) or []
        if not summaries:
            continue
        summary = summaries[0]
        title = (((summary.get("title") or {}).get("title") or {}).get("value") or "").strip()
        if not title:
            continue
        doi = ""
        external_ids = ((group.get("external-ids") or {}).get("external-id") or [])
        for external in external_ids:
            if (external.get("external-id-type") or "").lower() == "doi":
                doi = normalize_doi(external.get("external-id-value"))
                break
        year = None
        pub_date = summary.get("publication-date") or {}
        if pub_date.get("year"):
            year = int(pub_date["year"]["value"])
        venue = ((summary.get("journal-title") or {}).get("value") or "").strip()
        enriched = crossref_record(doi) if doi else {}
        record = {
            "id": slugify(enriched.get("title") or title),
            "title": enriched.get("title") or title,
            "authors": enriched.get("authors") or [],
            "year": enriched.get("year") or year or datetime.now().year,
            "venue": enriched.get("venue") or venue or "ORCID record",
            "status": "Published" if doi else "Indexed by ORCID",
            "type": enriched.get("type") or classify(summary.get("type", ""), venue),
            "selected": False,
            "keywords": [],
            "abstract": "",
            "abstractZh": "",
            "doi": doi,
            "links": [],
            "sources": ["ORCID"],
        }
        if doi:
            record["links"].append({"label": "Journal / DOI", "url": enriched.get("primaryUrl") or f"https://doi.org/{doi}"})
        record["links"].append({"label": "ORCID", "url": f"https://orcid.org/{ORCID_ID}"})
        records.append(record)
    return records


def parse_dblp() -> list[dict[str, Any]]:
    text = fetch_text(DBLP_PERSON_XML, accept="application/xml")
    if not text:
        return []
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        print(f"warning: could not parse dblp XML: {exc}", file=sys.stderr)
        return []
    records: list[dict[str, Any]] = []
    for node in root.iter():
        if node.tag not in {"article", "inproceedings", "proceedings", "book", "incollection"}:
            continue
        authors = [a.text.strip() for a in node.findall("author") if a.text]
        if DBLP_AUTHOR_NAME not in authors and "Zhen Li" not in authors:
            continue
        title = (node.findtext("title") or "").strip().rstrip(".")
        if not title:
            continue
        venue = node.findtext("booktitle") or node.findtext("journal") or "dblp record"
        year_text = node.findtext("year")
        try:
            year = int(year_text) if year_text else datetime.now().year
        except ValueError:
            year = datetime.now().year
        key = node.attrib.get("key", "")
        doi = ""
        links = []
        for ee in node.findall("ee"):
            url = (ee.text or "").strip()
            if not url:
                continue
            if "doi.org/" in url:
                doi = normalize_doi(url)
                label = "Journal / DOI" if "arxiv" not in url.lower() else "arXiv"
            else:
                label = "External"
            links.append({"label": label, "url": url})
        if key:
            links.append({"label": "DBLP", "url": f"https://dblp.org/rec/{key}"})
        records.append({
            "id": slugify(title),
            "title": title,
            "authors": [author.replace(" 0076", "") for author in authors],
            "year": year,
            "venue": venue,
            "status": "Indexed by DBLP",
            "type": classify(node.tag, venue),
            "selected": False,
            "keywords": [],
            "abstract": "",
            "abstractZh": "",
            "doi": doi,
            "links": links,
            "sources": ["DBLP"],
        })
    return records


def parse_scholar_profile() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    text = fetch_text(SCHOLAR_PROFILE_URL, accept="text/html")
    if not text:
        return [], {}

    metrics = {}
    metric_values = [int(value) for value in re.findall(r'<td class="gsc_rsb_std">(\d+)</td>', text)]
    if len(metric_values) >= 5:
        metrics["scholarMetrics"] = {
            "citations": metric_values[0],
            "hIndex": metric_values[2],
            "i10Index": metric_values[4],
        }

    years = [int(strip_html(value)) for value in re.findall(r'<span class="gsc_g_t"[^>]*>(.*?)</span>', text)]
    counts = [int(strip_html(value)) for value in re.findall(r'<span class="gsc_g_al">(.*?)</span>', text)]
    if years and len(years) == len(counts):
        metrics["citationsByYear"] = [{"year": year, "count": count} for year, count in zip(years, counts)]

    records: list[dict[str, Any]] = []
    row_pattern = re.compile(r'<tr class="gsc_a_tr">(.*?)</tr>', re.S)
    link_pattern = re.compile(r'<a href="([^"]+)" class="gsc_a_at">(.*?)</a>', re.S)
    gray_pattern = re.compile(r'<div class="gs_gray">(.*?)</div>', re.S)
    cite_pattern = re.compile(r'<a href="([^"]*)" class="gsc_a_ac[^"]*">(.*?)</a>', re.S)
    year_pattern = re.compile(r'<span class="gsc_a_h gsc_a_hc gs_ibl">(.*?)</span>', re.S)

    for row in row_pattern.findall(text):
        link_match = link_pattern.search(row)
        if not link_match:
            continue
        href, title_html = link_match.groups()
        title = strip_html(title_html)
        if not title:
            continue
        gray = [strip_html(part) for part in gray_pattern.findall(row)]
        authors = [name.strip() for name in (gray[0].split(",") if gray else []) if name.strip()]
        venue = gray[1] if len(gray) > 1 else "Google Scholar"
        venue = re.sub(r",?\s*\d{4}$", "", venue).strip()
        year_match = year_pattern.search(row)
        try:
            year = int(strip_html(year_match.group(1))) if year_match else datetime.now().year
        except ValueError:
            year = datetime.now().year
        cite_match = cite_pattern.search(row)
        citation_count = None
        if cite_match:
            cite_text = strip_html(cite_match.group(2))
            if cite_text.isdigit():
                citation_count = int(cite_text)

        link_url = urllib.parse.urljoin("https://scholar.google.com", unescape(href))
        record_type = classify("", venue, "scholar")
        if record_type == "preprint":
            continue
        records.append({
            "id": slugify(title),
            "title": title,
            "authors": authors,
            "year": year,
            "venue": venue,
            "venueGroup": "Conference Papers" if record_type == "conference" else ("Preprints" if record_type == "preprint" else "Journal Articles"),
            "status": "Indexed by Google Scholar",
            "type": record_type,
            "selected": False,
            "keywords": [],
            "abstract": "",
            "abstractZh": "",
            "doi": "",
            "citationCount": citation_count,
            "links": [{"label": "Scholar", "url": link_url}],
            "sources": ["Google Scholar"],
        })
    return records, metrics


def load_manual() -> list[dict[str, Any]]:
    if not MANUAL_PATH.exists():
        return []
    with MANUAL_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("items", data if isinstance(data, list) else [])


def merge_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}

    def key_for(record: dict[str, Any]) -> str:
        doi = normalize_doi(record.get("doi"))
        if doi:
            return f"doi:{doi}"
        return f"title:{fingerprint(record.get('title', ''))}"

    for record in records:
        key = key_for(record)
        existing = by_key.get(key)
        if not existing:
            by_key[key] = record
            continue
        existing_sources = set(existing.get("sources", []))
        existing_sources.update(record.get("sources", []))
        existing["sources"] = sorted(existing_sources)
        existing_links = {(link.get("label"), link.get("url")) for link in existing.get("links", [])}
        for link in record.get("links", []) or []:
            marker = (link.get("label"), link.get("url"))
            if marker not in existing_links:
                existing.setdefault("links", []).append(link)
                existing_links.add(marker)
        for field in ["authors", "venue", "status", "type", "year", "doi"]:
            if not existing.get(field) and record.get(field):
                existing[field] = record[field]

    # Manual records are applied last as curated overrides. They do not create
    # new publications, which keeps local unfinished manuscripts off the public page.
    for manual in load_manual():
        key = key_for(manual)
        target = by_key.get(key)
        if not target:
            continue
        links = target.get("links", [])
        link_markers = {(link.get("label"), link.get("url")) for link in links}
        for link in manual.get("links", []) or []:
            marker = (link.get("label"), link.get("url"))
            if marker not in link_markers:
                links.append(link)
                link_markers.add(marker)
        target.update({k: v for k, v in manual.items() if k != "links" and v not in [None, ""]})
        target["links"] = links
        target["sources"] = sorted(set(target.get("sources", [])) | {"Manual"})

    items = list(by_key.values())
    for item in items:
        item.setdefault("id", slugify(item.get("title", "")))
        item.setdefault("authors", [])
        item.setdefault("keywords", [])
        item.setdefault("links", [])
        item.setdefault("abstract", "")
        item.setdefault("abstractZh", "")
        item.setdefault("selected", False)
        item.setdefault("citationCount", None)
        item["doi"] = normalize_doi(item.get("doi"))
        # Use the title as the main clickable route through the first official link.
        if item["doi"] and not any(link.get("label") == "Journal / DOI" for link in item["links"]):
            item["links"].insert(0, {"label": "Journal / DOI", "url": f"https://doi.org/{item['doi']}"})
        add_unique_link(item["links"], "Scholar", scholar_url(item.get("title", "")))

        openalex = openalex_record(item.get("doi", ""), item.get("title", ""))
        citation_count = openalex.get("citationCount")
        if isinstance(citation_count, int):
            item["citationCount"] = citation_count
        if openalex.get("openAlexUrl"):
            add_unique_link(item["links"], "OpenAlex", openalex["openAlexUrl"])
        if not item.get("keywords") and openalex.get("openAlexKeywords"):
            item["keywords"] = openalex["openAlexKeywords"]
    public_items = [
        item for item in items
        if item.get("type") != "manuscript"
        and any((link.get("url") or "").startswith("http") for link in item.get("links", []))
    ]
    return sorted(public_items, key=lambda item: (-int(item.get("year") or 0), item.get("title", "")))


def main() -> None:
    records = []
    scholar_records, scholar_meta = parse_scholar_profile()
    records.extend(scholar_records)
    records.extend(parse_orcid())
    records.extend(parse_dblp())
    merged = merge_records(records)
    now = datetime.now(timezone.utc).astimezone()
    payload = {
        "meta": {
            "updated": now.strftime("%Y-%m-%d"),
            "generatedAt": now.isoformat(timespec="seconds"),
            "sources": {
                "orcid": f"https://orcid.org/{ORCID_ID}",
                "dblp": "https://dblp.org/pid/74/2397-76.html",
                "crossref": "https://api.crossref.org/works",
                "openalex": "https://openalex.org/",
                "googleScholar": SCHOLAR_PROFILE_URL
            },
            **scholar_meta,
        },
        "items": merged,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"updated {OUTPUT_PATH} with {len(merged)} publication(s)")


if __name__ == "__main__":
    main()
