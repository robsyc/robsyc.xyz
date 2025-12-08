<script lang="ts">
    /**
     * Home Page - Presentation Flow
     * 
     * Renders only UI-ready shapes (rxyz:UINodeShape) with matching custom
     * node components. This keeps the home view focused on the polished UX,
     * while /app handles the generic modeling view.
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

    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { quadsToFlowElements } from '$lib/rdf/flow-mapper-cf';
    
    // Custom node components for UI shapes
    import BlogNode from '$lib/components/flow/nodes/BlogNode.svelte';
    import NavigationNode from '$lib/components/flow/nodes/NavigationNode.svelte';
    import AgentNode from '$lib/components/flow/nodes/AgentNode.svelte';
    
    // Register only the custom components we want on the home view
    const nodeTypes = {
        blog: BlogNode,
        navigation: NavigationNode,
        agent: AgentNode,
    };

    // Only render nodes we have components for
    const allowedNodeTypes = new Set(Object.keys(nodeTypes));
   
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
    
    /**
     * Load additional graph content dynamically
     * Called when user clicks an action button in NavigationNode/AgentNode
     */
    async function loadGraph(graphName: 'home' | 'data' | 'shapes') {
        console.log(`[Home] Loading graph: ${graphName}`);
        isLoading = true;
        loadingMessage = 'Loading additional content...';
        
        try {
            // Load shapes first if loading data
            if (graphName === 'data') {
                await rdfStore.load({ url: '/graphs/shapes.ttl' });
            }
            
            await rdfStore.load({ url: `/graphs/${graphName}.ttl` });
            
            // Track current UI state for incremental update
            const existingNodeIds = new Set(nodes.map(n => n.id));
            const existingEdgeIds = new Set(edges.map(e => e.id));
            const existingPositions = new Map(nodes.map(n => [n.id, n.position]));
            
            // Build nodes/edges for new resources
            const elements = quadsToFlowElements(rdfStore, {
                existingNodeIds,
                existingEdgeIds,
                nodeTypeStrategy: 'custom',
                requireUINodeShape: true,
                allowedNodeTypes,
            });
            
            if (elements.nodes.length === 0 && elements.edges.length === 0) {
                console.log(`[Home] No new nodes/edges to add`);
                return;
            }
            
            // Inject callbacks and merge
            const newNodes = injectCallbacks(elements.nodes);
            const mergedNewNodes = newNodes.map(node => ({
                ...node,
                position: existingPositions.get(node.id) ?? node.position,
            }));
            
            nodes = [...nodes, ...mergedNewNodes];
            edges = [...edges, ...elements.edges];
            
            console.log(`[Home] Added ${mergedNewNodes.length} nodes, ${elements.edges.length} edges`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load additional content';
            console.error('[Home] Error loading graph:', e);
        } finally {
            isLoading = false;
        }
    }
    
    /**
     * Inject the loadGraph callback into navigation and agent node data
     * This allows these nodes to trigger dynamic loading
     * TODO: rather than loading a static graph, we want to make a parameterizable request to the backend e.g. request BlogNodeShape and matching data
     */
    function injectCallbacks(nodeList: Node[]): Node[] {
        return nodeList.map(node => {
            if (node.type === 'navigation' || node.type === 'agent') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        onLoadGraph: loadGraph,
                    },
                };
            }
            return node;
        });
    }
    
    // Load initial data on mount
    onMount(async () => {
        try {
            loadingMessage = 'Loading home...';
            await rdfStore.load({ url: '/graphs/home.ttl' });
            console.log('[Home] Loaded home graph');
            
            loadingMessage = 'Building visualization...';
            const elements = quadsToFlowElements(rdfStore, {
                nodeTypeStrategy: 'custom',
                requireUINodeShape: true,
                allowedNodeTypes,
            });
            
            nodes = injectCallbacks(elements.nodes);
            edges = elements.edges;
            
            console.log(`[Home] Created ${nodes.length} nodes and ${edges.length} edges`);
            
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load RDF data';
            console.error('[Home] Error loading RDF:', e);
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


