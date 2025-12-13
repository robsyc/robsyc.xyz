<script lang="ts">
    /**
     * ObjectPropertyNode - SvelteFlow Node for owl:ObjectProperty
     * 
     * Renders owl:ObjectProperty as a square node with dashed border.
     * Supports inverse property toggle and characteristic badges.
     */
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Info, Code, Database, ArrowLeftRight, ArrowRight } from "@lucide/svelte";
    
    import type { ObjectPropertyNodeData } from '$lib/rdf/flow-mapper';
    import { getObjectPropertyBadges } from '$lib/rdf/type-detection';
    import { getLabel, getComment } from '$lib/rdf/flow-mapper';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';
    
    import DetailsDialog from '../dialogs/DetailsDialog.svelte';
    import SerializeDialog from '../dialogs/SerializeDialog.svelte';
    import InstancesDialog from '../dialogs/InstancesDialog.svelte';

    let { id, data, selected }: NodeProps = $props();
    
    const nodeData = $derived(data as unknown as ObjectPropertyNodeData);
    const flags = $derived(nodeData.flags);
    const iri = $derived(nodeData.iri || id);
    const domainIris = $derived(nodeData.domainIris ?? []);
    const rangeIris = $derived(nodeData.rangeIris ?? []);
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
    
    // Domain/range display (can have multiple)
    const domainDisplays = $derived(domainIris.map(d => getLocalName(d)));
    const rangeDisplays = $derived(rangeIris.map(r => getLocalName(r)));
    
    const truncatedComment = $derived(
        comment && comment.length > 50 ? comment.substring(0, 47) + '...' : comment
    );
    
    let detailsOpen = $state(false);
    let serializeOpen = $state(false);
    let instancesOpen = $state(false);
</script>

<div 
    class="relative"
    class:ring-2={selected} 
    class:ring-primary={selected}
>
    <Handle type="target" position={Position.Top} />
    <Handle type="target" position={Position.Left} />

    <!-- Square shape with dashed border -->
    <div class="
        w-52 min-h-36 p-3
        bg-background border-2 border-dashed border-border
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col
        rounded-md
    ">
        <!-- Header: Badges + Inverse Toggle -->
        <div class="flex items-start justify-between gap-1 mb-2">
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
                            <p>Toggle inverse: {showInverse ? getLocalName(iri) : getLocalName(flags.inverseIri!)}</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            {/if}
        </div>
        
        <!-- Label -->
        <h3 class="font-semibold text-sm mb-0.5">{label}</h3>
        
        <!-- Compact IRI -->
        <p class="font-mono text-xs text-muted-foreground mb-2">{compactIri}</p>
        
        <!-- Domain → Range flow -->
        {#if domainDisplays.length > 0 || rangeDisplays.length > 0}
            <div class="flex items-center gap-1 text-xs mb-2 flex-wrap">
                {#each domainDisplays as domain (domain)}
                    <Badge variant="secondary" class="font-mono text-xs h-5">{domain}</Badge>
                {/each}
                <ArrowRight class="h-3 w-3 text-muted-foreground shrink-0" />
                {#each rangeDisplays as range (range)}
                    <Badge variant="secondary" class="font-mono text-xs h-5">{range}</Badge>
                {/each}
            </div>
        {/if}
        
        <!-- Comment -->
        {#if truncatedComment}
            <p class="text-xs text-muted-foreground flex-1 mb-2">{truncatedComment}</p>
        {/if}
        
        <!-- Action buttons -->
        <div class="flex gap-1 mt-auto">
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
                    <Tooltip.Content><p>Instances (Links)</p></Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
    </div>

    <Handle type="source" position={Position.Bottom} />
    <Handle type="source" position={Position.Right} />
</div>

<DetailsDialog bind:open={detailsOpen} pointer={activePointer} iri={activeIri} kind="objectProperty" {flags} />
<SerializeDialog bind:open={serializeOpen} pointer={activePointer} iri={activeIri} kind="objectProperty" />
<InstancesDialog bind:open={instancesOpen} pointer={activePointer} iri={activeIri} />

