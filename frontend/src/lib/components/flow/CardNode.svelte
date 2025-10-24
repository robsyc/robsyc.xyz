<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import * as Card from "$lib/components/ui/card/index.js";

  let { id, data, selected }: NodeProps = $props();
</script>

<div class="selectable rounded-xl ring-foreground/50" class:ring-2={selected}>
  <Handle
      type="target"
      position={Position.Top}
  />

  <Card.Root class="hover:shadow-foreground/5 hover:shadow-[0_0_6px_4px] transition-shadow duration-200">
    <Card.Header>
      <Card.Title>{data.title}</Card.Title>
      <Card.Description>{data.description}</Card.Description>
    </Card.Header>
    <Card.Content>
      <p>{data.content}</p>
    </Card.Content>
  </Card.Root>

  <Handle
      type="source"
      position={Position.Bottom}
  />
</div>