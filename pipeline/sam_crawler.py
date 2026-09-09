from __future__ import annotations

import re
from datetime import datetime, timezone

from pipeline.http_client import HttpPolicy, build_session
from pipeline.models import CrawlResult, Edge, Node


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slug(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def crawl_sam(api_key: str, policy: HttpPolicy, limit: int) -> CrawlResult:
    started = now()
    session = build_session(policy)
    nodes: dict[str, Node] = {}
    edges: list[Edge] = []
    warnings: list[str] = []
    total_available = 0
    page = 1
    page_size = min(100, max(1, limit))

    while len([node for node in nodes.values() if node.kind == "program"]) < limit:
        response = session.get(
            "https://api.sam.gov/assistance-listings/v1/search",
            params={"api_key": api_key, "status": "ACTIVE", "pageSize": page_size, "pageNumber": page},
            headers={"Accept": "application/json"},
            timeout=policy.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        total_available = int(payload.get("totalRecords") or 0)
        listings = payload.get("assistanceListingsData") or []
        if not listings:
            break
        for listing in listings:
            listing_id = listing.get("assistanceListingId")
            title = (listing.get("title") or "").strip()
            if not listing_id or not title:
                continue
            organization = listing.get("federalOrganization") or {}
            agency = organization.get("agency") or organization.get("department") or "Federal agency"
            overview = listing.get("overview") or {}
            program_id = f"program:sam:{listing_id}"
            agency_id = f"agency:{slug(agency)}"
            source_url = listing.get("programWebPage") or f"https://sam.gov/fal/{listing_id}"
            subject_terms = [item.get("name") for item in overview.get("subjectTerms") or [] if item.get("name")]
            nodes[program_id] = Node(
                program_id, "program", f"{listing_id} · {title}",
                (overview.get("objective") or overview.get("assistanceListingDescription") or "Federal assistance listing.")[:900],
                jurisdiction="federal", category="Federal assistance",
                reviewed_at=(listing.get("publishedDate") or "")[:10] or None, source_url=source_url,
                params={"jurisdiction": "federal", "audience": [], "category": "Federal assistance", "status": "machine-indexed", "sourceUrl": source_url, "sourceIds": [], "tags": [agency, *subject_terms], "retrievedAt": now(), "httpStatus": response.status_code},
            )
            nodes.setdefault(agency_id, Node(agency_id, "agency", agency, "Federal assistance publisher.", jurisdiction="federal", params={"jurisdiction": "federal", "audience": [], "status": "machine-indexed", "sourceIds": [], "tags": []}))
            edges.append(Edge(program_id, agency_id, "published-by"))
            if len([node for node in nodes.values() if node.kind == "program"]) >= limit:
                break
        if page * page_size >= total_available:
            break
        page += 1

    return CrawlResult("sam", started, now(), list(nodes.values()), edges, warnings, {
        "recordsAvailable": total_available,
        "programsIndexed": len([node for node in nodes.values() if node.kind == "program"]),
        "pagesRequested": page,
    })
