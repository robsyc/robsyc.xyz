# Current State

## ✅ Working Features + NOTES

### Data Layer
- N3.js RDF store with reactive Svelte 5 state
- Clownface pointers for graph traversal
- Load RDF from URL or test files

NOTE: we don't have 2-way communication; interactions with the flow don't alter the RDF triples in the store.

### Visualization
- SvelteFlow canvas with ObjectType and ObjectProperty nodes => these are okay but updating UI is still on the TODO
- **ELK-powered automatic layout** tree (and in the future force-directed) node placement
- **Progressive rendering and incremental updates** - starts with root nodes, expand/collapse via toggle
- Hierarchy edges (rdfs:subClassOf, skos:broader)
- Domain/range edges for ObjectProperties

The goal is for hierarcy (i.e., broader/subClassOf/subPropertyOf) to be visualized as a top-down tree layout, while the links between Classes should go **through object property nodes** (as domain/range edges).

### Node Components
- **ObjectTypeNode**: stadium shape, type badges, expand/collapse children, lock toggle
- **ObjectPropertyNode**: dashed border, inverse toggle, characteristic badges
- Details, Serialize, Instances dialogs (lazy computed via $derived.by)

### Type Detection
- rdfs:Class, owl:Class, sh:NodeShape detection
- owl:ObjectProperty with characteristics (Functional, Symmetric, Transitive)
- **Root detection** for progressive rendering (isRoot flag) # TODO thiss WIP to decide what to render on first load

### Visibility Store
- Progressive disclosure: start with root nodes only
- Expand/collapse: toggle children visibility
- Lock: keep specific nodes visible during collapse
- Version tracking for efficient reactive updates # TODO should check if this is as efficient as we can get it with Svelte 5

## 📁 Test Files

| File | Purpose |
|------|---------|
| `01-basic-classes.ttl` | Clean 4-level rdfs:Class hierarchy |
| `02-simple-shacl.ttl` | ShapeClass pattern, simple PropertyShapes, targetClass |
| `03-simple-properties.ttl` | Simple ObjectProperties, inverse pair, subPropertyOf, broader, domain/range(Includes) |
| TODO: `04-complex-shacl.ttl` | Complex SHACL shapes and predicate paths, nested PropertyShapes, sh:node, targetObjectsOf |
| TODO: `05-owl-classes.ttl` | OWL classes with advanced constructs, equivalentClass, disjointWith, Restriction |
| TODO: `06-owl-properties.ttl` | Advanced: property chains, all characteristics |
| TODO: `07-instances.ttl` | Instance data, UI/UX infromed by ontology data |

### NOTES PER TEST FILE

#### `01-basic-classes.ttl`

We should create custom SvelteFlow handles and edge components for the different kinds of semantics we're expressing, in this case hierarchy between classes: rdfs:subClassOf, skos:broader where the former implies the latter. E.g., HierarchyEdge and HierarchyHandle. We should make it possible for a user to invert the UI of nodes so that hierachy can be expressed top-down or bottom-up. This should be reflected in the layout algorithm, node handles and edges.

The UI of the ObjectTypeNode can be improved by
- making the edge toggle button part of the handle component (see SvelteFlow API)
- double click hierarcy toggle to expand/collapse all children
- right click hierarchy toggle to open menu with options (e.g. invert hierarchy)
- do not show IRI in full, instead the label is a button to open a tooltip with options to copy full URI/compact URI/local name (label), ... (make future proof)
- left-align text in label and comment
- action buttons should together cover the entire bottom portion of the stadium-shaped node
- improve placement of badges and click to copy IRI of e.g. rdfs:Class, sh:NodeShape
- using the **shadcn-svelte Item component** and other components to build the node UI more effectively and consistently
- create custom SvelteFlow handles that are more intuitive and aligned with the semantics (hierarchy vs. relation)
- details dialog should be presented more information-dense, the current approach will get very full and confusing quickly as nodes have more attributes, it might be helpful to document the desired contents of the dialogs for objTypes/Props better


#### `02-simple-shacl.ttl`

Extra notes on UI:
- targetClass edges should be shown similar to the hierarchy edges, i.e., as thick lines connecting top handle of NodeShape with bottom handle of Class node but dashed (and with an arrow pointing to the Class node)
- ideally we can style our node handles and edges such that it is clear what they describe without having to print out "targetClass" or "subClassOf" etc. the handle itself can then also serve as the toggle button making the UI more zen
- the SHACL properties in the dialog already look quite nice but I think we will have to move to a sub-dialog approach where the user can click on a property to see more details like validation message, metadata, etc. as we also want to allow the user to edit these down the line. Supporting nested shapes and more complex predicate paths will also not work without revising this (test 4).

#### `03-simple-properties.ttl`

In our node-based UI there is an important distinction between
- vertical connections (which express hierarcy)
    i.e., rdfs:subClassOf, skos:broader, rdfs:subPropertyOf
    we want to visualize this as thick lines forming a tree layout connecting parents to children using a circular icon in the handle of the parent node with chevrons (lucide icons)
- horizontal ones (which express object property relations)
    e.g., :Person -domain-[authorOf]-range-> :CreativeWork
    we want to visualize this as animated lines connecting the sides of UI nodes

This distinction should be 
- incorporated into the UI design for a clean and intuitive experience
- used to inform the layout/positioning algorithm (e.g., place child class in direction of the hierarchy, far enough but not too far and not overlapping with other nodes etc.)