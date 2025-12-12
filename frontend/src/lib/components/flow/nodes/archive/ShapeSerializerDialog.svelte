<!-- <script lang="ts">
  /**
   * ShapeSerializerDialog - SHACL-Driven RDF Serialization
   * 
   * Intelligent serialization that uses the SHACL shape to determine 
   * which triples to extract and how deep to traverse the graph.
   * 
   * Features:
   * - Uses shape property paths to extract relevant triples
   * - Follows sh:node constraints to include nested resources
   * - Serializes to Turtle with proper prefixes
   * 
   * TODO: should add filters to this e.g. include shape definition itself, inference rules, n-hop paths, ...
   */
  import { DataFactory, Writer } from 'n3';
  
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

  import { CodeXml } from "@lucide/svelte";

  import { ns, PREFIXES, extractSubgraph } from '$lib/rdf/clownface-store';
  import type { GraphPointer } from '$lib/rdf/clownface-store';
  import type { NamedNode, Term, Quad } from '@rdfjs/types';
  import type { Store } from 'n3';
  import { getCompactURI } from '$lib/rdf/utils';

  const { namedNode } = DataFactory;

  // Props
  interface Props {
    pointer: GraphPointer<Term, Store>;
    shapePointer?: GraphPointer<NamedNode, Store>;
    iri: string;
    variant?: 'outline' | 'default' | 'ghost';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    showLabel?: boolean;
  }
  
  let { 
    pointer,
    shapePointer,
    iri, 
    variant = 'outline', 
    size = 'sm',
    showLabel = true 
  }: Props = $props();
  
  /**
   * Extract quads guided by the SHACL shape.
   * If a shape is available, follows its property paths.
   * Otherwise, falls back to basic subgraph extraction.
   */
  function extractShapeQuads(): Quad[] {
    if (!pointer?.term) return [];
    
    // If we have a shape, we could be smarter about which properties to include
    // For now, use the general subgraph extraction with depth 2
    // TODO: Use shape's sh:property paths to guide extraction
    return extractSubgraph(pointer, 2);
  }
  
  /**
   * Serialize quads to Turtle format
   */
  function serializeToTurtle(quads: Quad[]): string {
    if (quads.length === 0) return '# No triples found for this resource.';
    
    const writer = new Writer({
      format: 'Turtle',
      prefixes: PREFIXES,
    });
    
    writer.addQuads(quads);
    
    let result = '';
    writer.end((error, output) => {
      if (error) {
        console.error('Serialization error:', error);
        result = `# Error serializing: ${error.message}`;
      } else {
        result = output;
      }
    });
    
    return result;
  }
  
  // Reactive Turtle serialization
  const turtleText = $derived.by(() => {
    const quads = extractShapeQuads();
    return serializeToTurtle(quads);
  });
  
  const quadCount = $derived.by(() => {
    const quads = extractShapeQuads();
    return quads.length;
  });
</script>

<Dialog.Root>
  <Dialog.Trigger class={buttonVariants({ variant, size })}>
    <CodeXml class="h-4 w-4" />
    {#if showLabel}RDF{/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-3xl">
    <Dialog.Header>
      <Dialog.Title>RDF Representation</Dialog.Title>
      <Dialog.Description>
        Resource: 
        <code class="text-xs bg-muted px-1 py-0.5 rounded">
          {getCompactURI(iri)}
        </code>
        <span class="text-xs ml-1">({quadCount} triples)</span>
      </Dialog.Description>
    </Dialog.Header>
    <ScrollArea class="h-[400px] w-full rounded-md border bg-muted/30 p-4">
      <pre class="text-xs font-mono whitespace-pre-wrap break-words text-foreground/90">{turtleText}</pre>
    </ScrollArea>
  </Dialog.Content>
</Dialog.Root>

 -->
