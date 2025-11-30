<script lang="ts">
  /**
   * AgentNode - Agent Node Component
   * 
   * Displays an agent avatar with a speech bubble containing a message.
   * The message text is displayed with a typing animation effect.
   * Action buttons (Blog, About, Ask) are shown below the message.
   * 
   * Code is a bit messy, should extend this and simplify where possible
   */
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  
  import * as Item from "$lib/components/ui/item/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";

  import { MessageCircle, Bot, Send } from "@lucide/svelte";

  import { rdfStore } from '$lib/stores/rdf.svelte';
  import { getLocalName } from '$lib/rdf/utils';
  import { PREFIXES } from '$lib/rdf/namespaces';
  import type { ShapeNodeData } from '$lib/rdf/flow-mapper';

  /** Extended data interface with the onLoadGraph callback */
  interface AgentNodeData extends ShapeNodeData {
    onLoadGraph?: (graphName: 'home' | 'data' | 'shapes') => void;
  }

  let { id, data, selected }: NodeProps = $props();
  
  // Cast to our extended data type
  const nodeData = data as unknown as AgentNodeData;
  
  // Extract the callback from data (injected by +page.svelte)
  const onLoadGraph = nodeData.onLoadGraph;
  
  // Get agent properties
  const name = $derived(nodeData.properties?.['name']?.value ?? 'Agent');
  const description = $derived(nodeData.properties?.['description']?.value ?? '');
  const imageUrl = $derived(nodeData.properties?.['image']?.value ?? '');
  
  // Get message text from the inverse path property (^sender)
  // The property is stored with local name "^sender" because it's an inverse path
  const messageIRIs = $derived(nodeData.properties?.['^sender']?.values ?? []);
  
  // Resolve message content from the RDF store
  // We need to look up the schema:text property of the message
  const messageData = $derived.by(() => {
    if (messageIRIs.length === 0) return null;
    
    const messageIRI = messageIRIs[0];
    const textPredicate = `${PREFIXES.schema}text`;
    const actionPredicate = `${PREFIXES.schema}potentialAction`;
    
    // Get message text
    const textTerm = rdfStore.getValue(messageIRI, textPredicate);
    const text = textTerm?.value ?? '';
    
    // Get message actions
    const actionTerms = rdfStore.getValues(messageIRI, actionPredicate);
    const actions = actionTerms.map(term => {
      const actionIRI = term.value;
      const nameTerm = rdfStore.getValue(actionIRI, `${PREFIXES.schema}name`);
      const targetTerm = rdfStore.getValue(actionIRI, `${PREFIXES.schema}target`);
      const localName = getLocalName(actionIRI);
      
      return {
        iri: actionIRI,
        label: nameTerm?.value ?? localName.replace(/^Search/, '').replace(/Action$/, ''),
        target: targetTerm?.value ?? '',
        isAskAction: localName.includes('Ask'),
      };
    });
    
    return { text, actions };
  });
  
  // Typing animation state
  let displayedCharCount = $state(0);
  let isTypingComplete = $state(false);
  
  // The full message text
  const fullText = $derived(messageData?.text ?? '');
  
  // The currently displayed (typed) portion of the message
  const displayedText = $derived(fullText.slice(0, displayedCharCount));
  
  // Typing animation effect
  $effect(() => {
    // Reset when message changes
    displayedCharCount = 0;
    isTypingComplete = false;
    
    const textLength = fullText.length;
    if (textLength === 0) {
      isTypingComplete = true;
      return;
    }
    
    // Typing speed: characters per interval
    const charsPerTick = 1;
    const intervalMs = 60;
    
    const interval = setInterval(() => {
      displayedCharCount += charsPerTick;
      
      if (displayedCharCount >= textLength) {
        displayedCharCount = textLength;
        isTypingComplete = true;
        clearInterval(interval);
      }
    }, intervalMs);
    
    // Cleanup on effect re-run or component destruction
    return () => clearInterval(interval);
  });
  
  // Ask dialog state
  let askDialogOpen = $state(false);
  let userQuestion = $state('');
  
  /**
   * Handle action button click
   * For Blog/About: logs the action to console
   * For Ask: opens the ask dialog
   */
  function handleActionClick(action: { iri: string; label: string; target: string; isAskAction: boolean }) {
    if (action.isAskAction) {
      askDialogOpen = true;
    } else {
      console.log(`[AgentNode] Action clicked: ${action.label}`);
      console.log(`[AgentNode] Action IRI: ${action.iri}`);
      console.log(`[AgentNode] Target: ${action.target}`);
    }
  }
  
  /**
   * Handle sending a question (placeholder for future implementation)
   */
  function handleSendQuestion() {
    console.log(`[AgentNode] User question: ${userQuestion}`);
    console.log('[AgentNode] Ask action triggered - backend integration pending');
    askDialogOpen = false;
    userQuestion = '';
  }
</script>

<div class="selectable">
  <Handle type="target" position={Position.Top} />

  <div class="flex items-start gap-3">
    <!-- Avatar -->
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
      <!-- Online indicator -->
      <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
    </div>

    <!-- Speech bubble with message -->
    <div class="relative max-w-sm">
      <!-- Speech bubble tail -->
      <div class="absolute -left-2 top-4 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-r-8 border-r-background"></div>
      
      <Item.Root class="rounded-2xl bg-background border border-border/50 shadow-md w-sm">
        <!-- <Item.Header class="pb-2">
          <Item.Content>
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold text-sm">{name}</span>
              <Badge variant="secondary" class="text-xs">
                <MessageCircle class="w-3 h-3 mr-1" />
                {nodeData.targetLocalName ?? 'Agent'}
              </Badge>
            </div>
          </Item.Content>
        </Item.Header> -->

        {#if messageData}
          <Item.Content class="pt-0">
            <!-- Message text with typing effect
             TODO: should use scroll area here to keep height of the message container constant
            -->
            <p class="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {displayedText}{#if !isTypingComplete}<span class="animate-pulse">▌</span>{/if}
            </p>
          </Item.Content>

          <!-- Action buttons (shown after typing completes)
           TODO: this should appear below the message bubble, not within it; and animate in/out
          -->
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

<!-- Ask Dialog
TODO: this should be more like a full fledged chat interface with a history of messages
-->
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
        Backend integration pending. This will be connected to an ML workflow.
      </p>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

