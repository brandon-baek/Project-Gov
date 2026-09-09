import type { GraphEdge, GraphNode } from "@/lib/schema";
import type { ConnectorResult } from "@/scripts/connectors/types";

type SamListing = {
  assistanceListingId?: string;
  title?: string;
  status?: string;
  publishedDate?: string;
  programWebPage?: string;
  federalOrganization?: { department?: string; agency?: string; office?: string };
  overview?: { objective?: string; assistanceListingDescription?: string; subjectTerms?: { name?: string }[] };
  criteriaForApplying?: { applicant?: { description?: string; types?: { name?: string }[] }; beneficiary?: { description?: string; types?: { name?: string }[] } };
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function crawlSam(apiKey: string, limit: number): Promise<ConnectorResult> {
  const startedAt = new Date().toISOString();
  const warnings: string[] = [];
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const pageSize = Math.min(100, Math.max(1, limit));
  const endpoint = new URL("https://api.sam.gov/assistance-listings/v1/search");
  endpoint.searchParams.set("api_key", apiKey);
  endpoint.searchParams.set("status", "ACTIVE");
  endpoint.searchParams.set("pageSize", String(pageSize));
  endpoint.searchParams.set("pageNumber", "1");
  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`SAM.gov returned ${response.status}`);
  const data = await response.json() as { totalRecords?: number; assistanceListingsData?: SamListing[] };

  for (const listing of (data.assistanceListingsData ?? []).slice(0, limit)) {
    if (!listing.assistanceListingId || !listing.title) continue;
    const agency = listing.federalOrganization?.agency || listing.federalOrganization?.department || "Federal agency";
    const agencyId = `agency:${slug(agency)}`;
    const programId = `program:sam:${listing.assistanceListingId}`;
    const tags = [
      ...(listing.overview?.subjectTerms ?? []).map((term) => term.name).filter(Boolean),
      ...(listing.criteriaForApplying?.applicant?.types ?? []).map((type) => type.name).filter(Boolean),
      ...(listing.criteriaForApplying?.beneficiary?.types ?? []).map((type) => type.name).filter(Boolean)
    ] as string[];
    nodes.push({
      id: programId,
      kind: "program",
      label: `${listing.assistanceListingId} · ${listing.title.trim()}`,
      description: (listing.overview?.objective || listing.overview?.assistanceListingDescription || "Federal assistance listing.").slice(0, 900),
      params: {
        jurisdiction: "federal",
        audience: [],
        category: "Federal assistance",
        status: "machine-indexed",
        reviewedAt: listing.publishedDate?.slice(0, 10),
        sourceUrl: listing.programWebPage || `https://sam.gov/fal/${listing.assistanceListingId}`,
        sourceIds: [],
        tags: [agency, ...tags]
      }
    });
    if (!nodes.some((node) => node.id === agencyId)) {
      nodes.push({ id: agencyId, kind: "agency", label: agency, description: "Federal assistance publisher.", params: { jurisdiction: "federal", audience: [], status: "machine-indexed", sourceIds: [], tags: [] } });
    }
    edges.push({ from: programId, to: agencyId, relation: "published-by" });
  }

  return {
    source: "sam",
    startedAt,
    finishedAt: new Date().toISOString(),
    nodes,
    edges,
    warnings,
    metadata: { availableRecords: data.totalRecords ?? 0, indexedPrograms: nodes.filter((node) => node.kind === "program").length }
  };
}
