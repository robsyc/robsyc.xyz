# VIEW_IMPLEMENTATION.md

## Goal

Build a shadcn-based UI for browsing and editing RDF resources. The UI follows a **two-panel pattern**: a reusable hierarchy browser on the left, and a detail viewer/editor on the right. This enables creating data like `01-basic-classes.ttl`.

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
- `sh:NodeShape`: Annotations + Target Class + Hierarchy (sh:node) + Property Shapes (sh:property) + ...

### 3. Svelte 5 Patterns
- **Snippets** for customizable rendering (e.g., custom tree node content)
- **Context** for shared state (selected resource, store reference)
- **`$props()`** with TypeScript interfaces for type-safe components
- **`$derived`** for computed values from store queries

---

## Core Components

### 1. HierarchyTree (Generic, Reusable)

A generic tree browser for any RDF type hierarchy.

**Features:**
- Combobox search by `rdfs:label` or local name w/ deduplication
- Type badge (e.g., "a rdfs:Class")
- Tree actions toolbar:
  - `git-branch-plus` Add child of selected (e.g., subClass)
  - `plus` Add sibling (same parent as selected)
  - `x` Remove selected
- Collapsible tree nodes via hierarchy predicate
- Visual indication of expandable nodes (has children)
- **Snippet prop** for custom node rendering

**Base shadcn Components:** `Combobox`, `Button`, `Tree` (shadcn-extras), `ScrollArea`

---

### 2. ResourceDetailPanel (Multi-Section Container)

A container that displays multiple collapsible sections for the selected resource.

This allows different views to compose different sections:
- `ClassEditorView`: Annotations + Superclass hierarchy
- `PropertyEditorView`: Annotations + Superproperty hierarchy
- `ShapeEditorView`: Annotations + Property shapes + ...

---

### 3. AnnotationSection (Reusable for ANY Resource)

Displays and edits annotations for **any** resource. This is the key reusable piece.

**Key Insight:** This component works for:
- Annotating an `rdfs:Class` (e.g., `rxyz:Person rdfs:label "Person"@en`)
- Annotating an `owl:AnnotationProperty` (e.g., `rdfs:label rdfs:label "label"`) ← meta!
- Annotating a `sh:NodeShape`, `owl:Class`, etc.

**Features:**
- Collapsible section with "Annotations" heading
- Bulk actions: remove selected, add new
- **Grouped by property**: Multiple values for same predicate grouped
- Collapse/expand groups with multiple values
- Per-value actions: edit, delete
- "Add value" button per property group

---

### 4. HierarchySection (Reusable for Relations)

Displays hierarchical relationships (subClassOf, subPropertyOf, etc.)

---

### 5. LiteralEditorDialog (Add/Edit Annotation)

