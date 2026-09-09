import { crawlSitemap } from "@/scripts/connectors/sitemap";
import type { CrawlOptions } from "@/scripts/connectors/types";

export function crawlUsaGov(options: CrawlOptions) {
  return crawlSitemap({
    source: "usagov",
    publisher: "USA.gov",
    origin: "https://www.usa.gov",
    sitemapUrl: "https://www.usa.gov/sitemap.xml",
    include: (url) => !url.pathname.startsWith("/es/") && !url.pathname.includes("/search") && url.pathname !== "/"
  }, options);
}
