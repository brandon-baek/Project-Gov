import type { MetadataRoute } from "next";
import { journeys } from "@/data/curated/journeys";
import { discoveredGuides } from "@/lib/discovered-guides";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/guides", "/moving", "/graph", "/data", "/about", "/privacy"].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : path === "/guides" ? .9 : .6 }));
  const reviewed = journeys.map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, lastModified: guide.reviewedAt, changeFrequency: "monthly" as const, priority: .9 }));
  const discovered = discoveredGuides.filter((guide) => guide.seoEligible).map((guide) => ({ url: `${siteUrl}/guides/${guide.slug}`, lastModified: guide.discoveredAt, changeFrequency: "monthly" as const, priority: .7 }));
  return [...staticPages, ...reviewed, ...discovered];
}
