<script lang="ts">
  /**
   * AgentNode - Clownface-Powered Agent Node Component
   * 
   * Displays an AI agent with its messages and action buttons.
   * Uses Clownface GraphPointers for all RDF data access.
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  import { Bot, Send } from "@lucide/svelte";

  import { ns } from '$lib/rdf/clownface-store';
  import type { GraphPointer } from '$lib/rdf/clownface-store';
  import type { Term } from '@rdfjs/types';
  import type { Store } from 'n3';
  import { getLocalName } from '$lib/rdf/utils';

  interface AgentNodeData {
    pointer: GraphPointer<Term, Store>;
    onLoadGraph?: (graphName: 'home' | 'data' | 'shapes') => void;
  }

  let { id, data, selected }: NodeProps = $props();
  
  const nodeData = data as unknown as AgentNodeData;
  const agentPointer = $derived(nodeData.pointer);
  const onLoadGraph = nodeData.onLoadGraph;
  
  // Property access via Clownface traversal
  const name = $derived(
    agentPointer?.out(ns.schema('name'))?.value ?? 'Agent'
  );
  
  const description = $derived(
    agentPointer?.out(ns.schema('description'))?.value ?? ''
  );
  
  const imageUrl = $derived(
    agentPointer?.out(ns.schema('image'))?.value ?? ''
  );
  
  // Messages via inverse path
  const messagePointers = $derived.by(() => {
    if (!agentPointer?.term) return [];
    return agentPointer.in(ns.schema('sender')).toArray();
  });
  
  const messageData = $derived.by(() => {
    if (messagePointers.length === 0) return null;
    
    const messagePtr = messagePointers[0];
    const text = messagePtr.out(ns.schema('text')).value ?? '';
    const actionPointers = messagePtr.out(ns.schema('potentialAction')).toArray();
    
    const actions = actionPointers.map((actionPtr: (typeof actionPointers)[number]) => {
      const actionIRI = actionPtr.term?.value ?? '';
      const label = actionPtr.out(ns.schema('name')).value ?? '';
      const target = actionPtr.out(ns.schema('target')).value ?? '';
      const localName = getLocalName(actionIRI);
      
      return {
        iri: actionIRI,
        label: label || localName.replace(/^Search/, '').replace(/Action$/, ''),
        target,
        isAskAction: localName.includes('Ask'),
        pointer: actionPtr,
      };
    });
    
    return { text, actions, messagePtr };
  });
  
  // Typing animation
  let displayedCharCount = $state(0);
  let isTypingComplete = $state(false);
  
  const fullText = $derived(messageData?.text ?? '');
  const displayedText = $derived(fullText.slice(0, displayedCharCount));
  
  $effect(() => {
    displayedCharCount = 0;
    isTypingComplete = false;
    
    const textLength = fullText.length;
    if (textLength === 0) {
      isTypingComplete = true;
      return;
    }
    
    const interval = setInterval(() => {
      displayedCharCount += 1;
      if (displayedCharCount >= textLength) {
        displayedCharCount = textLength;
        isTypingComplete = true;
        clearInterval(interval);
      }
    }, 60);
    
    return () => clearInterval(interval);
  });
  
  // Dialog state
  let askDialogOpen = $state(false);
  let userQuestion = $state('');
  
  function handleActionClick(action: { iri: string; label: string; target: string; isAskAction: boolean }) {
    if (action.isAskAction) {
      askDialogOpen = true;
    } else {
      console.log(`[AgentNode] Action clicked: ${action.label}, target: ${action.target}`);
      if (onLoadGraph && action.target.includes('Blog')) {
        onLoadGraph('data');
      }
    }
  }
  
  function handleSendQuestion() {
    console.log(`[AgentNode] User question: ${userQuestion}`);
    askDialogOpen = false;
    userQuestion = '';
  }
</script>

<div class="selectable">
  <Handle type="target" position={Position.Top} />

  <div class="flex items-start gap-3">
    <div class="relative shrink-0">
      {#if imageUrl}
        <img 
          src={imageUrl} 
          alt={name}
          class="w-14 h-14 rounded-full border-2 border-primary/30 shadow-lg"
        />
      {:else}
        <div class="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
          <Bot class="w-7 h-7 text-primary" />
        </div>
      {/if}
      <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
    </div>

    <div class="relative max-w-sm">
      <div class="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-background"></div>
      
      <Item.Root class="rounded-2xl bg-background border border-border/50 shadow-md w-sm">
        <Item.Header class="pb-1">
          <Item.Content>
            <span class="font-semibold text-sm">{name}</span>
          </Item.Content>
        </Item.Header>

        {#if messageData}
          <Item.Content class="pt-0">
            <p class="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {displayedText}{#if !isTypingComplete}<span class="animate-pulse">▌</span>{/if}
            </p>
          </Item.Content>

          {#if isTypingComplete && messageData.actions.length > 0}
            <Separator />
            <Item.Content class="pt-0 pb-3">
              <div class="flex flex-wrap gap-2">
                {#each messageData.actions as action (action.iri)}
                  <Button 
                    variant={action.isAskAction ? "default" : "outline"}
                    size="sm"
                    onclick={() => handleActionClick(action)}
                  >
                    {action.label}
                  </Button>
                {/each}
              </div>
            </Item.Content>
          {/if}
        {:else}
          <Item.Content>
            <p class="text-sm text-muted-foreground italic">
              {description || 'Loading message...'}
            </p>
          </Item.Content>
        {/if}
      </Item.Root>
    </div>
  </div>

  <Handle type="source" position={Position.Right} />
  <Handle type="source" position={Position.Bottom} />
</div>

<Dialog.Root bind:open={askDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Ask {name}</Dialog.Title>
      <Dialog.Description>
        Type your question and the agent will respond.
      </Dialog.Description>
    </Dialog.Header>
    
    <div class="flex items-center gap-2">
      <input
        type="text"
        placeholder="What would you like to know?"
        class="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        bind:value={userQuestion}
        onkeydown={(e) => e.key === 'Enter' && handleSendQuestion()}
      />
      <Button size="sm" onclick={handleSendQuestion} disabled={!userQuestion.trim()}>
        <Send class="w-4 h-4" />
      </Button>
    </div>
    
    <Dialog.Footer>
      <p class="text-xs text-muted-foreground">
        Backend integration pending.
      </p>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
