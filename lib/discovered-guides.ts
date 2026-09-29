import raw from "@/data/generated/discovered-guides.json";

export type DiscoveredGuide = {
  id: string;
  slug: string;
  title: string;
  sourceTitle: string;
  summary: string;
  category: string;
  jurisdiction: string;
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

export const discoveredGuides = raw.guides as DiscoveredGuide[];

export function getDiscoveredGuideBySlug(slug: string) {
  return discoveredGuides.find((guide) => guide.slug === slug);
}

export function getDiscoveredGuideById(id: string) {
  return discoveredGuides.find((guide) => guide.id === id);
}

const stopwords = new Set(["a", "about", "an", "and", "are", "do", "for", "get", "how", "i", "in", "is", "it", "me", "my", "need", "of", "on", "or", "the", "to", "want", "with"]);

function tokens(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 1 && !stopwords.has(word));
}

export function retrieveDiscoveredGuides(query: string, limit = 6) {
  const terms = [...new Set(tokens(query))];
  return discoveredGuides.map((guide) => {
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
  }).filter((match) => match.score > 0).sort((a, b) => b.score - a.score || a.guide.title.localeCompare(b.guide.title)).slice(0, limit);
}
