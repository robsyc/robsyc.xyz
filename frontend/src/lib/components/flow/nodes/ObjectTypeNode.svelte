<script lang="ts">
    /**
     * ObjectTypeNode - SvelteFlow Node for RDF ObjectTypes
     * 
     * Renders rdfs:Class, owl:Class, sh:NodeShape resources as wide rectangles
     * with rounded left and right edges (stadium/pill shape).
     * 
     * Features:
     * - Type badges (rdfs:Class, owl:Class, sh:NodeShape)
     * - Hierarchy toggle buttons (icon-only, visible on hover)
     * - Lock toggle (keep node on canvas during collapse)
     * - Click-to-copy IRI
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
        Copy,
        Check,
    } from "@lucide/svelte";
    
    import type { ObjectTypeNodeData } from '$lib/rdf/flow-mapper';
    import { getObjectTypeBadges } from '$lib/rdf/type-detection';
    import { getLabel, getComment } from '$lib/rdf/flow-mapper';
    import { getCompactURI } from '$lib/rdf/utils';
    import { ns } from '$lib/stores/rdf.svelte';
    import { visibilityStore } from '$lib/stores/visibility.svelte';
    
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
    
    // Check hierarchy relationships from RDF data
    const hasParentsInRdf = $derived.by(() => {
        const subClassOf = pointer.out(ns.rdfs('subClassOf')).terms;
        const broader = pointer.out(ns.skos('broader')).terms;
        return subClassOf.length > 0 || broader.length > 0;
    });
    
    const hasChildrenInRdf = $derived.by(() => {
        const subClassOf = pointer.in(ns.rdfs('subClassOf')).terms;
        const narrower = pointer.in(ns.skos('broader')).terms;
        return subClassOf.length > 0 || narrower.length > 0;
    });
    
    // Visibility state from store
    const isExpanded = $derived(visibilityStore.isExpanded(id));
    const isLocked = $derived(visibilityStore.isLocked(id));
    const hasVisibleChildren = $derived(visibilityStore.hasVisibleChildren(id));
    
    // UI state
    let isHovered = $state(false);
    let copiedIri = $state(false);
    
    // Dialog states
    let detailsOpen = $state(false);
    let serializeOpen = $state(false);
    let instancesOpen = $state(false);
    
    // Toggle children visibility via visibility store
    function toggleChildren() {
        visibilityStore.toggleNode(id);
    }
    
    // Toggle lock status
    function toggleLock() {
        visibilityStore.toggleLock(id);
    }
    
    // Copy IRI to clipboard
    async function copyIri() {
        await navigator.clipboard.writeText(iri);
        copiedIri = true;
        setTimeout(() => copiedIri = false, 1500);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="relative group"
    class:ring-2={selected} 
    class:ring-primary={selected}
    class:rounded-full={selected}
    onmouseenter={() => isHovered = true}
    onmouseleave={() => isHovered = false}
>
    <!-- Hierarchy handles (vertical) - for subClassOf/broader -->
    <Handle type="target" position={Position.Top} id="top" />
    
    <!-- Relation handles (horizontal) - for domain/range connections -->
    <Handle type="target" position={Position.Left} id="left" />

    <!-- Wide stadium shape (rounded left/right edges) -->
    <div class="
        w-80 min-h-28 px-6 py-3
        bg-background border-2 border-border
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col items-center justify-center text-center
        rounded-full
    ">
        <!-- Header: Badges + Lock toggle (lock visible on hover or when locked) -->
        <div class="flex items-center justify-between w-full mb-1">
            <div class="flex flex-wrap gap-1 justify-center flex-1">
                {#each badges as badge (badge)}
                    <Badge variant="secondary" class="text-xs font-mono h-5">{badge}</Badge>
                {/each}
            </div>
            
            <div class="transition-opacity" class:opacity-0={!isHovered && !isLocked} class:opacity-100={isHovered || isLocked}>
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                class="h-6 w-6 p-0"
                                onclick={toggleLock}
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
        </div>
        
        <!-- Label -->
        <h3 class="font-semibold text-base leading-tight">{label}</h3>
        
        <!-- Compact IRI with copy button -->
        <Tooltip.Provider>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <button 
                        class="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        onclick={copyIri}
                    >
                        {compactIri}
                        {#if copiedIri}
                            <Check class="h-3 w-3 text-green-500" />
                        {:else}
                            <Copy class="h-3 w-3 opacity-0 group-hover:opacity-50" />
                        {/if}
                    </button>
                </Tooltip.Trigger>
                <Tooltip.Content>
                    <p>{copiedIri ? 'Copied!' : 'Click to copy full IRI'}</p>
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
        
        <!-- Comment (only show if exists and not default) -->
        {#if truncatedComment && truncatedComment !== 'No rdfs:comment defined'}
            <p class="text-xs text-muted-foreground max-w-[240px] mt-1">{truncatedComment}</p>
        {/if}
        
        <!-- Action buttons -->
        <div class="flex gap-1 mt-2">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => detailsOpen = true}>
                            <Info class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Details</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => serializeOpen = true}>
                            <Code class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Serialize</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
            
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => instancesOpen = true}>
                            <Database class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Instances</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    </div>

    <!-- Hierarchy handles (vertical) - for subClassOf/broader to children -->
    <Handle type="source" position={Position.Bottom} id="bottom" />
    
    <!-- Relation handles (horizontal) - for domain/range connections -->
    <Handle type="source" position={Position.Right} id="right" />
    
    <!-- Bottom controls: Children toggle (icon-only, visible on hover when children exist) -->
    {#if hasChildrenInRdf}
        <div 
            class="absolute -bottom-6 left-1/2 -translate-x-1/2 transition-opacity"
            class:opacity-0={!isHovered && !isExpanded}
            class:opacity-100={isHovered || isExpanded}
        >
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button 
                            variant={isExpanded ? "secondary" : "outline"} 
                            size="sm" 
                            class="h-6 w-6 p-0 rounded-full"
                            onclick={toggleChildren}
                        >
                            <ChevronDown class="h-4 w-4 transition-transform {isExpanded ? 'rotate-180' : ''}" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                        <p>{isExpanded ? 'Hide subclasses' : 'Show subclasses'}</p>
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    {/if}
</div>

<DetailsDialog bind:open={detailsOpen} {pointer} {iri} kind="objectType" {flags} />
<SerializeDialog bind:open={serializeOpen} {pointer} {iri} kind="objectType" />
<InstancesDialog bind:open={instancesOpen} {pointer} {iri} />
