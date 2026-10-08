import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import path from "node:path";
import type { CensusMatch } from "@/lib/place-context";
import { geographyReferences } from "@/lib/place-context";

export type Place = {
  id: string; name: string; kind: string; state_code: string | null; state_fips: string | null;
  name_status: "official" | "unofficial" | "unknown";
  government_status: "active" | "inactive" | "none" | "unknown";
  matched_name?: string; matched_name_status?: string;
};
export type PlaceContext = {
  places: Place[];
  relations: { child_id: string; parent_id: string; relation: string; evidence: string }[];
  authorities: { id: string; name: string; level: string; verification: string }[];
  unresolved: { layer: string; geoid: string; name: string }[];
  precision: "community" | "address_range";
};

let registry: Database.Database | null = null;
export function openRegistry(): Database.Database | null {
  if (registry) return registry;
  const filename = process.env.GOVROUTE_REGISTRY_PATH ?? path.join(process.cwd(), "data/govroute-locations.db");
  if (!existsSync(filename)) return null;
  registry = new Database(filename, { readonly: true, fileMustExist: true });
  if (registry.pragma("user_version", { simple: true }) !== 1) {
    registry.close(); registry = null;
    throw new Error("Unsupported registry schema");
  }
  return registry;
}

const placeColumns = "p.id,p.name,p.kind,p.state_code,p.state_fips,p.name_status,p.government_status";
const normalize = (value: string) => value.normalize("NFKD").toLowerCase().trim().replace(/\s+/g, " ");

export function searchPlaces(query: string, state?: string): Place[] {
  const db = openRegistry();
  if (!db) return [];
  // Literal prefix query; no wildcard or FTS-query injection.
  const clean = normalize(query).replace(/[\\%_]/g, "\\$&");
  return db.prepare(`SELECT ${placeColumns},n.name AS matched_name,n.status AS matched_name_status
    FROM place_names n JOIN places p ON p.id=n.place_id
    WHERE n.search_name LIKE ? ESCAPE '\\' ${state ? "AND p.state_code=?" : ""}
    GROUP BY p.id,n.name,n.status
    ORDER BY n.search_name=? DESC, p.name,n.name LIMIT 20`)
    .all(...[clean + "%", ...(state ? [state.toUpperCase()] : []), normalize(query)]) as Place[];
}

export function contextForPlaces(ids: string[], precision: PlaceContext["precision"] = "community", unresolved: PlaceContext["unresolved"] = []): PlaceContext {
  const db = openRegistry();
  if (!db || !ids.length) return { places: [], relations: [], authorities: [], unresolved, precision };
  const keys = [...new Set(ids)].slice(0, 60);
  const placeholders = keys.map(() => "?").join(",");
  // Walk geography only. These ancestors are context, not inherited legal competence.
  const all = db.prepare(`WITH RECURSIVE context(id) AS (
    SELECT id FROM places WHERE id IN (${placeholders})
    UNION SELECT r.parent_id FROM place_relations r JOIN context c ON c.id=r.child_id
      WHERE r.relation IN ('contained_by','primary_point_in')
  ) SELECT ${placeColumns} FROM places p JOIN context c ON c.id=p.id`).all(...keys) as Place[];
  const allIds = all.map((place) => place.id);
  if (!allIds.length) return { places: [], relations: [], authorities: [], unresolved, precision };
  const allSlots = allIds.map(() => "?").join(",");
  const relations = db.prepare(`SELECT child_id,parent_id,relation,evidence FROM place_relations WHERE child_id IN (${allSlots}) AND parent_id IN (${allSlots})`).all(...allIds, ...allIds) as PlaceContext["relations"];
  const authorities = db.prepare(`SELECT id,name,level,verification FROM authorities WHERE place_id IN (${allSlots})`).all(...allIds) as PlaceContext["authorities"];
  return { places: all, relations, authorities, unresolved, precision };
}

export function contextForAddress(match: CensusMatch): PlaceContext {
  const db = openRegistry();
  const ids: string[] = [];
  const unresolved: PlaceContext["unresolved"] = [];
  for (const ref of geographyReferences(match)) {
    const rows = db?.prepare(`SELECT id FROM places WHERE geoid=?
      AND (json_extract(attributes_json,'$._layer_name')=? OR (?='Places' AND kind IN ('municipality','cdp')))`)
      .all(ref.geoid, ref.layer, ref.layer) as { id: string }[] | undefined;
    if (rows?.length === 1) ids.push(rows[0].id);
    else unresolved.push(ref);
  }
  return contextForPlaces(ids, "address_range", unresolved);
}

export function registryCoverage() {
  const db = openRegistry();
  if (!db) return { status: "not_imported" as const, placeCount: 0, sourceCount: 0, datasets: [] };
  return {
    status: "available" as const,
    placeCount: (db.prepare("SELECT count(*) AS count FROM places").get() as { count: number }).count,
    sourceCount: (db.prepare("SELECT count(*) AS count FROM legal_sources WHERE active=1").get() as { count: number }).count,
    datasets: db.prepare("SELECT id,publisher,url,vintage,retrieved_at,records_seen,complete FROM datasets").all()
  };
}

export function relevantLegalSources(ids: string[], topic: string) {
  const db = openRegistry();
  if (!db) return [];
  const slots = [...new Set([...ids, "country:US"])].slice(0, 61);
  // Geographic parents alone do not authorize a source. Require a reviewed topic scope.
  return db.prepare(`SELECT DISTINCT s.id,s.title,s.url,s.topic,s.source_kind,s.reviewed_at,
    a.name AS publisher,scope.role,scope.territory_id,
    (SELECT max(retrieved_at) FROM legal_snapshots WHERE source_id=s.id) AS last_indexed,
    (SELECT status FROM legal_source_checks WHERE source_id=s.id ORDER BY id DESC LIMIT 1) AS last_check_status
    FROM legal_sources s JOIN authorities a ON a.id=s.authority_id
    JOIN authority_scopes scope ON scope.authority_id=a.id AND scope.topic=s.topic
    WHERE s.active=1 AND s.topic=? AND scope.territory_id IN (${slots.map(() => "?").join(",")})
    ORDER BY s.title`).all(topic, ...slots);
}
