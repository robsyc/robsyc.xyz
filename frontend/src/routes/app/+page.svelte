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

    // RDF store and mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { quadsToFlowElements } from '$lib/rdf/flow-mapper';
    import type { ShapeRegistry } from '$lib/rdf/shacl-parser';
    
    // Import our custom node types and other components
    import BlogNode from '$lib/components/flow/BlogNode.svelte';
    import ShapeNode from '$lib/components/flow/ShapeNode.svelte';
    import NavigationNode from '$lib/components/flow/NavigationNode.svelte';
    import { Spinner } from "$lib/components/ui/spinner/index.js";
    
    // Register node types - 'shape' as generic fallback
    const nodeTypes = {
        shape: ShapeNode,
        blog: BlogNode,
        navigation: NavigationNode,
    };
   
    // Loading state
    let isLoading = $state(true);
    let loadingMessage = $state('Initializing...');
    let error = $state<string | null>(null);
    
    // Shape registry for on-demand node creation
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
    
    /**
     * Map from part IRI to the graph file that should be loaded
     * For now, this is a simple mapping; in the future, this could be
     * fetched from the backend or derived from the RDF data itself
     */
    const PART_TO_GRAPH: Record<string, string> = {
        'http://rosyc.xyz#MyBlog': '/graphs/data.ttl',
    };
    
    /**
     * Load additional graph content dynamically
     * Called when user clicks a hasPart button in NavigationNode
     */
    async function loadGraph(partIRI: string) {
        const graphUrl = PART_TO_GRAPH[partIRI];
        if (!graphUrl) {
            console.warn(`[App] No graph mapping found for: ${partIRI}`);
            return;
        }
        
        console.log(`[App] Loading graph for ${partIRI}: ${graphUrl}`);
        isLoading = true;
        loadingMessage = 'Loading additional content...';
        
        try {
            // Load shapes first if not already loaded
            await rdfStore.loadFromUrl('/graphs/shapes.ttl');
            
            // Load the requested graph data
            await rdfStore.loadFromUrl(graphUrl);
            
            // Rebuild flow elements with all loaded data
            const elements = quadsToFlowElements(rdfStore);
            
            // Re-inject callbacks for navigation nodes after rebuilding
            nodes = injectCallbacks(elements.nodes);
            edges = elements.edges;
            shapeRegistry = elements.shapeRegistry;
            
            console.log(`[App] Graph loaded. Now have ${nodes.length} nodes and ${edges.length} edges`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load additional content';
            console.error('[App] Error loading graph:', e);
        } finally {
            isLoading = false;
        }
    }
    
    /**
     * Inject the loadGraph callback into navigation node data
     * This allows NavigationNode to trigger dynamic loading
     */
    function injectCallbacks(nodeList: Node[]): Node[] {
        return nodeList.map(node => {
            if (node.type === 'navigation') {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        onLoadPart: loadGraph,
                    },
                };
            }
            return node;
        });
    }
    
    // Load initial home.ttl on mount
    onMount(async () => {
        try {
            // Load home.ttl which contains the navigation element and its shape
            loadingMessage = 'Loading home...';
            await rdfStore.loadFromUrl('/graphs/home.ttl');
            console.log('[App] Loaded home.ttl');
            
            // Convert RDF to SvelteFlow elements using shape-driven mapping
            loadingMessage = 'Building visualization...';
            const elements = quadsToFlowElements(rdfStore);
            
            // Inject callbacks for navigation nodes
            nodes = injectCallbacks(elements.nodes);
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
        console.log('Node clicked:', event.node.id, event.node.type, event.node.position);
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
    
    <!-- Loading overlay -->
    <!-- {#if isLoading}
        <div class="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3">
                <Spinner class="size-8" />
                <p class="text-muted-foreground text-sm">{loadingMessage}</p>
            </div>
        </div>
    {/if} -->
    
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
