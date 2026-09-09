import { journeys } from "@/data/curated/journeys";
import type { GraphEdge, GraphNode, Journey } from "@/lib/schema";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export type GovGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeById: Map<string, GraphNode>;
};

export function buildGraph(records: Journey[] = journeys): GovGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  for (const journey of records) {
    nodes.set(journey.id, {
      id: journey.id,
      kind: "journey",
      label: journey.title,
      description: journey.summary,
      params: {
        jurisdiction: journey.jurisdiction,
        audience: journey.audience,
        category: journey.category,
        status: journey.reviewStatus,
        reviewedAt: journey.reviewedAt,
        sourceIds: journey.sources.map((source) => `source:${source.id}`),
        tags: journey.aliases
      }
    });

    journey.steps.forEach((step, index) => {
      const stepId = `${journey.id}:step:${step.id}`;
      nodes.set(stepId, {
        id: stepId,
        kind: "step",
        label: step.title,
        description: step.detail,
        params: {
          jurisdiction: journey.jurisdiction,
          audience: journey.audience,
          category: journey.category,
          status: journey.reviewStatus,
          reviewedAt: journey.reviewedAt,
          sourceIds: step.sourceIds.map((sourceId) => `source:${sourceId}`),
          tags: []
        }
      });
      edges.push({ from: journey.id, to: stepId, relation: "contains", order: index + 1 });
      if (index > 0) {
        edges.push({ from: `${journey.id}:step:${journey.steps[index - 1].id}`, to: stepId, relation: "next", order: index + 1 });
      }
      for (const sourceId of step.sourceIds) {
        edges.push({ from: stepId, to: `source:${sourceId}`, relation: "supported-by" });
      }
    });

    for (const source of journey.sources) {
      const sourceId = `source:${source.id}`;
      const agencyId = `agency:${slug(source.publisher)}`;
      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, {
          id: sourceId,
          kind: "source",
          label: source.title,
          description: `Official source published by ${source.publisher}.`,
          params: {
            audience: [],
            status: journey.reviewStatus,
            reviewedAt: source.lastChecked,
            sourceUrl: source.url,
            sourceIds: [],
            tags: [source.publisher]
          }
        });
      }
      if (!nodes.has(agencyId)) {
        nodes.set(agencyId, {
          id: agencyId,
          kind: "agency",
          label: source.publisher,
          description: "Government publisher or official service.",
          params: { audience: [], status: "verified", sourceIds: [], tags: [] }
        });
      }
      edges.push({ from: sourceId, to: agencyId, relation: "published-by" });
    }
  }

  return { nodes: [...nodes.values()], edges, nodeById: nodes };
}

export function traceJourney(journey: Journey) {
  const graph = buildGraph([journey]);
  return {
    nodes: graph.nodes.map(({ id, kind, label }) => ({ id, kind, label })),
    edges: graph.edges
  };
}

export const govGraph = buildGraph();
