import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { govGraph } from "@/lib/graph";

async function main() {
  const output = path.join(process.cwd(), "data", "generated");
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "graph.json"), `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), nodes: govGraph.nodes, edges: govGraph.edges, runs: [] }, null, 2)}\n`);
  process.stdout.write(`Exported ${govGraph.nodes.length} nodes and ${govGraph.edges.length} edges.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});
