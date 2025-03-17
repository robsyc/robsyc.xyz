<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  
  // Props passed from SvelteFlow
  export let data: {
    name: string;
    initials: string;
    avatarSrc?: string;
    message: string;
  };
  export let selected: boolean = false;
  export let selectable: boolean = true;
  
  // Svelte Flow passes many props we don't use - this prevents warnings
  $$restProps;
</script>

<div 
    class="svelte-flow__node-default {selected ? 'selected' : ''} {selectable ? 'selectable' : ''}" 
    style="min-width: 320px; width: auto;">
    <div class="flex space-x-6">
        <div class="flex flex-col items-center justify-center shrink-0 gap-2 pl-2">
            <Avatar.Root>
                <Avatar.Image src={data.avatarSrc || "/assets/pf.jpg"} alt={data.name} />
                <Avatar.Fallback>{data.initials}</Avatar.Fallback>
            </Avatar.Root>
            <div class="font-mono text-xs">{data.name}</div>
        </div>

        <div class="flex flex-col gap-2">
            <ScrollArea class="h-[60px] w-[240px] rounded-sm border px-1 pr-3 nodrag nowheel">
            {data.message}
            </ScrollArea>
            <div class="flex gap-2 w-full">
                <Button variant="default" size="sm" class="flex-1 h-5 py-0">
                    <p class="text-xs">Yes</p>
                </Button>
                <Button variant="secondary" size="sm" class="flex-1 h-5 py-0">
                    <p class="text-xs">No</p>
                </Button>
            </div>
        </div>
    </div>
  
  <Handle type="source" position={Position.Right} />
</div>

<style>

</style> 