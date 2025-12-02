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
    
    // Node components - all use GraphPointer for data access
    import BlogNode from '$lib/components/flow/BlogNode.svelte';
    import ShapeNode from '$lib/components/flow/ShapeNode.svelte';
    import NavigationNode from '$lib/components/flow/NavigationNode.svelte';
    import AgentNode from '$lib/components/flow/AgentNode.svelte';
    
    // Register node types - 'shape' as generic fallback
    const nodeTypes = {
        shape: ShapeNode,
        blog: BlogNode,
        navigation: NavigationNode,
        agent: AgentNode,
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
    
    /**
     * Load additional graph content dynamically
     * Called when user clicks an action button in NavigationNode/AgentNode
     */
    async function loadGraph(graphName: 'home' | 'data' | 'shapes') {
        console.log(`[App] Loading graph: ${graphName}`);
        isLoading = true;
        loadingMessage = 'Loading additional content...';
        
        try {
            // Load shapes first if loading data
            if (graphName === 'data') {
                await rdfStore.loadFromUrl('/graphs/shapes.ttl');
            }
            
            await rdfStore.loadFromUrl(`/graphs/${graphName}.ttl`);
            
            // Track current UI state for incremental update
            const existingNodeIds = new Set(nodes.map(n => n.id));
            const existingEdgeIds = new Set(edges.map(e => e.id));
            const existingPositions = new Map(nodes.map(n => [n.id, n.position]));
            
            // Build nodes/edges for new resources
            const elements = quadsToFlowElements(rdfStore, {
                existingNodeIds,
                existingEdgeIds,
            });
            
            if (elements.nodes.length === 0 && elements.edges.length === 0) {
                console.log(`[App] No new nodes/edges to add`);
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
            
            console.log(`[App] Added ${mergedNewNodes.length} nodes, ${elements.edges.length} edges`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load additional content';
            console.error('[App] Error loading graph:', e);
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
            await rdfStore.loadFromUrl('/graphs/home.ttl');
            console.log('[App] Loaded home graph');
            
            loadingMessage = 'Building visualization...';
            const elements = quadsToFlowElements(rdfStore);
            
            nodes = injectCallbacks(elements.nodes);
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
