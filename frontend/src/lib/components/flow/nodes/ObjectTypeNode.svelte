<script lang="ts">
    /**
     * ObjectTypeNode - SvelteFlow Node for RDF ObjectTypes
     * 
     * Renders rdfs:Class, owl:Class, sh:NodeShape resources as wide ovals.
     */
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Info, Code, Database } from "@lucide/svelte";
    
    import type { ObjectTypeNodeData } from '$lib/rdf/flow-mapper';
    import { getObjectTypeBadges } from '$lib/rdf/type-detection';
    import { getLabel, getComment } from '$lib/rdf/flow-mapper';
    import { getCompactURI } from '$lib/rdf/utils';
    
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
        comment && comment.length > 60 ? comment.substring(0, 57) + '...' : comment
    );
    
    let detailsOpen = $state(false);
    let serializeOpen = $state(false);
    let instancesOpen = $state(false);
</script>

<div 
    class="relative"
    class:ring-2={selected} 
    class:ring-primary={selected}
    style="border-radius: 50%;"
>
    <Handle type="target" position={Position.Top} />
    <Handle type="target" position={Position.Left} />

    <!-- Wide oval shape -->
    <div class="
        w-80 min-h-28 px-6 py-4
        bg-background border-2 border-border
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col items-center justify-center text-center
        rounded-[50%]
    ">
        <!-- Badges -->
        <div class="flex flex-wrap gap-1 justify-center mb-2">
            {#each badges as badge (badge)}
                <Badge variant="secondary" class="text-xs font-mono">{badge}</Badge>
            {/each}
        </div>
        
        <!-- Label -->
        <h3 class="font-semibold text-base mb-0.5">{label}</h3>
        
        <!-- Compact IRI -->
        <p class="font-mono text-xs text-muted-foreground mb-1">{compactIri}</p>
        
        <!-- Comment -->
        {#if truncatedComment}
            <p class="text-xs text-muted-foreground max-w-[200px]">{truncatedComment}</p>
        {/if}
        
        <!-- Action buttons -->
        <div class="flex gap-1 mt-3">
            <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => detailsOpen = true}>
                <Info class="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => serializeOpen = true}>
                <Code class="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" class="h-7 px-2" onclick={() => instancesOpen = true}>
                <Database class="h-3.5 w-3.5" />
            </Button>
        </div>
    </div>

    <Handle type="source" position={Position.Bottom} />
    <Handle type="source" position={Position.Right} />
</div>

<DetailsDialog bind:open={detailsOpen} {pointer} {iri} kind="objectType" {flags} />
<SerializeDialog bind:open={serializeOpen} {pointer} {iri} kind="objectType" />
<InstancesDialog bind:open={instancesOpen} {pointer} {iri} />


