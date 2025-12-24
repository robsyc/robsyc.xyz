<script lang="ts">
    /**
     * Main App Page - RDF Schema Visualization
     * 
     * Uses SvelteFlow to display an interactive view of RDF ObjectTypes and ObjectProperties.
     * Features:
     * - ELK-powered automatic layout
     * - Progressive node rendering (roots first, expand via toggles)
     * - Clownface-powered node components for RDF data access
     */
    import { mode } from 'mode-watcher';
    import { onMount, untrack } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap,
        Panel,
        MarkerType,
    } from '@xyflow/svelte';
    import type { Node, Edge } from '@xyflow/svelte';

    // UI Components
    import { Button } from "$lib/components/ui/button/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { RefreshCw, Upload, Trash2, FolderOpen, Eye, EyeOff } from "@lucide/svelte";

    // RDF store and flow mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { visibilityStore } from '$lib/stores/visibility.svelte';
    import { mapRdfToFlow } from '$lib/rdf/archive/flow-mapper';
    import { layoutWithELK, positionChildNode, defaultLayoutOptions } from '$lib/rdf/archive/layout';
    
    // Node components
    import ObjectTypeNode from '$lib/components/flow/nodes/ObjectTypeNode.svelte';
    import ObjectPropertyNode from '$lib/components/flow/nodes/archive/ObjectPropertyNode.svelte';
    
    // Register node types
    const nodeTypes = {
        objectType: ObjectTypeNode,
        objectProperty: ObjectPropertyNode,
    };
   
    // State
    let isLoading = $state(true);
    let loadingMessage = $state('Initializing...');
    let error = $state<string | null>(null);
    
    // Using $state.raw so SvelteFlow can update positions
    let nodes = $state.raw<Node[]>([]);
    let edges = $state.raw<Edge[]>([]);
    
    // URL input state
    let urlInput = $state('/graphs/tests/01-basic-classes.ttl');
    let loadPopoverOpen = $state(false);
    
    let progressiveRendering = $state(true);
    
    // Test files for quick selection
    const testFiles = [
        { name: '01 - Basic Classes', url: '/graphs/tests/01-basic-classes.ttl' },
        { name: '02 - Simple SHACL', url: '/graphs/tests/02-simple-shacl.ttl' },
        { name: '03 - Simple Properties', url: '/graphs/tests/03-simple-properties.ttl' },
        // { name: '04 - Object Properties', url: '/graphs/tests/04-object-properties.ttl' },
        // { name: '05 - Complex Paths', url: '/graphs/tests/05-complex-paths.ttl' },
        // { name: '06 - Instances', url: '/graphs/tests/06-instances.ttl' },
    ];
    
    // Derive SvelteFlow color mode from mode-watcher
    const colorMode = $derived.by(() => {
        const m = mode.current;
        if (m === 'dark') return 'dark';
        if (m === 'light') return 'light';
        return 'system';
    });
    
    // Reactive update: when visibility changes, update displayed nodes/edges
    const visibleNodeCount = $derived(visibilityStore.visibleNodes.size);
    const totalNodeCount = $derived(visibilityStore.allNodes.length);
    
    /**
     * Apply ELK tree layout to current visible nodes (full re-layout)
     */
    async function applyLayout() {
        const visibleNodes = visibilityStore.getVisibleNodes();
        const visibleEdges = visibilityStore.getVisibleEdges();
        
        if (visibleNodes.length === 0) return;
        
        loadingMessage = 'Computing layout...';
        isLoading = true;
        
        try {
            const layoutedNodes = await layoutWithELK(visibleNodes, visibleEdges, defaultLayoutOptions);
            
            nodes = layoutedNodes;
            edges = visibleEdges;
        } catch (e) {
            console.error('[App] Layout failed:', e);
        } finally {
            isLoading = false;
        }
    }
    
    /**
     * Update flow display from visibility store (FULL re-layout)
     * Use this for initial load or when user explicitly requests re-layout
     */
    async function updateFlowFromVisibility() {
        const visibleNodes = visibilityStore.getVisibleNodes();
        const visibleEdges = visibilityStore.getVisibleEdges();
        
        // Apply tree layout to visible nodes
        const layoutedNodes = await layoutWithELK(visibleNodes, visibleEdges, defaultLayoutOptions);
        
        nodes = layoutedNodes;
        edges = visibleEdges;
    }
    
    /**
     * Incremental update: preserve existing node positions, only position NEW nodes
     * This provides a smoother UX when expanding/collapsing
     */
    function updateFlowIncremental() {
        const visibleNodes = visibilityStore.getVisibleNodes();
        const visibleEdges = visibilityStore.getVisibleEdges();
        
        // Build a map of current node positions
        const currentPositions = new Map<string, { x: number; y: number }>();
        for (const node of nodes) {
            currentPositions.set(node.id, { ...node.position });
        }
        
        // Find NEW nodes (visible but not currently rendered)
        const currentNodeIds = new Set(nodes.map(n => n.id));
        const newNodes = visibleNodes.filter(n => !currentNodeIds.has(n.id));
        const existingVisibleNodes = visibleNodes.filter(n => currentNodeIds.has(n.id));
        
        if (newNodes.length === 0) {
            // No new nodes - just filter to visible and preserve positions
            const updatedNodes = existingVisibleNodes.map(n => ({
                ...n,
                position: currentPositions.get(n.id) ?? n.position
            }));
            nodes = updatedNodes;
            edges = visibleEdges;
            return;
        }
        
        // Position NEW nodes relative to their parent using layout helper
        const positionedNewNodes: typeof newNodes = [];
        for (const newNode of newNodes) {
            // Find incoming hierarchy edge to determine parent (only vertical edges)
            const parentEdge = visibleEdges.find(e => 
                e.target === newNode.id && 
                (e.data?.edgeType === 'subClassOf' || 
                 e.data?.edgeType === 'broader' || 
                 e.data?.edgeType === 'subPropertyOf')
            );
            const parentId = parentEdge?.source;
            const parentPos = parentId ? currentPositions.get(parentId) : null;
            
            if (parentPos) {
                // Count siblings with same parent
                const siblingEdges = visibleEdges.filter(e => 
                    e.source === parentId && 
                    (e.data?.edgeType === 'subClassOf' || 
                     e.data?.edgeType === 'broader' || 
                     e.data?.edgeType === 'subPropertyOf')
                );
                const siblingIndex = siblingEdges.findIndex(e => e.target === newNode.id);
                
                // Use layout helper for proper positioning
                const position = positionChildNode(
                    parentPos,
                    siblingIndex,
                    siblingEdges.length,
                    defaultLayoutOptions
                );
                
                positionedNewNodes.push({ ...newNode, position });
            } else {
                // No parent found, place at origin offset
                positionedNewNodes.push({
                    ...newNode,
                    position: { x: newNodes.indexOf(newNode) * 400, y: 0 }
                });
            }
        }
        
        // Merge: existing (preserved positions) + new (computed positions)
        const updatedNodes = [
            ...existingVisibleNodes.map(n => ({
                ...n,
                position: currentPositions.get(n.id) ?? n.position
            })),
            ...positionedNewNodes
        ];
        
        nodes = updatedNodes;
        edges = visibleEdges;
    }
    
    // Load and map RDF data
    async function loadRdf(url: string, clearFirst = true) {
        try {
            isLoading = true;
            error = null;
            
            if (clearFirst) {
                loadingMessage = 'Clearing store...';
                rdfStore.clear();
            }
            
            loadingMessage = `Loading ${url}...`;
            const added = await rdfStore.load({ url });
            console.log(`[App] Loaded ${url}, added ${added} quads, store size: ${rdfStore.size}`);
            
            loadingMessage = 'Building visualization...';
            const elements = mapRdfToFlow(rdfStore);
            
            // Initialize visibility store
            if (progressiveRendering) {
                visibilityStore.initWithRoots(elements.nodes, elements.edges, elements.rootNodeIds);
            } else {
                visibilityStore.initShowAll(elements.nodes, elements.edges);
            }
            
            // Apply layout and display
            await updateFlowFromVisibility();
            
            console.log(`[App] Created ${elements.nodes.length} total nodes, ${visibleNodeCount} visible, ${edges.length} edges`);
            
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load RDF data';
            console.error('[App] Error loading RDF:', e);
        } finally {
            isLoading = false;
            loadPopoverOpen = false;
        }
    }
    
    // Refresh visualization from current store
    async function refreshVisualization() {
        loadingMessage = 'Refreshing visualization...';
        isLoading = true;
        
        try {
            const elements = mapRdfToFlow(rdfStore);
            
            if (progressiveRendering) {
                visibilityStore.initWithRoots(elements.nodes, elements.edges, elements.rootNodeIds);
            } else {
                visibilityStore.initShowAll(elements.nodes, elements.edges);
            }
            
            await updateFlowFromVisibility();
            console.log(`[App] Refreshed: ${totalNodeCount} total nodes, ${visibleNodeCount} visible`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to refresh';
            console.error('[App] Error refreshing:', e);
        } finally {
            isLoading = false;
        }
    }
    
    // Clear the store
    function clearStore() {
        rdfStore.clear();
        nodes = [];
        edges = [];
        console.log('[App] Store cleared');
    }
    
    // Toggle progressive rendering mode
    async function toggleProgressiveRendering() {
        progressiveRendering = !progressiveRendering;
        await refreshVisualization();
    }
    
    // Load initial data on mount
    onMount(async () => {
        // Load config (annotation properties, etc.) first
        // await loadConfig();
        // Then load the initial data
        await loadRdf(urlInput);
    });
    
    function handleNodeClick(event: { node: Node }) {
        console.log('Node clicked:', event.node.id, event.node.type, event.node.position);
    }
    
    // React to visibility changes (expand/collapse) with incremental updates
    // This preserves existing node positions for a smoother UX
    let previousVisibilityVersion = -1;
    $effect(() => {
        const version = visibilityStore.visibilityVersion;
        
        // Only update if version changed and not loading
        if (version > 0 && version !== previousVisibilityVersion && !untrack(() => isLoading)) {
            previousVisibilityVersion = version;
            updateFlowIncremental();
        }
    });
</script>

<div class="relative w-full h-full">
    {#if isLoading}
        <!-- Loading overlay -->
        <div class="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p class="text-sm text-muted-foreground">{loadingMessage}</p>
            </div>
        </div>
    {/if}

    <SvelteFlow
        bind:nodes
        bind:edges
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1.5 }}
        colorMode={colorMode}
        {nodeTypes}
        onnodeclick={handleNodeClick}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
            type: 'bezier',
            animated: false, // TODO: we should update this with custom handle and edge components
            markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15 },
        }}
    >
        <!-- Top toolbar Panel -->
        <Panel position="top-left" class="flex gap-2 items-center z-50 flex-wrap">
            <Popover.Root bind:open={loadPopoverOpen}>
                <Popover.Trigger>
                    <Button variant="outline" size="sm" class="gap-2">
                        <Upload class="h-4 w-4" />
                        Load Graph
                    </Button>
                </Popover.Trigger>
                <Popover.Content class="w-96" align="start">
                    <div class="space-y-4">
                        <div class="space-y-2">
                            <h4 class="font-medium text-sm">Load RDF from URL</h4>
                            <div class="flex gap-2">
                                <Textarea 
                                    bind:value={urlInput}
                                    placeholder="/graphs/tests/01-basic-classes.ttl"
                                    class="text-xs font-mono min-h-[60px]"
                                />
                            </div>
                            <Button 
                                size="sm" 
                                class="w-full"
                                onclick={() => loadRdf(urlInput)}
                                disabled={isLoading || !urlInput.trim()}
                            >
                                {isLoading ? 'Loading...' : 'Load'}
                            </Button>
                        </div>
                        
                        <div class="space-y-2">
                            <h4 class="font-medium text-sm flex items-center gap-2">
                                <FolderOpen class="h-4 w-4" />
                                Test Files
                            </h4>
                            <div class="grid gap-1">
                                {#each testFiles as file (file.url)}
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        class="justify-start text-xs h-8 font-mono"
                                        onclick={() => { urlInput = file.url; loadRdf(file.url); }}
                                    >
                                        {file.name}
                                    </Button>
                                {/each}
                            </div>
                        </div>
                    </div>
                </Popover.Content>
            </Popover.Root>
            
            <!-- Progressive rendering toggle -->
            <Button 
                variant={progressiveRendering ? "secondary" : "outline"} 
                size="sm" 
                onclick={toggleProgressiveRendering}
                disabled={isLoading}
                class="gap-2"
            >
                {#if progressiveRendering}
                    <Eye class="h-4 w-4" />
                {:else}
                    <EyeOff class="h-4 w-4" />
                {/if}
                Progressive
            </Button>
            
            <Button variant="outline" size="sm" onclick={refreshVisualization} disabled={isLoading} title="Re-layout all nodes">
                <RefreshCw class="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onclick={clearStore} disabled={isLoading} title="Clear store">
                <Trash2 class="h-4 w-4" />
            </Button>
            
            <Badge variant="secondary" class="font-mono text-xs">
                {visibleNodeCount}/{totalNodeCount} nodes
            </Badge>
            
            <Badge variant="outline" class="font-mono text-xs">
                {rdfStore.size} quads
            </Badge>
        </Panel>
        
        <Controls />
        <Background 
            bgColor="var(--accent)"
            variant={BackgroundVariant.Dots} 
        />
        <MiniMap 
            nodeColor={(node) => {
                if (node.type === 'objectType') return 'var(--foreground/90)';
                if (node.type === 'objectProperty') return 'var(--foreground/80)';
                return 'var(--muted)';
            }}
        />
    </SvelteFlow>
    
    <!-- Error overlay -->
    {#if error}
        <div class="absolute inset-0 bg-background/90 flex items-center justify-center z-50">
            <div class="flex flex-col items-center gap-3 max-w-md text-center p-6">
                <div class="rounded-full h-12 w-12 bg-destructive/20 flex items-center justify-center">
                    <span class="text-destructive text-xl">!</span>
                </div>
                <p class="text-destructive font-medium">Failed to load RDF data</p>
                <p class="text-muted-foreground text-sm">{error}</p>
                <div class="flex gap-2">
                    <Button 
                        variant="outline"
                        onclick={() => error = null}
                    >
                        Dismiss
                    </Button>
                    <Button 
                        onclick={() => loadRdf(urlInput)}
                    >
                        Retry
                    </Button>
                </div>
            </div>
        </div>
    {/if}
</div>
