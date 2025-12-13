<script lang="ts">
    /**
     * ObjectTypeNode - SvelteFlow Node for RDF ObjectTypes
     * 
     * Renders rdfs:Class, owl:Class, sh:NodeShape resources as wide rectangles
     * with rounded left and right edges (stadium/pill shape).
     * 
     * Features:
     * - Type badges (rdfs:Class, owl:Class, sh:NodeShape)
     * - Hierarchy toggle buttons (show/hide parent/child edges)
     * - Lock toggle (keep node on canvas)
     * - Action buttons for dialogs
     */
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { 
        Info, 
        Code, 
        Database, 
        ChevronUp, 
        ChevronDown,
        Lock,
        Unlock,
    } from "@lucide/svelte";
    
    import type { ObjectTypeNodeData } from '$lib/rdf/flow-mapper';
    import { getObjectTypeBadges } from '$lib/rdf/type-detection';
    import { getLabel, getComment } from '$lib/rdf/flow-mapper';
    import { getCompactURI } from '$lib/rdf/utils';
    import { ns } from '$lib/stores/rdf.svelte';
    
    import DetailsDialog from '../dialogs/DetailsDialog.svelte';
    import SerializeDialog from '../dialogs/SerializeDialog.svelte';
    import InstancesDialog from '../dialogs/InstancesDialog.svelte';

    let { id, data, selected }: NodeProps = $props();
    
    const nodeData = $derived(data as unknown as ObjectTypeNodeData);
    const pointer = $derived(nodeData.pointer);
    const flags = $derived(nodeData.flags);
    const iri = $derived(nodeData.iri || id);
    
    const label = $derived(getLabel(pointer));
    const comment = $derived(getComment(pointer));
    const badges = $derived(getObjectTypeBadges(flags));
    const compactIri = $derived(getCompactURI(iri));
    
    const truncatedComment = $derived(
        comment && comment.length > 80 ? comment.substring(0, 77) + '...' : comment
    );
    
    // Check if this node has hierarchy edges
    const hasParents = $derived.by(() => {
        const subClassOf = pointer.out(ns.rdfs('subClassOf')).terms;
        const broader = pointer.out(ns.skos('broader')).terms;
        return subClassOf.length > 0 || broader.length > 0;
    });
    
    const hasChildren = $derived.by(() => {
        const subClassOf = pointer.in(ns.rdfs('subClassOf')).terms;
        const narrower = pointer.in(ns.skos('broader')).terms;
        return subClassOf.length > 0 || narrower.length > 0;
    });
    
    // Node state
    // TODO: These toggles currently only update local state
    // To actually hide/show edges, we need to communicate with the page via:
    // - A shared Svelte store for edge visibility per node
    // - Or using useSvelteFlow to access/filter edges
    // We need to keep track of which triples are visible/hidden as edges and are added/removed dynamically
    // important to think this through architecturally as it will be a major performance bottleneck if not done correctly
    let isLocked = $state(false);
    let showParents = $state(true);
    let showChildren = $state(true);
    
    // Dialog states
    let detailsOpen = $state(false);
    let serializeOpen = $state(false);
    let instancesOpen = $state(false);
</script>

<div 
    class="relative"
    class:ring-2={selected} 
    class:ring-primary={selected}
>
    <!-- Top controls: Parent toggle -->
    {#if hasParents}
        <div class="absolute -top-7 left-1/2 -translate-x-1/2 flex gap-1">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button 
                            variant={showParents ? "secondary" : "outline"} 
                            size="sm" 
                            class="h-6 px-2 text-xs"
                            onclick={() => showParents = !showParents}
                        >
                            <ChevronUp class="h-3 w-3 mr-1" />
                            {showParents ? 'Hide' : 'Show'} parents
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Toggle superclass/broader visibility</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    {/if}

    <Handle type="target" position={Position.Top} />
    <Handle type="target" position={Position.Left} />

    <!-- Wide stadium shape (rounded left/right edges) -->
    <div class="
        w-80 min-h-28 px-6 py-4
        bg-background border-2 border-border
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col items-center justify-center text-center
        rounded-full
    ">
        <!-- Header: Badges + Lock toggle -->
        <div class="flex items-center justify-between w-full mb-2">
            <div class="flex flex-wrap gap-1 justify-center flex-1">
                {#each badges as badge (badge)}
                    <Badge variant="secondary" class="text-xs font-mono">{badge}</Badge>
                {/each}
            </div>
            
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            class="h-6 w-6 p-0 ml-2"
                            onclick={() => isLocked = !isLocked}
                        >
                            {#if isLocked}
                                <Lock class="h-3.5 w-3.5" />
                            {:else}
                                <Unlock class="h-3.5 w-3.5 text-muted-foreground" />
                            {/if}
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>{isLocked ? 'Unlock node' : 'Lock node on canvas'}</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
        
        <!-- Label -->
        <h3 class="font-semibold text-base mb-0.5">{label}</h3>
        
        <!-- Compact IRI -->
        <p class="font-mono text-xs text-muted-foreground mb-1">{compactIri}</p>
        
        <!-- Comment -->
        {#if truncatedComment}
            <p class="text-xs text-muted-foreground max-w-[240px] mb-2">{truncatedComment}</p>
        {/if}
        
        <!-- Action buttons -->
        <div class="flex gap-1 mt-2">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => detailsOpen = true}>
                            <Info class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Details</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => serializeOpen = true}>
                            <Code class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Serialize</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => instancesOpen = true}>
                            <Database class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Instances</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    </div>

    <Handle type="source" position={Position.Bottom} />
    <Handle type="source" position={Position.Right} />
    
    <!-- Bottom controls: Children toggle -->
    {#if hasChildren}
        <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 flex gap-1">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button 
                            variant={showChildren ? "secondary" : "outline"} 
                            size="sm" 
                            class="h-6 px-2 text-xs"
                            onclick={() => showChildren = !showChildren}
                        >
                            <ChevronDown class="h-3 w-3 mr-1" />
                            {showChildren ? 'Hide' : 'Show'} children
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>Toggle subclass/narrower visibility</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    {/if}
</div>

<DetailsDialog bind:open={detailsOpen} {pointer} {iri} kind="objectType" {flags} />
<SerializeDialog bind:open={serializeOpen} {pointer} {iri} kind="objectType" />
<InstancesDialog bind:open={instancesOpen} {pointer} {iri} />
