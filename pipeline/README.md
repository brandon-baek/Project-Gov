# GovGuide Python data pipeline

The data system is separate from the TypeScript web application. Running `python3 -m pipeline.run` performs the complete acquisition path:

1. Read each configured government sitemap.
2. Fetch and enforce the origin's `robots.txt` policy.
3. Select same-origin pages and crawl them with bounded workers, a shared rate gate, retries, timeouts, and response-size limits.
4. Extract the page title, summary, headings, canonical URL, response metadata, and a SHA-256 content fingerprint.
5. Normalize each page into a typed graph node and connect it to its publisher.
6. Upsert those nodes, edges, official sources, source snapshots, and ingestion-run results into `data/govguide.db` in a transaction.
7. Export the complete SQL graph to `data/generated/graph.json`.

`sam_crawler.py` uses SAM.gov's structured Assistance Listings API instead of scraping HTML. It paginates until the configured record limit.

## Run it

```bash
python3 -m pip install -r pipeline/requirements.txt
python3 -m pipeline.run --source usagov --limit 40
python3 -m pipeline.run --source california --limit 40
SAM_API_KEY=your_key python3 -m pipeline.run --source sam --limit 500
```

New crawler records are automatically stored as `machine-indexed`. This is a database status, not a manual holding file. They are immediately queryable and visible to internal graph tooling, while the separate `verified` status identifies reviewed instructions safe for user-facing procedural answers.

## Files

- `run.py`: command-line orchestration
- `sitemap_crawler.py`: standards-aware government HTML crawler
- `sam_crawler.py`: paginated API crawler
- `http_client.py`: retrying HTTP session and rate gate
- `database.py`: automatic transactional SQLite writes and graph export
- `config.py`: source registry and scope rules
- `models.py`: normalized Python data classes
