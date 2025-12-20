# VIEW_IMPLEMENTATION.md

## Goal

Build a shadcn-based UI for browsing and editing RDF resources. The UI follows a **two-panel pattern**: a reusable hierarchy browser on the left, and a detail viewer/editor on the right. This enables creating and editing RDF data like `01-basic-classes.ttl`.

---

## Current Status

### Implemented ✅
- **HierarchyTree**: Generic tree browser with debounced search, expand/collapse, CRUD actions
- **ResourceDetailPanel**: Multi-section container with header showing label/IRI
- **AnnotationSection**: View and edit annotations grouped by predicate
- **HierarchySection**: View and edit hierarchical relationships (supports multiple predicates for ShapeClass)
- **TargetSection**: Display SHACL targeting (sh:targetClass, etc.) NEW
- **PropertyShapeSection**: Display sh:PropertyShape details for NodeShapes NEW
- **LiteralEditorDialog**: Three-panel dialog for creating/editing literals with datatype support
- **CreateResourceDialog**: Dialog for creating new resources with namespace selection
- **HierarchyEditorDialog**: Dialog for adding/editing hierarchy relationships with cycle detection
- **RdfStore**: Reactive N3.js wrapper with batch transactions
- **Resource type configuration**: `resource-types.ts` with extensible type registry
- **View profiles**: `view-profiles.ts` with section composition logic NEW
- **Reactive utilities**: `createExpandableSet`, `createDebounced`, `createSelectionState`, `createDialogState` NEW

### Ready for Integration 🔧
These utilities were created during the refactoring sprint but are **not yet wired into production code**:

| Utility | File | Purpose | Integration Point |
|---------|------|---------|-------------------|
| `createSelectionState()` | `$lib/utils/selection.svelte.ts` | Single/multi-selection with shift-click | Replace manual selection in `+page.svelte` |
| `createKeyedSelectionState()` | `$lib/utils/selection.svelte.ts` | Per-tab selection tracking | Replace `selectedByTab` record |
| `createRdfContext()` | `$lib/components/rdf/context.ts` | Context factory with multi-selection | Replace manual context creation |
| `createDialogState()` | `$lib/utils/dialog.svelte.ts` | Generic dialog open/data management | Replace 8+ dialog state variables |
| `createConfirmDialog()` | `$lib/utils/dialog.svelte.ts` | Confirmation dialog with action | Replace confirm dialog boilerplate |
| `getSectionsForResource()` | `$lib/rdf/view-profiles.ts` | Dynamic section composition | Replace manual section conditionals |

### Planned 📋
- **Drag-and-drop** hierarchy manipulation in tree (using svelte-dnd-action)
- **Multi-select** with shift-click (utility ready, needs UI wiring + testing)
- **Dynamic section composition** (utility ready, needs UI wiring + testing)
- **SHACL NodeShape and PropertyShape integration** new tabs for working with SHACL shapes (`02-simple-shacl.ttl`)
- **Tree virtualization** for large graphs (consider @tanstack/svelte-virtual)
- More datatype-specific editors (date pickers, etc.)
- Further consolidate UI with generic base components & deduplicate

---

## Design Principles

### 1. Maximum Reusability
Every component should work for **any RDF resource type**:
- `HierarchyTree` works for `rdfs:Class`, `owl:AnnotationProperty`, `sh:NodeShape`, etc.
- `AnnotationSection` works for annotating classes, properties, shapes - anything
- The same UI pattern applies recursively (annotation properties have annotations too!)

### 2. Composable Detail Panels
The right panel is a **multi-section container**. Different resource types get different sections:
- `rdfs:Class`: Annotations + Hierarchy (subClassOf)
- `owl:AnnotationProperty`: Annotations + Hierarchy (subPropertyOf)
- `sh:NodeShape`: Annotations + Target + Hierarchy (sh:node) + Property Shapes (clownface-shacl-path)
- `sh:ShapeClass`: All of the above (dual rdfs:Class + sh:NodeShape) (SHACL 1.2 shortcut)

Use `getSectionsForResource()` to dynamically determine which sections to show.

### 3. Svelte 5 Patterns
- **Snippets** for customizable rendering (e.g., custom tree node content)
- **Context** for shared state (store, selection, future multi-select)
- **`$props()`** with TypeScript interfaces for type-safe components
- **`$derived`** for computed values from store queries
- **`$state`** only at top-level variable declarations
- **Utility factories** (`createXxx()`) for reusable reactive state patterns

### 4. DRY and Minimal Code
- Extract common patterns into `$lib/utils/` (expandable, debounce, selection, dialog)
- Batch store operations to minimize reactive updates
- Use `resource-types.ts` registry instead of hardcoded type configs
- Use `view-profiles.ts` for UI-specific type decisions

