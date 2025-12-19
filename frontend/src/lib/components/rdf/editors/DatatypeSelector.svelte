<script lang="ts">
    import { Search } from '@lucide/svelte';
    import { getDatatypesByCategory, type DatatypeKey, type DatatypeInfo } from '$lib/rdf/datatypes';

    interface Props {
        /** Currently selected datatype key */
        selected?: DatatypeKey;
        /** Callback when datatype is selected */
        onselect?: (datatype: DatatypeKey) => void;
        /** Compact mode */
        compact?: boolean;
    }

    let {
        selected = $bindable('string'),
        onselect,
        compact = false
    }: Props = $props();

    let searchQuery = $state('');

    // Datatype groups with search filtering
    const datatypeGroups = getDatatypesByCategory();
    const filteredGroups = $derived(
        searchQuery.trim()
            ? datatypeGroups.map(g => ({
                ...g,
                datatypes: g.datatypes.filter(dt => 
                    dt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    dt.key.toLowerCase().includes(searchQuery.toLowerCase())
                )
            })).filter(g => g.datatypes.length > 0)
            : datatypeGroups
    );

    function handleSelect(key: string) {
        selected = key as DatatypeKey;
        onselect?.(key as DatatypeKey);
    }
</script>

<div class="flex flex-col border rounded-lg overflow-hidden min-h-0 h-full">
    <div class="p-2 border-b bg-muted/30 space-y-2 shrink-0">
        <span class="text-xs font-medium text-muted-foreground">Datatype</span>
        <div class="relative">
            <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
                type="text"
                placeholder="Search..."
                class="w-full h-7 pl-7 pr-2 text-xs rounded border bg-background"
                bind:value={searchQuery}
            />
        </div>
    </div>
    <div class="flex-1 min-h-0 overflow-auto p-2">
        {#each filteredGroups as group (group.category)}
            <div class="mb-3">
                <p class="text-xs font-medium text-muted-foreground mb-1 px-1">{group.label}</p>
                {#each group.datatypes as dt (dt.key)}
                    <button
                        type="button"
                        class="w-full text-left px-2 py-1 rounded hover:bg-muted/50"
                        class:text-sm={!compact}
                        class:text-xs={compact}
                        class:bg-muted={selected === dt.key}
                        onclick={() => handleSelect(dt.key)}
                    >
                        {dt.label}
                    </button>
                {/each}
            </div>
        {/each}
        {#if filteredGroups.length === 0}
            <p class="text-xs text-muted-foreground text-center py-2">No matches</p>
        {/if}
    </div>
</div>
