<script lang="ts">
    /**
     * LinkTypeNode - SvelteFlow Node for RDF LinkTypes
     * 
     * Renders owl:ObjectProperty as sharp-cornered squares.
     * Shows PropertyShape constraints if a wrapping shape exists.
     */
    import { Handle, Position, type NodeProps } from '@xyflow/svelte';
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Info, Code, Database, ArrowRight, ArrowLeft } from "@lucide/svelte";
    
    import type { LinkTypeNodeData } from '$lib/rdf/flow-mapper';
    import { getLinkTypeBadges } from '$lib/rdf/type-detection';
    import { getLabel, getComment } from '$lib/rdf/flow-mapper';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';
    
    import DetailsDialog from '../dialogs/DetailsDialog.svelte';
    import SerializeDialog from '../dialogs/SerializeDialog.svelte';
    import InstancesDialog from '../dialogs/InstancesDialog.svelte';

    let { id, data, selected }: NodeProps = $props();
    
    const nodeData = $derived(data as unknown as LinkTypeNodeData);
    const pointer = $derived(nodeData.pointer);
    const flags = $derived(nodeData.flags);
    const iri = $derived(nodeData.iri || id);
    const propertyShape = $derived(nodeData.propertyShape);
    const domainIri = $derived(nodeData.domainIri);
    const rangeIri = $derived(nodeData.rangeIri);
    
    const label = $derived(getLabel(pointer));
    const comment = $derived(getComment(pointer));
    const badges = $derived(getLinkTypeBadges(flags));
    const compactIri = $derived(getCompactURI(iri));
    
    // Domain/range display
    const domainDisplay = $derived(domainIri ? getLocalName(domainIri) : null);
    const rangeDisplay = $derived(rangeIri ? getLocalName(rangeIri) : (propertyShape?.nodeTargetIri ? getLocalName(propertyShape.nodeTargetIri) : null));
    
    // Cardinality from PropertyShape
    const cardinality = $derived.by(() => {
        if (!propertyShape) return null;
        const min = propertyShape.minCount ?? '0';
        const max = propertyShape.maxCount ?? '*';
        return `[${min}..${max}]`;
    });
    
    const truncatedComment = $derived(
        comment && comment.length > 40 ? comment.substring(0, 37) + '...' : comment
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

    <!-- Sharp square shape -->
    <div class="
        w-48 min-h-32 p-3
        bg-background border-2 border-dashed border-border
        shadow-md hover:shadow-lg transition-shadow
        flex flex-col
        rounded-sm
    ">
        <!-- Badges -->
        <div class="flex flex-wrap gap-1 mb-2">
            {#each badges as badge (badge)}
                <Badge variant="outline" class="text-xs font-mono h-5">{badge}</Badge>
            {/each}
        </div>
        
        <!-- Label -->
        <h3 class="font-semibold text-sm mb-0.5">{label}</h3>
        
        <!-- Compact IRI -->
        <p class="font-mono text-xs text-muted-foreground mb-2">{compactIri}</p>
        
        <!-- Domain → Range flow -->
        {#if domainDisplay || rangeDisplay}
            <div class="flex items-center gap-1 text-xs mb-2 flex-wrap">
                {#if domainDisplay}
                    <Badge variant="secondary" class="font-mono text-xs h-5">{domainDisplay}</Badge>
                    <ArrowRight class="h-3 w-3 text-muted-foreground shrink-0" />
                {/if}
                {#if rangeDisplay}
                    <Badge variant="secondary" class="font-mono text-xs h-5">{rangeDisplay}</Badge>
                {/if}
            </div>
        {/if}
        
        <!-- Cardinality from PropertyShape -->
        {#if cardinality}
            <div class="text-xs text-muted-foreground mb-1">
                <span class="font-mono">{cardinality}</span>
            </div>
        {/if}
        
        <!-- Comment -->
        {#if truncatedComment}
            <p class="text-xs text-muted-foreground flex-1">{truncatedComment}</p>
        {/if}
        
        <!-- Action buttons -->
        <div class="flex gap-1 mt-auto pt-2">
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

<DetailsDialog bind:open={detailsOpen} {pointer} {iri} kind="linkType" {flags} {propertyShape} />
<SerializeDialog bind:open={serializeOpen} {pointer} {iri} kind="linkType" {propertyShape} />
<InstancesDialog bind:open={instancesOpen} {pointer} {iri} />


