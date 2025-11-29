<script lang="ts">
    import { mode } from 'mode-watcher';
    import { onMount } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        // MiniMap,
    } from '@xyflow/svelte';
    import type { Node, Edge } from '@xyflow/svelte';
    // import { initialNodes, initialEdges } from '$lib/flow-data';

    // RDF store and mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { quadsToFlowElements } from '$lib/rdf/flow-mapper';
    import type { ShapeRegistry } from '$lib/rdf/shacl-parser';
    
    // Import our custom node types and other components
    import BlogNode from '$lib/components/flow/BlogNode.svelte';
    import ShapeNode from '$lib/components/flow/ShapeNode.svelte';
    import { Spinner } from "$lib/components/ui/spinner/index.js";
    
    // Register node types - 'blog' for BlogPosting, 'shape' as generic fallback
    const nodeTypes = {
        blog: BlogNode,
        shape: ShapeNode,
    };
   
    // Loading state
    let isLoading = $state(true);
    let loadingMessage = $state('Initializing...');
    let error = $state<string | null>(null);
    
    // Shape registry for debugging/inspection
    let shapeRegistry = $state<ShapeRegistry | null>(null);
    
    // Using $state.raw for the nodes and edges so Svelte Flow can update their positions
    let nodes = $state.raw<Node[]>([]);
    let edges = $state.raw<Edge[]>([]);
    
    // Derive SvelteFlow color mode from mode-watcher (Svelte 5 runes)
    const colorMode = $derived.by(() => {
        const m = mode.current;
        if (m === 'dark') return 'dark';
        if (m === 'light') return 'light';
        return 'system';
    });
    
    // Load RDF data on mount
    // Question: is this pre-rendered by SvelteKit?
    // What are alternatives and how do those behave? e.g. click to load, lazy, ...
    // TODO: we should not just add triples onMount, but also have a way to load from link/action
    onMount(async () => {
        try {
            // Step 1: Load SHACL shapes first (defines what we can visualize)
            loadingMessage = 'Loading shape definitions...';
            await rdfStore.loadFromUrl('/graphs/shapes.ttl');
            console.log('[App] Loaded shapes.ttl');
            
            // Step 2: Load instance data
            loadingMessage = 'Loading knowledge graph data...';
            await rdfStore.loadFromUrl('/graphs/data.ttl');
            console.log('[App] Loaded data.ttl');
            
            // Step 3: Convert RDF to SvelteFlow elements using shape-driven mapping
            loadingMessage = 'Building visualization...';
            const elements = quadsToFlowElements(rdfStore);
            nodes = elements.nodes;
            edges = elements.edges;
            shapeRegistry = elements.shapeRegistry;
            
            console.log(`[App] Created ${nodes.length} nodes and ${edges.length} edges from ${shapeRegistry.size} shapes`);
            
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load RDF data';
            console.error('[App] Error loading RDF:', e);
        } finally {
            isLoading = false;
        }
    });
    
    // Event handlers
    function handleNodeClick(event: { node: Node }) {
        console.log('Node clicked:', event.node.id, event.node.type);
    }
</script>

<!-- Always show SvelteFlow, overlay loading state on top -->
<div class="relative w-full h-full">
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
        <!-- MiniMap -->
    </SvelteFlow>
    
    <!-- TODO: rather than complete screen overlay, we should show the canvas without nodes, with first nodes, edge, more nodes, ... lazy loading -->
    <!-- Loading overlay -->
    {#if isLoading}
        <div class="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3">
                <Spinner class="size-8" />
                <p class="text-muted-foreground text-sm">{loadingMessage}</p>
            </div>
        </div>
    {/if}
    
    <!-- Error overlay -->
    {#if error}
        <div class="absolute inset-0 bg-background/90 flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3 max-w-md text-center p-6">
                <div class="rounded-full h-12 w-12 bg-destructive/20 flex items-center justify-center">
                    <span class="text-destructive text-xl">!</span>
                </div>
                <p class="text-destructive font-medium">Failed to load knowledge graph</p>
                <p class="text-muted-foreground text-sm">{error}</p>
                <button 
                    class="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
                    onclick={() => window.location.reload()}
                >
                    Retry
                </button>
            </div>
        </div>
    {/if}
</div>
