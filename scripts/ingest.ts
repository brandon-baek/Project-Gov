import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { crawlUsaGov } from "@/scripts/connectors/usagov";
import { crawlCalifornia } from "@/scripts/connectors/california";
import { crawlSam } from "@/scripts/connectors/sam";
import { govGraph } from "@/lib/graph";
import type { ConnectorResult } from "@/scripts/connectors/types";

const generatedDir = path.join(process.cwd(), "data", "generated");
const selected = process.argv.find((arg) => arg.startsWith("--source="))?.split("=")[1];
const limit = Number(process.env.GOVGUIDE_CRAWL_LIMIT ?? 40);
const delayMs = Number(process.env.GOVGUIDE_CRAWL_DELAY_MS ?? 0);
const userAgent = process.env.GOVGUIDE_USER_AGENT ?? "GovGuide/1.0 (educational civic navigation project)";

async function existing(file: string): Promise<ConnectorResult | null> {
  try { return JSON.parse(await readFile(path.join(generatedDir, file), "utf8")) as ConnectorResult; } catch { return null; }
}

async function main() {
  await mkdir(generatedDir, { recursive: true });
  const results: ConnectorResult[] = [];
  const options = { limit, delayMs, userAgent };

  if (!selected || selected === "usagov") results.push(await crawlUsaGov(options));
  else { const prior = await existing("usagov.json"); if (prior) results.push(prior); }

  if (!selected || selected === "california") results.push(await crawlCalifornia(options));
  else { const prior = await existing("california.json"); if (prior) results.push(prior); }

  if ((!selected || selected === "sam") && process.env.SAM_API_KEY) results.push(await crawlSam(process.env.SAM_API_KEY, Math.max(limit, 100)));
  else if (selected === "sam" && !process.env.SAM_API_KEY) throw new Error("SAM_API_KEY is required for the SAM.gov connector.");
  else { const prior = await existing("sam.json"); if (prior) results.push(prior); }

  for (const result of results) await writeFile(path.join(generatedDir, `${result.source}.json`), `${JSON.stringify(result, null, 2)}\n`);

  const nodeMap = new Map(govGraph.nodes.map((node) => [node.id, node]));
  const edges = [...govGraph.edges];
  for (const result of results) {
    for (const node of result.nodes) nodeMap.set(node.id, node);
    edges.push(...result.edges);
  }
  const graph = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    nodes: [...nodeMap.values()],
    edges,
    runs: results.map(({ source, startedAt, finishedAt, warnings, metadata }) => ({ source, startedAt, finishedAt, warnings, metadata }))
  };
  await writeFile(path.join(generatedDir, "graph.json"), `${JSON.stringify(graph, null, 2)}\n`);
  process.stdout.write(`Wrote ${graph.nodes.length} nodes and ${graph.edges.length} edges from ${results.length} connector(s).\n`);
}

main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : error}\n`); process.exitCode = 1; });
