# robsyc.xyz

My personal website!

## Features

- Linked Data w/ content negotiation
- SPARQL, FTS and semantic search endpoints (Tentris & Meilisearch)
- Dynamic machine & human readable data discovery (SvelteFlow)
- This is the predecessor of the upcoming `ontometic` project...

### TODO

- [ ] Create basic view with Linked Data blog (schema.org, foaf, dc, sioc)
- [ ] Proper ontology A/T/LBox in tandem with data and UI construction (RDFa)
- [ ] FastAPI to SvelteKit API gateway and database integration
- [ ] SPARQL and semantic search endpoints
- [ ] Auth and user functionality (e.g. comments or likes)
- [ ] Edit route and extended UI for creating/editing content
- [ ] robsyc agent and avatar in UI (makes toast!)
- [ ] Collaborative spaces (Yjs)

## Docker Setup Guide

### Quick Start

```bash
# Development mode with hot reloading
docker compose -f compose.yaml -f compose.dev.yaml up

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
# random commands
curl -H "accept:text/turtle" http://localhost:3000 -L
curl -H "accept:application/ld+json" http://localhost:3000 -L
```