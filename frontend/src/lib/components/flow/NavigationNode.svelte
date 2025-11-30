<script lang="ts">
  /**
   * NavigationNode - SiteNavigationElement Node Component
   * 
   * Displays a navigation element with action buttons for each potentialAction.
   * Used as the entry point in the knowledge graph, allowing users to trigger
   * actions that may load additional content.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";

  import { ArrowRight, Compass } from "@lucide/svelte";

  import { getLocalName } from '$lib/rdf/utils';
  import type { ShapeNodeData } from '$lib/rdf/flow-mapper';

  /** Extended data interface with the onLoadGraph callback */
  interface NavigationNodeData extends ShapeNodeData {
    onLoadGraph?: (graphName: 'home' | 'data' | 'shapes') => void;
  }

  let { id, data, selected }: NodeProps = $props();
  
  // Cast to our extended data type (includes onLoadGraph callback)
  const nodeData = data as unknown as NavigationNodeData;
  
  // Extract the callback from data (injected by +page.svelte)
  const onLoadGraph = nodeData.onLoadGraph;
  
  // Get the name property (title)
  const name = $derived(nodeData.properties?.['name']?.value ?? 'Navigation');
  
  // Get the description property
  const description = $derived(nodeData.properties?.['description']?.value ?? null);
  
  // Get potentialAction references - these are the actions the user can take
  const actions = $derived.by(() => {
    const actionProp = nodeData.properties?.['potentialAction'];
    if (!actionProp) return [];
    
    // Extract action IRIs and derive display labels
    // Action names are derived from the IRI local name (e.g., SearchBlogAction → Blog)
    // TODO: we are interested in the target of the action, it will point us to the shape we want to request from the backend
    return actionProp.values.map(iri => {
      const localName = getLocalName(iri);
      // Extract a cleaner label: "SearchBlogAction" → "Blog", "SearchAboutAction" → "About"
      const label = localName
        .replace(/^Search/, '')
        .replace(/Action$/, '');
      return {
        iri,
        label: label || localName,
      };
    });
  });
  
  /**
   * Handle action button click
   * For now, logs the action IRI to console. Backend integration will be added later.
   */
  function handleActionClick(actionIRI: string, actionLabel: string) {
    console.log(`[NavigationNode] Action clicked: ${actionLabel}`);
    console.log(`[NavigationNode] Action IRI: ${actionIRI}`);
    // TODO: In future, resolve schema:target from the action and load that content
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
            {nodeData.targetLocalName ?? 'Navigation'}
          </Badge>
        </div>
        <Item.Title class="text-lg font-semibold">{name}</Item.Title>
        {#if description}
          <Item.Description class="mt-1 text-sm">{description}</Item.Description>
        {/if}
      </Item.Content>
    </Item.Header>

    {#if actions.length > 0}
      <Separator />
      
      <Item.Content class="py-3">
        <p class="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
          Explore
        </p>
        <div class="flex flex-wrap gap-2">
          {#each actions as action (action.iri)}
            <Button 
              variant="outline" 
              size="sm" 
              class="group"
              onclick={() => handleActionClick(action.iri, action.label)}
            >
              <span class="font-medium">{action.label}</span>
              <ArrowRight class="h-4 w-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </Button>
          {/each}
        </div>
      </Item.Content>
    {/if}

  </Item.Root>

  <Handle type="source" position={Position.Right} />
  <Handle type="source" position={Position.Bottom} />
</div>

