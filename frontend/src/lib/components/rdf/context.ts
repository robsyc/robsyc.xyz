/**
 * RDF Editor Context
 * 
 * Provides shared state for RDF editing components via Svelte context.
 * Avoids prop drilling for store access, selection, and navigation.
 */

import { getContext, setContext } from 'svelte';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import type { NamedNode, BlankNode } from 'n3';
import type { SelectionState } from '$lib/utils/selection.svelte';

const RDF_CONTEXT_KEY = Symbol('rdf-editor');

/**
 * Navigation callbacks for cross-component navigation.
 * These are optional and provided by the page-level component.
 */
export interface NavigationCallbacks {
    /** Navigate to a resource (select it, potentially switching tabs) */
    toResource?: (resource: NamedNode | BlankNode) => void;
    /** Navigate to a predicate (typically switches to annotation properties tab) */
    toPredicate?: (predicate: NamedNode) => void;
}

export interface RdfEditorContext {
    /** The RDF store instance */
    store: RdfStore;
    
    /** Currently selected resource (reactive getter) */
    readonly selectedResource: NamedNode | BlankNode | null;
    /** Set the selected resource */
    setSelected: (resource: NamedNode | BlankNode | null) => void;
    
    /** Set of selected resource IRIs for multi-select mode */
    readonly selectedSet: ReadonlySet<string>;
    /** Number of selected items */
    readonly selectionCount: number;
    /** Toggle selection of a resource (for shift-click multi-select) */
    toggleSelection: (resource: NamedNode | BlankNode, multi: boolean) => void;
    /** Clear all selections */
    clearSelection: () => void;
    /** Check if a resource is selected */
    isSelected: (resource: NamedNode | BlankNode) => boolean;
    /** Get all selected IRIs as array */
    getSelectedIris: () => string[];
    
    /** Navigation callbacks (optional, set by page-level component) */
    navigation: NavigationCallbacks;
}

export function setRdfContext(context: RdfEditorContext): void {
    setContext(RDF_CONTEXT_KEY, context);
}

export function getRdfContext(): RdfEditorContext {
    const ctx = getContext<RdfEditorContext>(RDF_CONTEXT_KEY);
    if (!ctx) {
        throw new Error(
            'RDF context not found. Make sure to call setRdfContext() in a parent component.'
        );
    }
    return ctx;
}

/**
 * Options for creating an RdfEditorContext.
 */
export interface CreateRdfContextOptions {
    store: RdfStore;
    /** Function returning the current active selection (for reactive access) */
    getSelection: () => SelectionState;
    /** Navigation callbacks (optional) */
    navigation?: NavigationCallbacks;
}

/**
 * Create an RdfEditorContext with full selection and navigation support.
 * 
 * Uses a getter function for selection to support reactive tab switching.
 * The getter is called each time a selection method is invoked, ensuring
 * the correct per-tab selection is used.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   const selections = createKeyedSelectionState(TABS.map(t => t.id));
 *   const activeSelection = $derived(selections.get(activeTab));
 *   
 *   setRdfContext(createRdfContext({
 *     store: rdfStore,
 *     getSelection: () => activeSelection,
 *     navigation: {
 *       toResource: (r) => { ... },
 *       toPredicate: (p) => { ... }
 *     }
 *   }));
 * </script>
 * ```
 */
export function createRdfContext(options: CreateRdfContextOptions): RdfEditorContext {
    const { store, getSelection, navigation = {} } = options;
    
    return {
        store,
        get selectedResource() {
            return getSelection().selected;
        },
        setSelected: (resource) => getSelection().select(resource),
        get selectedSet() {
            return getSelection().selectedSet;
        },
        get selectionCount() {
            return getSelection().count;
        },
        toggleSelection: (resource, multi) => getSelection().toggle(resource, multi),
        clearSelection: () => getSelection().clear(),
        isSelected: (resource) => getSelection().isSelected(resource),
        getSelectedIris: () => getSelection().getSelectedIris(),
        navigation,
    };
}
