PRAGMA foreign_keys = ON;

-- Separate geographic identity from the government able to perform a task.
CREATE TABLE datasets (
  id TEXT PRIMARY KEY, publisher TEXT NOT NULL, url TEXT NOT NULL,
  vintage TEXT NOT NULL, retrieved_at TEXT NOT NULL, sha256 TEXT,
  records_seen INTEGER NOT NULL CHECK(records_seen >= 0),
  complete INTEGER NOT NULL CHECK(complete IN (0,1))
);
CREATE TABLE places (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, search_name TEXT NOT NULL,
  kind TEXT NOT NULL, state_fips TEXT, state_code TEXT, geoid TEXT,
  gnis_id TEXT, name_status TEXT NOT NULL CHECK(name_status IN ('official','unofficial','unknown')),
  government_status TEXT NOT NULL CHECK(government_status IN ('active','inactive','none','unknown')),
  functional_status TEXT, latitude REAL, longitude REAL,
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  attributes_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX places_search ON places(search_name, state_code);
CREATE INDEX places_state ON places(state_fips, kind);
CREATE TABLE place_identifiers (
  namespace TEXT NOT NULL, external_id TEXT NOT NULL,
  place_id TEXT NOT NULL REFERENCES places(id),
  PRIMARY KEY(namespace, external_id, place_id)
);
CREATE TABLE place_names (
  place_id TEXT NOT NULL REFERENCES places(id), name TEXT NOT NULL,
  search_name TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('official','unofficial','unknown')),
  kind TEXT NOT NULL CHECK(kind IN ('primary','variant','community')),
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  PRIMARY KEY(place_id, name, dataset_id)
);
CREATE INDEX names_search ON place_names(search_name);
CREATE TABLE place_relations (
  child_id TEXT NOT NULL REFERENCES places(id), parent_id TEXT NOT NULL REFERENCES places(id),
  relation TEXT NOT NULL CHECK(relation IN ('contained_by','primary_point_in','overlaps','served_by')),
  dataset_id TEXT NOT NULL REFERENCES datasets(id), evidence TEXT NOT NULL,
  PRIMARY KEY(child_id,parent_id,relation,dataset_id)
);
CREATE TABLE authorities (
  id TEXT PRIMARY KEY, place_id TEXT REFERENCES places(id), name TEXT NOT NULL,
  level TEXT NOT NULL, existence_evidence_url TEXT NOT NULL,
  -- Census functional status confirms a government exists, not its topic-specific competence.
  verification TEXT NOT NULL CHECK(verification IN ('census_functional_status','reviewed'))
);
CREATE TABLE authority_scopes (
  authority_id TEXT NOT NULL REFERENCES authorities(id), territory_id TEXT NOT NULL REFERENCES places(id),
  topic TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('regulator','service_provider','record_keeper')),
  evidence_url TEXT NOT NULL, reviewed_at TEXT NOT NULL,
  PRIMARY KEY(authority_id,territory_id,topic,role)
);
CREATE TABLE legal_sources (
  id TEXT PRIMARY KEY, authority_id TEXT NOT NULL REFERENCES authorities(id), topic TEXT NOT NULL,
  title TEXT NOT NULL, url TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('procedure','code','regulation','parcel','zoning','records')),
  adapter TEXT NOT NULL DEFAULT 'html', reviewed_at TEXT,
  freshness_days INTEGER NOT NULL DEFAULT 30 CHECK(freshness_days > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE legal_snapshots (
  id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES legal_sources(id),
  retrieved_at TEXT NOT NULL, effective_from TEXT, effective_to TEXT,
  sha256 TEXT NOT NULL, content TEXT NOT NULL, final_url TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'machine_indexed'
    CHECK(review_status IN ('machine_indexed','reviewed','superseded')),
  UNIQUE(source_id,sha256)
);
CREATE TABLE legal_source_checks (
  id INTEGER PRIMARY KEY, source_id TEXT NOT NULL REFERENCES legal_sources(id),
  checked_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('indexed','unchanged','unavailable')),
  error TEXT
);
CREATE TABLE legal_chunks (
  id INTEGER PRIMARY KEY, snapshot_id INTEGER NOT NULL REFERENCES legal_snapshots(id),
  ordinal INTEGER NOT NULL, heading TEXT, text TEXT NOT NULL,
  UNIQUE(snapshot_id,ordinal)
);
CREATE VIRTUAL TABLE legal_search USING fts5(text, content='legal_chunks', content_rowid='id');
CREATE TRIGGER chunks_insert AFTER INSERT ON legal_chunks BEGIN
  INSERT INTO legal_search(rowid,text) VALUES(new.id,new.text);
END;
CREATE TABLE process_definitions (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, topic TEXT NOT NULL,
  authority_id TEXT NOT NULL REFERENCES authorities(id),
  eligibility_json TEXT NOT NULL DEFAULT '[]', review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK(review_status IN ('draft','reviewed','retired')),
  reviewed_at TEXT
);
CREATE TABLE process_steps (
  id TEXT PRIMARY KEY, process_id TEXT NOT NULL REFERENCES process_definitions(id),
  position INTEGER NOT NULL, title TEXT NOT NULL, instructions TEXT NOT NULL,
  requirements_json TEXT NOT NULL DEFAULT '[]', dependencies_json TEXT NOT NULL DEFAULT '[]',
  fees_json TEXT NOT NULL DEFAULT '[]', deadlines_json TEXT NOT NULL DEFAULT '[]',
  source_id TEXT NOT NULL REFERENCES legal_sources(id), action_url TEXT,
  UNIQUE(process_id,position)
);
CREATE TABLE coverage_gaps (
  id INTEGER PRIMARY KEY, territory_id TEXT REFERENCES places(id), topic TEXT NOT NULL,
  reason TEXT NOT NULL, recorded_at TEXT NOT NULL, resolved_at TEXT
);
PRAGMA user_version = 1;
