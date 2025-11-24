# robsyc.xyz

Personal playground for Linked Data UX, node-based storytelling, and semantic web x ML applications.

## Vision & Scope

- Serve the same knowledge graph to machines (RDF content negotiation) and humans (SvelteFlow UI) without duplicating business logic.
- Treat Tentris (or GraphDB) as the source of truth while allowing both FastAPI (Python) and SvelteKit (TypeScript) to read/write via SPARQL.
- Stream triples between backend tasks and frontend sessions so that SvelteFlow nodes always reflect the latest RDF, SHACL shapes, and DASH/UI hints.
- Use this codebase as the incubator for the future `ontometic` project.

## Repository Map

- `backend/`: FastAPI service with RDFlib, PySHACL, ...
- `frontend/`: SvelteKit 5 app with XYFlow-based canvas, Tailwind, Shadcn UI, ...
- `db/`: Persistent volumes for Tentris and Meilisearch.
- `compose*.yaml`: Docker Compose stacks that wire Tentris, Meilisearch, backend, and frontend together.

## Architecture Overview

### Triple Store & Knowledge Fabric

- Tentris hosts the canonical dataset, shapes (`shapes.ttl`), ontology (`onto.ttl`), and blog/data triples (`data.ttl`).
- Meilisearch sits beside the graph store for full-text and semantic search once blog/content indexing lands.
- Maintain named graphs for ontology, shapes, published content, and workspace/session data to keep concerns separated.

### Backend (FastAPI, RDFlib, PySHACL)

- Provides REST endpoints for SPARQL query/update, blog post materialization, SHACL validation, and graph loading.
- Manages long-running or compute-heavy work: validation, inference, enrichment, search sync, multi-service orchestration.
- Streams graph diffs/events to clients (see “Streaming & Sync” below) without knowing anything about SvelteFlow.

### Frontend (SvelteKit, XYFlow, Tailwind)

- `/app` route renders XYFlow nodes; sub routes reflect different "rooms" of triples/nodes (e.g. `/blog`)
- Entry server (`+page.server.ts`) handles content negotiation by redirecting RDF requests (to static Turtle/JSON-LD)
- SvelteFlow data layer will shift from static seed nodes to live triple streams parsed with `n3`, `jsonld`, or similar.

### Streaming & Synchronization Model

- Allow both backend and frontend to read from Tentris directly (shared SPARQL endpoint) for low-latency queries.
- Centralize writes/mutations through the backend so it can enforce validation, provenance, and audit logs.
- Backend exposes a WebSocket or SSE channel that emits typed events:
  - `GraphPatch` (N-Triples, Turtle, or compact JSON-LD) for inserts/deletes.
  - `ShapeUpdate` for SHACL/DASH updates.
  - `TaskStatus` for backend job lifecycle.
- Frontend keeps an EventSource/WebSocket client that appends triples into an in-memory store (e.g., N3 Store) and triggers derived Svelte stores/hooks to:
  - Parse triples into SvelteFlow node/edge props.
  - Map DASH annotations to UI component factories.
  - Run lightweight SHACL validation before optimistic UI updates.
- When triples arrive, a dedicated “graph ingestion” hook (Svelte 5 rune or custom store) normalizes them, persists session graphs, and emits UI diff events so nodes rerender seamlessly.

### Temporary Graph Strategy

- Backend: spawn task-scoped named graphs (e.g., `urn:task:<id>`) for inference or ETL, delete them when the job finishes, optionally materialize results into the shared dataset.
- Frontend: maintain session-scoped graphs (e.g., `urn:session:<client_id>`) cached in the client or SvelteKit server memory; persist to Tentris only after validation/back-end approval.
- Both services can request “scratch” graphs from Tentris via SPARQL 1.1 `WITH GRAPH`/`USING` to avoid stepping on each other.

### Validation Responsibilities

- Frontend runs quick SHACL checks (e.g., `shacl-engine`, `@zazuko/rdf-validate-shacl`, or WASM) before allowing user actions such as login/post creation—this keeps latency low.
- Backend re-validates via PySHACL for authoritative enforcement and can stream back violation reports as triples for UI display.

### Consistency & Conflict Avoidance

- Only backend performs destructive updates on shared/public graphs; frontend submits mutation intents (SPARQL Update payloads or higher-level commands) over HTTP/WebSocket.
- Use versioned named graphs (timestamped IRIs) or attach ETags to mutation intents so the backend can detect stale reads and request a client rebase.
- Emit provenance triples (`prov:wasAttributedTo`, `prov:generatedAtTime`) with each change to keep history auditable and reproduce the SvelteFlow state machine.

### Shared / Infra

- Tentris (default) or GraphDB – SPARQL endpoint + named graphs.
- Meilisearch – semantic/FTS complement to SPARQL query.
- Docker Compose – local orchestration with hot reload via `compose.dev.yaml`.

## Path Forward

- [ ] Create basic view with Linked Data blog (schema.org, foaf, dc, sioc, skos)
- [ ] Proper ontology/KG in tandem with data and UI construction (RDFa)
- [ ] FastAPI to SvelteKit API gateway and database integration
- [ ] SPARQL and semantic search endpoints
- [ ] Auth and user functionality (e.g. comments or likes)
- [ ] Edit route and extended UI for creating/editing content
- [ ] robsyc agent and avatar in UI (makes toast!)
- [ ] Collaborative spaces (Yjs)

1. **Graph plumbing**
   - [ ] Finalize SPARQL endpoint config for both frontend and backend containers (auth, HTTPS, named graph conventions).
   - [ ] Add WebSocket/SSE service in backend that publishes graph diffs + job events.
   - [ ] Decide on event payload format (N-Triples chunk, HDT, compacted JSON-LD) and max payload sizes.
2. **Frontend ingestion**
   - [ ] Introduce an RDF store (`n3`) plus a Svelte rune/store that reacts to triple events.
   - [ ] Build mappers that translate shapes + DASH annotations into XYFlow node/edge types and editor affordances.
   - [ ] Run lightweight SHACL validation (`shacl-engine`) inside the SvelteKit server for auth/message/blog forms.
3. **Backend specialization**
   - [ ] Expand task API (e.g., `/tasks/run-shacl`, `/tasks/enrich`) to encapsulate long jobs and attach temporary graph IRIs.
   - [ ] Persist validation reports + provenance triples and expose them through SPARQL/REST.
   - [ ] Keep Pydantic-RDF for deterministic exports but make it optional once the frontend can parse triples itself.
4. **Authoring workflow**
   - [ ] Flesh out `/app/edit` route with collaborative editing (Yjs) using frontend session graphs.
   - [ ] Implement optimistic writes: frontend issues mutation intent → backend validates/commits → stream echoes change.
5. **Observability & safeguards**
   - [ ] Add metrics on graph size, stream throughput, validation latency.
   - [ ] Document recovery steps when Tentris/Meilisearch snapshots roll back to avoid divergence.

## Docker Setup Guide

### Quick Start

```bash
# Development mode with hot reloading
docker compose -f compose.yaml -f compose.dev.yaml up --build

# Production mode
docker compose up -d

# DBs only
docker-compose up tentris meilisearch
```

### Services

- **Tentris** (Triplestore): `http://localhost:9080/ui`
- **Meilisearch** (Search Engine): `http://localhost:7700`
- **Backend** (FastAPI): `http://localhost:8000/docs`
- **Frontend** (SvelteKit): `http://localhost:3000`

```bash
# some useful commands
curl -H "accept:text/turtle" http://localhost:3000 -L
curl -H "accept:application/ld+json" http://localhost:3000 -L
```