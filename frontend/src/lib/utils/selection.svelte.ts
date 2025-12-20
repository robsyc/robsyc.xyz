/**
 * Selection State Utility
 * 
 * A reactive utility for managing single and multi-selection state.
 * Supports shift-click for multi-selection and provides a unified interface.
 */

import { SvelteSet } from 'svelte/reactivity';
import type { NamedNode, BlankNode } from 'n3';

type SelectableNode = NamedNode | BlankNode;

export interface SelectionState {
    /** The primary selected resource (most recently selected) */
    readonly selected: SelectableNode | null;
    /** Set of all selected resource IRIs (for multi-select) */
    readonly selectedSet: ReadonlySet<string>;
    /** Number of selected items */
    readonly count: number;
    /** Whether multi-selection is active (more than one item selected) */
    readonly isMulti: boolean;
    
    /** Set a single selection (clears any multi-selection) */
    select: (resource: SelectableNode | null) => void;
    /** Toggle selection of a resource. If multi=true, adds/removes from set. If false, replaces. */
    toggle: (resource: SelectableNode, multi: boolean) => void;
    /** Check if a resource is selected */
    isSelected: (resource: SelectableNode) => boolean;
    /** Clear all selections */
    clear: () => void;
    /** Get all selected resources as an array of IRIs */
    getSelectedIris: () => string[];
}

/**
 * Create a reactive selection state manager.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createSelectionState } from '$lib/utils/selection.svelte';
 *   
 *   const selection = createSelectionState();
 *   
 *   // Single select
 *   selection.select(resource);
 *   
 *   // Multi-select (shift+click)
 *   function handleClick(resource, event) {
 *     selection.toggle(resource, event.shiftKey);
 *   }
 *   
 *   // Check selection
 *   const isSelected = selection.isSelected(resource);
 * </script>
 * ```
 */
export function createSelectionState(): SelectionState {
    // Primary selection (most recent)
    let primary = $state<SelectableNode | null>(null);
    // Set of selected resource IRIs
    const selectedIris = new SvelteSet<string>();
    
    function getIri(resource: SelectableNode): string {
        return resource.value;
    }

    return {
        get selected() {
            return primary;
        },
        
        get selectedSet(): ReadonlySet<string> {
            return selectedIris;
        },
        
        get count() {
            return selectedIris.size;
        },
        
        get isMulti() {
            return selectedIris.size > 1;
        },

        select(resource: SelectableNode | null) {
            selectedIris.clear();
            primary = resource;
            if (resource) {
                selectedIris.add(getIri(resource));
            }
        },

        toggle(resource: SelectableNode, multi: boolean) {
            const iri = getIri(resource);
            
            if (multi) {
                // Multi-select mode: toggle in/out of set
                if (selectedIris.has(iri)) {
                    selectedIris.delete(iri);
                    // If we removed the primary, pick another or null
                    if (primary?.value === iri) {
                        const remaining = [...selectedIris];
                        primary = remaining.length > 0 ? resource : null; // Keep type, will be updated on next select
                    }
                } else {
                    selectedIris.add(iri);
                    primary = resource;
                }
            } else {
                // Single-select mode: replace selection
                selectedIris.clear();
                selectedIris.add(iri);
                primary = resource;
            }
        },

        isSelected(resource: SelectableNode): boolean {
            return selectedIris.has(getIri(resource));
        },

        clear() {
            selectedIris.clear();
            primary = null;
        },

        getSelectedIris(): string[] {
            return [...selectedIris];
        }
    };
}

/**
 * Create selection state that persists per-key (e.g., per-tab).
 * Useful for maintaining separate selections across different views.
 * 
 * @param keys - Array of keys to initialize
 */
export function createKeyedSelectionState<K extends string>(keys: K[]): {
    /** Get selection state for a specific key */
    get: (key: K) => SelectionState;
    /** Get the primary selected resource for a key */
    getSelected: (key: K) => SelectableNode | null;
    /** Set selection for a key */
    setSelected: (key: K, resource: SelectableNode | null) => void;
    /** Clear all selections for all keys */
    clearAll: () => void;
} {
    const states = new Map<K, SelectionState>();
    
    // Initialize states for all keys
    for (const key of keys) {
        states.set(key, createSelectionState());
    }

    return {
        get(key: K): SelectionState {
            let state = states.get(key);
            if (!state) {
                state = createSelectionState();
                states.set(key, state);
            }
            return state;
        },

        getSelected(key: K): SelectableNode | null {
            return states.get(key)?.selected ?? null;
        },

        setSelected(key: K, resource: SelectableNode | null) {
            this.get(key).select(resource);
        },

        clearAll() {
            for (const state of states.values()) {
                state.clear();
            }
        }
    };
}
