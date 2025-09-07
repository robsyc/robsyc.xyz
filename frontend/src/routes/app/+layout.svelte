<script lang="ts">
    import type { LayoutProps } from './$types';
    import '@xyflow/svelte/dist/style.css';
    
    let { data, children }: LayoutProps = $props();
</script>

{@render children()}