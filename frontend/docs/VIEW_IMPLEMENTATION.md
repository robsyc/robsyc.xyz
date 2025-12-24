# VIEW_IMPLEMENTATION.md

## Goal

Build a shadcn-based UI for browsing and editing RDF resources. The UI follows a **two-panel pattern**: a reusable hierarchy browser on the left, and a detail viewer/editor on the right. This enables creating and editing RDF data like `01-basic-classes.ttl` and `02-simple-shacl.ttl`

---

## Current Status

### Implemented ✅

**Core Components:**
- **HierarchyTree**: Tree browser with search, expand/collapse, CRUD, multi-select support
- **ResourceDetailPanel**: Multi-section container with header for currently selected resource
- **AnnotationSection**: View/edit annotations grouped by predicate
- **HierarchySection**: View/edit hierarchical relationships
- **TargetSection**: Display SHACL targeting (currently lacks a hint for implicit class targets)
- **PropertyShapeSection**: Display sh:PropertyShape details (currently cannot be edited and isn't removed when deleting the node shape)

**Dialogs:**
- **LiteralEditorDialog**: Create/edit literals with datatype support (more work needed for datatype oriented field components e.g., xsd:date)
- **CreateResourceDialog**: Create new resources with namespace selection and optionally a parent resource to link to
- **HierarchyEditorDialog**: Add/edit hierarchy relationships with cycle detection

**Infrastructure:**
- **RdfStore**: Reactive N3.js wrapper with batch transactions
- **Resource type config**: `resource-types.ts` with extensible type registry
- **View profiles**: `view-profiles.ts` with tab-aware section composition
- **Selection state**: `selection.svelte.ts` with per-tab multi-select support
- **Utilities**: e.g., `dialog.svelte.ts` for dialogs, `expandable.svelte.ts` for expandable sets, `debounce.svelte.ts` for debounced functions, etc.

### Selection Model ✅

Per-tab selection with multi-select support:

```typescript
// Per-tab selection (in +page.svelte)
const selections = createKeyedSelectionState(TABS.map(t => t.id));
const activeSelection = $derived(selections.get(activeTab));

// Single click: select and update detail panel
activeSelection.select(resource);

// Shift+click: toggle multi-select (highlighting only, no panel update)
activeSelection.toggle(resource, true);

// Check if selected (for highlighting)
activeSelection.isSelected(resource);

// Batch operations use activeSelection.count and getSelectedIris()
```

Key behaviors:
- **Click**: Selects resource, updates detail panel, clears multi-selection
- **Shift+click**: Toggles resource in selection set, highlights but doesn't change detail panel
- **Tab switch**: Each tab maintains its own selection (including multi-select)
- **Remove button**: Deletes all selected when count > 1, single resource otherwise (in the future we will add more batch operations e.g., copy all labels with indentation)

### Planned 📋

- **Drag-and-drop** hierarchy manipulation (using svelte-dnd-action)
- **Tree virtualization** for large graphs (@tanstack/svelte-virtual)
- **Datatype-specific editors** (date pickers, etc.)
- **SHACL PropertyShape editor** (complex: constraints, nesting)
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

### Selection Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    +page.svelte                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ createKeyedSelectionState(tabs)                          │   │
│  │   → selections.get(activeTab) → activeSelection          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                    │
│      ┌─────────────────────┼─────────────────────┐              │
│      ▼                     ▼                     ▼              │
│  ┌────────┐          ┌──────────┐         ┌──────────┐          │
│  │selected│          │isSelected│         │ ontoggle │          │
│  │  prop  │          │ callback │         │ callback │          │
│  └────┬───┘          └────┬─────┘         └────┬─────┘          │
│       │                   │                    │                │
│       └───────────────────┼────────────────────┘                │
│                           ▼                                     │
│            ┌──────────────────────────────┐                     │
│            │      HierarchyTree           │                     │
│            │  • checkSelected() for UI    │                     │
│            │  • handleNodeClick()         │                     │
│            └──────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

### Type System

```
ResourceTypeId (RDF-based)         ViewProfileId (UI-specific)
├─ 'class'                    ──→  ├─ 'class'
├─ 'nodeShape'                ──→  ├─ 'nodeShape'  
├─ 'annotationProperty'       ──→  ├─ 'annotationProperty'
├─ 'propertyShape'            ──→  ├─ 'propertyShape'
                                   ├─ 'shapeClass' (dual type)
                                   └─ 'unknown'
```

Later we will add owlClass, objectProperty and datatypeProperty to the mix.

### Tab-Aware Section Composition

`getSectionsForResource(store, resource, activeTab)` returns sections based on:
1. Resource's RDF types
2. **Active tab** (for dual-type resources like ShapeClass)

Example: `Person` is both `rdfs:Class` and `sh:NodeShape`
- **Classes tab**: Annotations + Hierarchy (rdfs:subClassOf)
- **Node Shapes tab**: Annotations + Targets + Properties + Hierarchy (sh:node)

---

### SelectionState Interface

```typescript
interface SelectionState {
    readonly selected: SelectableNode | null;     // Primary (for detail panel)
    readonly selectedSet: ReadonlySet<string>;    // All selected IRIs
    readonly count: number;
    readonly isMulti: boolean;
    
    select: (resource: SelectableNode | null) => void;  // Single select
    toggle: (resource: SelectableNode, multi: boolean) => void;  // Multi-select
    isSelected: (resource: SelectableNode) => boolean;
    clear: () => void;
    getSelectedIris: () => string[];
}
```

---

## File Structure

```
src/lib/
├── components/rdf/
│   ├── context.ts                 # RdfEditorContext
│   ├── tree/HierarchyTree.svelte  # With multi-select support TODO: decompose into multiple components
│   ├── sections/                  # Annotation, Hierarchy, Target, PropertyShape
│   ├── editors/                   # Dialog components
│   ├── panels/                    # ResourceDetailPanel
│   └── shared/                    # IriTooltip, ResourceSelector
├── rdf/
│   ├── namespaces.ts              # RDF namespace helpers + toCompactIri
│   ├── datatypes.ts               # Datatype registry + validation + hints
│   ├── resource-types.ts          # Resource type configuration
│   ├── view-profiles.ts           # Tab-aware section composition
│   └── queries/
│       ├── hierarchy.ts           # Tree building, CRUD, cycle detection
│       ├── annotations.ts         # Annotation queries
│       ├── shacl.ts               # SHACL-specific queries
│       └── index.ts
├── stores/
│   └── rdf.svelte.ts              # Reactive N3.Store wrapper
└── utils/
    ├── selection.svelte.ts        # createSelectionState, createKeyedSelectionState
    ├── dialog.svelte.ts           # createDialogState, createConfirmDialog
    ├── expandable.svelte.ts       # createExpandableSet
    └── debounce.svelte.ts         # createDebounced
```

---

## Next Steps

### High Priority
- [x] Test multi-select across tabs thoroughly
- [x] Clean up codebase and simplify/decompose/refactor where possible
- [ ] Add keyboard shortcuts (Delete, Escape to clear selection)
- [ ] Drag-and-drop hierarchy editing with `svelte-dnd-action`
- [ ] SHACL PropertyShape editor

### Medium Priority
- [ ] Tab for viewing/editing sh:PropertyShape (don't have hierarchy)
- [ ] Tree virtualization for large graphs with `@tanstack/svelte-virtual`
- [ ] Undo/redo support and back/forward in navigation
- [ ] Additional datatype editors

### Lower Priority
- [ ] SHACL 1.2 ShapeClass which is a combination of rdfs/owl:Class and sh:NodeShape
- [ ] OWL Class support with restrictions
- [ ] OWL ObjectProperty support with characteristics and subproperty chain
- [ ] Testing infrastructure
