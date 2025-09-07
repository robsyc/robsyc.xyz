<script lang="ts">
    import type { PageProps } from './$types';
    import { SvelteFlow, Background } from '@xyflow/svelte';

    let { data }: PageProps = $props();

    let nodes = $state.raw([
        { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
        { id: '2', position: { x: 0, y: 100 }, data: { label: 'World' } },
    ]);

    let edges = $state.raw([
        { id: 'e1-2', source: '1', target: '2' },
    ]);
</script>

<div style:width="100vw" style:height="100vh">
    <SvelteFlow bind:nodes bind:edges>
        <Background />
    </SvelteFlow>
</div>