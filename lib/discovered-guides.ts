import raw from "@/data/generated/discovered-guides.json";
import { journeys } from "@/data/curated/journeys";
import { canonicalUrl, guideIdentity } from "@/lib/guide-identity";
import { matchesLocation, statesInText } from "@/lib/jurisdictions";

export type DiscoveredGuide = {
  id: string;
  slug: string;
  title: string;
  sourceTitle: string;
  summary: string;
  category: string;
  jurisdiction: string;
  state?: string;
  locality?: string;
  aliasSlugs?: string[];
  publisher: string;
  agency: string;
  agencyId: string | null;
  sourceId: string;
  officialUrl: string;
  discoveredAt: string;
  reviewedAt: string;
  reason: string;
  matchedTerms: string[];
  outline: string[];
  seoEligible: boolean;
  qualityReason: string;
  reviewChecks: string[];
  status: "published";
};

const reviewedUrls = new Set(journeys.flatMap((journey) => journey.sources.map((source) => canonicalUrl(source.url))));
const seen = new Set<string>();
export const discoveredGuides = (raw.guides as DiscoveredGuide[]).filter((guide) => {
  const key = guideIdentity(guide);
  if (reviewedUrls.has(canonicalUrl(guide.officialUrl)) || seen.has(key)) return false;
  seen.add(key);
  return true;
});

export function getDiscoveredGuideBySlug(slug: string) {
  return (raw.guides as DiscoveredGuide[]).find((guide) => guide.slug === slug || guide.aliasSlugs?.includes(slug));
}

export function getDiscoveredGuideById(id: string) {
  return discoveredGuides.find((guide) => guide.id === id);
}

const stopwords = new Set(["a", "about", "an", "and", "are", "do", "for", "get", "how", "i", "in", "is", "it", "me", "my", "need", "of", "on", "or", "the", "to", "want", "with"]);

function tokens(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 1 && !stopwords.has(word));
}

export function retrieveDiscoveredGuides(query: string, limit = 6, state?: string, locality?: string) {
  const location = state ?? statesInText(query)[0]?.code;
  const terms = [...new Set(tokens(query))];
  return discoveredGuides.filter((guide) => matchesLocation(guide, location, locality)).map((guide) => {
    const title = guide.title.toLowerCase();
    const category = guide.category.toLowerCase();
    const summary = guide.summary.toLowerCase();
    const publisher = guide.publisher.toLowerCase();
    const score = terms.reduce((total, term) => total
      + (title.includes(term) ? 8 : 0)
      + (category.includes(term) ? 4 : 0)
      + (summary.includes(term) ? 2 : 0)
      + (publisher.includes(term) ? 1 : 0), 0);
    return { guide, score };
  }).filter((match) => match.score >= 12).sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title)).slice(0, limit);
}
