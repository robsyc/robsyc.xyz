<script lang="ts">
  /**
   * NavigationNode - SiteNavigationElement Node Component
   * 
   * Displays a navigation element with action buttons for each potentialAction.
   * Uses Clownface GraphPointers for RDF data access.
   * Serves as the entry point in the knowledge graph, allowing users to trigger
   * actions that may load additional content.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";

  import { ArrowRight, Compass } from "@lucide/svelte";

  import { ns } from '$lib/rdf/clownface-store';
  import type { GraphPointer } from '$lib/rdf/clownface-store';
  import type { Term } from '@rdfjs/types';
  import type { Store } from 'n3';
  import { getLocalName } from '$lib/rdf/utils';

  /** Node data containing the GraphPointer */
  interface NavigationNodeData {
    pointer: GraphPointer<Term, Store>;
    targetLocalName?: string;
    onLoadGraph?: (graphName: 'home' | 'data' | 'shapes') => void;
  }

  let { id, data, selected }: NodeProps = $props();
  
  const nodeData = data as unknown as NavigationNodeData;
  const pointer = $derived(nodeData.pointer);
  const onLoadGraph = nodeData.onLoadGraph;
  
  //=============================================================================
  // Property Access via Clownface Traversal
  //=============================================================================
  
  /** Navigation name via schema:name */
  const name = $derived(
    pointer?.out(ns.schema('name'))?.value ?? 'Navigation'
  );
  
  /** Navigation description via schema:description */
  const description = $derived(
    pointer?.out(ns.schema('description'))?.value ?? null
  );
  
  /** 
   * Get potentialAction references and resolve their properties
   * Each action has: IRI, name (for label), and target (shape to load)
   */
  const actions = $derived.by(() => {
    if (!pointer?.term) return [];
    
    const actionPointers = pointer.out(ns.schema('potentialAction')).toArray();
    
    return actionPointers.map((actionPtr: (typeof actionPointers)[number]) => {
      const actionIRI = actionPtr.term?.value ?? '';
      const actionName = actionPtr.out(ns.schema('name')).value ?? '';
      const target = actionPtr.out(ns.schema('target')).value ?? '';
      const localName = getLocalName(actionIRI);
      
      // Derive a clean label: "SearchBlogAction" → "Blog"
      const label = actionName || localName
        .replace(/^Search/, '')
        .replace(/Action$/, '');
      
      return {
        iri: actionIRI,
        label: label || localName,
        target,
        targetLocalName: target ? getLocalName(target) : undefined,
      };
    });
  });
  
  /**
   * Handle action button click
   * Resolves the action's schema:target and triggers content loading
   */
  function handleActionClick(action: { iri: string; label: string; target: string }) {
    console.log(`[NavigationNode] Action clicked: ${action.label}`);
    console.log(`[NavigationNode] Action IRI: ${action.iri}`);
    console.log(`[NavigationNode] Target: ${action.target}`);
    
    if (onLoadGraph && action.target) {
      // Determine which graph to load based on target
      if (action.target.includes('Blog')) {
        onLoadGraph('data');
      } else if (action.target.includes('About')) {
        onLoadGraph('data');
      }
    }
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
              onclick={() => handleActionClick(action)}
              title={action.targetLocalName ? `Load ${action.targetLocalName}` : undefined}
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
