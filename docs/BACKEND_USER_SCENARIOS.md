# Backend user scenarios

The production HTTP suite runs against the real national serving database, with paid AI disabled. It writes measured results and response timing to the govroute-user-scenarios Actions artifact.

| User task | Required features | Expected result |
| --- | --- | --- |
| Find a community in each Census state/territory | Official national import, indexed name search, state filters | Correct stable place ID and state, with no other-state matches |
| Renew a passport from every imported state | Place selection, scope resolution, registry process publication, retrieval, citations | Federal publication with five steps and valid per-step source references |
| Find Springfield without a state | Ambiguous names, multiple governments | Alternatives remain distinct; no arbitrary selected government |
| Find an informal community name | GNIS name crosswalk | Matching record explicitly labels the unofficial name |
| Choose a Census-designated place | Statistical versus functioning government | No fabricated municipal authority |
| Ask whether an ADU is legal on a property | Location context, property guard, source scopes | Parcel, zoning, and recorded restrictions remain explicit gaps |
| Request a reviewed local procedure | Exact territory IDs, reviewed source scope, chat routing | Reviewed steps appear only in the matching municipality; a coverage gap does not override a published route |
| Request a local building permit | CISA inventory, government-name matching, local crawl, chat response | Official local starting points with unreviewed procedure labels |
| Supply a postal locality as free text | Stable jurisdiction IDs, scope safety | Free text cannot certify a municipal service area |
| Select a California community while choosing Texas | Location validation | Clarification; no other-state instructions |
| Mix a valid place and an invalid ID | Input and context completeness | Clarification; invalid places are not silently ignored |
| Move from New York to Texas | Multi-state detection, moving checklist | Moving planner route |
| Browse procedures using a selected place ID | Derived state, exact scopes, input validation | Correct catalog; unknown IDs and conflicting state selections are rejected |
| Apply for a California license versus a Texas license | Explicit process scopes | California publication appears only in the California catalog |
| Submit a sensitive identifier or oversized request | Privacy guard, bounded input, website response contract | Blocked/413 response with safe, renderable alternatives |
| Resolve one or several street addresses | Census API adapter, candidate confirmation, no address persistence | Address-range precision remains distinct from parcel certainty |
| Encounter a failed address service | Upstream timeout and malformed-data handling | Recoverable error; state/community search stays available |
| Encounter changed or unavailable local sources | Crawl history, hashes, robots policy, source freshness | Prior successful pages retained; new failures reported separately |
| Deploy the national backend | Compact projection, immutable asset, hash verification, file tracing | Serving data included; full archive excluded; function budget passes |

Importer tests reject truncated Census pagination, duplicate domain records, changed inventory headers, ambiguous government-name matches, external redirects, and inferred topic competence. Projection tests compare stable IDs, names, foreign keys, source types, and search behavior with the full archive.

The HTTP suite also requests the homepage, data page, passport guide, and moving page from the production build. Rendered layout still needs browser verification; these tests verify successful HTML responses and API behavior.

The interstate matrix also checks every supported origin/destination pair with and without a vehicle. Texas license applications depend on registration when a vehicle is brought; New York plate/insurance instructions remain tied to the origin. Unknown destinations receive official-directory planning questions without fabricated deadlines. Source review expires after 30 days.

The production suite checks government-catalog paging, guide-group browsing, and invalid catalog input as well. Success on these scenarios measures the implemented behavior; it does not establish complete local-law coverage.
