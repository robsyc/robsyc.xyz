/**
 * RDF Editor Context
 * 
 * Provides shared state for RDF editing components via Svelte context.
 * Avoids prop drilling for store access and selected resource.
 */

import { getContext, setContext } from 'svelte';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import type { NamedNode, BlankNode } from 'n3';
import type { SelectionState } from '$lib/utils/selection.svelte';

const RDF_CONTEXT_KEY = Symbol('rdf-editor');

export interface RdfEditorContext {
    /** The RDF store instance */
    store: RdfStore;
    
    // Single selection (backward compatible)
    /** Currently selected resource (reactive getter) */
    readonly selectedResource: NamedNode | BlankNode | null;
    /** Set the selected resource */
    setSelected: (resource: NamedNode | BlankNode | null) => void;
    
    // Multi-selection support (optional, for future features)
    /** 
     * Set of selected resource IRIs for multi-select mode (optional).
     * Components should check if this is defined before using.
     */
    readonly selectedResources?: ReadonlySet<string>;
    /** 
     * Toggle selection of a resource (for shift-click multi-select).
     * If multi is true, adds/removes from selection. If false, replaces selection.
     */
    toggleSelection?: (resource: NamedNode | BlankNode, multi: boolean) => void;
    /** Clear all selections */
    clearSelection?: () => void;
    /** Check if a resource is selected */
    isSelected?: (resource: NamedNode | BlankNode) => boolean;
}

export function setRdfContext(context: RdfEditorContext): void {
    setContext(RDF_CONTEXT_KEY, context);
}

export function getRdfContext(): RdfEditorContext {
    const ctx = getContext<RdfEditorContext>(RDF_CONTEXT_KEY);
    if (!ctx) {
        throw new Error(
            'RDF context not found. Make sure to call setRdfContext() in a parent component. ' +
            'Example: setRdfContext({ store: rdfStore, get selectedResource() { return selected; }, setSelected: (r) => selected = r })'
        );
    }
    return ctx;
}

/**
 * Create an RdfEditorContext from an RdfStore and a SelectionState.
 * This is the recommended way to create a context with full multi-selection support.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createSelectionState } from '$lib/utils/selection.svelte';
 *   import { createRdfContext, setRdfContext } from '$lib/components/rdf/context';
 *   
 *   const selection = createSelectionState();
 *   setRdfContext(createRdfContext(rdfStore, selection));
 * </script>
 * ```
 */
export function createRdfContext(store: RdfStore, selection: SelectionState): RdfEditorContext {
    return {
        store,
        get selectedResource() {
            return selection.selected;
        },
        setSelected: (resource) => selection.select(resource),
        get selectedResources() {
            return selection.selectedSet;
        },
        toggleSelection: (resource, multi) => selection.toggle(resource, multi),
        clearSelection: () => selection.clear(),
        isSelected: (resource) => selection.isSelected(resource),
    };
}
