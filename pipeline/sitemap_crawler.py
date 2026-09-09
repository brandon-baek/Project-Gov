from __future__ import annotations

import hashlib
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import urlsplit, urlunsplit
from urllib.robotparser import RobotFileParser
from xml.etree import ElementTree

from bs4 import BeautifulSoup

from pipeline.config import SitemapSource
from pipeline.http_client import HttpPolicy, RateGate, build_session
from pipeline.models import CrawlResult, Edge, Node

MAX_SITEMAPS = 100
MAX_PAGE_BYTES = 5_000_000


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_url(value: str) -> str:
    parsed = urlsplit(value)
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, "", ""))


def slug(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def discover_sitemaps(source: SitemapSource, policy: HttpPolicy) -> tuple[list[str], int]:
    session = build_session(policy)
    queue = [(source.sitemap_url, 0)]
    seen: set[str] = set()
    pages: set[str] = set()
    while queue and len(seen) < MAX_SITEMAPS:
        url, depth = queue.pop(0)
        if url in seen or depth > 3:
            continue
        seen.add(url)
        response = session.get(url, timeout=policy.timeout_seconds, headers={"Accept": "application/xml,text/xml"})
        response.raise_for_status()
        root = ElementTree.fromstring(response.content)
        namespace = "" if not root.tag.startswith("{") else root.tag.split("}")[0] + "}"
        if root.tag.endswith("sitemapindex"):
            for loc in root.findall(f"{namespace}sitemap/{namespace}loc"):
                if loc.text:
                    queue.append((loc.text.strip(), depth + 1))
        else:
            for loc in root.findall(f"{namespace}url/{namespace}loc"):
                if loc.text:
                    pages.add(clean_url(loc.text.strip()))
    return sorted(pages), len(seen)


def robots_policy(source: SitemapSource, policy: HttpPolicy) -> tuple[RobotFileParser, float]:
    url = f"{source.origin}/robots.txt"
    session = build_session(policy)
    response = session.get(url, timeout=policy.timeout_seconds, headers={"Accept": "text/plain"})
    response.raise_for_status()
    parser = RobotFileParser(url)
    parser.parse(response.text.splitlines())
    crawl_delay = parser.crawl_delay(policy.user_agent) or parser.crawl_delay("*") or 0
    return parser, max(policy.delay_seconds, float(crawl_delay))


def parse_page(source: SitemapSource, url: str, policy: HttpPolicy, gate: RateGate) -> Node | None:
    gate.wait()
    response = build_session(policy).get(
        url,
        timeout=policy.timeout_seconds,
        headers={"Accept": "text/html,application/xhtml+xml"},
        allow_redirects=True,
    )
    response.raise_for_status()
    if not source.accepts(response.url):
        raise ValueError("redirected outside the configured government origin")
    content_type = response.headers.get("content-type", "")
    if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
        return None
    if len(response.content) > MAX_PAGE_BYTES:
        raise ValueError("page exceeds the 5 MB HTML limit")
    soup = BeautifulSoup(response.content, "lxml")
    for element in soup.select("script,style,noscript,svg,nav,footer"):
        element.decompose()
    main = soup.select_one("main, article, [role='main']") or soup.body
    if not main:
        return None
    heading = main.find("h1") or soup.find("title")
    title = " ".join(heading.get_text(" ", strip=True).split()) if heading else ""
    if not title:
        return None
    text = " ".join(main.get_text(" ", strip=True).split())
    description_tag = soup.select_one("meta[name='description']")
    description = description_tag.get("content", "") if description_tag else ""
    if not description:
        paragraph = main.find("p")
        description = paragraph.get_text(" ", strip=True) if paragraph else text[:700]
    headings = [" ".join(item.get_text(" ", strip=True).split()) for item in main.select("h2,h3")[:20]]
    final_url = clean_url(response.url)
    retrieved = now()
    return Node(
        id=f"source:crawl:{hashlib.sha1(final_url.encode()).hexdigest()[:16]}",
        kind="source",
        label=title[:240],
        description=" ".join(description.split())[:700],
        reviewed_at=retrieved[:10],
        source_url=final_url,
        params={
            "audience": [], "status": "machine-indexed", "reviewedAt": retrieved[:10],
            "sourceUrl": final_url, "contentHash": hashlib.sha256(text.encode()).hexdigest(),
            "sourceIds": [], "tags": [source.publisher, *headings], "retrievedAt": retrieved,
            "httpStatus": response.status_code, "etag": response.headers.get("etag"),
            "lastModified": response.headers.get("last-modified"),
        },
    )


def crawl_sitemap(source: SitemapSource, policy: HttpPolicy, limit: int, concurrency: int) -> CrawlResult:
    started = now()
    warnings: list[str] = []
    try:
        robots, delay = robots_policy(source, policy)
    except Exception as error:
        return CrawlResult(source.key, started, now(), warnings=[f"robots.txt unavailable; fail-closed: {error}"], metadata={"indexedPages": 0})
    pages, sitemap_count = discover_sitemaps(source, policy)
    eligible = [url for url in pages if source.accepts(url) and robots.can_fetch(policy.user_agent, url)][:limit]
    gate = RateGate(delay)
    nodes: list[Node] = []
    lock = threading.Lock()
    with ThreadPoolExecutor(max_workers=max(1, min(concurrency, 8))) as executor:
        futures = {executor.submit(parse_page, source, url, policy, gate): url for url in eligible}
        for future in as_completed(futures):
            try:
                node = future.result()
                if node:
                    nodes.append(node)
            except Exception as error:
                with lock:
                    warnings.append(f"{futures[future]}: {error}")
    nodes.sort(key=lambda item: item.source_url or "")
    agency_id = f"agency:crawl:{slug(source.publisher)}"
    edges = [Edge(node.id, agency_id, "published-by") for node in nodes]
    if nodes:
        nodes.append(Node(agency_id, "agency", source.publisher, f"Publisher for {source.key} discovery records.", params={"audience": [], "status": "machine-indexed", "sourceIds": [], "tags": [source.key]}))
    return CrawlResult(source.key, started, now(), nodes, edges, warnings, {
        "sitemapsRead": sitemap_count, "urlsDiscovered": len(pages), "urlsEligible": len(eligible),
        "pagesIndexed": len([node for node in nodes if node.kind == "source"]), "requestDelaySeconds": delay,
        "workers": max(1, min(concurrency, 8)),
    })
