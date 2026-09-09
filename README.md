# GovGuide

GovGuide turns a plain-language government task into an ordered, source-linked pathway. The answer layer is deliberately constrained: a model may help select an existing journey ID, but facts, steps, cautions, and links come from the verified knowledge graph stored in SQL.

## Current MVP

- 24 reviewed federal and California pathways
- 170 verified graph nodes and 277 typed edges
- SQLite database with migrations, foreign keys, integrity checks, FTS5 search, source snapshots, ingestion runs, and GNN review tables
- deterministic intent retrieval with an optional OpenAI structured-output classifier
- USA.gov and CA.gov sitemap crawlers that respect robots rules and crawl delays
- SAM.gov Assistance Listings connector with incremental, key-gated access
- twice-monthly source refresh workflow that opens a review pull request
- experimental two-layer GraphSAGE link-discovery model
- responsive guide browser, source views, graph explorer, skeleton state, privacy guard, error boundary, and 404 page

## Run locally

Requirements: Node.js 22 or newer and Python 3 with NumPy for the optional GNN step.

```bash
npm install
npm run graph:export
npm run gnn:train
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

The app works without API keys. Copy `.env.example` to `.env.local` only when enabling optional integrations.

## Commands

```bash
npm run typecheck       # TypeScript validation
npm test                # routing, safety, and graph tests
npm run build           # production build
npm run db:stats        # SQL integrity and graph counts
npm run check:sources   # live official-link health report
npm run ingest:usa      # refresh the USA.gov machine index
npm run ingest:sam      # refresh SAM.gov; requires SAM_API_KEY
```

## Grounding contract

The normalized node class lives in `lib/schema.ts`. Every node has an ID, kind, label, description, review status, source relationships, and typed parameters such as jurisdiction, audience, category, and review date.

User-facing facts follow this path:

```text
request -> known journey -> ordered step -> official source -> publisher
```

A step without a `supported-by` edge is invalid. Machine-indexed records remain separate from verified records until reviewed. Changed source content becomes a review task; it does not silently rewrite a guide.

## Database

The default database is `data/govguide.db`. The migration in `database/migrations/001_initial.sql` creates:

- `graph_nodes` and `graph_edges`
- `journeys`, `journey_steps`, `sources`, and `step_sources`
- `journey_search` using SQLite FTS5
- `ingestion_runs` and `source_snapshots`
- `gnn_suggestions` with pending, accepted, or rejected review state

Set `GOVGUIDE_DB_PATH` to use a different file. The schema uses conservative SQL types and constraints so a later PostgreSQL migration is straightforward.

### Why SQLite for the MVP?

SQLite is an intentional MVP choice, not a placeholder masquerading as a database. GovGuide's current workload is read-heavy, the reviewed dataset fits comfortably in one relational file, and the app does not yet need multiple servers writing concurrently. SQLite gives the prototype real foreign keys, transactions, indexes, full-text search, migrations, and integrity checks without requiring a cloud database account during a classroom demonstration. It also makes the result reproducible: a teacher can open the exact populated database in `data/govguide.db` instead of depending on a remote service. The tables and constraints are kept portable so the project can move to PostgreSQL when hosting, concurrent writes, or larger-scale ingestion makes that operational complexity worthwhile.

To inspect the populated database directly:

```bash
sqlite3 data/govguide.db
.tables
SELECT kind, COUNT(*) FROM graph_nodes GROUP BY kind;
SELECT relation, COUNT(*) FROM graph_edges GROUP BY relation;
```

## Crawling and refresh

The sitemap crawlers use an explicit user agent, remain on their configured government origin, honor `robots.txt`, and apply the greater of the configured delay and the site’s crawl delay. Indexed pages enter the graph with `machine-indexed` status.

SAM.gov’s current Assistance Listings API requires a personal API key. Store it as the `SAM_API_KEY` repository secret for the scheduled workflow. Do not put it in source control.

The ready-to-enable GitHub Actions definition is in `automation/data-refresh.workflow.yml`. Move it to `.github/workflows/data-refresh.yml` when the repository credential has GitHub's `workflow` scope.

## GNN policy

`ml/train_gnn.py` trains a reproducible GraphSAGE encoder using topology and hashed node features. It proposes journey-to-journey `related-to` edges in `data/generated/gnn-neighbors.json`. Suggestions are imported into SQL as `pending` and are never used as factual support until a person reviews them.

## Production notes

- Keep request-body logging disabled because users may describe sensitive situations.
- Put the app behind a persistent volume or migrate the same schema to managed PostgreSQL before horizontal scaling.
- Add a SAM.gov key only through the host’s secret manager.
- Treat HTTP 403 responses from government anti-bot systems separately from confirmed 404s during source review.
- Run the full test, build, database integrity, and source-health gates before deployment.

GovGuide is an independent educational project. It provides public information, not legal advice, and hands transactions back to official government sites.
