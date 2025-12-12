# RDF Flow Visualization - Implementation Guide

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

1. **Progressive Disclosure**: Show OWL features only for owl:Class, SHACL features only for sh:NodeShape
2. **Lazy Loading**: Compute expensive data (OWL restrictions, SHACL paths) only when dialogs open
3. **Single Source of Truth**: Clownface pointers generated from the RDF graph(s) as the data interface for all components
4. **Inverse Property Consolidation and other UI/UX sugar**: Show inverse property pairs as single nodes with toggle, toggle views/rendering, inference mode/inferred triples graph that when parsed results in UI nodes with dotted lines, etc.

### Technologies

| Technology | Purpose |
|------------|---------|
| **N3.js** | RDF parsing, storage, serialization (also has reasoning capabilities but eye-js might be better suited) |
| **Clownface** | Graph traversal and manipulation |
| **clownface-shacl-path** | Complex SHACL property path handling |
| **SvelteFlow** | Node-based UI visualization |
| **shadcn-svelte** | UI components (dialogs, buttons, etc.) |

---

## Data Model

### ObjectType (Classes/Shapes)

Resources that define **types** of things. Detected by `rdf:type`:

| Type Pattern | Flags | UI Features |
|--------------|-------|-------------|
| `rdfs:Class` only | `isRdfsClass` | Basic class info, rdfs:subClassOf/skos:broader hierarchy |
| `owl:Class` | `isOwlClass` (implies isRdfsClass) | + OWL restrictions, equivalence, disjointness |
| `sh:NodeShape` only | `isNodeShape` | + (nested) sh:PropertyShapes, sh:targetClass, metadata |
| `rdfs:Class + sh:NodeShape` | Both flags | ShapeClass pattern (SHACL 1.2) w/ implicit target |
| `owl:Class + sh:NodeShape` | All flags | Full OWL + SHACL features |

Instances of object types are called objects. They are detected by `rdf:type` of the ObjectType and `owl:NamedIndividual`. The `sh:PropertyShape`s of the ObjectType can be quite complex and nested, see below.

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
- **Blank Node**: Inline in `sh:property` list
- **Nested**: Contains `sh:property` for multi-level validation
- **sh:node reference**: Points to another NodeShape

Have associated to them
- metadata like `sh:name`, `sh:description`, `sh:order`, `sh:group`, `sh:closed`, `sh:message`, `sh:ignoredProperties`, etc.
- constraints like `sh:minCount`, `sh:maxCount`, `sh:datatype`, `sh:nodeKind`, `sh:class`, etc.
- property paths like `sh:path`, `sh:inversePath`, `sh:sequencePath`, `sh:alternativePath`, `sh:zeroOrMorePath`, `sh:oneOrMorePath`, `sh:zeroOrOnePath`, etc.
- targets like `sh:targetClass`, `sh:targetObjectsOf`, etc.

The properties defined in `sh:path` can be explicitly defined owl:DatatypeProperty or owl:ObjectProperty but not necessarily. It should work for both.

---

## Test Files

Located in `frontend/static/graphs/tests/`:

| File | Purpose | Key Features Tested |
|------|---------|---------------------|
| `01-basic-classes.ttl` | Simple rdfs:Class | Hierarchy, labels, comments |
| `02-shacl-shapes.ttl` | SHACL NodeShapes | PropertyShapes, nesting, sh:node |
| `03-owl-classes.ttl` | OWL constructs | Restrictions, equivalence, disjoint |
| `04-object-properties.ttl` | Object properties | Inverse, characteristics, chains |
| `05-complex-paths.ttl` | SHACL paths | Sequence, alternative, inverse paths |
| `06-instances.ttl` | Instance data | Validation, relationships |

### Loading Test Files

```typescript
// Load specific test file
await rdfStore.load({ url: '/graphs/tests/02-shacl-shapes.ttl' });
```

We should implement a way to enter a url and load the graph from it.

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

### ObjectProperty Detection (WIP)

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
  const inversePtr = pointer.out(ns.owl('inverseOf')); // or p.in(ns.owl('inverseOf')) ?
  
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

### Finding All ObjectTypes/Properties (WIP)

Possibly we should use distinct RDF graphs for ontology schema vs. instance data...

