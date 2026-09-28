from __future__ import annotations

import csv
import hashlib
import io
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from urllib.parse import urlsplit

import requests

from pipeline.http_client import HttpPolicy, build_session
from pipeline.models import CrawlResult, Node

FEDERAL_DOMAINS_CSV = "https://raw.githubusercontent.com/cisagov/dotgov-data/main/current-federal.csv"
ALL_GOV_DOMAINS_CSV = "https://raw.githubusercontent.com/cisagov/dotgov-data/main/current-full.csv"
USAGOV_STATES_URL = "https://www.usa.gov/state-governments"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_federal_domains(policy: HttpPolicy, limit: int | None = None) -> list[dict[str, str]]:
    with build_session(policy) as session:
        response = session.get(FEDERAL_DOMAINS_CSV, timeout=policy.timeout_seconds)
        response.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(response.text)))
    valid = [row for row in rows if re.fullmatch(r"[a-z0-9.-]+\.gov", row.get("Domain name", ""), re.I)]
    return valid[:limit] if limit else valid


def load_all_gov_domains(policy: HttpPolicy, limit: int | None = None) -> list[dict[str, str]]:
    with build_session(policy) as session:
        response = session.get(ALL_GOV_DOMAINS_CSV, timeout=policy.timeout_seconds)
        response.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(response.text)))
    valid = [row for row in rows if re.fullmatch(r"[a-z0-9.-]+\.gov", row.get("Domain name", ""), re.I)]
    return valid[:limit] if limit else valid


def directory_result(rows: list[dict[str, str]]) -> CrawlResult:
    started = now()
    nodes = []
    for row in rows:
        domain = row["Domain name"].lower()
        organization = row.get("Organization name") or domain
        subdivision = row.get("Suborganization name") or ""
        label = f"{organization} — {subdivision}" if subdivision else organization
        node_id = f"agency:dotgov:{hashlib.sha1(domain.encode()).hexdigest()[:16]}"
        nodes.append(Node(
            node_id, "agency", label[:240], f"Official federal .gov registration for {domain}.",
            jurisdiction="federal", source_url=f"https://{domain}",
            params={
                "jurisdiction": "federal", "audience": [], "status": "machine-indexed",
                "sourceUrl": f"https://{domain}", "sourceIds": [],
                "tags": [domain, row.get("Domain type", "Federal"), row.get("City", ""), row.get("State", "")],
                "retrievedAt": now(), "catalogSource": FEDERAL_DOMAINS_CSV,
            },
        ))
    return CrawlResult("federal-directory", started, now(), nodes, [], [], {
        "domainsImported": len(nodes), "catalog": FEDERAL_DOMAINS_CSV,
    })


def crawl_federal_directory(policy: HttpPolicy) -> CrawlResult:
    return directory_result(load_federal_domains(policy))


def government_domain_result(rows: list[dict[str, str]]) -> CrawlResult:
    started = now()
    nodes = []
    for row in rows:
        domain = row["Domain name"].lower()
        org = row.get("Organization name") or domain
        subdivision = row.get("Suborganization name") or ""
        label = f"{org} — {subdivision}" if subdivision else org
        domain_type = row.get("Domain type", "")
        federal = domain_type.lower().startswith("federal")
        node_id = f"agency:dotgov-full:{hashlib.sha1(domain.encode()).hexdigest()[:16]}"
        nodes.append(Node(
            node_id, "agency", label[:240], f"Registered U.S. government .gov domain: {domain}.",
            jurisdiction="federal" if federal else None, source_url=f"https://{domain}",
            params={"jurisdiction": "federal" if federal else "state-local-tribal", "audience": [],
                    "status": "machine-indexed", "sourceUrl": f"https://{domain}", "sourceIds": [],
                    "tags": [domain, domain_type, row.get("State", ""), row.get("City", "")],
                    "retrievedAt": now(), "catalogSource": ALL_GOV_DOMAINS_CSV},
        ))
    return CrawlResult("government-domain-directory", started, now(), nodes, [], [],
                       {"domainsImported": len(nodes), "catalog": ALL_GOV_DOMAINS_CSV})


