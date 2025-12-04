# robsyc.xyz

Personal playground for Linked Data UX, node-based storytelling, and semantic web x ML applications.

i.e. graphs!

## Vision & Scope

It a website with a blog!

- Serve the same knowledge graph to machines ([RDF](https://www.w3.org/TR/rdf11-concepts/) w/ content negotiation) and humans ([SvelteFlow](https://svelteflow.dev/) UI)
- Treat [Tentris](https://tentris.io/) (or [GraphDB](https://graphdb.ontotext.com/))triple store as the source of truth while allowing both the backend ([FastAPI](https://fastapi.tiangolo.com/)) and frontend ([SvelteKit](https://kit.svelte.dev/)) to read/write via [SPARQL](https://www.w3.org/TR/sparql11-query/).
- Utilize [SHACL](https://www.w3.org/TR/shacl/) and [DASH](https://datashapes.org/dash.html) to express views and forms and validate data, inspired by the many [shapes of SHACL](https://www.youtube.com/watch?v=ccs-KhnWR1U) and [this post](https://www.linkedin.com/pulse/what-coming-shacl-12-holger-knublauch-q6sye/)
- Intuitive node-based UI to model and construct [shacl] shapes, [owl] classes and data triples as well as the application workflow itself (n8n-style) with [pydantic-graph], a state-machine library
- Web-first personal and collaborative editing spaces with [Yjs](https://docs.yjs.dev/) and an accessible API that lends itself to use by AI agents.
- Reuse vocabularies for provenance ([PROV](https://www.w3.org/TR/prov-o/)), citations ([CITO](https://purl.org/spar/cito/)), units ([QUDT](https://www.qudt.org/)), time ([TIME](https://www.w3.org/TR/owl-time/)), [SKOS](https://www.w3.org/TR/skos-reference/), [FOAF](https://xmlns.com/foaf/spec/), [Schema.org](https://schema.org/), and more.
- Stream triples between backend tasks and frontend sessions so that SvelteFlow nodes reflect latest version while optimizing for a snappy UI/UX
- Backend manages long-running ML workflows, data enrichment, persistent storage, auth, ... but is not engaged with display.

## Requirements and use-case oriented notes

**1. The system lends itself to editing KGs by generating form-based UIs (accessible on the web)**
With this app we want to i. view blog posts, ii. view forms for CRUDing on blog posts, iii. view underlying models (like "Blog" and "Agent") and workflows (e.g. SearchAction -> SPARQL query), and iiii. view forms for CRUDing on those models and workflows (essentially app building).

**2. The system parses SHACL shapes to view data and generate forms**
Linked data, RDF, SHACL and others are central. We leveral tools and models to give shape to the app's workings. A Blog is a sh:NodeShape, with properties such as title and text.

**3. Ontology reasoning is applied to generate pieces of information in the UI**
Also OWL, SPARQL, Notation3 rules, and advanced SHACL features will be leveraged to bring logical inference into the application and its UI. This could be something simple like stating that a Person is also a Primate and at query-time computation of the number of BlogPostings in a blog.

**4. The systems defines application logic and the workflows through forms as an ontology**
Inspired by platforms like n8n, TopBraid EDG, and Palantir, this tool seeks to not just model data but business logic and application workflow itself, potentially leveraging the state-machine library pydantic-graph along with an ontology that lends itself to it. These are long-term ambitions, first things irst: a blog.

## Repository Map

- `backend/`: FastAPI service with RDFlib, PySHACL, Pydantic, ...
- `frontend/`: SvelteKit 5 app with [N3.js](https://github.com/rdfjs/N3.js), [Clownface](), [rdf-schacl-validate](https://github.com/zazuko/rdf-validate-shacl), [Shadcn](https://www.shadcn-svelte.com/), [SvelteFlow](https://svelteflow.dev/) UI, ...
- `db/`: Persistent volumes for [Tentris](https://tentris.io/) triple store and [Meilisearch](https://www.meilisearch.com/) searchengine.
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
    - [ ] Blog with BlogPostings, multi-node display with pagination
    - [ ] Custom edge and edge anchors
- [ ] Make x/y properties optional and implement dynamic placement of blog and it's blogposts (with pagination)
- [ ] Shape-aware RDF triples view with laso tool in serialization into various formats (turtle, ntriples, json-ld, ...)
- [ ] Implement tests & verify spec compliance: property paths, nested shapes, inheritance, ...

### Phase 2: Data Loading & Backend Integration
- [x] triples dynamically loaded from the backend
- [x] Load triples from URL/endpoint
- [ ] FastAPI to SvelteKit API gateway
  - [x] SPARQL query endpoint integration
  - [ ] Request shapes and their data + filters
  - [ ] SHACL validation/inference endpoints
  - [ ] Triple update/mutation endpoints
  - [ ] Content negotiation
- [ ] Real-time triple streaming (WebSocket/SSE)

### Phase 3: SHACL-Driven Forms & Editing
- [ ] SHACL to Shadcn form builder
  - [ ] Property shape → form field mapping (shadcn Field components)
  - [ ] DASH UI hints integration (PropertyShape to Item/Field conversion w/ dash:viewer/editor)
  - [ ] Validation feedback from SHACL reports ('rdf-validate-shacl') client-side!
- [ ] Form submission → triple generation
  - [ ] Shape-driven serialization (reverse of extraction)
  - [ ] Update RDF store on submit (through backend, which enriches it with e.g. PROV)
  - [ ] Triple store persistence via SPARQL UPDATE

### Phase 4: Enhanced Visualization & Features
- [ ] Multi-hop relationship visualization
- [ ] Node component hierarchy (BaseNode → BlogNode/PersonNode)
- [ ] OWL classes, restrictions, property chains
- [ ] RDFa and JSON-LD semantic markup for SEO
- [ ] robsyc agent with actual LLM/workflow behind it

### Phase 5: Advanced Features
- [ ] GitHub workflow to fetch "materialized" KG and publishes to /static w/ content negotiation
- [ ] Semantic search (Meilisearch integration)
- [ ] Auth and user functionality (make post, comments, reactions)
- [ ] Collaborative spaces (Yjs for real-time editing)
- [ ] Application logic w/ state-machine and pydantic-graph -> basic appointment app

## Docker Setup Guide

### Quick Start

```bash
# Development mode with hot reloading
docker compose -f compose.yaml -f compose.dev.yaml up --build

# Production mode
docker compose up -d

# DBs only
docker compose up tentris meilisearch

# check health / see longs
docker compose ps
docker compose logs -f backend
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

## Side-note about Palantir's "ontology"

Palantir is a platform for modelling a business' workflow (and its data). It defines only a few *types*:

- **Object type** of which instances are called 'objects' and is kind of like an owl:Class or sh:NodeShape. There is no explicit reasoning to it, only a vague notion of hierarchy through tags. So it is really more like skos:Concept with skos:boarder/narrower. Interestingly, object types can be tied to an ingestion scheme such as being fetched from an excelsheet or various other connectors, which means there is kind of meta-model behind object types. Object types have properties and actions...

- **Property types** behaving kind of like owl:DatatypeProperty or simple predicate path sh:PropertyShape with xsd datatypes. Their is no hierachy or inference involved. Objects also have metadate kind of similar to skos:prefLabel, primary keys, ... The ingestion schemes of object types populate properties, kind of like an RML behind the class.

- **Link types** are like owl:ObjectProperty or sh:PropertyShapes with nested node shapes. They specifically link object together. Notably, instances of links are created and given an ID so their KG is more like an LPG: re-ification is simple but constrained.

- **Action types** are the most interesting, they are composed of rules (what to do), parameters (what to do it with), and submission criteria (when to do it). These are the most challending to find linked data alternatives to... Perhaps some domain ontology could be of use. Declarative modeling vs. procedural logic.