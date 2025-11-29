<script lang="ts">
  /**
   * NavigationNode - SiteNavigationElement Node Component
   * 
   * Displays a navigation element with action buttons for each hasPart reference.
   * Used as the entry point in the knowledge graph, allowing users to load
   * additional content dynamically.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";

  import { ArrowRight, Compass } from "@lucide/svelte";

  import { shortenIRI, getLocalName } from '$lib/rdf/utils';
  import type { ShapeNodeData } from '$lib/rdf/flow-mapper';

  /** Extended data interface with the onLoadPart callback */
  interface NavigationNodeData extends ShapeNodeData {
    onLoadPart?: (partIRI: string) => void;
  }

  let { id, data, selected }: NodeProps = $props();
  
  // Cast to our extended data type (includes onLoadPart callback)
  const nodeData = data as unknown as NavigationNodeData;
  const iri = nodeData.iri || id;
  
  // Extract the callback from data (injected by +page.svelte)
  const onLoadPart = nodeData.onLoadPart;
  
  // Get the name property (title)
  const name = $derived(nodeData.properties?.['name']?.value ?? 'Navigation');
  
  // Get the description property
  const description = $derived(nodeData.properties?.['description']?.value ?? null);
  
  // Get hasPart references - these are the items we can load
  const hasParts = $derived.by(() => {
    const partProp = nodeData.properties?.['hasPart'];
    if (!partProp) return [];
    
    // Return all part IRIs with their display names
    return partProp.values.map(iri => ({
      iri,
      label: getLocalName(iri),
      shortIRI: shortenIRI(iri),
    }));
  });
  
  function handleLoadPart(partIRI: string) {
    console.log(`[NavigationNode] Load requested for: ${partIRI}`);
    onLoadPart?.(partIRI);
  }
</script>

<div class="selectable rounded-2xl ring-ring" class:ring-2={selected}>
  <Handle type="target" position={Position.Top} />

  <Item.Root class="rounded-2xl w-xs bg-background border-2 border-primary/20 hover:border-primary/40 hover:shadow-primary/10 hover:shadow-[0_0_12px_8px] transition-all duration-300">
    
    <Item.Header class="pb-2">
      <Item.Content>
        <div class="flex items-center gap-2 mb-2">
          <div class="p-1.5 rounded-lg bg-primary/10">
            <Compass class="h-4 w-4 text-primary" />
          </div>
          <Badge variant="outline" class="text-xs font-mono">
            {nodeData.targetClassLocalName ?? 'Navigation'}
          </Badge>
        </div>
        <Item.Title class="text-lg font-semibold">{name}</Item.Title>
        {#if description}
          <Item.Description class="mt-1 text-sm">{description}</Item.Description>
        {/if}
      </Item.Content>
    </Item.Header>

    {#if hasParts.length > 0}
      <Separator />
      
      <Item.Content class="py-3">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
          Explore
        </p>
        <div class="flex flex-col gap-2">
          {#each hasParts as part (part.iri)}
            <Button 
              variant="secondary" 
              size="sm" 
              class="w-full justify-between group"
              onclick={() => handleLoadPart(part.iri)}
            >
              <span class="font-medium">{part.label}</span>
              <ArrowRight class="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Button>
          {/each}
        </div>
      </Item.Content>
    {/if}

  </Item.Root>

  <Handle type="source" position={Position.Right} />
  <Handle type="source" position={Position.Bottom} />
</div>

