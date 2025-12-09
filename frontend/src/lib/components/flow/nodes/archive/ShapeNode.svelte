<!-- <script lang="ts">
  /**
   * ShapeNode - Generic SHACL Shape-Driven Node Component
   * 
   * Renders any RDF resource using Clownface GraphPointers.
   * Dynamically extracts and displays properties from the underlying RDF data.
   * Used as a fallback when no custom node component exists for a shape's target class.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";

  import { ExternalLink } from "@lucide/svelte";

  import { ns } from '$lib/rdf/clownface-store';
  import type { GraphPointer } from '$lib/rdf/clownface-store';
  import type { Term } from '@rdfjs/types';
  import type { Store } from 'n3';
  import { getCompactURI, formatDate, getLocalName } from '$lib/rdf/utils';
  import ShapeSerializerDialog from '../../utils/ShapeSerializerDialog.svelte';

  /** Node data containing the GraphPointer */
  interface ShapeNodeData {
    pointer: GraphPointer<Term, Store>;
    iri: string;
    targetLocalName?: string;
    targetClass?: string;
  }

  let { id, data, selected }: NodeProps = $props();
  
  const nodeData = data as unknown as ShapeNodeData;
  const pointer = $derived(nodeData.pointer);
  const iri = nodeData.iri || id;
  
  //=============================================================================
  // Property Extraction via Clownface
  //=============================================================================

  /** Property value representation for display */
  interface DisplayProperty {
    predicate: string;
    localName: string;
    value: string;
    values: string[];
    isMultiValued: boolean;
    isLiteral: boolean;
  }
  
  /** 
   * Extract all properties from the pointer's dataset
   * Excludes position coordinates (rxyz:x, rxyz:y) and rdf:type
   */
  const displayProperties = $derived.by(() => {
    if (!pointer?.term) return [];
    
    const excluded = new Set([
      ns.rxyz('x').value,
      ns.rxyz('y').value,
      ns.rdf('type').value,
    ]);
    
    const dataset = pointer.dataset;
    const subject = pointer.term;
    if (!dataset || !subject) return [];
        
    // Group by predicate
    const propMap = new Map<string, DisplayProperty>();
    
    for (const quad of dataset.match(subject as any, null, null, null)) {
      const predIRI = quad.predicate.value;
      if (excluded.has(predIRI)) continue;
      
      const existing = propMap.get(predIRI);
      const valueStr = quad.object.value;
      const isLiteral = quad.object.termType === 'Literal';
      
      if (existing) {
        existing.values.push(valueStr);
        existing.isMultiValued = true;
      } else {
        propMap.set(predIRI, {
          predicate: predIRI,
          localName: getLocalName(predIRI),
          value: valueStr,
          values: [valueStr],
          isMultiValued: false,
          isLiteral,
        });
      }
    }
    
    return Array.from(propMap.values());
  });
  
  /** Get a title property - look for common title-like predicates */
  const titleProperty = $derived.by(() => {
    const titlePredicates = [
      ns.rdfs('label'),
      ns.schema('name'),
      ns.schema('headline'),
      ns.schema('title'),
    ];
    
    for (const pred of titlePredicates) {
      const value = pointer?.out(pred)?.value;
      if (value) return value;
    }
    
    return getCompactURI(iri);
  });
  
  /** Get a description property */
  const descriptionProperty = $derived.by(() => {
    const descPredicates = [
      ns.rdfs('comment'),
      ns.schema('description'),
      ns.schema('abstract'),
    ];
    
    for (const pred of descPredicates) {
      const value = pointer?.out(pred)?.value;
      if (value) return value;
    }
    
    return null;
  });
  
  /** Get the rdf:type for display */
  const typeLocalName = $derived.by(() => {
    const typeIRI = pointer?.out(ns.rdf('type'))?.value;
    return typeIRI ? getLocalName(typeIRI) : nodeData.targetLocalName ?? 'Resource';
  });
  
  /** Get the full type IRI for linking */
  const typeIRI = $derived(
    pointer?.out(ns.rdf('type'))?.value ?? nodeData.targetClass
  );
  
  /** Format a property value for display */
  function formatValue(prop: DisplayProperty): string {
    if (prop.localName.toLowerCase().includes('date')) {
      return formatDate(prop.value);
    }
    if (prop.value.length > 15) {
      return prop.value.substring(0, 15) + '...';
    }
    return prop.value;
  }
  
  /** Predicates to exclude from the property list (shown in header) */
  const excludedFromList = new Set([
    ns.rdfs('label').value,
    ns.schema('name').value,
    ns.schema('headline').value,
    ns.schema('title').value,
    ns.rdfs('comment').value,
    ns.schema('description').value,
    ns.schema('abstract').value,
  ]);
