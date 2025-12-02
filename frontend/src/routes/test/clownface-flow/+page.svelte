<script lang="ts">
    /**
     * Clownface Flow Test Page
     * 
     * Demonstrates the Clownface-powered flow visualization with
     * GraphPointer-based node components and subgraph export.
     */
    import { mode } from 'mode-watcher';
    import { onMount } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
    } from '@xyflow/svelte';
    import type { Node, Edge } from '@xyflow/svelte';

    // RDF store
    import { rdfStore } from '$lib/stores/rdf.svelte';
    
    // Flow mapper with Clownface pointers
    import { quadsToFlowElements, serializeSelectedNodes, type ClownfaceNodeData } from '$lib/rdf/flow-mapper-cf';
    
    // Node components - all use GraphPointer for data access
    import AgentNode from '$lib/components/flow/AgentNode.svelte';
    import ShapeNode from '$lib/components/flow/ShapeNode.svelte';
    import NavigationNode from '$lib/components/flow/NavigationNode.svelte';
    
    // UI components
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    
    // Register node types - matches NODE_TYPE_MAP in flow-mapper-cf.ts
    const nodeTypes = {
        shape: ShapeNode,
        agent: AgentNode,
        navigation: NavigationNode,
    };
   
    // State
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    
    let nodes = $state.raw<Node[]>([]);
    let edges = $state.raw<Edge[]>([]);
    
    // Selection state for subgraph extraction demo
    let selectedNodeIds = $state<Set<string>>(new Set());
    let exportDialogOpen = $state(false);
    let exportedTurtle = $state('');
    
    const colorMode = $derived.by(() => {
        const m = mode.current;
        if (m === 'dark') return 'dark';
        if (m === 'light') return 'light';
        return 'system';
    });
    
    function injectCallbacks(nodeList: Node[]): Node[] {
        return nodeList.map(node => {
            if (node.type === 'navigation' || node.type === 'agent') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        onLoadGraph: () => console.log('[TestPage] Load graph called'),
                    },
                };
            }
            return node;
        });
    }
    
    function handleNodeClick(event: { node: Node }) {
        const nodeId = event.node.id;
        
        const newSelection = new Set(selectedNodeIds);
        if (newSelection.has(nodeId)) {
            newSelection.delete(nodeId);
        } else {
            newSelection.add(nodeId);
        }
        selectedNodeIds = newSelection;
        
        console.log(`[TestPage] Selected nodes: ${Array.from(newSelection).join(', ')}`);
    }
    
    function handleExportSelected() {
        const selectedNodes = nodes.filter(n => selectedNodeIds.has(n.id));
        const nodeData = selectedNodes.map(n => n.data as unknown as ClownfaceNodeData);
        
        try {
            exportedTurtle = serializeSelectedNodes(nodeData, 'turtle');
            exportDialogOpen = true;
        } catch (e) {
            console.error('Export error:', e);
            exportedTurtle = `Error: ${e instanceof Error ? e.message : 'Unknown error'}`;
            exportDialogOpen = true;
        }
    }
    
    onMount(async () => {
        try {
            await rdfStore.loadFromUrl('/graphs/home.ttl');
            console.log('[TestPage] Loaded home.ttl');
            
            const elements = quadsToFlowElements(rdfStore);
            
            nodes = injectCallbacks(elements.nodes);
            edges = elements.edges;
            
            console.log(`[TestPage] Created ${nodes.length} nodes and ${edges.length} edges`);
            
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load';
            console.error('[TestPage] Error:', e);
        } finally {
            isLoading = false;
        }
    });
    
    const selectedCount = $derived(selectedNodeIds.size);
</script>

<div class="relative w-full h-full">
    <div class="absolute top-4 left-4 z-10 flex gap-2 items-center">
        <div class="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border">
            <span class="text-sm font-medium">Clownface Flow Test</span>
            <span class="text-xs text-muted-foreground ml-2">
                {nodes.length} nodes, {edges.length} edges
            </span>
        </div>
        
        {#if selectedCount > 0}
            <Button 
                size="sm" 
                variant="secondary"
                onclick={handleExportSelected}
            >
                Export {selectedCount} Selected
            </Button>
        {/if}
    </div>

    <SvelteFlow
        bind:nodes
        bind:edges
        fitView
        colorMode={colorMode}
        {nodeTypes}
        onnodeclick={handleNodeClick}
        proOptions={{ hideAttribution: true }}
    >
        <Controls />
        <Background 
            bgColor="var(--accent)"
            variant={BackgroundVariant.Dots} 
        />
    </SvelteFlow>
    
    {#if isLoading}
        <div class="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                <p class="text-muted-foreground text-sm">Loading...</p>
            </div>
        </div>
    {/if}
    
    {#if error}
        <div class="absolute inset-0 bg-background/90 flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3 max-w-md text-center p-6">
                <div class="rounded-full h-12 w-12 bg-destructive/20 flex items-center justify-center">
                    <span class="text-destructive text-xl">!</span>
                </div>
                <p class="text-destructive font-medium">Failed to load</p>
                <p class="text-muted-foreground text-sm">{error}</p>
            </div>
        </div>
    {/if}
</div>

<Dialog.Root bind:open={exportDialogOpen}>
    <Dialog.Content class="sm:max-w-2xl">
        <Dialog.Header>
            <Dialog.Title>Exported Subgraph (Turtle)</Dialog.Title>
            <Dialog.Description>
                RDF triples for {selectedCount} selected node(s)
            </Dialog.Description>
        </Dialog.Header>
        
        <ScrollArea class="h-[400px] w-full">
            <pre class="text-xs font-mono bg-muted p-4 rounded-md whitespace-pre-wrap">{exportedTurtle}</pre>
        </ScrollArea>
        
        <Dialog.Footer>
            <Button 
                variant="outline" 
                onclick={() => navigator.clipboard.writeText(exportedTurtle)}
            >
                Copy to Clipboard
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
