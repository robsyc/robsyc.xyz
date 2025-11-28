<script lang="ts">
  /**
   * RdfTriplesDialog - Reusable component for displaying RDF triples
   * 
   * Shows the underlying RDF triples for a given resource IRI.
   * Can be composed into any flow node component.
   */
  import { DataFactory } from 'n3';
  
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

  import { CodeXml } from "@lucide/svelte";

  import { rdfStore } from '$lib/stores/rdf.svelte';
  import { shortenIRI, formatTriple } from '$lib/rdf/utils';

  const { namedNode } = DataFactory;

  // Props
  interface Props {
    iri: string;
    variant?: 'outline' | 'default' | 'ghost';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    showLabel?: boolean;
  }
  
  let { 
    iri, 
    variant = 'outline', 
    size = 'sm',
    showLabel = true 
  }: Props = $props();
  
  // Reactive triples display
  let triplesText = $derived.by(() => {
    // Access version to trigger re-computation when store changes
    rdfStore.version;
    
    // TODO: we should do this in a smarter way; if a shape is available, which should be the case
    // then we should use that to construct a query (possibly multi-hop relationships) and serialize (Turtle, N-triples, ...)
    const quads = rdfStore.getQuads(namedNode(iri), null, null, null);
    if (quads.length === 0) {
      return 'No triples found for this resource.';
    }
    
    return quads.map(q => formatTriple(
      q.subject.value,
      q.predicate.value,
      {
        value: q.object.value,
        termType: q.object.termType,
        language: q.object.termType === 'Literal' ? (q.object as any).language : undefined,
        datatype: q.object.termType === 'Literal' ? (q.object as any).datatype : undefined,
      }
    )).join('\n');
  });
  
  let tripleCount = $derived(
    triplesText === 'No triples found for this resource.' 
      ? 0 
      : triplesText.split('\n').length
  );
</script>

<Dialog.Root>
  <Dialog.Trigger class={buttonVariants({ variant, size })}>
    <CodeXml class="h-4 w-4" />
    {#if showLabel}RDF{/if}
  </Dialog.Trigger>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>RDF Triples</Dialog.Title>
      <Dialog.Description>
        Underlying triples for: 
        <code class="text-xs bg-muted px-1 py-0.5 rounded">
          {shortenIRI(iri)}
        </code>
        <span class="text-xs ml-1">({tripleCount} triples)</span>
      </Dialog.Description>
    </Dialog.Header>
    <ScrollArea class="h-[300px] w-full rounded-md border p-4">
      <pre class="text-xs font-mono whitespace-pre-wrap break-all">{triplesText}</pre>
    </ScrollArea>
  </Dialog.Content>
</Dialog.Root>

