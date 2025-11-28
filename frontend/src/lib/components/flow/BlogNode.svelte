<script lang="ts">
  /**
   * BlogNode - Custom node component for BlogPosting entities
   * 
   * Displays blog post content with title, date, description, tags, and full content dialog.
   * Uses RdfTriplesDialog for showing underlying RDF data.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  let { id, data, selected }: NodeProps = $props();

  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";

  import { ChevronsRight } from "@lucide/svelte";

  import { marked } from 'marked';
  import RdfTriplesDialog from './RdfTriplesDialog.svelte';

  // Get the IRI from node data (set by flow-mapper)
  const iri = (data as { iri?: string }).iri || id;
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
        <RdfTriplesDialog {iri} />

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
                {#each Array.isArray(data.tags) ? data.tags : [] as tag (tag)}
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
