<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { SvelteSet } from 'svelte/reactivity';
    import { Search, Check } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
    import * as Popover from '$lib/components/ui/popover/index.js';
    import { getRdfContext } from '../context';
    import { getResourceLabel } from '$lib/rdf/queries';
    import { toCompactIri, getLocalName } from '$lib/rdf/namespaces';

    interface Props {
        /** The rdf:type to filter resources by (optional) */
        resourceType?: NamedNode;
        /** Currently selected resource */
        selected?: NamedNode | BlankNode | null;
        /** Callback when selection changes */
        onselect?: (resource: NamedNode | BlankNode) => void;
        /** Placeholder text */
        placeholder?: string;
        /** Resources to exclude from the list */
        exclude?: (NamedNode | BlankNode)[];
        /** Additional class for the trigger */
        class?: string;
    }

    let {
        resourceType,
        selected = $bindable(null),
        onselect,
        placeholder = 'Select resource...',
        exclude = [],
        class: className = ''
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    let open = $state(false);
    let searchQuery = $state('');

    // Get all resources of the type (or all named nodes if no type specified)
    const allResources = $derived.by(() => {
        store.version; // reactive dependency
        
        if (resourceType) {
            return store.getResourcesByType(resourceType);
        }
        
        // If no type specified, get all unique subjects that are NamedNodes
        const subjects = new SvelteSet<string>();
        const resources: (NamedNode | BlankNode)[] = [];
        
        for (const quad of store.getQuads(null, null, null)) {
            if (quad.subject.termType === 'NamedNode' && !subjects.has(quad.subject.value)) {
                subjects.add(quad.subject.value);
                resources.push(quad.subject);
            }
        }
        
        return resources;
    });

    // Filter out excluded resources
    const excludeSet = $derived(new SvelteSet(exclude.map(r => r.value)));
    
    // Filter resources by search query
    const filteredResources = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();
        
        let resources = allResources.filter(r => !excludeSet.has(r.value));
        
        if (!query) return resources;
        
        return resources.filter(r => {
            const label = getResourceLabel(store, r).toLowerCase();
            const localName = r.termType === 'NamedNode' ? getLocalName(r.value).toLowerCase() : '';
            const iri = r.value.toLowerCase();
            
            return label.includes(query) || localName.includes(query) || iri.includes(query);
        });
    });

    // Selected resource label for display
    const selectedLabel = $derived(selected ? getResourceLabel(store, selected) : null);
    const selectedIri = $derived(selected?.termType === 'NamedNode' ? toCompactIri(selected.value) : selected?.value);

    function handleSelect(resource: NamedNode | BlankNode) {
        selected = resource;
        onselect?.(resource);
        open = false;
        searchQuery = '';
    }
</script>

<Popover.Root bind:open>
    <Popover.Trigger>
        {#snippet child({ props })}
            <Button 
                {...props}
                variant="outline" 
                class="w-full justify-start text-left font-normal {className}"
            >
                {#if selected}
                    <div class="flex flex-col items-start min-w-0">
                        <span class="truncate">{selectedLabel}</span>
                        <span class="text-xs text-muted-foreground font-mono truncate">{selectedIri}</span>
                    </div>
                {:else}
                    <span class="text-muted-foreground">{placeholder}</span>
                {/if}
            </Button>
        {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-80 p-0" align="start">
        <div class="p-2 border-b">
            <div class="relative">
                <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by label or IRI..."
                    class="w-full h-9 pl-8 pr-3 text-sm rounded-md border bg-background"
                    bind:value={searchQuery}
                />
            </div>
        </div>
        <ScrollArea class="max-h-72">
            <div class="p-1">
                {#if filteredResources.length === 0}
                    <p class="text-sm text-muted-foreground text-center py-4">
                        {searchQuery ? 'No matches found' : 'No resources available'}
                    </p>
                {:else}
                    {#each filteredResources as resource (resource.value)}
                        {@const label = getResourceLabel(store, resource)}
                        {@const iri = resource.termType === 'NamedNode' ? toCompactIri(resource.value) : resource.value}
                        {@const isSelected = selected?.value === resource.value}
                        
                        <button
                            type="button"
                            class="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 flex items-center gap-2"
                            class:bg-muted={isSelected}
                            onclick={() => handleSelect(resource)}
                        >
                            <div class="flex-1 min-w-0">
                                <span class="text-sm block truncate">{label}</span>
                                <span class="text-xs text-muted-foreground font-mono block truncate">{iri}</span>
                            </div>
                            {#if isSelected}
                                <Check class="h-4 w-4 shrink-0" />
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>
        </ScrollArea>
    </Popover.Content>
</Popover.Root>
