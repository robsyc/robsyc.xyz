# RDF Data Management Plan for robsyc.xyz

## Current State Analysis

The website currently implements RDF data management through:

1. **Static RDF Files**: Turtle and JSON-LD files stored in `/static/rdf/`
2. **API-based Content Negotiation**: Server-side routes that serve these files based on Accept headers
3. **Visualization**: Basic SvelteFlow implementation for knowledge graph visualization

While functional, this approach has several limitations:
- No single source of truth (data duplication across formats)
- Manual synchronization required between formats
- Limited developer experience (no type hints, no programmatic access)
- No direct integration with the HTML (no RDFa implementation)

## Proposed Architecture

### 1. Single Source of Truth

We'll implement a **data-first approach** with a single source of truth:

```
src/
└── lib/
    └── rdf/
        ├── data/              # Source RDF data
        │   └── me.ts          # Core RDF data as TypeScript objects
        ├── context.ts         # JSON-LD context definitions
        ├── store.ts           # Svelte store for RDF data
        ├── converters/        # Format conversion utilities
        │   ├── jsonld.ts      # Convert to JSON-LD
        │   ├── turtle.ts      # Convert to Turtle
        │   └── rdfa.ts        # Generate RDFa attributes
        └── components/        # RDF-aware components
            └── RdfProvider.svelte  # RDF data provider component
```

### 2. Developer-Friendly TypeScript Interface

We'll define TypeScript interfaces for RDF data:

```typescript
// Example of a type-safe RDF data structure
interface RdfNode {
  id: string;
  type: string | string[];
  properties: Record<string, RdfValue>;
}

type RdfValue = string | number | boolean | Date | RdfNode | RdfNode[];

// Type-safe schema.org types
interface Person extends RdfNode {
  type: 'schema:Person';
  properties: {
    'schema:name': string;
    'schema:givenName'?: string;
    'schema:familyName'?: string;
    'schema:birthDate'?: Date;
    'schema:knows'?: Person[];
    // ...other properties
  };
}
```

### 3. RDF.js Integration

We'll integrate RDF.js libraries for parsing, processing, and serializing RDF data:

- **@rdfjs/data-model**: Core RDF data model
- **n3**: Parser and serializer for Turtle
- **jsonld**: JSON-LD processor
- **rdflib**: Comprehensive RDF library with SPARQL support

### 4. RDFa Implementation

We'll implement RDFa in the HTML templates:

1. **Base Layout Component**: Add RDFa attributes to the HTML and body tags
2. **RDF-aware Components**: Create components that automatically add RDFa attributes
3. **Metadata Component**: Add JSON-LD script to the head section

### 5. Content Negotiation

We'll improve the content negotiation implementation:

1. **Generate on Demand**: Generate RDF formats from the single source of truth
2. **Caching**: Implement efficient caching for generated formats
3. **Prerendering**: Prerender static RDF files during build time

## Implementation Plan

### Phase 1: Core RDF Data Structure

1. Define TypeScript interfaces for RDF data
2. Create the core data structure in `src/lib/rdf/data/me.ts`
3. Implement a Svelte store for RDF data

### Phase 2: Format Converters

1. Install and configure RDF.js libraries
2. Implement converters for JSON-LD and Turtle
3. Create utility for generating RDFa attributes

### Phase 3: RDFa Integration

1. Update layout component with RDFa attributes
2. Create RDF-aware components
3. Add JSON-LD script to the head section

### Phase 4: Content Negotiation

1. Update API routes to use the single source of truth
2. Implement caching for generated formats
3. Add prerendering for static RDF files

### Phase 5: Knowledge Graph Visualization

1. Update SvelteFlow implementation to use the RDF data store
2. Implement interactive graph exploration
3. Add filtering and search capabilities

## Benefits of the New Approach

- **Single Source of Truth**: All RDF data defined in one place
- **Type Safety**: TypeScript interfaces for RDF data
- **Developer Experience**: Improved DX with type hints and utilities
- **Maintainability**: Easier to update and extend
- **Performance**: Efficient caching and prerendering
- **SEO**: Better search engine optimization with embedded RDFa

## Libraries to Consider

1. **@rdfjs/data-model**: Core RDF data model
2. **n3**: Parser and serializer for Turtle
3. **jsonld**: JSON-LD processor
4. **rdflib**: Comprehensive RDF library with SPARQL support
5. **graphy**: High-performance RDF libraries
6. **@ontologies/core**: TypeScript types for common ontologies
7. **@ontologies/schema**: TypeScript types for schema.org

## Questions Addressed

### How should we store our RDF data?

We'll store RDF data as TypeScript objects in a single source of truth, with converters to generate different formats as needed.

### How will we maintain a single source of truth?

By defining all RDF data in TypeScript files and generating other formats (Turtle, JSON-LD, RDFa) from this source.

### How will we utilize our RDF data in a developer-friendly way?

By defining TypeScript interfaces for RDF data, creating a Svelte store for reactive access, and implementing RDF-aware components.

## Next Steps

1. Research and select appropriate RDF.js libraries
2. Define the core TypeScript interfaces for RDF data
3. Create a proof-of-concept implementation of the single source of truth
4. Test the format converters
5. Implement RDFa in the layout component 