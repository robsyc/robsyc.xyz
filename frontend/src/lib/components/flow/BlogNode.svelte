<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  let { id, data, selected }: NodeProps = $props();

  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";

  import { ChevronsRight, SmilePlus, MessageCircle } from "@lucide/svelte";

  import { marked } from 'marked'
  // mdsvex might be more rich but let's see how far we can get with marked
  
</script>

<div class="selectable rounded-xl ring-ring" class:ring-2={selected}>
  <Handle type="target" position={Position.Top} />

  <Card.Root class="hover:shadow-foreground/8 hover:shadow-[0_0_8px_6px] transition-shadow duration-200 w-sm">

    <Card.Header>
      <div class="flex justify-between items-center pb-2">
        <Card.Title>{data.title}</Card.Title>
        <span class="text-sm text-muted-foreground">{data.date}</span>
      </div>
      <Card.Description>{data.description}</Card.Description>
    </Card.Header>

    <Card.Content>
      <div class="flex justify-between w-full">
        <!-- <Button disabled variant="outline" size="sm">
          <SmilePlus />React
          TODO: Popover with reactions 
        </Button>
        <Button disabled variant="outline" size="sm">
          <MessageCircle />Comment
          TODO: Dialog with form 
        </Button> -->
        <Dialog.Root>
          <Dialog.Trigger class={buttonVariants({ variant: "default", size: "sm" })}>
            <ChevronsRight />Open
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