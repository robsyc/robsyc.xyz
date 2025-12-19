# FLOW_IMPLEMENTATION.MD

This document provides a comprehensive guide for implementing the RDF visualization system using Svelte, SvelteFlow, N3.js, and Clownface.

## Table of Contents

1. [Overview](#overview)
2. [Data Model](#data-model)
3. [Test Files](#test-files)
4. [Type Detection](#type-detection)
5. [Flow Mapping](#flow-mapping)
6. [Node Components](#node-components)
7. [Dialog Components](#dialog-components)
8. [SHACL Path Handling](#shacl-path-handling)
9. [Implementation Phases](#implementation-phases)

---

## Overview

### Goal

Create a dynamic, semantic-aware UI for visualizing and editing RDF data (RDFS, OWL, SHACL) using a node-based flow interface. The UI adapts based on the semantic granularity of the data (and the user's needs).

### Core Principles

1. **Progressive Disclosure**: Show OWL features only for owl:Class, SHACL features only for sh:NodeShape, etc.
2. **Lazy Loading**: Compute expensive data (OWL restrictions, SHACL paths) only when e.g. dialogs open. We keep the canvas light and the user builds up the UI incrementally.
3. **Single Source of Truth**: Clownface pointers generated from the RDF graph(s) as the data interface for all components. Pointers are used to traverse the graph in various graph patterns and to create LPG-like nodes and edges.
4. **Inverse Property Consolidation and other UI/UX sugar**: Show inverse property pairs as single nodes with toggle to switch view; dynamic rendering of hierarchy and topology; inference mode to show inferred triples graph with distinct UI (dotted lines, ...), etc.

### Technologies

| Technology | Purpose |
|------------|---------|
| **N3.js** | RDF parsing, storage, serialization (has reasoning but < eye-js) |
| **Clownface** | Graph traversal and manipulation |
| **clownface-shacl-path** | Complex SHACL property path handling |
| **SvelteFlow** | Node-based UI visualization |
| **shadcn-svelte** | UI components (dialogs, buttons, etc.) |

---

## Data Model

### ObjectType (Classes/Shapes)

Resources that define **types** of things. Detected by `? rdf:type rdfs:Class/owl:Class/sh:NodeShape`:

| Type Pattern | Flags | UI Features |
|--------------|-------|-------------|
| `rdfs:Class` only | `isRdfsClass` | Basic class info & annotation props, rdfs:subClassOf/skos:broader hierarchy |
| `owl:Class` | `isOwlClass` (implies isRdfsClass) | + OWL restrictions, equivalence, disjointness |
| `sh:NodeShape` only | `isNodeShape` | + (nested) sh:PropertyShapes, sh:targetClass, metadata |
| `rdfs:Class + sh:NodeShape` | Both flags | equivalent to sh:ShapeClass (SHACL 1.2) w/ implicit target |
| `owl:Class + sh:NodeShape` | All flags | Full OWL + SHACL features |

Instances of object types are called objects. They are detected by `rdf:type` of the ObjectType and `owl:NamedIndividual`. The `sh:PropertyShape`s of the node shape object types can be quite complex and nested, see below.

### ObjectProperty (Relationships)

Resources typed as `owl:ObjectProperty`. Characteristics detected:

| Characteristic | Detection | UI Display |
|----------------|-----------|------------|
| Inverse | `owl:inverseOf` | Toggle button to switch view |
| Functional | `owl:FunctionalProperty` type | Badge |
| Symmetric | `owl:SymmetricProperty` type | Badge |
| Transitive | `owl:TransitiveProperty` type | Badge |
| SubProperty | `rdfs:subPropertyOf` | Hierarchy edge |
| PropertyChain | `owl:propertyChainAxiom` | Show in Details |

Instances of object properties (between objects) are called links. They are detected by `s :thisProperty o` and `thisProperty rdf:type o` etc.

### PropertyShape (Attributes)

Not visualized as nodes but shown in ObjectType details. Can be:
- **Named**: IRI subject with `rdf:type sh:PropertyShape`
- **Blank Node**: Inline in `sh:property` list (might be tricky to handle)
- **Nested**: Contains `sh:property` for BFO-aligned graph patterns
- **sh:node reference**: Points to another NodeShape (w/ button to close dialog and open see the referenced UI node on the canvas)

Have associated to them
- metadata like `sh:name`, `sh:description`, `sh:order`, `sh:group`, `sh:closed`, `sh:message`, `sh:ignoredProperties`, etc.
- constraints like `sh:minCount`, `sh:maxCount`, `sh:datatype`, `sh:nodeKind`, `sh:class`, etc.
- property paths like `sh:path`, `sh:inversePath`, `sh:sequencePath`, `sh:alternativePath`, `sh:zeroOrMorePath`, `sh:oneOrMorePath`, `sh:zeroOrOnePath`, etc.
- targets like `sh:targetClass`, `sh:targetObjectsOf`, etc.

The properties defined in `sh:path` can be explicitly defined owl:DatatypeProperty or owl:ObjectProperty but not necessarily. It should work for both. More details on SHACL can be found in the specification. SHACL 1.2 Core and SHACL 1.2 UI are our main references, but we don't have a shacl 1.2. validator yet.

---

## Test Files

Located in `frontend/static/graphs/tests/`:

| File | Purpose | Key Features Tested |
|------|---------|---------------------|
| `01-basic-classes.ttl` | Simple rdfs:Class | Hierarchy, labels, comments |
| `02-shacl-shapes.ttl` | SHACL NodeShapes | simple PropertyShapes, nesting, sh:node |
| `03-owl-classes.ttl` | OWL constructs | Restrictions, equivalence, disjoint |
| `04-object-properties.ttl` | Object properties | Inverse, characteristics, chains |
| `05-complex-paths.ttl` | SHACL paths | Sequence, alternative, inverse paths |
| `06-instances.ttl` | Instance data | Validation, relationships |

### Loading Test Files

```typescript
// Load specific test file
await rdfStore.load({ url: '/graphs/tests/02-shacl-shapes.ttl' });
```

We should implement a way to enter a url and load the triples graph from it.

---

## Type Detection

File: `frontend/src/lib/rdf/type-detection.ts`

### ObjectType Detection

```typescript
interface ObjectTypeFlags {
  isRdfsClass: boolean;   // rdfs:Class (not rdf:Property)
  isOwlClass: boolean;    // owl:Class (implies isRdfsClass)
  isNodeShape: boolean;   // sh:NodeShape
}

function detectObjectType(pointer: GraphPointer): ObjectTypeFlags {
  const types = pointer.out(ns.rdf('type')).terms;
  const typeSet = new Set(types.map(t => t.value));
  
  return {
    isRdfsClass: typeSet.has(ns.rdfs('Class').value) || typeSet.has(ns.owl('Class').value),
    isOwlClass: typeSet.has(ns.owl('Class').value),
    isNodeShape: typeSet.has(ns.sh('NodeShape').value),
  };
}
```

For toggle functionality, we're not yet sure if we should store it here, or higher up in the flow mapping logic / componentry.

### ObjectProperty Detection

```typescript
interface ObjectPropertyFlags {
  isFunctional: boolean;
  isSymmetric: boolean;
  isTransitive: boolean;
  hasInverse: boolean;
  inverseIri?: string;
  hasPropertyChain: boolean; // needed?
}

function detectObjectProperty(pointer: GraphPointer): ObjectPropertyFlags {
  const types = pointer.out(ns.rdf('type')).terms;
  const typeSet = new Set(types.map(t => t.value));
  const inversePtr = pointer.out(ns.owl('inverseOf')); // or p.in(ns.owl('inverseOf')) ? Or also query inferred triples graph ?
  
  return {
    isFunctional: typeSet.has(ns.owl('FunctionalProperty').value),
    isSymmetric: typeSet.has(ns.owl('SymmetricProperty').value),
    isTransitive: typeSet.has(ns.owl('TransitiveProperty').value),
    hasInverse: !!inversePtr.term,
    inverseIri: inversePtr.value,
    hasPropertyChain: !!pointer.out(ns.owl('propertyChainAxiom')).term,
  };
}
```

In effect, for both types of entities, we want a manageable but flexible set of flags to manage dynamic behavior, pointer traversal and UI presentation.

### Finding All ObjectTypes/Properties

Possibly we should use distinct RDF graphs for ontology schema vs. instance data vs. inferred data vs. etc.

```typescript
function findAllObjectTypes(store: RdfStore): ObjectTypeInfo[] {
  const results: ObjectTypeInfo[] = [];
  const seen = new Set<string>();
  
  // Query for each type
  // TODO: is there no more efficient way with sparql or join queries instead of deduplication with a set?
  for (const typeIri of [ns.rdfs('Class'), ns.owl('Class'), ns.sh('NodeShape')]) {
    for (const quad of store.getQuads(null, ns.rdf('type'), typeIri)) {
      if (seen.has(quad.subject.value)) continue;
      seen.add(quad.subject.value);
      
      const pointer = store.pointer(quad.subject.value);
      const flags = detectObjectType(pointer);
      
      if (isObjectType(flags)) {
        results.push({ pointer, iri: quad.subject.value, flags });
      }
    }
  }
  return results;
}
```

---

## Flow Mapping

File: `frontend/src/lib/rdf/flow-mapper.ts`

### Node Creation

```typescript
function mapRdfToFlow(store: RdfStore): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeIds = new Set<string>();
  
  // 1. Create ObjectType nodes
  for (const info of findAllObjectTypes(store)) {
    nodes.push({
      id: info.iri,
      type: 'objectType',
      position: getPosition(info.pointer, nodes.length), 
      // Possibly use more sophisticated layout algorithm like force-directed graph layout
      // We would also like for the placement of UI nodes to be saved (with a flag) and restored when the user navigates back to the graph.
      data: { pointer: info.pointer, iri: info.iri, flags: info.flags },
    });
    nodeIds.add(info.iri);
  }
  
  // 2. Create ObjectProperty nodes (consolidate inverse pairs)
  const processedInverses = new Set<string>();
  for (const info of findAllObjectProperties(store)) {
    // Skip if this is the "secondary" side of an inverse pair
    if (processedInverses.has(info.iri)) continue;
    
    // Mark inverse as processed
    if (info.flags.inverseIri) {
      processedInverses.add(info.flags.inverseIri);
    }
    
    nodes.push({
      id: info.iri,
      type: 'objectProperty',
      position: getPosition(info.pointer, nodes.length),
      data: { 
        pointer: info.pointer, 
        iri: info.iri, 
        flags: info.flags,
        inversePointer: info.flags.inverseIri 
          ? store.pointer(info.flags.inverseIri) 
          : undefined,
      },
    });
    nodeIds.add(info.iri);
  }
  
  // 3. Create edges
  createHierarchyEdges(nodes, edges, store);
  createDomainRangeEdges(nodes, edges, store);
  
  return { nodes, edges };
}
```

We should also think about NOT rendering all nodes/edges at once but rather e.g. only the top concepts in the hierarchy and then load the rest incrementally when the user navigates with toggles, searches, etc. The flow should look peaceful and responsive, or familiar by storing placement state and restoring it the next time the user visits the graph.

The creation of instances (particulars or universals) will require different logic and should be handled separately; the object properties will be edges between objects instead of first class nodes, and the properties will be direct forms dynamically generated from the definitions higher order abstract flow (the universals)

### Edge Types

| Edge Type | Source | Target | Description |
|-----------|--------|--------|-------------|
| `skos:broader/narrower` | Child class/property/instance | Parent class/property/instance | this is very generic & weak semantics but useful |
| `rdfs:subClassOf` | Child class | Parent class | type propagation inference |
| `rdfs:subPropertyOf` | Child property | Parent property | same but for properties |
| `schema:domainIncludes` and `schema:rangeIncludes` | ObjectProperty | ObjectType | weakly typed; no inference |
| `rdfs:domain` and `rdfs:range` | ObjectProperty | ObjectType | use of the predicate infers the type in subject and object |
| `sh:targetClass` | NodeShape | Class | instances targeted by the node shape |
| `sh:node` | NodeShape | NodeShape | can be used as a form of inheritance or nesting between node shapes |

Object type and Object property UI nodes should support toggles for:

- Locking the node on screen or allowing it to be removed (e.g. via a "clean" button or by selected node's distance, or screen-visibility heuristics).

- Showing/hiding hierarchy (parent/child relationships with skos or rdfs); each edge has its own hide button, which also hides the connected node if it’s not locked. Toggles are placed at the top/bottom of the UI node.

- For ObjectProperties: toggle domain(/Includes) and range(/Includes) visibility, with controls on the left/right sides.

- For rdfs:Class nodes: show NodeShape(s) targeting them (bottom of node).

- For sh:NodeShape nodes: show their target class(es) (top), and show sh:node inheritance (instead of sub/superclass).

- Optionally, offer toggles for equivalence/disjointness (e.g. via a “...” popover) - currently out of scope. In the future we may also visualize PropertyShapes connected to ObjectProperties with sh:path.

Important is to remeber that we want to keep the canvas clean, lean and intuitive, but also responsive, flexible and extensible by choosing more refined semantics and graph patterns.

---

## Node Components

### ObjectTypeNode (WIP)

File: `frontend/src/lib/components/flow/nodes/ObjectTypeNode.svelte`

Key features:
- Display class/shape badge, labels, comments
- Toggle buttons for locking/unlocking the node, showing/hiding hierarchy edges, in domain/range of, etc.
- Action buttons for Details, Serialize, Instances dialogs

```svelte
<script lang="ts">
  import type { NodeProps } from '@xyflow/svelte';
  import type { ObjectTypeNodeData } from '$lib/rdf/flow-mapper';
  
  let { id, data, selected }: NodeProps = $props();
  const nodeData = $derived(data as ObjectTypeNodeData);
  const flags = $derived(nodeData.flags);
  
  // Conditional badge display
  const badges = $derived.by(() => {
    const b: string[] = [];
    if (flags.isOwlClass) b.push('owl:Class');
    else if (flags.isRdfsClass) b.push('rdfs:Class');
    if (flags.isNodeShape) b.push('sh:NodeShape');
    return b;
  });

  // ...
</script>

<!-- Wide rectangular shape with rounded left and right sides -->
```

### ObjectPropertyNode (WIP)

File: `frontend/src/lib/components/flow/nodes/ObjectPropertyNode.svelte`

Key features:
- Toggle button for inverse property view
- Display domain → range and hierarchy flow
- Show characteristic badges (Functional, Symmetric, etc.)

```svelte
<script lang="ts">
  let showInverse = $state(false);
  
  // Toggle between property and its inverse
  const activePointer = $derived(
    showInverse && nodeData.inversePointer 
      ? nodeData.inversePointer 
      : nodeData.pointer
  );
</script>

<!-- Square shape for ObjectProperty -->
<div class="rounded-sm border-dashed ...">
  {#if nodeData.flags.hasInverse}
    <button onclick={() => showInverse = !showInverse}>
      ↔ Toggle Inverse
    </button>
  {/if}
</div>
```

---

## Dialog Components

### DetailsDialog (WIP)

Show information based on type flags:

```svelte
<script lang="ts">
  // Lazy computation - only when dialog opens
  const owlRestrictions = $derived.by(() => {
    if (!open || !flags.isOwlClass) return [];
    return extractOwlRestrictions(pointer);
  });
  
  const shaclProperties = $derived.by(() => {
    if (!open || !flags.isNodeShape) return [];
    return extractPropertyShapes(pointer); // using clownface-shacl-path library
  });
</script>

<!-- Conditional sections -->
{#if flags.isRdfsClass}
  <ClassHierarchySection {pointer} />
{/if}

{#if flags.isOwlClass}
  <OwlRestrictionsSection restrictions={owlRestrictions} />
{/if}

{#if flags.isNodeShape}
  <ShaclPropertiesSection properties={shaclProperties} />
{/if}
```

### SerializeDialog (WIP)

Features:
- Extract quads for resource (with configurable depth and filters)
- Turtle/N-Triples/JSON-LD/... serialization with prefixes
- Copy to clipboard
- **Future**: In-place editing that updates the RDF graph upon submission (possibly validation feedback, inference preview, ...) in a nice editor with syntax highlighting, auto-completion like Cursor, etc.

### InstancesDialog (not yet started)

Features:
- Query instances: `?s rdf:type :ThisClass` or `?s :thisProperty ?o`
- Data table with configurable & sortable columns
- Filter by property values
- Open instance in form (generated from SHACL shape)
- Visualize instance as node in flow (which also has dialog to open shacl-based form for editing)

---

## SHACL Path Handling

Using `clownface-shacl-path` library.

### Path Types

| Path Type | Turtle Syntax | Example |
|-----------|---------------|---------|
| Predicate | `sh:path ex:prop` | Direct property |
| Sequence | `sh:path ( ex:a ex:b )` | Follow a then b |
| Alternative | `sh:path [ sh:alternativePath (ex:a ex:b) ]` | a OR b |
| Inverse | `sh:path [ sh:inversePath ex:a ]` | Reverse direction |
| Zero-or-more | `sh:path [ sh:zeroOrMorePath ex:a ]` | Transitive closure |
| One-or-more | `sh:path [ sh:oneOrMorePath ex:a ]` | At least one hop |

### Parsing Paths

We will likely need additional utilities to parse and display these elements thorougly. Same goes for OWL restrictions, SHACL metadata and other complex graph patterns. However, Clownface will be our friend and the `clownface-shacl-path` library will help us a lot and give insights into how to use it effectively.

```typescript
import { fromNode, toSparql, findNodes } from 'clownface-shacl-path';

// Get path from PropertyShape
const pathPtr = propertyShapePtr.out(ns.sh('path'));

// Parse into structured path (ShaclPropertyPath type)
const path = fromNode(pathPtr);

// Convert to SPARQL property path syntax
// Uses https://github.com/tpluscode/sparql-builder under the hood
const sparqlPath = toSparql(path);

// Find nodes matching the path from a start node
const matchingNodes = findNodes(startNodePtr, path);
```

### Displaying Paths

```typescript
function pathToString(pathPtr: GraphPointer): string {
  const path = fromNode(pathPtr);
  
  if (path instanceof PredicatePath) {
    return getLocalName(path.term.value);
  }
  if (path instanceof SequencePath) {
    return path.paths.map(p => pathToString(p)).join(' / ');
  }
  if (path instanceof AlternativePath) {
    return path.paths.map(p => pathToString(p)).join(' | ');
  }
  if (path instanceof InversePath) {
    return `^${pathToString(path.path)}`;
  }
  // ... other path types
}
```

---

## Key References

### Specifications

- [SHACL 1.2 Core](https://www.w3.org/TR/shacl12-core/) though we will ignore the more advanced features like reification, sparql inference, node expressions and rules for now.
- [SHACL 1.2 UI](https://w3c.github.io/data-shapes/shacl12-ui/) (Draft)
- [OWL 2 Web Ontology Language](https://www.w3.org/TR/2012/REC-owl2-primer-20121211/)

### Libraries

- [rdf.js.org](https://rdf.js.org/)
- [N3.js](https://github.com/rdfjs/N3.js)
- [Clownface](https://github.com/zazuko/clownface)
- [clownface-shacl-path](https://github.com/hypermedia-app/clownface-shacl-path)
- [SvelteFlow](https://svelteflow.dev/)
- [shadcn-svelte](https://www.shadcn-svelte.com/)

Potential libraries:
- [sparql-builder](https://github.com/tpluscode/sparql-builder) for creating and executing SPARQL with binding of variables in JS
- [eyereasoner](https://github.com/eyereasoner/eye-js) for reasoner inference and querying

### Internal Files

| File | Purpose |
|------|---------|
| `stores/rdf.svelte.ts` | RdfStore class, namespace definitions |
| `rdf/type-detection.ts` | Type flag detection |
| `rdf/flow-mapper.ts` | RDF → SvelteFlow conversion |
| `rdf/utils.ts` | URI utilities (getLocalName, getCompactURI) |

---

## Namespace Configuration

We will use the @rdfjs/namespace library to create namespace objects that can be used to create NamedNodes for any local name. Though we could opt for this bundled version: https://github.com/tpluscode/rdf-ns-builders

```typescript
// In stores/rdf.svelte.ts
export const ns = {
  xsd: namespace('http://www.w3.org/2001/XMLSchema#'),
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  rdfs: namespace('http://www.w3.org/2000/01/rdf-schema#'),
  owl: namespace('http://www.w3.org/2002/07/owl#'),
  sh: namespace('http://www.w3.org/ns/shacl#'),
  skos: namespace('http://www.w3.org/2004/02/skos/core#'),
  schema: namespace('https://schema.org/'),
  rxyz: namespace('http://robsyc.xyz/'),
  fromIri: (iri: string) => namedNode(iri),
};
```

---

## UI/UX Principles from SHACL UI Spec (WIP; will become more concrete as we go and implement instances and dynamic forms)

Based on [SHACL 1.2 UI Working Draft](https://w3c.github.io/data-shapes/shacl12-ui/):

1. **Property UI Component**: A (nested) field in a form, derived from PropertyShapes sharing the same path
2. **Node UI Component**: Form for a focus node, containing property UI components
3. **sh:order and sh:group**: Use for consistent property ordering in instances' Details dialog
4. **View vs Edit Mode**: Specify viewer and editor for mapping to UI components for
5. **Label Resolution**: Use rdfs:label, sh:name, or generate from local name

## Extra

Once a user has created a model and instance data for it, they will want to deploy it to a production environment. In later iterations we will want to implement a way to expose the model and instances through an API with SPARQL, GraphQL, semantic search, agentic tools, reasoning runs, etc.