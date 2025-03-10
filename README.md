# robsyc.xyz

My personal website with integrated RDF knowledge graph!

## Vision

This project aims to create a personal website that serves as both a traditional web presence and a semantic knowledge graph. The site publishes structured data about me and my connections in machine-readable formats while providing an engaging visual interface for human visitors.

## Core Features

### RDF Data Management

- **Single Source of Truth**: RDF data embedded directly in HTML (using RDFa), with additional static files generated from the same source
- **Multiple RDF Serializations**: Support for various RDF formats:
  - **HTML+RDFa**: Primary format with data embedded in the website markup
  - **Turtle**: Available at `/rdf/me.ttl` and via content negotiation
  - **JSON-LD**: Available at `/rdf/me.jsonld` and via content negotiation

### Data Access & Integration

- **Content Negotiation**: Full implementation of HTTP content negotiation for RDF data
- **CORS Support**: Cross-Origin Resource Sharing enabled for all RDF endpoints
- **Link Headers**: Proper HTTP Link headers to advertise alternate formats

### Knowledge Graph Capabilities

- **Dynamic Visualization**: Interactive graph visualization using SvelteFlow
- **SPARQL Endpoint**: (Planned) Local SPARQL endpoint for complex queries
- **Agent Queries**: (Planned) Support for agentic queries against the knowledge graph

## Tech Stack

- [SvelteKit with Svelte 5](https://svelte.dev/) - Modern web framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn-svelte](https://www.shadcn-svelte.com/) - Component library
- [SvelteFlow](https://svelteflow.dev/) - Knowledge graph visualization

Potential future tech stack:
- RDF js libraries for parsing, storing, processing, and querying RDF data

## Implementation Details

### RDF Data Publishing

The site implements multiple strategies for publishing RDF data:

1. **Embedded RDFa**: Core data embedded directly in HTML markup
2. **Static RDF Files**: Pre-generated Turtle and JSON-LD files
3. **Content Negotiation**: Server-side content type selection based on Accept headers

### Visualization

The knowledge graph is visualized using SvelteFlow, allowing visitors to explore connections and relationships in an interactive interface.

### Future Plans

- Implement a client-side SPARQL engine for complex queries
- Add support for agent-based interactions with the knowledge graph
- Expand the ontology to include more detailed information about projects, publications, and interests