---

## Architecture

### Type System

```
┌─────────────────────────────────────────────────────────────────┐
│                     ResourceTypeId                              │
│  (RDF-based: 'class', 'nodeShape', 'annotationProperty', etc.)  │
└────────────────────────────┬────────────────────────────────────┘
                             │ maps to
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ViewProfileId                              │
│  ResourceTypeId + UI-only: 'shapeClass', 'unknown'              │
└────────────────────────────┬────────────────────────────────────┘
                             │ determines
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SectionConfig[]                            │
│  Which sections to show: annotation, hierarchy, target, etc.    │
└─────────────────────────────────────────────────────────────────┘
```

### Resource Type Configuration (`$lib/rdf/resource-types.ts`)

Central registry defining all supported RDF resource types:

```typescript
interface ResourceTypeConfig {
    id: string;
    label: string;
    pluralLabel: string;
    typeIris: NamedNode[];           // rdf:type values
    hierarchyPredicates: NamedNode[]; // e.g., rdfs:subClassOf
    badge: string;
    emptyLabel: string;
    order: number;
}

// Current registry:
RESOURCE_TYPES = {
    annotationProperty,  // owl:AnnotationProperty → rdfs:subPropertyOf
    class,               // rdfs:Class → rdfs:subClassOf
    nodeShape,           // sh:NodeShape → sh:node
    propertyShape,       // sh:PropertyShape (no hierarchy)
    owlClass,            // owl:Class → rdfs:subClassOf but more complex axioms w/ restrictions and unnamed ancestors
    datatypeProperty,    // owl:DatatypeProperty → rdfs:subPropertyOf
    objectProperty,      // owl:ObjectProperty → rdfs:subPropertyOf
}
```

### View Profiles (`$lib/rdf/view-profiles.ts`)

UI-specific type detection and section composition:

```typescript
// Determine how to present a resource
getViewProfile(store, resource): ViewProfile
// → { id: 'shapeClass', preferredTab: 'class' }

// Get sections to display
getSectionsForResource(store, resource): SectionConfig[]
// → [
//     { type: 'annotation', props: {} },
//     { type: 'target', props: {} },
//     { type: 'hierarchy', title: 'Superclasses', props: { predicates: [...] } },
//     { type: 'propertyShapes', props: {} }
//   ]

// Helper checks
hasPropertyShapes(store, resource): boolean
hasTargets(store, resource): boolean
isResourceTypeId(id): boolean  // excludes 'shapeClass', 'unknown'
```

### Context (`$lib/components/rdf/context.ts`)

Shared state via Svelte context:

```typescript
interface RdfEditorContext {
    store: RdfStore;
    
    // Single selection
    readonly selectedResource: NamedNode | BlankNode | null;
    setSelected: (resource: NamedNode | BlankNode | null) => void;
    
    // Multi-selection (optional, for shift-click)
    readonly selectedResources?: ReadonlySet<string>;
    toggleSelection?: (resource: NamedNode | BlankNode, multi: boolean) => void;
    clearSelection?: () => void;
    isSelected?: (resource: NamedNode | BlankNode) => boolean;
}

// Factory for full multi-selection support (NOT YET USED)
createRdfContext(store: RdfStore, selection: SelectionState): RdfEditorContext
```

---

## Core Components

### 1. HierarchyTree

Generic tree browser for any RDF type hierarchy.

**Props:**
- `resourceType: NamedNode` - The rdf:type to browse
- `hierarchyPredicate: NamedNode` - Property defining parent-child
- `selected: NamedNode | BlankNode | null` - Currently selected (bindable)
- `onselect, onadd, onaddchild, onremove` - Event callbacks
- `nodeContent?: Snippet` - Custom node rendering

**Features:**
- **Debounced search** (150ms) for performance on large trees
- Auto-expand ancestors when selection changes externally
- Expand/collapse state via `createExpandableSet()` utility
- Toolbar actions: add sibling, add child, remove
- Multi-selection ready (checks `ctx.toggleSelection`)

### 2. ResourceDetailPanel

Container displaying header + collapsible sections.

**Props:**
- `subject: NamedNode | BlankNode | null`
- `children: Snippet` - Section components to render

### 3. Section Components

| Component | Purpose | Trigger Condition |
|-----------|---------|-------------------|
| `AnnotationSection` | View/edit annotations | Always shown |
| `HierarchySection` | View/edit hierarchy | If `hierarchyPredicates.length > 0` |
| `TargetSection` | View SHACL targets | If `hasTargets()` |
| `PropertyShapeSection` | View sh:PropertyShape | If `hasPropertyShapes()` |

