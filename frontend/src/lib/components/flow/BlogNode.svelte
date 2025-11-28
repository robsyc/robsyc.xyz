<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { DataFactory } from 'n3';
  let { id, data, selected }: NodeProps = $props();

  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

  import { ChevronsRight, Code2 } from "@lucide/svelte";

  import { marked } from 'marked'; // mdsvex?
  import { rdfStore } from '$lib/stores/rdf.svelte';
  import { shortenIRI } from '$lib/rdf/flow-mapper';

  const { namedNode } = DataFactory;

  // Get the IRI from node data (set by flow-mapper)
  const iri = (data as { iri?: string }).iri || id;
  
  // Reactive triples display
  // This is a kind of cheap approach;
  // Basically just gets all triples from store where this node id is the subject
  // no shacl, no sparql, no serialization; I think we way need a dedicated slot in the node data for all relevant triples
  // Could be interesting to add an infernece mode in this view to see that :me a :Primate
  let triplesText = $derived.by(() => {
    // Access version to trigger re-computation when store changes
    rdfStore.version;
    
    const quads = rdfStore.getQuads(namedNode(iri), null, null, null);
    if (quads.length === 0) {
      return 'No triples found for this resource.';
    }
    
    return quads.map(q => {
      const subject = shortenIRI(q.subject.value);
      const predicate = shortenIRI(q.predicate.value);
      let object: string;
      
      if (q.object.termType === 'Literal') {
        // Format literals with quotes
        const value = q.object.value.length > 100 
          ? q.object.value.substring(0, 100) + '...' 
          : q.object.value;
        object = `"${value}"`;
        if (q.object.language) {
          object += `@${q.object.language}`;
        } else if (q.object.datatype && !q.object.datatype.value.includes('string')) {
          object += `^^${shortenIRI(q.object.datatype.value)}`;
        }
      } else {
        object = shortenIRI(q.object.value);
      }
      
      return `${subject} ${predicate} ${object} .`;
    }).join('\n');
  });
</script>

<div class="selectable rounded-xl ring-ring" class:ring-2={selected}>
  <Handle type="target" position={Position.Top} />

  <Card.Root class="hover:shadow-foreground/8 hover:shadow-[0_0_8px_6px] transition-shadow duration-200 w-sm">

    <!-- TODO: we want to express linked data for SEO w/ RDFa and/or json-ld injection 
     An alternative approach would be to encode the desired semantics in shacl or owl that should be included in properties/attributes of the node data objects
     -->
    <Card.Header>
      <div class="flex justify-between items-center pb-2">
        <Card.Title>{data.title}</Card.Title>
        <span class="text-sm text-muted-foreground">{data.date}</span>
      </div>
      <Card.Description>{data.description}</Card.Description>
    </Card.Header>

    <Card.Content>
      <div class="flex gap-2 w-full">
        <!-- View Triples Button -->
        <Dialog.Root>
          <Dialog.Trigger class={buttonVariants({ variant: "outline", size: "sm" })}>
            <Code2 class="h-4 w-4" />RDF
          </Dialog.Trigger>
          <Dialog.Content class="sm:max-w-2xl">
            <Dialog.Header>
              <Dialog.Title>RDF Triples</Dialog.Title>
              <Dialog.Description>
                Underlying triples for: <code class="text-xs bg-muted px-1 py-0.5 rounded">
                  {shortenIRI(iri)}
                  {#if triplesText}
                    ({triplesText.split('\n').length} triples)
                  {:else}
                    (0 triples)
                  {/if}
                </code>
              </Dialog.Description>
            </Dialog.Header>
            <ScrollArea class="h-[300px] w-full rounded-md border p-4">
              <pre class="text-xs font-mono whitespace-pre-wrap break-all">
                {#if triplesText}
                  {triplesText}
                {:else}
                  No triples found for this resource.
                {/if}
              </pre>
            </ScrollArea>
          </Dialog.Content>
        </Dialog.Root>

        <!-- Open Content Button -->
        <Dialog.Root>
          <Dialog.Trigger class={buttonVariants({ variant: "default", size: "sm" })}>
            <ChevronsRight class="h-4 w-4" />Open
          </Dialog.Trigger>
          <Dialog.Content class="sm:max-w-2xl lg:max-w-5xl">
            <Dialog.Header>
              <Dialog.Title>{data.title}</Dialog.Title>
              <Dialog.Description>{data.description}</Dialog.Description>
              <div class="flex flex-wrap gap-2 items-center">
                {#each Array.isArray(data.tags) ? data.tags : [] as tag}
                  <Badge variant="outline">{tag}</Badge>
                {/each}
              </div>
            </Dialog.Header>
            {@html marked(data.content as string)}
          </Dialog.Content>
        </Dialog.Root>
      </div>
    </Card.Content>
  </Card.Root>

  <Handle type="source" position={Position.Right} />
  <Handle type="source" position={Position.Bottom} />
</div>
