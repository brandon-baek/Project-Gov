import { createHash } from "node:crypto";
import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import robotsParser from "robots-parser";
import type { ConnectorResult, CrawlOptions } from "@/scripts/connectors/types";
import type { GraphNode } from "@/lib/schema";

const xml = new XMLParser({ ignoreAttributes: false });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function getSitemapUrls(url: string, userAgent: string, depth = 0): Promise<string[]> {
  if (depth > 2) return [];
  const response = await fetch(url, { headers: { "User-Agent": userAgent, Accept: "application/xml,text/xml" } });
  if (!response.ok) throw new Error(`Sitemap ${url} returned ${response.status}`);
  const body = xml.parse(await response.text());
  const direct = asArray<{ loc?: string }>(body.urlset?.url).map((entry) => entry.loc).filter(Boolean) as string[];
  const indexes = asArray<{ loc?: string }>(body.sitemapindex?.sitemap).map((entry) => entry.loc).filter(Boolean) as string[];
  if (indexes.length === 0) return direct;
  const nested = await Promise.all(indexes.slice(0, 12).map((entry) => getSitemapUrls(entry, userAgent, depth + 1)));
  return nested.flat();
}

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function pageToNode(html: string, url: string, publisher: string, retrievedAt: string): GraphNode | null {
  const $ = load(html);
  const main = $("main").first();
  const h1 = normalizeSpace(main.find("h1").first().text() || $("h1").first().text());
  if (!h1) return null;
  const description = normalizeSpace($("meta[name='description']").attr("content") || main.find("p").first().text()).slice(0, 500);
  const headings = main.find("h2, h3").map((_, element) => normalizeSpace($(element).text())).get().filter(Boolean).slice(0, 16);
  const hash = createHash("sha256").update(normalizeSpace(main.text())).digest("hex");
  const id = `source:crawl:${createHash("sha1").update(url).digest("hex").slice(0, 16)}`;
  return {
    id,
    kind: "source",
    label: h1,
    description,
    params: {
      audience: [],
      status: "machine-indexed",
      reviewedAt: retrievedAt.slice(0, 10),
      sourceUrl: url,
      contentHash: hash,
      sourceIds: [],
      tags: [publisher, ...headings]
    }
  };
}

export async function crawlSitemap(config: {
  source: string;
  publisher: string;
  origin: string;
  sitemapUrl: string;
  include: (url: URL) => boolean;
}, options: CrawlOptions): Promise<ConnectorResult> {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const robotsUrl = new URL("/robots.txt", config.origin).toString();
  const robotsResponse = await fetch(robotsUrl, { headers: { "User-Agent": options.userAgent } });
  const robots = robotsParser(robotsUrl, robotsResponse.ok ? await robotsResponse.text() : "User-agent: *\nAllow: /");
  const robotsDelay = Number(robots.getCrawlDelay(options.userAgent) ?? robots.getCrawlDelay("*") ?? 0) * 1000;
  const delay = Math.max(options.delayMs, robotsDelay);
  const urls = (await getSitemapUrls(config.sitemapUrl, options.userAgent))
    .map((value) => new URL(value))
    .filter((url) => url.origin === config.origin && config.include(url) && robots.isAllowed(url.toString(), options.userAgent) !== false)
    .slice(0, options.limit);
  const nodes: GraphNode[] = [];

  for (let index = 0; index < urls.length; index += 1) {
    if (index > 0 && delay > 0) await sleep(delay);
    const url = urls[index];
    try {
      const response = await fetch(url, { headers: { "User-Agent": options.userAgent, Accept: "text/html" }, redirect: "follow" });
      if (!response.ok) {
        warnings.push(`${url} returned ${response.status}`);
        continue;
      }
      const type = response.headers.get("content-type") ?? "";
      if (!type.includes("text/html")) continue;
      const node = pageToNode(await response.text(), url.toString(), config.publisher, new Date().toISOString());
      if (node) nodes.push(node);
    } catch (error) {
      warnings.push(`${url} failed: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    source: config.source,
    startedAt,
    finishedAt: new Date().toISOString(),
    nodes,
    edges: [],
    warnings,
    metadata: { discoveredUrls: urls.length, indexedPages: nodes.length, appliedDelayMs: delay }
  };
}
