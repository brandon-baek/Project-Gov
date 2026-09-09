from __future__ import annotations

import argparse
import json
import os
from dataclasses import asdict
from pathlib import Path

from pipeline.config import SITEMAP_SOURCES
from pipeline.database import export_graph, open_database, store_result
from pipeline.http_client import HttpPolicy
from pipeline.sam_crawler import crawl_sam
from pipeline.sitemap_crawler import crawl_sitemap

ROOT = Path(__file__).resolve().parents[1]


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Crawl government sources and populate GovGuide SQLite automatically.")
    parser.add_argument("--source", choices=("all", "usagov", "california", "sam"), default="all")
    parser.add_argument("--limit", type=int, default=int(os.getenv("GOVGUIDE_CRAWL_LIMIT", "40")))
    parser.add_argument("--workers", type=int, default=int(os.getenv("GOVGUIDE_CRAWL_WORKERS", "4")))
    parser.add_argument("--delay", type=float, default=float(os.getenv("GOVGUIDE_CRAWL_DELAY_SECONDS", "0.25")))
    parser.add_argument("--database", type=Path, default=ROOT / "data/govguide.db")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "data/generated")
    return parser.parse_args()


def main() -> None:
    args = arguments()
    policy = HttpPolicy(
        user_agent=os.getenv("GOVGUIDE_USER_AGENT", "GovGuide/1.0 educational civic navigator; contact repository owner"),
        delay_seconds=args.delay,
    )
    results = []
    for source in SITEMAP_SOURCES:
        if args.source in ("all", source.key):
            results.append(crawl_sitemap(source, policy, args.limit, args.workers))
    if args.source in ("all", "sam"):
        api_key = os.getenv("SAM_API_KEY")
        if api_key:
            results.append(crawl_sam(api_key, policy, max(args.limit, 100)))
        elif args.source == "sam":
            raise SystemExit("SAM_API_KEY is required for --source sam")
        else:
            print("SAM.gov skipped because SAM_API_KEY is not set.")

    database = open_database(args.database, ROOT / "database/migrations/001_initial.sql")
    try:
        for result in results:
            store_result(database, result)
            args.output_dir.mkdir(parents=True, exist_ok=True)
            output = args.output_dir / f"{result.connector}.json"
            output.write_text(json.dumps(asdict(result), indent=2) + "\n")
            print(f"{result.connector}: {len(result.nodes)} nodes, {len(result.edges)} edges, {len(result.warnings)} warnings")
        export_graph(database, args.output_dir / "graph.json")
        check = database.execute("PRAGMA integrity_check").fetchone()[0]
        counts = dict(database.execute("SELECT kind,COUNT(*) FROM graph_nodes GROUP BY kind"))
        print(json.dumps({"database": str(args.database), "integrity": check, "nodes": counts}, indent=2))
    finally:
        database.close()


if __name__ == "__main__":
    main()
