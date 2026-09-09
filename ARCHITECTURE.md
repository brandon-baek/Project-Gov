# Architecture

## Data planes

### Verified plane

Curated journeys are normalized into SQL graph records. These nodes can appear in user-facing answers because each step has reviewed source support.

### Discovery plane

USA.gov, CA.gov, and SAM.gov connectors produce `machine-indexed` nodes with provenance metadata. They are candidates for review, not automatically trusted instructions.

## Request path

1. Reject sensitive identifiers and immediate-emergency requests.
2. Load verified journey documents from SQLite.
3. Rank candidates using aliases, weighted terms, category, and jurisdiction.
4. Optionally ask an OpenAI model for a structured journey-ID selection from those candidates only.
5. Validate the ID against the candidate set.
6. Traverse the chosen journey through steps and supporting sources.
7. Render the structured route; never render model-written government facts.

## Graph model

Node kinds: `journey`, `step`, `source`, `agency`, `program`, and `requirement`.

Edge relations: `contains`, `next`, `supported-by`, `published-by`, and `related-to`.

Review states: `verified`, `review-due`, and `machine-indexed`.

## GNN boundary

The GNN is a discovery assistant. It can learn embeddings and propose related paths. It cannot validate a source, promote a node, or participate in the evidence chain that supports a displayed step.
