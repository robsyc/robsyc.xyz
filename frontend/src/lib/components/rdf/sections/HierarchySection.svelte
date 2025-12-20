<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { ChevronDown, ChevronRight, Plus, X, ExternalLink } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { getRdfContext } from '../context';
    import { getParents, getChildren, getResourceLabel } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';

    interface Props {
        /** The resource to show hierarchy for */
        subject: NamedNode | BlankNode;
        /** The predicate defining the hierarchy (rdfs:subClassOf, rdfs:subPropertyOf) */
        predicate: NamedNode;
        /** Section label */
        label: string;
        /** Direction: outgoing = show parents, incoming = show children */
        direction?: 'outgoing' | 'incoming';
        /** Initially collapsed? */
        collapsed?: boolean;
        /** Callback when a related resource is clicked */
        onnavigate?: (resource: NamedNode | BlankNode) => void;
    }

    let {
        subject,
        predicate,
        label,
        direction = 'outgoing',
        collapsed = false,
        onnavigate
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Section collapsed state
    // svelte-ignore state_referenced_locally
    let isCollapsed = $state(collapsed);

    // Get related resources reactively
    const relatedResources = $derived(
        direction === 'outgoing' 
            ? getParents(store, subject, predicate)
            : getChildren(store, subject, predicate)
    );

    function handleNavigate(resource: NamedNode | BlankNode) {
        onnavigate?.(resource);
    }
</script>

<div class="border rounded-lg">
    <!-- Section header -->
    <button
        type="button"
        class="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onclick={() => isCollapsed = !isCollapsed}
    >
        <div class="flex items-center gap-2">
            {#if isCollapsed}
                <ChevronRight class="h-4 w-4 text-muted-foreground" />
            {:else}
                <ChevronDown class="h-4 w-4 text-muted-foreground" />
            {/if}
            <span class="font-medium text-sm">{label}</span>
            <Badge variant="outline" class="text-xs">
                {relatedResources.length}
            </Badge>
        </div>
    </button>
    
    <!-- Section content -->
    {#if !isCollapsed}
        <div class="border-t">
            {#if relatedResources.length === 0}
                <p class="text-sm text-muted-foreground text-center py-4">
                    {direction === 'outgoing' ? 'No parent resources' : 'No child resources'}
                </p>
            {:else}
                <div class="divide-y">
                    {#each relatedResources as resource (resource.value)}
                        {@const resourceLabel = getResourceLabel(store, resource)}
                        {@const resourceIri = resource.termType === 'NamedNode' ? toCompactIri(resource.value) : resource.value}
                        
                        <div class="py-2 px-3 flex items-center justify-between group hover:bg-muted/30">
                            <div class="flex flex-col min-w-0">
                                <span class="text-sm font-medium truncate">{resourceLabel}</span>
                                <span class="text-xs text-muted-foreground font-mono truncate">{resourceIri}</span>
                            </div>
                            {#if onnavigate}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    class="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    onclick={() => handleNavigate(resource)}
                                    title="Navigate to resource"
                                >
                                    <ExternalLink class="h-3 w-3" />
                                </Button>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>


