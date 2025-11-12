<script lang="ts">
    import { mode } from 'mode-watcher';
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap
    } from '@xyflow/svelte';
    
    // Import our flow data
    import { initialNodes, initialEdges } from '$lib/flow-data';
    
    // Import our custom node types
    import BlogNode from '$lib/components/flow/BlogNode.svelte';
    const nodeTypes = {
        blog: BlogNode,
    };
   
    // Using $state.raw for the nodes and edges so Svelte Flow can update their positions
    let nodes = $state.raw(initialNodes);
    let edges = $state.raw(initialEdges);
    
    // Derive SvelteFlow color mode from mode-watcher (Svelte 5 runes)
    const colorMode = $derived.by(() => {
        const m = mode.current;
        if (m === 'dark') return 'dark';
        if (m === 'light') return 'light';
        return 'system';
    });
    
    // Event handlers
    function handleNodeClick(event: any) {
        console.log('Node clicked:', event.node);
    }
</script>

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
    <!-- <MiniMap /> -->
</SvelteFlow>