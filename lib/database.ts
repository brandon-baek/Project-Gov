import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Journey } from "@/lib/schema";
import { journeys as bundledJourneys } from "@/data/curated/journeys";

let singleton: Database.Database | null = null;

export function openDatabase(filename = process.env.GOVGUIDE_DB_PATH ?? path.join(process.cwd(), "data", "govguide.db")) {
  mkdirSync(path.dirname(filename), { recursive: true });
  const database = new Database(filename);
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  return database;
}

export function migrateDatabase(database: Database.Database) {
  const migrationPath = path.join(process.cwd(), "database", "migrations", "001_initial.sql");
  database.exec(readFileSync(migrationPath, "utf8"));
}

export function getDatabase() {
  if (!singleton) singleton = openDatabase();
  return singleton;
}

export function loadVerifiedJourneys(database = getDatabase()): Journey[] {
  const rows = database.prepare("SELECT document_json FROM journeys j JOIN graph_nodes n ON n.id = j.node_id WHERE n.status = 'verified' ORDER BY j.category, n.label").all() as { document_json: string }[];
  return rows.map((row) => JSON.parse(row.document_json) as Journey);
}

export function getStoredJourneys(): { journeys: Journey[]; storage: "sqlite" | "bundled-fallback" } {
  try {
    const records = loadVerifiedJourneys();
    if (records.length > 0) return { journeys: records, storage: "sqlite" };
  } catch {
    // The bundled graph keeps the read path available during first-run setup.
  }
  return { journeys: bundledJourneys, storage: "bundled-fallback" };
}
