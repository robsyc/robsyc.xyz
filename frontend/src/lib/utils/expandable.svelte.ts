/**
 * Expandable Set Utility
 * 
 * A reactive utility for tracking expanded/collapsed state in tree views and lists.
 * Uses Svelte 5's SvelteSet for reactive updates.
 */

import { SvelteSet } from 'svelte/reactivity';

export interface ExpandableSet {
    /** Check if an item is expanded */
    has: (id: string) => boolean;
    /** Toggle an item's expanded state */
    toggle: (id: string) => void;
    /** Expand specific items */
    expand: (ids: string[]) => void;
    /** Collapse specific items */
    collapse: (ids: string[]) => void;
    /** Collapse all items */
    collapseAll: () => void;
}

/**
 * Create a reactive expandable set for tracking expanded/collapsed state.
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { createExpandableSet } from '$lib/utils/expandable.svelte';
 *   
 *   const expanded = createExpandableSet();
 *   
 *   // Check if expanded
 *   const isExpanded = expanded.has('node-1');
 *   
 *   // Toggle
 *   expanded.toggle('node-1');
 *   
 *   // Expand multiple
 *   expanded.expand(['node-1', 'node-2']);
 * </script>
 * ```
 */
export function createExpandableSet(initialExpanded?: string[]): ExpandableSet {
    const set = new SvelteSet<string>(initialExpanded);
    
    return {
        has: (id: string) => set.has(id),
        toggle: (id: string) => {
            if (set.has(id)) {
                set.delete(id);
            } else {
                set.add(id);
            }
        },
        expand: (ids: string[]) => {
            for (const id of ids) {
                set.add(id);
            }
        },
        collapse: (ids: string[]) => {
            for (const id of ids) {
                set.delete(id);
            }
        },
        collapseAll: () => {
            set.clear();
        },
    };
}
