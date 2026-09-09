import { readFileSync } from "node:fs";
import path from "node:path";
import { journeys } from "@/data/curated/journeys";
import { govGraph } from "@/lib/graph";
import { migrateDatabase, openDatabase } from "@/lib/database";

const database = openDatabase();
migrateDatabase(database);

const insertNode = database.prepare(`
  INSERT INTO graph_nodes (id, kind, label, description, jurisdiction, category, status, reviewed_at, source_url, params_json, updated_at)
  VALUES (@id, @kind, @label, @description, @jurisdiction, @category, @status, @reviewedAt, @sourceUrl, @paramsJson, CURRENT_TIMESTAMP)
  ON CONFLICT(id) DO UPDATE SET label=excluded.label, description=excluded.description, jurisdiction=excluded.jurisdiction,
    category=excluded.category, status=excluded.status, reviewed_at=excluded.reviewed_at, source_url=excluded.source_url,
    params_json=excluded.params_json, updated_at=CURRENT_TIMESTAMP
`);
const insertEdge = database.prepare("INSERT OR REPLACE INTO graph_edges (from_node_id, to_node_id, relation, edge_order) VALUES (?, ?, ?, ?)");
const insertJourney = database.prepare(`
  INSERT OR REPLACE INTO journeys (node_id, slug, category, jurisdiction, summary, estimated_time, official_action_label, official_action_url, document_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertStep = database.prepare(`
  INSERT OR REPLACE INTO journey_steps (node_id, journey_node_id, step_key, step_order, detail, action_label, action_url, caution)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSource = database.prepare("INSERT OR REPLACE INTO sources (node_id, source_key, title, publisher, url, last_checked, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?)");
const insertStepSource = database.prepare("INSERT OR IGNORE INTO step_sources (step_node_id, source_node_id) VALUES (?, ?)");
const insertSearch = database.prepare("INSERT INTO journey_search (journey_node_id, title, summary, aliases, category) VALUES (?, ?, ?, ?, ?)");
const insertGnn = database.prepare("INSERT OR REPLACE INTO gnn_suggestions (from_node_id, to_node_id, model, score, review_status) VALUES (?, ?, ?, ?, 'pending')");

database.transaction(() => {
  database.exec("DELETE FROM journey_search; DELETE FROM step_sources; DELETE FROM journey_steps; DELETE FROM journeys; DELETE FROM graph_edges;");
  for (const node of govGraph.nodes) {
    insertNode.run({
      id: node.id,
      kind: node.kind,
      label: node.label,
      description: node.description,
      jurisdiction: node.params.jurisdiction ?? null,
      category: node.params.category ?? null,
      status: node.params.status,
      reviewedAt: node.params.reviewedAt ?? null,
      sourceUrl: node.params.sourceUrl ?? null,
      paramsJson: JSON.stringify(node.params)
    });
  }
  for (const edge of govGraph.edges) insertEdge.run(edge.from, edge.to, edge.relation, edge.order ?? null);
  for (const journey of journeys) {
    insertJourney.run(journey.id, journey.slug, journey.category, journey.jurisdiction, journey.summary, journey.estimatedTime ?? null, journey.officialAction?.label ?? null, journey.officialAction?.url ?? null, JSON.stringify(journey));
    insertSearch.run(journey.id, journey.title, journey.summary, journey.aliases.join(" "), journey.category);
    for (const source of journey.sources) insertSource.run(`source:${source.id}`, source.id, source.title, source.publisher, source.url, source.lastChecked, source.contentHash ?? null);
    journey.steps.forEach((step, index) => {
      const stepNodeId = `${journey.id}:step:${step.id}`;
      insertStep.run(stepNodeId, journey.id, step.id, index + 1, step.detail, step.action?.label ?? null, step.action?.url ?? null, step.caution ?? null);
      for (const sourceId of step.sourceIds) insertStepSource.run(stepNodeId, `source:${sourceId}`);
    });
  }

  const suggestionsPath = path.join(process.cwd(), "data", "generated", "gnn-neighbors.json");
  try {
    const payload = JSON.parse(readFileSync(suggestionsPath, "utf8")) as { model: string; suggestions: { from: string; to: string; score: number }[] };
    for (const suggestion of payload.suggestions) insertGnn.run(suggestion.from, suggestion.to, payload.model, suggestion.score);
  } catch {
    // The database remains valid before the optional model has run.
  }
})();

const stats = database.prepare("SELECT kind, COUNT(*) AS count FROM graph_nodes GROUP BY kind ORDER BY kind").all();
process.stdout.write(`${JSON.stringify({ database: database.name, stats }, null, 2)}\n`);
database.close();
