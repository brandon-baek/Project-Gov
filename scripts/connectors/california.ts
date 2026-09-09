import { crawlSitemap } from "@/scripts/connectors/sitemap";
import type { CrawlOptions } from "@/scripts/connectors/types";

export function crawlCalifornia(options: CrawlOptions) {
  return crawlSitemap({
    source: "california",
    publisher: "State of California",
    origin: "https://www.ca.gov",
    sitemapUrl: "https://www.ca.gov/sitemaps/sitemapindex.xml",
    include: (url) => !url.pathname.startsWith("/translate") && !url.pathname.includes("/search")
  }, options);
}
