<script lang="ts">
    import { onMount } from 'svelte';

  import { Handle, Position } from '@xyflow/svelte';

  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { Textarea } from "$lib/components/ui/textarea/index.js";
  import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
  import { createTypewriter, LoadingDots } from '$lib/flow/components/utils/index';

  import { BotMessageSquare } from 'lucide-svelte';
  import { ChevronDown } from 'lucide-svelte';
  
  // Node component props
  export let data: {
    name: string;
    initials: string;
    avatarSrc?: string;
    message: string | string[];
  };
  export let selected: boolean = false;
  export let selectable: boolean = true;

  // Convert message to array if it's a string
  const messages = Array.isArray(data.message) ? data.message : [data.message];
  
  // Create typewriter effect
  const { typedText, isTyping, startTyping, typeNextMessage, currentLineIndex } = createTypewriter(messages);
  
  // Start typing the first message when component is mounted
  onMount(() => {
    if (messages.length > 0) {
      // Add a 1 second delay before starting the typewriter effect
      setTimeout(() => {
        startTyping();
      }, 2500);
    }
  });
  
  // Handle chevron click to progress to the next message
  function handleChevronClick() {
    if (!$isTyping) {
      typeNextMessage();
    }
  }
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

        <div class="flex gap-2 items-center">
            <ScrollArea class="h-[70px] w-[240px] rounded-[0.2rem] border p-1 pl-2 pr-3 nodrag nowheel">
                <div class="text-left">
                    {#if $typedText.length > 0}
                        <p class="whitespace-pre-line">{$typedText[$currentLineIndex]}</p>
                    {:else}
                        <p class="text-muted-foreground italic">
                            Loading<LoadingDots />
                        </p>
                    {/if}
                </div>
            </ScrollArea>
            <div class="flex flex-col gap-2">
                <Tooltip.Provider delayDuration={100} disableHoverableContent={true}>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Popover.Root>
                                <Popover.Trigger>
                                    <Button variant="ghost" size="icon" class="w-8 h-8">
                                        <BotMessageSquare />
                                    </Button>
                                </Popover.Trigger>
                                <Popover.Content class="w-[440px] p-4 space-y-3">
                                    <p class="text-sm text-muted-foreground">
                                        Down the line, this popover will contain an input field for the user to respond to the agent.
                                        As well as some default actions.
                                    </p>
                                    <Textarea placeholder="Type your message here." class="min-h-[100px]" />
                                </Popover.Content>
                            </Popover.Root>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p class="text-xs">Interact</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
                
                <Tooltip.Provider delayDuration={100} disableHoverableContent={true}>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button onclick={handleChevronClick} variant="ghost" size="icon" class="w-8 h-8">
                                <ChevronDown class="{$isTyping ? '' : ($currentLineIndex < messages.length - 1 ? 'animate-bounce' : '')}" />
                            </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p class="text-xs">Continue</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
            </div>
        </div>
    </div>
  
  <Handle type="source" position={Position.Right} />
</div>

<style>

</style> 