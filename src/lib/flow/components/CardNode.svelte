<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  // Props passed from SvelteFlow
  export let data: {
    label: string;
    description?: string;
  };
  export let selected: boolean = false;
  export let selectable: boolean = true;
  
  // Svelte Flow passes many props we don't use - this prevents warnings
  $$restProps;
</script>

<div class="svelte-flow__node-default {selected ? 'selected' : ''} {selectable ? 'selectable' : ''}">
  <Handle type="source" position={Position.Top} />

  <div>
    <div class="label">{data.label}</div>
    {#if data.description}
      <div class="description">{data.description}</div>
    {/if}
  </div>
  
  <Handle type="target" position={Position.Bottom} />
</div>

<style>  

</style> 