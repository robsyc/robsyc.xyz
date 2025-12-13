<script lang="ts">
    /**
     * Main App Page - RDF Schema Visualization
     * 
     * Uses SvelteFlow to display an interactive view of RDF ObjectTypes and ObjectProperties.
     * - ObjectTypes: rdfs:Class, owl:Class, sh:NodeShape
     * - ObjectProperties: owl:ObjectProperty
     * 
     * Features:
     * - Clownface-powered node components for RDF data access
     * - Type-detection based rendering
     * - Details, Serialize, and Instances dialogs
     * - Load test files via URL input
     */
    import { mode } from 'mode-watcher';
    import { onMount } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap,
        Panel,
    } from '@xyflow/svelte';
    import type { Node, Edge } from '@xyflow/svelte';

    // UI Components
    import { Button } from "$lib/components/ui/button/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import * as Popover from "$lib/components/ui/popover/index.js";
    import { Textarea } from "$lib/components/ui/textarea/index.js";
    import { RefreshCw, Upload, Trash2, FolderOpen } from "@lucide/svelte";

    // RDF store and flow mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { mapRdfToFlow } from '$lib/rdf/flow-mapper';
    
    // Node components
    import ObjectTypeNode from '$lib/components/flow/nodes/ObjectTypeNode.svelte';
    import ObjectPropertyNode from '$lib/components/flow/nodes/ObjectPropertyNode.svelte';
    
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
    
    // Test files for quick selection
    const testFiles = [
        { name: '01 - Basic Classes', url: '/graphs/tests/01-basic-classes.ttl' },
        { name: '02 - SHACL Shapes', url: '/graphs/tests/02-shacl-shapes.ttl' },
        { name: '03 - OWL Classes', url: '/graphs/tests/03-owl-classes.ttl' },
        { name: '04 - Object Properties', url: '/graphs/tests/04-object-properties.ttl' },
        { name: '05 - Complex Paths', url: '/graphs/tests/05-complex-paths.ttl' },
        { name: '06 - Instances', url: '/graphs/tests/06-instances.ttl' },
    ];
    
    // Derive SvelteFlow color mode from mode-watcher
    const colorMode = $derived.by(() => {
        const m = mode.current;
        if (m === 'dark') return 'dark';
        if (m === 'light') return 'light';
        return 'system';
    });
    
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
            const added = await rdfStore.load({ url, force: true });
            console.log(`[App] Loaded ${url}, added ${added} quads, store size: ${rdfStore.size}`);
            
            loadingMessage = 'Building visualization...';
            const elements = mapRdfToFlow(rdfStore);
            
            nodes = elements.nodes;
            edges = elements.edges;
            
            console.log(`[App] Created ${nodes.length} nodes and ${edges.length} edges`);
            
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load RDF data';
            console.error('[App] Error loading RDF:', e);
        } finally {
            isLoading = false;
            loadPopoverOpen = false;
        }
    }
    
    // Refresh visualization from current store
    function refreshVisualization() {
        loadingMessage = 'Refreshing visualization...';
        isLoading = true;
        
        try {
            const elements = mapRdfToFlow(rdfStore);
            nodes = elements.nodes;
            edges = elements.edges;
            console.log(`[App] Refreshed: ${nodes.length} nodes, ${edges.length} edges`);
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
    
    // Load initial data on mount
    onMount(async () => {
        await loadRdf(urlInput);
    });
    
    function handleNodeClick(event: { node: Node }) {
        console.log('Node clicked:', event.node.id, event.node.type, event.node.position);
    }
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
        colorMode={colorMode}
        {nodeTypes}
        onnodeclick={handleNodeClick}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
            type: 'bezier', // default (bezier), straight, step, and smoothstep.
            // TODO: use bezier for hierarchy, smoothstep for domain/range edges
            animated: false,
        }}
    >
        <!-- Top toolbar Panel -->
        <Panel position="top-left" class="flex gap-2 items-center z-50">
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
            
            <Button variant="outline" size="sm" onclick={refreshVisualization} disabled={isLoading}>
                <RefreshCw class="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onclick={clearStore} disabled={isLoading}>
                <Trash2 class="h-4 w-4" />
            </Button>
            
            <Badge variant="secondary" class="font-mono text-xs">
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