```typescript
function findAllObjectTypes(store: RdfStore): ObjectTypeInfo[] {
  const results: ObjectTypeInfo[] = [];
  const seen = new Set<string>();
  
  // Query for each type
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

It will be a bit tricky to consolidate inverse ObjectProperties as single nodes with toggle.

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
      position: getPosition(info.pointer, nodes.length), // possibly use more sophisticated layout algorithm like force-directed graph layout
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

The creation of instances will require different logic and should be handled separately; the object properties will be edges between objects instead of first class nodes.

### Edge Types

| Edge Type | Source | Target |
|-----------|--------|--------|
| `skos:broader/narrower` | Child class/property/instance | Parent class/property/instance |
| `rdfs:subClassOf` | Child class | Parent class |
| `rdfs:subPropertyOf` | Child property | Parent property |
| `rdfs:domain` and `schema:domainIncludes` | ObjectProperty | ObjectType |
| `rdfs:range` and `schema:rangeIncludes` | ObjectProperty | ObjectType |
| `sh:targetClass` | NodeShape | Class |
| `sh:node` | NodeShape | NodeShape |

Object type and Object property nodes should support toggles for:
- Locking the node on screen or removing it (e.g. via a clean button or by selected node's distance/screen visibility heuristics).
- Showing/hiding edges for hierarchy; each edge has its own hide button, which also hides the connected node if it’s not locked. Edge toggles are placed at the top/bottom of the node.
- For ObjectProperties: toggling domain(/Includes) and range(/Includes) visibility, with controls on the left/right sides.
- For rdfs:Class nodes: show NodeShape(s) targeting them (bottom of node).
- For sh:NodeShape nodes: show their targets (top), and show sh:node inheritance (instead of sub/superclass).
- Optionally, offer toggles for equivalence/disjointness (e.g. via a “...” popover) - currently out of scope. In the future we may also visualize PropertyShapes connected to ObjectProperties with sh:path.

---

## Node Components

### ObjectTypeNode

File: `frontend/src/lib/components/flow/nodes/ObjectTypeNode.svelte`

Key features:
- Display class/shape badge, labels, comments
- Toggle buttons for locking/unlocking the node, showing/hiding hierarchy edges, etc.
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

<!-- Rectangular shape with rounded left and right sides for ObjectType -->
```

### ObjectPropertyNode

File: `frontend/src/lib/components/flow/nodes/ObjectPropertyNode.svelte`

Key features:
- Toggle button for inverse property view
- Display domain → range flow
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

### DetailsDialog

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

### SerializeDialog

Features:
- Extract quads for resource (with configurable depth and filters)
- Turtle/N-Triples/JSON-LD/... serialization with prefixes
- Copy to clipboard
- **Future**: In-place editing that updates the RDF graph

### InstancesDialog

Features:
- Query instances: `?s rdf:type :ThisClass` or `?s :thisProperty ?o`
- Data table with sortable columns
- Filter by property values
- Open instance in form (generated from SHACL shape)
- Visualize instance as node in flow

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

We will likely need additional utilities to parse and display these elements thorougly. Same goes for OWL restrictions, SHACL properties and other complex graph patterns. However, Clownface will be our friend and the clownface-shacl-path library will help us a lot and give insights into how to use it effectively.

```typescript
import { fromNode, toSparql, findNodes } from 'clownface-shacl-path';

// Get path from PropertyShape
const pathPtr = propertyShapePtr.out(ns.sh('path'));

// Parse into structured path
const path = fromNode(pathPtr);

// Convert to SPARQL property path syntax
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

## Implementation Phases

### Phase 1: Core Detection & Basic Nodes

**Files to modify:**
- `type-detection.ts`: Update ObjectType/ObjectProperty detection
- `flow-mapper.ts`: Rename LinkType → ObjectProperty, consolidate inverses
- `ObjectTypeNode.svelte`: Update existing, add conditional badges and new features
- Rename `LinkTypeNode.svelte` → `ObjectPropertyNode.svelte` and update it to new semantics

**Test with:** `01-basic-classes.ttl`, `04-object-properties.ttl`

### Phase 2: SHACL PropertyShape Display

**Files to modify:**
- `DetailsDialog.svelte`: Add PropertyShape extraction and display (possibly nested field)
- Add PropertyShape parsing utilities and mapping to shadcn Item(viewer)/Field(editor) components

**Test with:** `02-shacl-shapes.ttl`

### Phase 3: OWL Constructs

**Files to modify:**
- `type-detection.ts`: Add OWL restriction detection (possibly also extra utils; our "clownface-owl")
- `DetailsDialog.svelte`: Add OWL-specific sections

**Test with:** `03-owl-classes.ttl`

### Phase 4: Complex SHACL Paths

**Files to modify:**
- Add path parsing utilities using `clownface-shacl-path`
- Update PropertyShape display for complex paths

**Test with:** `05-complex-paths.ttl`

### Phase 5: Instance Handling

**Files to modify:**
- `InstancesDialog.svelte`: Implement instance queries
- Node/Edge componentry (edges between objects)
- Add form generation from SHACL shapes (using SHACL-UI spec)

**Test with:** `06-instances.ttl`

### Phase 6: Editing Features

**Files to modify:**
- `SerializeDialog.svelte`: Add edit mode
- `DetailsDialog.svelte`: Add CRUD operations
- Update `RdfStore` for reactive updates

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

## UI/UX Principles from SHACL UI Spec (WIP; will become more concrete as we go and implement instances and forms)

Based on [SHACL 1.2 UI Working Draft](https://w3c.github.io/data-shapes/shacl12-ui/):

1. **Property UI Component**: A (nested) field in a form, derived from PropertyShapes sharing the same path
2. **Node UI Component**: Form for a focus node, containing property UI components
3. **sh:order and sh:group**: Use for consistent property ordering in instances' Details dialog
4. **View vs Edit Mode**: Specify viewer and editor for mapping to UI components for
5. **Label Resolution**: Use rdfs:label, sh:name, or generate from local name
