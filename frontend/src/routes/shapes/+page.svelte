<script lang="ts">
    /**
     * Main App Page - Knowledge Graph Visualization
     * 
     * Uses SvelteFlow to display an interactive RDF graph with:
     * - Clownface-powered node components for RDF data access
     * - SHACL shape-driven node type mapping
     * - Dynamic graph loading via action buttons
     */
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

    // RDF store and Clownface-powered mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { quadsToFlowElements } from '$lib/rdf/flow-mapper-cf';
    
    // Node components - modeling view uses generic ShapeNode
    // TODO: down the line we could add more than just ShapeNode
    // ShapeNode is for declarative modeling
    // for procedural logic and workflows we should add distinct node types (~n8n)
    import ShapeNode from '$lib/components/flow/nodes/ShapeNode.svelte';
    
    // Register node types - modeling view always uses generic ShapeNode
    const nodeTypes = {
        shape: ShapeNode,
    };
   
    // State
    let isLoading = $state(true);
    let loadingMessage = $state('Initializing...');
    let error = $state<string | null>(null);
    
    // Using $state.raw so SvelteFlow can update positions
    let nodes = $state.raw<Node[]>([]);
    let edges = $state.raw<Edge[]>([]);
    
    // Derive SvelteFlow color mode from mode-watcher
    const colorMode = $derived.by(() => {
        const m = mode.current;
        if (m === 'dark') return 'dark';
        if (m === 'light') return 'light';
        return 'system';
    });
    
    // Load initial data on mount
    onMount(async () => {
        try {
            loadingMessage = 'Loading home...';
            await rdfStore.load({ url: '/graphs/home.ttl' });
            console.log('[App] Loaded home graph');
            
            loadingMessage = 'Building visualization...';
            const elements = quadsToFlowElements(rdfStore, {
                nodeTypeStrategy: 'generic',
            });
            
            nodes = elements.nodes;
            edges = elements.edges;
            
            console.log(`[App] Created ${nodes.length} nodes and ${edges.length} edges`);
            
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load RDF data';
            console.error('[App] Error loading RDF:', e);
        } finally {
            isLoading = false;
        }
    });
    
    function handleNodeClick(event: { node: Node }) {
        console.log('Node clicked:', event.node.id, event.node.type);
    }
</script>

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
