<script lang="ts">
  /**
   * BlogNode - Custom node component for BlogPosting entities
   * 
   * Displays blog post content with title, date, description, tags, and full content dialog.
   * Uses RdfTriplesDialog for showing underlying RDF data.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";

  import { ChevronsRight } from "@lucide/svelte";

  import { marked } from 'marked';
  import ShapeSerializerDialog from './ShapeSerializerDialog.svelte';

  let { id, data, selected }: NodeProps = $props();

  // Get the IRI from node data (set by flow-mapper)
  const iri = (data as { iri?: string }).iri || id;
</script>

<div class="selectable rounded-xl ring-ring" class:ring-2={selected}>
  <Handle type="target" position={Position.Top} />
    <!-- TODO: we want to express linked data for SEO w/ RDFa and/or json-ld injection 
     An alternative approach would be to encode the desired semantics in shacl or owl that should be included in properties/attributes of the node data objects
     -->

  <Item.Root class="rounded-xl w-sm bg-background hover:shadow-foreground/8 hover:shadow-[0_0_8px_6px] transition-shadow duration-200">
    
    <Item.Header>
      <img
        src="https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?q=80&w=640&auto=format&fit=crop"
        alt="this is a test"
        class="w-full h-28 object-cover rounded-sm"
      />
    </Item.Header>

    <Item.Header>
      <Item.Content>
        <div class="flex items-center gap-2 mb-1">
          <Badge variant="secondary" class="text-xs font-mono">BlogPosting</Badge>
          <span class="text-xs text-muted-foreground">{data.date}</span>
        </div>
        <Item.Title class="py-1">{data.title}</Item.Title>
        <Item.Description>{data.description}</Item.Description>
      </Item.Content>
    </Item.Header>

    <Item.Actions>
      <!-- <ShapeSerializerDialog {pointer} iri={iri} /> -->

      <!-- Dialog to open the full blog post content -->
      <Dialog.Root>
        <Dialog.Trigger class={buttonVariants({ variant: "default", size: "sm" })}>
          <ChevronsRight class="h-4 w-4" />Read
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
          <!-- <ScrollArea class="h-[60vh] w-full"> this removes newlines from the markdown content -->
              {@html marked(data.content as string)}
          <!-- </ScrollArea> -->
        </Dialog.Content>
      </Dialog.Root>
      
    </Item.Actions>
  </Item.Root>

  <Handle type="source" position={Position.Right} />
  <Handle type="source" position={Position.Bottom} />
</div>
