# robsyc.xyz

Personal playground for Linked Data UX, node-based storytelling, and semantic web x ML applications.

i.e. graphs!

## Vision & Scope

It a website with a blog!

- Serve the same knowledge graph to machines ([RDF](https://www.w3.org/TR/rdf11-concepts/) w/ content negotiation) and humans ([SvelteFlow](https://svelteflow.dev/) UI)
- Treat [Tentris](https://tentris.io/) (or [GraphDB](https://graphdb.ontotext.com/)) as the source of truth while allowing both the backend ([FastAPI](https://fastapi.tiangolo.com/)) and frontend ([SvelteKit](https://kit.svelte.dev/)) to read/write via [SPARQL](https://www.w3.org/TR/sparql11-query/).
- Utilize [SHACL](https://www.w3.org/TR/shacl/) and [DASH](https://datashapes.org/dash.html) to express forms and validate data, inspired by the many [shapes of SHACL](https://www.youtube.com/watch?v=ccs-KhnWR1U) and [this post](https://www.linkedin.com/pulse/what-coming-shacl-12-holger-knublauch-q6sye/)
- Intuitive node-builder to construct shacl shapes, owl classes and data triples as well as collaborative editing with [Yjs](https://docs.yjs.dev/) and an API
- Reuse vocabularies for provenance ([PROV](https://www.w3.org/TR/prov-o/)), citations ([CITO](https://purl.org/spar/cito/)), units ([QUDT](https://www.qudt.org/)), time ([TIME](https://www.w3.org/TR/owl-time/)), [SKOS](https://www.w3.org/TR/skos-reference/), [FOAF](https://xmlns.com/foaf/spec/), [Schema.org](https://schema.org/), and more.
- Stream triples between backend tasks and frontend sessions so that SvelteFlow nodes always reflect the latest RDF, SHACL shapes, and DASH/UI hints.
- Use this codebase as the incubator for the future `ontometic` project.

## Repository Map

- `backend/`: FastAPI service with RDFlib, PySHACL, Pydantic, ...
- `frontend/`: SvelteKit 5 app with [N3.js](https://github.com/rdfjs/N3.js), [rdf-schacl-validate](https://github.com/zazuko/rdf-validate-shacl) [Shadcn](https://www.shadcn-svelte.com/), [SvelteFlow](https://svelteflow.dev/) UI, ...
- `db/`: Persistent volumes for [Tentris](https://tentris.io/) and [Meilisearch](https://www.meilisearch.com/).
- `compose*.yaml`: Docker Compose stacks that wire everything together.

## Path Forward

### Phase 1: Foundation & Cleanup
- [x] Frontend-side reactive triple store (`RdfStore` with Svelte 5 runes)
- [x] SHACL-driven flow mapping (shapes.ttl → SvelteFlow nodes)
- [x] Generic `ShapeNode` component for shape-based rendering
- [x] PersonNodeShape for testing generic rendering
- [ ] Improve Node components
    - [x] Simplify with shadcn Item (instead of Card)
    - [x] ShapeNode w/ better hints and scrutinize w/ more difficult shacl shapes
    - [ ] Custom edge and edge anchors
- [x] Remove redundant/unused code; resolve NOTE's and TODO's
- [ ] Make x/y properties optional and implement dynamic placement of blog and it's blogposts (with pagination)
- [ ] Shape-aware RDF triples view (use shape to construct queries and populate Dialog)
- [ ] Turtle/N-Triples serialization in dialogs
- [ ] Revise shacl-parser.ts to be more spec compliant: generic parent Shape interface, property paths, etc.


### Phase 2: Data Loading & Backend Integration
- [x] triples dynamically loaded from the backend
- [x] Load triples from URL/endpoint
- [ ] FastAPI to SvelteKit API gateway
  - [x] SPARQL query endpoint integration
  - [x] Request shapes TO BE IMPROVED
  - [ ] SHACL validation/inference endpoints
  - [ ] Triple update/mutation endpoints
  - [ ] Content negotiation
- [ ] Real-time triple streaming (WebSocket/SSE)

### Phase 3: SHACL-Driven Forms & Editing
- [ ] SHACL to Shadcn form builder
  - [ ] Property shape → form field mapping (shadcn Field components)
  - [ ] DASH UI hints integration (PropertyShape to Item/Field conversion)
  - [ ] Validation feedback from SHACL reports ('rdf-validate-shacl') client-side!
- [ ] Form submission → triple generation
  - [ ] Shape-driven serialization (reverse of extraction)
  - [ ] Update RDF store on submit (through backend, which enriches it with e.g. PROV)
  - [ ] Backend persistence via SPARQL UPDATE

### Phase 4: Enhanced Visualization & Features
- [ ] Multi-hop relationship visualization
- [ ] Node component hierarchy (BaseNode → BlogNode/PersonNode)
- [ ] OWL inferred classes, management for more complex data
- [ ] RDFa and JSON-LD semantic markup for SEO
- [ ] robsyc agent and avatar in UI (makes toast!)

### Phase 5: Advanced Features
- [ ] GitHub workflow to fetches "materialized" KG and publishes to /static w/ content negotiation
- [ ] Semantic search (Meilisearch integration)
- [ ] Proper ontology/KG construction
  - [ ] N3.js / eye-js inference w/ OWL and visualization
  - [ ] Class hierarchy display
  - [ ] Property chain visualization
- [ ] Auth and user functionality (comments, likes, bookmarks)
- [ ] Collaborative spaces (Yjs for real-time editing)
- [ ] Node builder for creating SHACL shapes visually

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