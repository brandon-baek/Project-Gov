PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('journey', 'step', 'agency', 'source', 'program', 'requirement')),
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  jurisdiction TEXT CHECK (jurisdiction IN ('federal', 'california', 'federal-and-state')),
  category TEXT,
  status TEXT NOT NULL CHECK (status IN ('verified', 'review-due', 'machine-indexed')),
  reviewed_at TEXT,
  source_url TEXT,
  params_json TEXT NOT NULL CHECK (json_valid(params_json)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graph_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relation TEXT NOT NULL CHECK (relation IN ('contains', 'next', 'published-by', 'supported-by', 'related-to')),
  edge_order INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (from_node_id, to_node_id, relation)
);

CREATE TABLE IF NOT EXISTS journeys (
  node_id TEXT PRIMARY KEY REFERENCES graph_nodes(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  summary TEXT NOT NULL,
  estimated_time TEXT,
  official_action_label TEXT,
  official_action_url TEXT,
  document_json TEXT NOT NULL CHECK (json_valid(document_json))
);

CREATE TABLE IF NOT EXISTS journey_steps (
  node_id TEXT PRIMARY KEY REFERENCES graph_nodes(id) ON DELETE CASCADE,
  journey_node_id TEXT NOT NULL REFERENCES journeys(node_id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_order INTEGER NOT NULL CHECK (step_order > 0),
  detail TEXT NOT NULL,
  action_label TEXT,
  action_url TEXT,
  caution TEXT,
  UNIQUE (journey_node_id, step_order),
  UNIQUE (journey_node_id, step_key)
);

CREATE TABLE IF NOT EXISTS sources (
  node_id TEXT PRIMARY KEY REFERENCES graph_nodes(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  url TEXT NOT NULL,
  last_checked TEXT NOT NULL,
  content_hash TEXT,
  UNIQUE (url)
);

CREATE TABLE IF NOT EXISTS step_sources (
  step_node_id TEXT NOT NULL REFERENCES journey_steps(node_id) ON DELETE CASCADE,
  source_node_id TEXT NOT NULL REFERENCES sources(node_id) ON DELETE CASCADE,
  PRIMARY KEY (step_node_id, source_node_id)
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connector TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_changed INTEGER NOT NULL DEFAULT 0,
  warning_json TEXT CHECK (warning_json IS NULL OR json_valid(warning_json))
);

CREATE TABLE IF NOT EXISTS source_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  retrieved_at TEXT NOT NULL,
  http_status INTEGER,
  content_hash TEXT,
  response_url TEXT,
  metadata_json TEXT CHECK (metadata_json IS NULL OR json_valid(metadata_json)),
  UNIQUE (source_node_id, retrieved_at)
);

CREATE TABLE IF NOT EXISTS gnn_suggestions (
  from_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  to_node_id TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  score REAL NOT NULL CHECK (score >= -1 AND score <= 1),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'accepted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (from_node_id, to_node_id, model)
);

CREATE INDEX IF NOT EXISTS graph_nodes_kind_status_idx ON graph_nodes(kind, status);
CREATE INDEX IF NOT EXISTS graph_nodes_category_idx ON graph_nodes(category);
CREATE INDEX IF NOT EXISTS graph_edges_from_idx ON graph_edges(from_node_id, relation);
CREATE INDEX IF NOT EXISTS graph_edges_to_idx ON graph_edges(to_node_id, relation);
CREATE INDEX IF NOT EXISTS journeys_slug_idx ON journeys(slug);
CREATE INDEX IF NOT EXISTS snapshots_source_date_idx ON source_snapshots(source_node_id, retrieved_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS journey_search USING fts5(
  journey_node_id UNINDEXED,
  title,
  summary,
  aliases,
  category,
  tokenize = 'porter unicode61'
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES (1);
