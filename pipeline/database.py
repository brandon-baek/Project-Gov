from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from pipeline.models import CrawlResult


def open_database(path: Path, migration: Path) -> sqlite3.Connection:
    database = sqlite3.connect(path)
    database.execute("PRAGMA foreign_keys = ON")
    database.execute("PRAGMA journal_mode = WAL")
    database.executescript(migration.read_text())
    return database


def store_result(database: sqlite3.Connection, result: CrawlResult) -> None:
    status = "partial" if result.warnings else "completed"
    with database:
        run = database.execute(
            "INSERT INTO ingestion_runs(connector,status,started_at) VALUES (?, 'running', ?)",
            (result.connector, result.started_at),
        ).lastrowid
        for node in result.nodes:
            params = {**node.params, "connector": result.connector}
            database.execute(
                """
                INSERT INTO graph_nodes(id,kind,label,description,jurisdiction,category,status,reviewed_at,source_url,params_json,updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                  label=excluded.label, description=excluded.description, jurisdiction=excluded.jurisdiction,
                  category=excluded.category, reviewed_at=excluded.reviewed_at, source_url=excluded.source_url,
                  params_json=excluded.params_json, updated_at=CURRENT_TIMESTAMP,
                  status=CASE WHEN graph_nodes.status='verified' THEN graph_nodes.status ELSE excluded.status END
                """,
                (node.id, node.kind, node.label, node.description, node.jurisdiction, node.category, node.status, node.reviewed_at, node.source_url, json.dumps(params, separators=(",", ":"))),
            )
            if node.kind == "source" and node.source_url:
                database.execute(
                    """
                    INSERT INTO sources(node_id,source_key,title,publisher,url,last_checked,content_hash)
                    VALUES (?,?,?,?,?,?,?)
                    ON CONFLICT(url) DO UPDATE SET title=excluded.title,publisher=excluded.publisher,last_checked=excluded.last_checked,content_hash=excluded.content_hash
                    """,
                    (node.id, node.id.removeprefix("source:"), node.label, node.params.get("tags", [result.connector])[0], node.source_url, node.reviewed_at, node.params.get("contentHash")),
                )
                snapshot_node_id = database.execute("SELECT node_id FROM sources WHERE url=?", (node.source_url,)).fetchone()[0]
                database.execute(
                    """
                    INSERT OR IGNORE INTO source_snapshots(source_node_id,retrieved_at,http_status,content_hash,response_url,metadata_json)
                    VALUES (?,?,?,?,?,?)
                    """,
                    (snapshot_node_id, node.params.get("retrievedAt", result.finished_at), node.params.get("httpStatus"), node.params.get("contentHash"), node.source_url, json.dumps({"etag": node.params.get("etag"), "lastModified": node.params.get("lastModified"), "connector": result.connector})),
                )
        for edge in result.edges:
            database.execute(
                "INSERT OR REPLACE INTO graph_edges(from_node_id,to_node_id,relation,edge_order) VALUES (?,?,?,?)",
                (edge.source, edge.target, edge.relation, edge.order),
            )
        database.execute(
            "UPDATE ingestion_runs SET status=?,finished_at=?,records_seen=?,records_changed=?,warning_json=? WHERE id=?",
            (status, result.finished_at, len(result.nodes), len(result.nodes), json.dumps(result.warnings), run),
        )


def export_graph(database: sqlite3.Connection, output: Path) -> None:
    nodes = []
    for row in database.execute("SELECT id,kind,label,description,params_json FROM graph_nodes ORDER BY id"):
        nodes.append({"id": row[0], "kind": row[1], "label": row[2], "description": row[3], "params": json.loads(row[4])})
    edges = [
        {"from": row[0], "to": row[1], "relation": row[2], **({"order": row[3]} if row[3] is not None else {})}
        for row in database.execute("SELECT from_node_id,to_node_id,relation,edge_order FROM graph_edges ORDER BY id")
    ]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"schemaVersion": 1, "nodes": nodes, "edges": edges}, indent=2) + "\n")
