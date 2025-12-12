<script lang="ts">
    /**
     * Main App Page - RDF Schema Visualization
     * 
     * Uses SvelteFlow to display an interactive view of RDF ObjectTypes and LinkTypes.
     * - ObjectTypes: rdfs:Class, owl:Class, sh:NodeShape
     * - LinkTypes: owl:ObjectProperty, sh:PropertyShape with sh:node
     * 
     * Features:
     * - Clownface-powered node components for RDF data access
     * - Type-detection based rendering
     * - Details, Serialize, and Instances dialogs
     */
    import { mode } from 'mode-watcher';
    import { onMount } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap,
    } from '@xyflow/svelte';
    import type { Node, Edge } from '@xyflow/svelte';
    import '@xyflow/svelte/dist/style.css';

    // RDF store and flow mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { mapRdfToFlow } from '$lib/rdf/flow-mapper';
    
    // Node components
    import ObjectTypeNode from '$lib/components/flow/nodes/ObjectTypeNode.svelte';
    import LinkTypeNode from '$lib/components/flow/nodes/LinkTypeNode.svelte';
    
    // Register node types
    const nodeTypes = {
        objectType: ObjectTypeNode,
        linkType: LinkTypeNode,
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
            loadingMessage = 'Loading RDF data...';
            await rdfStore.load({ url: '/graphs/home.ttl' });
            console.log('[App] Loaded home graph, store size:', rdfStore.size);
            
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
        }
    });
    
    function handleNodeClick(event: { node: Node }) {
        console.log('Node clicked:', event.node.id, event.node.type);
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
            type: 'smoothstep',
            animated: false,
        }}
    >
        <Controls />
        <Background 
            bgColor="var(--background)"
            variant={BackgroundVariant.Dots} 
        />
        <MiniMap 
            nodeColor={(node) => {
                if (node.type === 'objectType') return 'var(--primary)';
                if (node.type === 'linkType') return 'var(--secondary)';
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
