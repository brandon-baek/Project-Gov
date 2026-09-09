from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class SitemapSource:
    key: str
    publisher: str
    origin: str
    sitemap_url: str
    excluded_prefixes: tuple[str, ...] = ()
    excluded_fragments: tuple[str, ...] = ()

    def accepts(self, url: str) -> bool:
        parsed = urlparse(url)
        if f"{parsed.scheme}://{parsed.netloc}" != self.origin:
            return False
        return not any(parsed.path.startswith(item) for item in self.excluded_prefixes) and not any(item in parsed.path for item in self.excluded_fragments)


SITEMAP_SOURCES = (
    SitemapSource(
        key="usagov",
        publisher="USA.gov",
        origin="https://www.usa.gov",
        sitemap_url="https://www.usa.gov/sitemap.xml",
        excluded_prefixes=("/es/",),
        excluded_fragments=("/search",),
    ),
    SitemapSource(
        key="california",
        publisher="State of California",
        origin="https://www.ca.gov",
        sitemap_url="https://www.ca.gov/sitemaps/sitemapindex.xml",
        excluded_prefixes=("/translate",),
        excluded_fragments=("/search",),
    ),
)
