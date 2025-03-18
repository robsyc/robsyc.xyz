<script lang="ts">
    import { onMount } from 'svelte';

  import { Handle, Position } from '@xyflow/svelte';

  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
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
    
    // Add keyboard event listener for Enter key
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        handleChevronClick();
      }
    };
    
    window.addEventListener('keydown', handleKeydown);
    
    // Clean up the event listener when component is destroyed
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
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
            <ScrollArea class="h-[72px] w-[240px] rounded-[0.2rem] border p-1 pl-2 pr-3 nodrag nowheel">
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
                            <Dialog.Root>
                                <Dialog.Trigger>
                                    <Button variant="ghost" size="icon" class="w-8 h-8 nodrag">
                                        <BotMessageSquare />
                                    </Button>
                                </Dialog.Trigger>
                                <Dialog.Content class="">
                                    <Dialog.Header>
                                        <Dialog.Title>Interact with Agent</Dialog.Title>
                                        <Dialog.Description>
                                            Down the line, this dialog will allow you to interact with the agent.
                                            Chat, or ask it to perform actions.
                                        </Dialog.Description>
                                    </Dialog.Header>
                                    <div class="py-4">
                                        <Textarea placeholder="Type your message here." class="w-full" />
                                    </div>
                                    <Dialog.Footer>
                                        <div class="flex gap-3 w-full">
                                            <Button variant="default" class="flex-1">Message</Button>
                                            <Button variant="secondary" class="flex-1">Action</Button>
                                        </div>
                                    </Dialog.Footer>
                                </Dialog.Content>
                            </Dialog.Root>
                        </Tooltip.Trigger>
                        <Tooltip.Content>
                            <p class="text-xs">Interact</p>
                        </Tooltip.Content>
                    </Tooltip.Root>
                </Tooltip.Provider>
                
                <Tooltip.Provider delayDuration={100} disableHoverableContent={true}>
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            <Button onclick={handleChevronClick} variant="ghost" size="icon" class="w-8 h-8 nodrag">
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
  
  <Handle type="source" position={Position.Bottom} />
</div>

<style>

</style> 