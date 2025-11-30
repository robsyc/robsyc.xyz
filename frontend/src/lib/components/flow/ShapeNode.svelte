<script lang="ts">
  /**
   * ShapeNode - Generic SHACL Shape-Driven Node Component
   * 
   * Renders any RDF resource based on its SHACL shape definition.
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

  import { shortenIRI, formatDate } from '$lib/rdf/utils';
  import type { ShapeNodeData, PropertyValue } from '$lib/rdf/flow-mapper';
  import RdfTriplesDialog from './RdfTriplesDialog.svelte';

  let { id, data, selected }: NodeProps = $props();
  
  // Cast to ShapeNodeData
  const shapeData = data as unknown as ShapeNodeData;
  const iri = shapeData.iri || id;
  
  // Filter properties for display (exclude coordinates)
  const displayProperties = $derived.by(() => {
    const excluded = new Set(['x', 'y']);
    return Object.entries(shapeData.properties || {})
      .filter(([key]) => !excluded.has(key))
      .map(([key, value]) => ({ key, ...value as PropertyValue }));
  });
  
  // Get a "title" property - look for common title-like properties
  const titleProperty = $derived.by(() => {
    const titleKeys = ['label', 'name', 'title', 'givenName'];
    for (const key of titleKeys) {
      if (shapeData.properties?.[key]?.value) {
        return shapeData.properties[key].value;
      }
    }
    // Fall back to local name from IRI
    return shortenIRI(iri);
  });
  
  // Get a "description" property
  const descriptionProperty = $derived.by(() => {
    const descKeys = ['comment', 'summary', 'abstract', 'description'];
    for (const key of descKeys) {
      if (shapeData.properties?.[key]?.value) {
        return shapeData.properties[key].value;
      }
    }
    return null;
  });
  
  // Format property value for display
  function formatValue(prop: PropertyValue): string {
    if (prop.datatype?.includes('dateTime') || prop.datatype?.includes('date')) {
      return formatDate(prop.value);
    }
    // Truncate long values
    if (prop.value.length > 10) {
      return prop.value.substring(0, 10) + '...';
    }
    return prop.value;
  }
  
  // Keys to exclude from property list (already shown in header)
  const excludedFromList = new Set([
    'label', 'name', 'title', 'givenName',
    'comment', 'summary','abstract', 'description',
  ]);
</script>

<div class="selectable rounded-xl ring-ring" class:ring-2={selected}>
  <Handle type="target" position={Position.Top} />

  <Item.Root class="rounded-xl w-3xs bg-background hover:shadow-foreground/8 hover:shadow-[0_0_8px_6px] transition-shadow duration-200">

    <Item.Header>
      <Item.Content>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="secondary" class="text-xs font-mono hover:underline">
            <a href={shapeData.targetClass} target="_blank">
              {shapeData.targetLocalName}
            </a>
          </Badge>
        </div>
        <Item.Title>{titleProperty}</Item.Title>
        {#if descriptionProperty}
          <Item.Description>{descriptionProperty}</Item.Description>
        {/if}
      </Item.Content>
    </Item.Header>

    <!-- Property list (limited preview) -->
    {#if displayProperties.length > 0}
    <Separator />
      <Item.Content>
        <div class="space-y-1">
          {#each displayProperties.slice(0, 5) as prop (prop.path)}
            {#if prop.value && !excludedFromList.has(prop.key)}
              <div class="flex items-baseline gap-2 text-xs">
                <span class="text-muted-foreground font-mono shrink-0">{prop.localName}:</span>
                {#if prop.isMultiValued && prop.values.length > 1}
                  <div class="flex flex-wrap gap-1">
                    {#each prop.values.slice(0, 2) as val, i (i)}
                      <Badge variant="outline" class="text-xs">{val}</Badge>
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

      <RdfTriplesDialog {iri} />

      <!-- Dialog to open the full shape details -->
      <Dialog.Root>

        <Dialog.Trigger class={buttonVariants({ variant: "default", size: "sm" })}>
          <ExternalLink class="h-4 w-4" />Details
        </Dialog.Trigger>
        
        <Dialog.Content class="sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title>{titleProperty}</Dialog.Title>
            <Dialog.Description>
              <Badge variant="secondary">{shapeData.targetLocalName}</Badge>
              <code class="text-xs bg-muted px-1 py-0.5 rounded ml-2">{shortenIRI(iri)}</code>
            </Dialog.Description>
          </Dialog.Header>
          
          <ScrollArea class="h-[400px] w-full">
            <div class="space-y-3 pr-4">
              {#each displayProperties as prop (prop.path)}
                <div class="border-b pb-2">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-medium text-sm">{prop.localName}</span>
                    {#if prop.isRequired}
                      <Badge variant="destructive" class="text-xs">required</Badge>
                    {/if}
                    {#if prop.isMultiValued}
                      <Badge variant="outline" class="text-xs">multi</Badge>
                    {/if}
                  </div>
                  
                  {#if prop.isMultiValued && prop.values.length > 1}
                    <div class="flex flex-wrap gap-1">
                      {#each prop.values as val, i (i)}
                        <Badge variant="secondary">{val}</Badge>
                      {/each}
                    </div>
                  {:else if prop.value}
                    <p class="text-sm text-muted-foreground whitespace-pre-wrap">{prop.value}</p>
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
</div>
