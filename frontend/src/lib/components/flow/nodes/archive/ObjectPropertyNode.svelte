<script lang="ts">
    /**
     * ObjectPropertyNode - SvelteFlow Node for owl:ObjectProperty
     * 
     * Renders owl:ObjectProperty as a square node with dashed border.
     * Features:
     * - Inverse property toggle
     * - Characteristic badges (Functional, Symmetric, Transitive)
     * - Click-to-copy IRI
     * - Domain/range shown in Details dialog only (not inline)
     */
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Info, Code, Database, ArrowLeftRight, Copy, Check } from "@lucide/svelte";
    
    import type { ObjectPropertyNodeData } from '$lib/rdf/flow-mapper';
    import { getObjectPropertyBadges } from '$lib/rdf/type-detection';
    import { getLabel, getComment } from '$lib/rdf/flow-mapper';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';
    
    import DetailsDialog from '../../dialogs/DetailsDialog.svelte';
    import SerializeDialog from '../../dialogs/SerializeDialog.svelte';
    import InstancesDialog from '../../dialogs/InstancesDialog.svelte';

    let { id, data, selected }: NodeProps = $props();
    
    const nodeData = $derived(data as unknown as ObjectPropertyNodeData);
    const flags = $derived(nodeData.flags);
    const iri = $derived(nodeData.iri || id);
    const inversePointer = $derived(nodeData.inversePointer);
    
    // Toggle for showing inverse property view
    let showInverse = $state(false);
    
    // Active pointer based on toggle
    const activePointer = $derived(
        showInverse && inversePointer 
            ? inversePointer 
            : nodeData.pointer
    );
    const activeIri = $derived(
        showInverse && flags.inverseIri 
            ? flags.inverseIri 
            : iri
    );
    
    const label = $derived(getLabel(activePointer));
    const comment = $derived(getComment(activePointer));
    const badges = $derived(getObjectPropertyBadges(flags));
    const compactIri = $derived(getCompactURI(activeIri));
    
    const truncatedComment = $derived(
        comment && comment.length > 60 ? comment.substring(0, 57) + '...' : comment
    );
    
    // UI state
    let isHovered = $state(false);
    let copiedIri = $state(false);
    
    let detailsOpen = $state(false);
    let serializeOpen = $state(false);
    let instancesOpen = $state(false);
    
    // Copy IRI to clipboard
    async function copyIri() {
        await navigator.clipboard.writeText(activeIri);
        copiedIri = true;
        setTimeout(() => copiedIri = false, 1500);
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
    class="relative group"
    class:ring-2={selected} 
    class:ring-primary={selected}
    class:rounded-md={selected}
    onmouseenter={() => isHovered = true}
    onmouseleave={() => isHovered = false}
>
    <!-- Hierarchy handles (vertical) - for subPropertyOf -->
    <Handle type="target" position={Position.Top} id="top" />
    
    <!-- Relation handles (horizontal) - domain (left) receives from ObjectType -->
    <Handle type="target" position={Position.Left} id="left" />

    <!-- Square shape with dashed border -->
    <div class="
        w-52 min-h-32 p-3
        bg-background border-2 border-dashed border-border
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col
        rounded-md
    ">
        <!-- Header: Badges + Inverse Toggle -->
        <div class="flex items-start justify-between gap-1 mb-1">
            <div class="flex flex-wrap gap-1">
                {#each badges as badge (badge)}
                    <Badge variant="outline" class="text-xs font-mono h-5">{badge}</Badge>
                {/each}
            </div>
            
            {#if flags.hasInverse}
                <Tooltip.Provider>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button 
                                variant={showInverse ? "secondary" : "ghost"} 
                                size="sm" 
                                class="h-6 w-6 p-0"
                                onclick={() => showInverse = !showInverse}
                            >
                                <ArrowLeftRight class="h-3.5 w-3.5" />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p>Show {showInverse ? getLocalName(iri) : getLocalName(flags.inverseIri!)}</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            {/if}
        </div>
        
        <!-- Label -->
        <h3 class="font-semibold text-sm leading-tight">{label}</h3>
        
        <!-- Compact IRI with copy button -->
        <Tooltip.Provider>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <button 
                        class="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors text-left"
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
            <p class="text-xs text-muted-foreground flex-1 mt-1">{truncatedComment}</p>
        {/if}
        
        <!-- Action buttons -->
        <div class="flex gap-1 mt-auto pt-2">
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <Button variant="ghost" size="sm" class="h-7 w-7 p-0" onclick={() => detailsOpen = true}>
                            <Info class="h-3.5 w-3.5" />
                        </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content><p>Details (Domain/Range)</p></Tooltip.Content>
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
                    <Tooltip.Content><p>Instances (Links)</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    </div>

    <!-- Hierarchy handles (vertical) - for subPropertyOf to children -->
    <Handle type="source" position={Position.Bottom} id="bottom" />
    
    <!-- Relation handles (horizontal) - range (right) connects to ObjectType -->
    <Handle type="source" position={Position.Right} id="right" />
</div>

<DetailsDialog bind:open={detailsOpen} pointer={activePointer} iri={activeIri} kind="objectProperty" {flags} />
<SerializeDialog bind:open={serializeOpen} pointer={activePointer} iri={activeIri} kind="objectProperty" />
<InstancesDialog bind:open={instancesOpen} pointer={activePointer} iri={activeIri} />