def crawl_state_directory(policy: HttpPolicy) -> tuple[CrawlResult, list[dict[str, str]]]:
    """Use USA.gov's state/territory directory as the authoritative starting point."""
    from bs4 import BeautifulSoup
    from urllib.parse import urljoin

    started = now()
    with build_session(policy) as session:
        response = session.get(USAGOV_STATES_URL, timeout=policy.timeout_seconds)
        response.raise_for_status()
        directory_url, directory_content = response.url, response.content
    soup = BeautifulSoup(directory_content, "lxml")
    main = soup.select_one("main") or soup
    state_links = []
    for anchor in main.select("a[href]"):
        name = " ".join(anchor.get_text(" ", strip=True).split())
        href = urljoin(directory_url, anchor["href"])
        if re.fullmatch(r".+ \([A-Z]{2}\)", name) and urlsplit(href).hostname == "www.usa.gov":
            state_links.append((name.rsplit(" (", 1)[0], name[-3:-1], href))

    nodes: list[Node] = []
    sites: dict[str, dict[str, str]] = {}
    headers = {"User-Agent": policy.user_agent}
    warnings: list[str] = []
    def fetch_state(item: tuple[str, str, str]):
        state_name, abbreviation, detail_url = item
        try:
            with build_session(policy) as state_session:
                detail_response = state_session.get(detail_url, timeout=min(8.0, policy.timeout_seconds), headers=headers)
                detail_response.raise_for_status()
            detail_soup = BeautifulSoup(detail_response.content, "lxml")
            detail_main = detail_soup.select_one("main") or detail_soup
            state_node_id = f"agency:state:{abbreviation.lower()}"
            state_nodes = [Node(state_node_id, "agency", state_name, f"Official state or territory government directory for {state_name}.",
                              source_url=detail_response.url,
                              params={"jurisdiction": "state-or-territory", "state": abbreviation,
                                      "audience": [], "status": "machine-indexed", "sourceUrl": detail_response.url,
                                      "sourceIds": [], "tags": [state_name, abbreviation, "state-government"],
                                      "catalogSource": USAGOV_STATES_URL, "retrievedAt": now()})]
            state_sites: dict[str, dict[str, str]] = {}
            seen_urls = set()
            for anchor in detail_main.select("a[href]"):
                label = " ".join(anchor.get_text(" ", strip=True).split())
                site_url = urljoin(detail_response.url, anchor["href"])
                parsed = urlsplit(site_url)
                if not label or parsed.scheme not in ("https", "http") or parsed.hostname in ("www.usa.gov", "usa.gov"):
                    continue
                if any(host in (parsed.hostname or "") for host in ("facebook.com", "x.com", "twitter.com", "linkedin.com", "youtube.com", "instagram.com")):
                    continue
                site_url = f"{parsed.scheme}://{parsed.netloc}/"
                key = site_url.lower()
                if key in seen_urls:
                    continue
                seen_urls.add(key)
                digest = hashlib.sha1(f"{abbreviation}:{key}".encode()).hexdigest()[:16]
                state_nodes.append(Node(f"agency:state-site:{digest}", "agency", label[:240],
                                  f"Official {state_name} government or agency website listed by USA.gov.",
                                  jurisdiction="california" if abbreviation == "CA" else None, source_url=site_url,
                                  params={"jurisdiction": "state", "state": abbreviation, "audience": [],
                                          "status": "machine-indexed", "sourceUrl": site_url, "sourceIds": [],
                                          "tags": [state_name, abbreviation, label, "state-agency"],
                                          "catalogSource": detail_response.url, "retrievedAt": now()}))
                state_sites.setdefault(key, {"domain": parsed.hostname or "", "publisher": label, "state": abbreviation,
                                             "root": site_url, "catalog_url": detail_response.url})
            return state_nodes, state_sites, None
        except Exception as error:
            return [], {}, f"{state_name} ({abbreviation}) directory page failed: {error}"
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch_state, item) for item in state_links]
        for future in as_completed(futures):
            state_nodes, state_sites, warning = future.result()
            nodes.extend(state_nodes)
            sites.update(state_sites)
            if warning:
                warnings.append(warning)
    if not state_links:
        warnings.append("USA.gov state directory yielded no state or territory links")
    result = CrawlResult("state-directory", started, now(), nodes, [], warnings,
                         {"statesListed": len(state_links), "sitesCataloged": len(sites), "catalog": USAGOV_STATES_URL})
    return result, list(sites.values())


def discover_sitemap(domain: str, policy: HttpPolicy) -> str | None:
    origin = f"https://{domain}"
    headers = {"User-Agent": policy.user_agent}
    probe_timeout = min(3.0, policy.timeout_seconds)
    try:
        with requests.get(f"{origin}/robots.txt", timeout=probe_timeout, headers=headers) as robots:
            if robots.ok:
                for line in robots.text.splitlines():
                    if line.lower().startswith("sitemap:"):
                        candidate = line.split(":", 1)[1].strip()
                        host = (urlsplit(candidate).hostname or "").removeprefix("www.")
                        if host == domain.removeprefix("www."):
                            return candidate
    except Exception:
        pass
    try:
        candidate = f"{origin}/sitemap.xml"
        with requests.get(candidate, timeout=probe_timeout, headers={**headers, "Accept": "application/xml,text/xml"}) as response:
            if response.ok and ("xml" in response.headers.get("content-type", "") or response.content.lstrip().startswith(b"<")):
                return response.url
    except Exception:
        pass
    return None