### 4. Editor Dialogs

| Dialog | Purpose |
|--------|---------|
| `LiteralEditorDialog` | Create/edit literal values with datatype selection |
| `CreateResourceDialog` | Create new resources with namespace selection |
| `HierarchyEditorDialog` | Add/edit hierarchy relations with cycle detection |

More to come, e.g., SHACL PropertyShape editor (this will be quite complex, including constraints, nesting, etc.)

### 5. Shared Components

- **IriTooltip**: Button/tooltip showing full/compact IRI
- **ResourceSelector**: Searchable popover for resource selection
- **BaseSection**: Collapsible section wrapper with header, count, add button

---

## File Structure

```
src/lib/
├── components/rdf/
│   ├── context.ts                 # RdfEditorContext + createRdfContext
│   ├── index.ts                   # Re-exports
│   ├── tree/
│   │   ├── HierarchyTree.svelte   # With debounced search TODO: decompose into different components
│   │   └── index.ts
│   ├── sections/
│   │   ├── BaseSection.svelte
│   │   ├── AnnotationSection.svelte
│   │   ├── HierarchySection.svelte
│   │   ├── TargetSection.svelte            # NEW
│   │   ├── PropertyShapeSection.svelte     # NEW
│   │   └── index.ts
│   ├── editors/ # TODO: add more datatype specific components for e.g., xsd:date
│   │   ├── LiteralEditorDialog.svelte
│   │   ├── CreateResourceDialog.svelte
│   │   ├── HierarchyEditorDialog.svelte
│   │   ├── DatatypeSelector.svelte
│   │   ├── LangStringEditor.svelte
│   │   └── index.ts
│   ├── panels/
│   │   ├── ResourceDetailPanel.svelte
│   │   └── index.ts
│   └── shared/
│       ├── IriTooltip.svelte
│       ├── ResourceSelector.svelte
│       └── index.ts
├── rdf/
│   ├── namespaces.ts              # RDF namespace helpers + toCompactIri
│   ├── datatypes.ts               # Datatype registry + validation + hints
│   ├── resource-types.ts          # Resource type configuration
│   ├── view-profiles.ts           # ViewProfileId + getSectionsForResource
│   └── queries/
│       ├── hierarchy.ts           # Tree building, CRUD, cycle detection
│       ├── annotations.ts         # Annotation queries
│       ├── shacl.ts               # SHACL-specific queries
│       └── index.ts
├── stores/
│   └── rdf.svelte.ts              # Reactive N3.Store wrapper
└── utils/
    ├── expandable.svelte.ts       # Expand/collapse utility
    ├── debounce.svelte.ts         # Debounce utility (USED in HierarchyTree, could maybe also be used in ResourceSelector)
    ├── selection.svelte.ts        # Selection utility (NOT YET USED)
    ├── dialog.svelte.ts           # Dialog state utility (NOT YET USED)
    └── index.ts
```

---

## Next Sprint: Integration Tasks

- Simplify component props by ragarding URI as ID and determining label (CURIE) from it
- Wire Multi-Selection into UI for batch editing operations (for now just delete)
- Replace Dialog State Variables using createDialogState utility to reduce boilerplate
- Dynamic Section Composition with getSectionsForResource utility
- Add Drag-and-Drop to HierarchyTree (using svelte-dnd-action and `ondrop` callback for hierarchy modifications)
- Tree Virtualization for Large Graphs (using `@tanstack/svelte-virtual`)
- Additional Datatype Editors (e.g., date picker for `xsd:date`, `xsd:dateTime`, number spinner with constraints for `xsd:integer`, duration editor for `xsd:duration`, etc.)

---

## SHACL Support Status

NOT YET TESTED OR IMPLEMENTED: see `02-simple-shacl.ttl` and `xx-complex-paths.ttl` for examples.

### sh:NodeShape ✅
- **TargetSection**: Shows `sh:targetClass`, `sh:targetNode`, `sh:targetSubjectsOf`, `sh:targetObjectsOf`
- **PropertyShapeSection**: Lists `sh:property` shapes with path, constraints, cardinality
- **Hierarchy**: Via `sh:node` predicate

### sh:ShapeClass (SHACL 1.2) ✅
- Detected via `isShapeClass()` (dual rdfs:Class + sh:NodeShape)
- **Or** explicit `sh:ShapeClass` type (SHACL 1.2)
- Hierarchy from BOTH `rdfs:subClassOf` AND `sh:node`
- All sections from both types via `getSectionsForResource()`

### sh:PropertyShape 🚧
- Can be displayed but not yet editable
- Editor dialog needed for constraint definition