# Govroute: pathways first, jurisdiction data underneath

Govroute helps a person quickly find and understand a specific government process.
The main interaction is a task in plain language, followed by a short, ordered pathway:
which route fits, what to prepare, what it costs, when to act, and the official next action.
Ask for location and eligibility only when they change that pathway. Do not make people
browse government hierarchies to renew a passport.

## What this change implements

- A warm off-white, high-contrast homepage centered on tasks rather than interstate moves.
- Federal pathways included by default in browsing; location is an optional refinement.
- A separate SQLite geographic registry and an atomic national Census/GNIS importer.
- Official primary names, unofficial variants, stable identifiers, geographic relationships,
  and functioning-government status stored independently.
- Place-name search and a private, uncached US Census address-range lookup with explicit
  candidate selection. Raw addresses are never saved by Govroute or sent to its AI router.
- A reviewed authority/topic/source manifest, versioned source snapshots and searchable
  chunks, and a structured process/step model including requirements, fees, deadlines,
  dependencies, and source links.
- Property questions produce a record-gathering route and explicit coverage gaps, rather
  than an unsupported determination of an owner's rights.
- CI tests the application and creates a national-registry artifact and coverage report.

The existing curated and discovered pathway catalogs remain the public pathway source.
The new process tables are a migration target, not a claim that every jurisdiction's
procedures have been collected. The initial new source manifest contains two federal
passport procedure pages. Adding a city to the registry does not publish its laws.

## Build and validate

```sh
python3 -m unittest pipeline.test_locations -v
python3 -m pipeline.locations --output data/govroute-locations.db
python3 -m pipeline.legal_sources --database data/govroute-locations.db
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

The place importer uses Python's standard library. Census layers are discovered by exact
names, paginated with unique object IDs, and checked against counts before and after the
download. National minimum-count gates catch empty or truncated core layers. GNIS ZIP
names are discovered from USGS's documented public staged-products directory. Local official GNIS files can be passed
with `--populated` and `--names`; Census still requires its API. Missing/changing schemas
fail the build rather than publishing guessed records.

All imports stage a new database. `os.replace` publishes it only after complete imports,
foreign-key checks, and integrity checks. Existing source versions are retained for source
IDs that remain in the manifest. Interrupted or failed imports leave the previous live
database intact. A failed legal-source refresh retains its last successful snapshot and
returns a failure status. It never upgrades machine-indexed content to reviewed.

The `Govroute foundation` workflow runs the application checks and national import on
relevant pull requests. Its artifact contains `govroute-locations.db` and a measured
coverage report. Review that report and place the database in `data/` before deploying
location features, or set `GOVROUTE_REGISTRY_PATH` to a published, immutable snapshot.
The workflow does not merge, deploy, or commit data to main. Without a published registry,
the app reports that location coverage is not imported; existing pathways still work.

## Geographic identity and authority

| Record | Meaning | Legal routing rule |
| --- | --- | --- |
| Incorporated place | Census legal place, with FUNCSTAT preserved | A functioning government can be identified; topic competence still needs reviewed evidence |
| Census designated place | Official statistical geography | Never create a municipal government from this record |
| GNIS populated place | Officially named settlement/feature | Existence and a primary coordinate do not establish incorporation or boundaries |
| GNIS variant | Non-official alternative name of a known feature | Mark unofficial and resolve to its stable feature identity |
| County or equivalent | Census geography that may be statistical or nonfunctioning | Respect FUNCSTAT; do not assume a county government exists |
| Township or subdivision | Legal or statistical subdivision | Retain status; verify which functions its government performs |
| Tribal area | Reservation, trust, or statistical geography | Preserve separately; no blanket county/state authority inheritance |
| School district | A topic-specific administrative geography | No general-purpose legal authority inferred |

GNIS feature IDs and Census National Standard identifiers provide explicit identity
crosswalks. Equal names or close centroids do not deduplicate entities. Multiple Census
representations sharing an identifier remain ambiguous rather than arbitrarily merged.
The primary GNIS county relation is `primary_point_in`, not full geographic containment.
Municipalities spanning multiple counties are not assigned a county from their centroid.

`place_relations` carries geographic context. `authorities` identifies governments or
service bodies. Only `authority_scopes` with an explicit territory, topic, role, official
evidence URL, and review date can select a jurisdiction-specific legal/procedure source.
An agency may regulate a task, provide the service, or keep its records; these roles differ.
Federal sources can apply regardless of a person's municipal location.

GNIS does not enumerate every informal neighborhood or community that exists. Additional
local gazetteers and community datasets need dedicated adapters and provenance. The schema
supports unofficial community records and many-to-many geographic/service relationships;
source discovery and review are still required before those records are published.

## API behavior

| Endpoint | Purpose | Missing/ambiguous behavior |
| --- | --- | --- |
| `GET /api/places?q=...&state=CA` | Prefix search of official and unofficial place names | 503 before import; no invented fallback places |
| `GET /api/places?id=...` | Inspect geographic context and identified governments | Unknown IDs return 404; ancestors do not establish legal competence |
| `GET /api/places?coverage=true` | Current imported counts and dataset provenance | Returns `not_imported` when no snapshot exists |
| `POST /api/location/resolve` | Address-range geographies from the official Census API | Zero/multiple candidates stay explicit; uncached response |
| `POST /api/chat` | Task-first pathway matching with optional state/place IDs | Property evidence gaps are explicit; unsupported local guides are not selected by free text alone |

The public location picker stores neither the typed address nor a parcel identity. It
passes registry place IDs into pathway retrieval. Census coordinates are interpolated
along address ranges. They are unsuitable as proof of an exact parcel, ownership,
easement, zoning determination, or which overlapping body has authority over every issue.
Hosting/network logs and the Census service are separate systems; do not claim they retain
no data. Disable request-body capture in deployment observability.

## Completing nationwide pathway coverage

1. Import and measure the place registry, including territorial gaps and source vintages.
2. Map actual agencies to reviewed territory/topic scopes, including county and municipal
   competence, special districts, service agreements, courts, and tribal jurisdictions.
3. Add connector-specific adapters for official procedure pages, local code publishers,
   ordinances, zoning GIS, assessors, recorders, and service-office directories. Respect
   terms, robots rules, limits, and available official APIs. `.gov` alone is not verification.
4. Assemble draft processes from sourced requirements and actions. Retain effective dates,
   historical versions, citations per step, eligibility branches, fees, and deadlines.
   Review and publish a process independently of the success of its crawler.
5. Migrate existing curated/discovered catalogs to the process model without presenting
   discovered pages as complete or legally reviewed pathways.
6. Report coverage by jurisdiction **and task**, age of sources, unresolved authorities,
   and missing records. Measure completion of a useful task, not the number of crawled pages.

For property rights, require parcel identity, authoritative boundary datasets, zoning
overlays and current code, recorded deeds/easements/covenants, and applicable higher-level
law. Conflicts, exceptions, and unresolved facts must remain visible. No address-only
pipeline can truthfully settle every person's exact rights.

## Primary data references

- Census current legal/statistical layers: https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Current/MapServer
- Census functional status definitions: https://www.census.gov/library/reference/code-lists/functional-status-codes.html
- USGS GNIS downloads: https://www.usgs.gov/us-board-on-geographic-names/download-gnis-data
- GNIS format documentation: https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/GNIS_file_format.pdf
- Census geocoder API and limitations: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
