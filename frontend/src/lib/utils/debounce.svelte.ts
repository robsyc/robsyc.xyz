/**
 * Debounce Utility
 * 
 * A reactive utility for debouncing values in Svelte 5.
 * Useful for search inputs and other frequently-updated values.
 */

/**
 * Create a debounced reactive value.
 * 
 * @param getValue - Function that returns the current value (should access reactive state)
 * @param delay - Debounce delay in milliseconds (default: 150ms)
 * @returns Object with `current` getter for the debounced value
 * 
 * @example
 * ```svelte
 * <script lang="ts">
 *   let searchInput = $state('');
 *   const debouncedSearch = createDebounced(() => searchInput, 150);
 *   
 *   // Use debouncedSearch.current for filtering
 *   const filtered = $derived(items.filter(i => i.name.includes(debouncedSearch.current)));
 * </script>
 * 
 * <input bind:value={searchInput} />
 * ```
 */
export function createDebounced<T>(getValue: () => T, delay: number = 150): { readonly current: T } {
    let debounced = $state<T>(getValue());
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    $effect(() => {
        const value = getValue();
        
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        
        timeoutId = setTimeout(() => {
            debounced = value;
            timeoutId = null;
        }, delay);

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    });

    return {
        get current() {
            return debounced;
        }
    };
}
