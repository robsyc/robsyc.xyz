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

### Phase 1: Foundation & Cleanup ✅
- [x] Frontend-side reactive triple store (`RdfStore` with Svelte 5 runes)
- [x] SHACL-driven flow mapping (shapes.ttl → SvelteFlow nodes)
- [x] Generic `ShapeNode` component for shape-based rendering
- [x] PersonNodeShape for testing generic rendering
- [ ] Improve Node components
    - [ ] Simplify with shadcn Item (instead of Card)
    - [ ] ShapeNode w/ better hints and scrutinize w/ difficult shacl shapes
    - [ ] Custom edge and edge anchors
- [ ] Remove redundant/unused code; resolve NOTE's and TODO's
- [ ] Shape-aware RDF triples view (use shape to construct queries and populate Dialog)
- [ ] Turtle/N-Triples serialization in dialogs
- [ ] Revise shacl-parser.ts to be more spec compliant: generic parent Shape interface, property paths, etc.

#### Return to the use-case!
- [ ] Introduce schema:Blog that links to schema:BlogPosting in data.ttl
- [ ] Visualize the blog as a node with an action (loaded on mount) to view the blog posts as a list (request made to the backend)
- [ ] Thats the first node-based storytelling use-case! A user on /app is met with a canvas with on it a node (a kind of panel or base interface for new users) with a button that, when clicked, requests the blog posts (also nodes on the canvas) and adds them to the canvas.

### Phase 2: Data Loading & Backend Integration
- [ ] No more triples loaded from the frontend /static, but dynamically loaded from the backend
- [ ] Load triples from URL/endpoint
- [ ] FastAPI to SvelteKit API gateway
  - [ ] SPARQL query endpoint integration
  - [ ] Request shapes
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

Last prompt:
```
@README.md  We are extending the work in, and andressing the TODO's and NOTE's of our @Svelte-based @frontend, namely @frontend/src/lib/stores/rdf.svelte.ts triple store wrapper, @frontend/src/lib/rdf/flow-mapper.ts RDF to SvelteFlow @frontend/src/lib/components/flow/BlogNode.svelte of @frontend/static/graphs/data.ttl 

In short, our applications seeks to:
- fetch triples from the FastAPI backend
- store triples in the frontend (session)
- parse (and transform) them, but most importantly,
- visualize them through the node-based @SvelteFlowExamples UI library (@SvelteFlowAPI)

The goal is really to make it possible for users to view and interact with triples through a graph-like interface.
- requires round-trip mapping logic from triples to SvelteFlow LPG-like nodes and edges.
- predicates can themselves be nodes in RDF, so a node in our UI would be more like a paricular shape; a BlogNode shape
- will likely entail @SHACL-Primer (and @DASH) for display and form generation, possibly also @SPARQL1.1-Query (https://uispin.org/ui.html)

We want triples to be tighly integrated into the UI and UX such that
- a user could click on a node and request to see the actual underlying triples, or a preview of the triples that are about to be inserted w/ a form submission
- it is robust and allows for flexibility when we cannot (yet) visualize certain triple patterns, but can associate them to visual entities, we should treat shapes as first class citizens in our UI

I have left you with lots of informative resources and a broad objective, begin with a deep dive into the codebase and the information provided. Analyze the TODO's in the aformentioned files and think of next steps in our iterative development process, for example, 
- adding a second blog to the ttl data
- add functionality to load triples from a link (perhaps in the @edit route only)
- SvelteFlow PersonNode
- utilize shacl @frontend/static/graphs/shapes.ttl to drive form generation and data viewing, rather than hardcoding properties in our RDF to SvelteFlow mapping

Think, prioritize, plan.

https://www.mdpi.com/2673-6470/5/4/56 
```