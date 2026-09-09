import type { GraphEdge, GraphNode } from "@/lib/schema";

export type ConnectorResult = {
  source: string;
  startedAt: string;
  finishedAt: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  warnings: string[];
  metadata: Record<string, string | number | boolean>;
};

export type CrawlOptions = {
  limit: number;
  userAgent: string;
  delayMs: number;
};
