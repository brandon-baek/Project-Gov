from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import sys
from pathlib import Path


TOPICS = (
    ("Benefits and financial help", ("benefit", "unemployment", "food", "snap", "wic", "medicaid", "medicare", "disability", "retirement", "assistance")),
    ("Jobs and workplace", ("job", "worker", "workplace", "employment", "wage", "labor", "career", "workforce", "apprentice")),
    ("Housing and utilities", ("housing", "rent", "mortgage", "eviction", "homeless", "utility", "homeowner")),
    ("Health and coverage", ("health", "medical", "clinic", "insurance", "prescription", "medicaid", "medicare")),
    ("Children and families", ("child", "family", "adoption", "guardian", "childcare", "foster", "caregiver", "birth")),
    ("Education and training", ("student", "school", "college", "education", "training", "scholarship", "fafsa", "research", "internship")),
    ("Immigration and citizenship", ("immigration", "citizen", "green card", "visa", "naturalization", "uscis")),
    ("Taxes and money", ("tax", "refund", "finance", "loan", "debt", "money", "irs", "currency")),
    ("Business and permits", ("business", "permit", "license", "employer", "entrepreneur", "procurement", "grant")),
    ("Driving and transportation", ("driver", "vehicle", "transport", "transit", "dmv", "real id")),
    ("Identity and records", ("passport", "identity", "record", "certificate", "social security", "archive", "foia")),
    ("Consumer protection", ("scam", "fraud", "consumer", "complaint", "recall", "safety")),
    ("Emergencies and recovery", ("disaster", "emergency", "flood", "wildfire", "storm", "recovery")),
    ("Voting and civic life", ("vote", "voting", "election", "jury", "civic", "government")),
    ("Veterans and military", ("veteran", "military", "service member", "defense")),
    ("Law, courts, and public safety", ("legal", "court", "justice", "attorney", "crime", "oversight", "investigation")),
)

LOW_VALUE_TITLE = re.compile(r"privacy|accessibility|press release|newsroom|news release|newsletter|blog|meeting|photo gallery|about us|contact us|home ?page", re.I)
PATHWAY_SIGNAL = re.compile(
    r"\b(apply|application|benefits?|services?|assistance|request|replace|renew|file|report|register|payments?|claims?|vote|voting|adoption|guardianship|coverage|unemployment|tax|passport|grants?|permits?|licen[sc]e|eligibility|enrollment|complaints?|records?|training|internship|scholarship|support|resources?|online|citizenship|medicare|medicaid)\b|how-to|how to|green-card|green card|social-security|social security|student-aid|student aid|financial-aid|financial aid|plan-ahead|plan ahead|disaster-assistance|disaster assistance",
    re.I,
)
NON_PATHWAY = re.compile(
    r"^(about\b|\d{4}\b)|\b(news|press|blog|meetings?|events?|gallery|appointments?|biography|speech|remarks|celebrat(?:e|ing|ion)|bulletin|proclaims?|announces?|conviction|nominations?|obituary|postponed|policies|software|closed for|residents urged|program update|request for information|impact report|annual report|exceptional service)\b|404|500 error|index of|hello world|accessibility|privacy|contact us|about us",
    re.I,
)


def slug(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))[:72]


def category_for(text: str) -> tuple[str, list[str]]:
    normalized = text.lower().replace("-", " ")
    matches = [(category, [term for term in terms if term in normalized]) for category, terms in TOPICS]
    matches = [(category, terms) for category, terms in matches if terms]
    if not matches:
        return "More government services", []
    return max(matches, key=lambda item: len(item[1]))


def export_discovered_guides(database: sqlite3.Connection, output: Path) -> int:
    rows = database.execute(
        """
        SELECT s.node_id, s.title, s.publisher, s.url, s.last_checked,
               n.description, n.jurisdiction, n.params_json,
               a.id AS agency_id, a.label AS agency
        FROM sources s
        JOIN graph_nodes n ON n.id = s.node_id
        LEFT JOIN graph_edges e ON e.from_node_id = n.id AND e.relation = 'published-by'
        LEFT JOIN graph_nodes a ON a.id = e.to_node_id AND a.kind = 'agency'
        WHERE n.status = 'machine-indexed'
        ORDER BY s.title COLLATE NOCASE, s.url
        """
    ).fetchall()
    by_url: dict[str, dict[str, object]] = {}
    for node_id, title, publisher, url, checked, description, jurisdiction, params_json, agency_id, agency in rows:
        params = json.loads(params_json)
        pathway_text = f"{title} {url}"
        if not PATHWAY_SIGNAL.search(pathway_text) or NON_PATHWAY.search(f"{pathway_text} {description or ''}"):
            continue
        tags = [str(item) for item in params.get("tags", [])]
        outline = []
        for heading in tags:
            if heading.lower() != publisher.lower() and heading not in outline and len(heading) > 2:
                outline.append(heading)
        category, matched_terms = category_for(f"{title} {description} {url} {' '.join(tags)}")
        digest = hashlib.sha1(url.encode()).hexdigest()[:10]
        guide_slug = f"{slug(title) or 'government-service'}-{digest}"
        reason = (
            f"Shown because the crawler found this official page from {publisher}"
            + (f" and matched it to {category.lower()} using {', '.join(matched_terms[:3])}." if matched_terms else ". It remains discoverable under more government services until it is categorized more specifically.")
        )
        seo_eligible = len(title) >= 8 and len(description or "") >= 80 and not LOW_VALUE_TITLE.search(title)
        by_url[url] = {
            "id": f"journey:discovered:{digest}",
            "slug": guide_slug,
            "title": title,
            "summary": description or f"Official government information published by {publisher}.",
            "category": category,
            "jurisdiction": jurisdiction or params.get("jurisdiction") or "federal-and-state",
            "publisher": publisher,
            "agency": agency or publisher,
            "agencyId": agency_id,
            "sourceId": node_id,
            "officialUrl": url,
            "discoveredAt": params.get("retrievedAt", checked),
            "reason": reason,
            "matchedTerms": matched_terms,
            "outline": outline[:12],
            "seoEligible": seo_eligible,
            "qualityReason": "Substantial official title and summary available." if seo_eligible else "Visible for discovery; held out of search indexing until the crawler captures enough useful page detail.",
            "status": "discovered",
        }
    guides = sorted(by_url.values(), key=lambda item: (str(item["category"]), str(item["title"]), str(item["officialUrl"])))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"schemaVersion": 1, "count": len(guides), "guides": guides}, indent=2) + "\n")
    return len(guides)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    database_path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "data/govguide.db"
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else root / "data/generated/discovered-guides.json"
    connection = sqlite3.connect(database_path)
    try:
        print(f"Exported {export_discovered_guides(connection, output_path)} discovered guides to {output_path}")
    finally:
        connection.close()