</script>

<div class="selectable rounded-xl ring-ring" class:ring-2={selected}>
  <Handle type="target" position={Position.Top} />

  <Item.Root class="rounded-xl w-3xs bg-background hover:shadow-foreground/8 hover:shadow-[0_0_8px_6px] transition-shadow duration-200">

    <Item.Header>
      <Item.Content>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="secondary" class="text-xs font-mono hover:underline">
            {#if typeIRI}
              <a href={typeIRI} target="_blank">{typeLocalName}</a>
            {:else}
              {typeLocalName}
            {/if}
          </Badge>
        </div>
        <Item.Title>{titleProperty}</Item.Title>
        {#if descriptionProperty}
          <Item.Description>{descriptionProperty}</Item.Description>
        {/if}
      </Item.Content>
    </Item.Header>

    {#if displayProperties.length > 0}
    <Separator />
      <Item.Content>
        <div class="space-y-1">
          {#each displayProperties.slice(0, 5) as prop (prop.predicate)}
            {#if prop.value && !excludedFromList.has(prop.predicate)}
              <div class="flex items-baseline gap-2 text-xs">
                <span class="text-muted-foreground font-mono shrink-0">{prop.localName}:</span>
                {#if prop.isMultiValued && prop.values.length > 1}
                  <div class="flex flex-wrap gap-1">
                    {#each prop.values.slice(0, 2) as val, i (i)}
                      <Badge variant="outline" class="text-xs">{getCompactURI(val)}</Badge>
                    {/each}
                    {#if prop.values.length > 2}
                      <Badge variant="outline" class="text-xs">+{prop.values.length - 2}</Badge>
                    {/if}
                  </div>
                {:else}
                  <span class="truncate">{formatValue(prop)}</span>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </Item.Content>
    {/if}

    <Separator />

    <Item.Actions>

      <ShapeSerializerDialog {pointer} iri={iri} />

      <Dialog.Root>

        <Dialog.Trigger class={buttonVariants({ variant: "default", size: "sm" })}>
          <ExternalLink class="h-4 w-4" />Details
        </Dialog.Trigger>
        
        <Dialog.Content class="sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title>{titleProperty}</Dialog.Title>
            <Dialog.Description>
              <Badge variant="secondary">{typeLocalName}</Badge>
              <code class="text-xs bg-muted px-1 py-0.5 rounded ml-2">{getCompactURI(iri)}</code>
            </Dialog.Description>
          </Dialog.Header>
          
          <ScrollArea class="h-[400px] w-full">
            <div class="space-y-3 pr-4">
              {#each displayProperties as prop (prop.predicate)}
                <div class="border-b pb-2">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-sm">{prop.localName}</span>
                    {#if prop.isMultiValued}
                      <Badge variant="outline" class="text-xs">multi ({prop.values.length})</Badge>
                    {/if}
                    {#if !prop.isLiteral}
                      <Badge variant="secondary" class="text-xs">ref</Badge>
                    {/if}
                  </div>
                  
                  {#if prop.isMultiValued && prop.values.length > 1}
                    <div class="flex flex-wrap gap-1">
                      {#each prop.values as val, i (i)}
                        <Badge variant="secondary">{prop.isLiteral ? val : getCompactURI(val)}</Badge>
                      {/each}
                    </div>
                  {:else if prop.value}
                    <p class="text-sm text-muted-foreground whitespace-pre-wrap">
                      {prop.isLiteral ? prop.value : getCompactURI(prop.value)}
                    </p>
                  {:else}
                    <p class="text-sm text-muted-foreground italic">No value</p>
                  {/if}
                </div>
              {/each}
            </div>
          </ScrollArea>
        </Dialog.Content>
      </Dialog.Root>
    </Item.Actions>
  </Item.Root>

  <Handle type="source" position={Position.Right} />
  <Handle type="source" position={Position.Bottom} />
</div> -->
