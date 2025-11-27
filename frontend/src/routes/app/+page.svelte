<script lang="ts">
    import { mode } from 'mode-watcher';
    import { onMount } from 'svelte';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
    } from '@xyflow/svelte';
    import type { Node, Edge } from '@xyflow/svelte';
    
    // RDF store and mapper
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { quadsToFlowElements } from '$lib/rdf/flow-mapper';
    
    // Import our custom node types
    import BlogNode from '$lib/components/flow/BlogNode.svelte';
    const nodeTypes = {
        blog: BlogNode,
    };
   
    // Loading state
    let isLoading = $state(true);
    let error = $state<string | null>(null);
    
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
    onMount(async () => {
        try {
            // Load the TTL files from static folder
            await rdfStore.loadFromUrl('/graphs/data.ttl');
            
            // Convert RDF to SvelteFlow elements
            const elements = quadsToFlowElements(rdfStore);
            nodes = elements.nodes;
            edges = elements.edges;
            
            console.log('[App] Loaded', nodes.length, 'nodes and', edges.length, 'edges from RDF');
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to load RDF data';
            console.error('[App] Error loading RDF:', e);
        } finally {
            isLoading = false;
        }
    });
    
    // Event handlers
    function handleNodeClick(event: any) {
        console.log('Node clicked:', event.node);
    }
</script>

{#if isLoading}
    <div class="flex items-center justify-center h-full">
        <p class="text-muted-foreground">Loading knowledge graph...</p>
    </div>
{:else if error}
    <div class="flex items-center justify-center h-full">
        <p class="text-destructive">Error: {error}</p>
    </div>
{:else}
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
        <Background variant={BackgroundVariant.Dots} />
    </SvelteFlow>
{/if}