A dialog for creating/editing literal values with full datatype support.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Add Annotation                                    [✕] │
├────────────────────────────┬────────────────┬───────────────────────────────────┤
│   PropertyTree             │   Datatype     │   Editor                          │
│                            │   Selector     │                                   │
│  [🔍 Combobox           ]  │                │   Language-tagged String          │
│  a owl:AnnotationProperty  │  ▸ langString  │                                   │
│                            │    string      │   Description...                  │
│  ▸ label  ← selected       │    boolean     │                                   │
│  ▼ note                    │    integer     │   Examples:                       │
│    ▸ definition            │    ...         │   • "Hello"@en                    │
│    ▸ editorial note        │                │   • "Bonjour"@fr                  │
│                            │                │                                   │
│                            │                │  ┌─────────────────────┬───────┐  │
│                            │                │  │ Person              │ en ▼  │  │
│                            │                │  └─────────────────────┴───────┘  │
│                            │                │                                   │
│                            │                │ Preview:                          │
│                            │                │ rxyz:Person rdfs:label "Person"@en│
│                            │                │                                   │
│                            │                │  [  Preview  ]  [  Submit  ]      │
└────────────────────────────┴────────────────┴───────────────────────────────────┘
```

**Three Sections:**
1. **PropertyTree** (left): Reuse `HierarchyTree` for `owl:AnnotationProperty`
2. **DatatypeSelector** (middle): Vertical list from `DATATYPES` (grouped by category)
3. **EditorPanel** (right): Datatype info + dynamic input + preview

---

### 6. LiteralValueEditor (Dynamic Input)

Renders the appropriate input based on `editorType`.

**Editor Mapping (from `datatypes.ts`):**

| `editorType` | Component |
|--------------|-----------|
| `text-input` | `Input` |
| `textarea` | `Textarea` |
| `lang-string` | `Input` + `LanguageSelector` |
| `switch` | `Switch` |
| `integer-input` | `NumberField` |
| `decimal-input` | `NumberField` |
| `date-picker` | `DatePicker` |
| `iri-input` | `Combobox` |

---

## File Structure

```
src/lib/components/rdf/
├── context.ts                     # Shared context definition
├── tree/
│   ├── HierarchyTree.svelte       # Generic tree browser
│   ├── TreeNode.svelte            # Single recursive node
│   ├── TreeToolbar.svelte         # Search + actions
│   └── index.ts
├── sections/
│   ├── AnnotationSection.svelte   # Annotation editor section
│   ├── HierarchySection.svelte    # Hierarchy display section
│   ├── PropertyShapeSection.svelte # For sh:NodeShape (future)
│   └── index.ts
├── editors/
│   ├── CreateResourceDialog.svelte # Create a new resource (e.g., Class or Property)
│   ├── LiteralEditorDialog.svelte # Full add/edit dialog
│   ├── LiteralValueEditor.svelte  # Dynamic input dispatcher
│   ├── DatatypeSelector.svelte    # Datatype picker
│   ├── DatatypeInfoPanel.svelte   # Datatype description
│   ├── LanguageSelector.svelte    # BCP47 selector
│   ├── LangStringEditor.svelte    # Text + language
│   ├── more datatype-specific editor components...
│   └── index.ts
├── panels/
│   ├── ResourceDetailPanel.svelte # Multi-section container (which sections are used is determined by the resource type)
│   └── index.ts
├── views/
│   ├── ClassEditorView.svelte     # rdfs:Class editing
│   ├── PropertyEditorView.svelte  # owl:AnnotationProperty editing
│   └── index.ts
└── index.ts                       # Re-exports
```

---

## Store Operations

```typescript
import { DataFactory } from 'n3';
import { rdfStore } from '$lib/stores/rdf.svelte';
import { ns } from '$lib/rdf/namespaces';

const { namedNode, literal } = DataFactory;

// Create any typed resource
function createResource(
  localName: string, 
  type: NamedNode,
  parent?: NamedNode,
  parentPredicate?: NamedNode
): NamedNode {
  const subject = ns.rxyz(localName);
  rdfStore.addQuad(subject, ns.rdf('type'), type);
  if (parent && parentPredicate) {
    rdfStore.addQuad(subject, parentPredicate, parent);
  }
  return subject;
}

// Works for any resource type!
createResource('Person', ns.rdfs('Class'), ns.rxyz('Thing'), ns.rdfs('subClassOf'));
createResource('myLabel', ns.owl('AnnotationProperty'), ns.rdfs('label'), ns.rdfs('subPropertyOf'));
```

---

## Key Reusability Examples

### The Meta Case: Editing Annotation Properties

`rdfs:label` is an `owl:AnnotationProperty` that itself has:
- `rdfs:label "label"` (its own label!)
- `rdfs:comment "A human-readable name..."` (its own description!)

The **same** `AnnotationSection` component that edits annotations on `rxyz:Person` also edits annotations on `rdfs:label`. No special code needed!

```svelte
<!-- Editing rxyz:Person (a rdfs:Class) -->
<AnnotationSection subject={ns.rxyz('Person')} />

<!-- Editing rdfs:label (an owl:AnnotationProperty) - same component! -->
<AnnotationSection subject={ns.rdfs('label')} />
```

### Generic Views via Snippets

Use snippets to customize tree node rendering without duplicating the tree logic:

```svelte
<HierarchyTree
  resourceType={ns.rdfs('Class')}
  hierarchyPredicate={ns.rdfs('subClassOf')}
  bind:selected
>
  {#snippet nodeContent({ node, label })}
    <span class="font-medium">{label}</span>
    <Badge variant="outline">rdfs:Class</Badge>
  {/snippet}
</HierarchyTree>
```

---

## Notes

- **Reactivity**: All store queries access `rdfStore.version` for reactive updates
- **Validation**: Use `pattern` and `constraints` from `DatatypeInfo`
- **Preview**: Show triple(s) before submit via `previewTriple()`
- **Multi-value**: Same property can have multiple values (e.g., different languages or just multiple tripes with same s and p)
- **DRY**: Every component should work for any of our RDF resource types