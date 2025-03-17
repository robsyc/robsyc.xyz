<script lang="ts">
    import {
        SvelteFlow,
        Controls,
        Background,
        BackgroundVariant,
        MiniMap
    } from '@xyflow/svelte';
    
    // Import our flow data
    import { initialNodes, initialEdges } from '$lib/flow/flow-data';
    
    // Import our custom node types
    import { nodeTypes } from '$lib/flow/components';
    
    // Import our theme utility
    import { flowColorMode } from '$lib/utils';
   
    // Using $state.raw for the nodes and edges so Svelte Flow can update their positions
    let nodes = $state.raw(initialNodes);
    let edges = $state.raw(initialEdges);
    
    // Event handlers
    function handleNodeClick(event: any) {
        console.log('Node clicked:', event.node);
    }
</script>

<SvelteFlow
    bind:nodes
    bind:edges
    fitView
    colorMode={$flowColorMode}
    onnodeclick={handleNodeClick}
    {nodeTypes}
>
    <Controls />
    <Background variant={BackgroundVariant.Dots} />
    <MiniMap />
</SvelteFlow>