# robsyc.xyz

Personal playground for Linked Data UX, node-based storytelling, and semantic web x ML applications.

i.e. graphs!

## Vision & Scope

It a website with a blog!

- Serve the same knowledge graph to machines ([RDF](https://www.w3.org/TR/rdf11-concepts/) w/ content negotiation) and humans ([SvelteFlow](https://svelteflow.dev/) UI)
- Treat [Tentris](https://tentris.io/) (or [GraphDB](https://graphdb.ontotext.com/)) as the source of truth while allowing both the backend ([FastAPI](https://fastapi.tiangolo.com/)) and frontend ([SvelteKit](https://kit.svelte.dev/)) to read/write via [SPARQL](https://www.w3.org/TR/sparql11-query/).
- Utilize [SHACL](https://www.w3.org/TR/shacl/) and [DASH](https://datashapes.org/dash.html) to express forms and validate data, inspired by the many [shapes of SHACL](https://www.youtube.com/watch?v=ccs-KhnWR1U)
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

- [ ] frontend-side triple store, used to dynamically update the UI (time.sleep -> add triples to the store -> real-time UI update)
- [ ] Proper ontology/KG in tandem with data and UI construction (w/ RDFa and other semantics infused)
- [ ] FastAPI to SvelteKit API gateway (SPARQL queries, semantic search, advanced SHACL validation/inference, ML tasks, etc.)
- [ ] Edit route and extended UI for creating/editing content
- [ ] robsyc agent and avatar in UI (makes toast!)
- [ ] Auth and user functionality (e.g. comments, likes)
- [ ] Collaborative spaces (Yjs)

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