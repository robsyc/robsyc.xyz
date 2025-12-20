<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import type { Snippet } from 'svelte';
    import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
    import { getRdfContext } from '../context';
    import { getResourceLabel } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';

    interface Props {
        /** The resource to display */
        subject: NamedNode | BlankNode | null;
        /** Sections to render */
        children?: Snippet;
        /** Show IRI in header */
        showIri?: boolean;
    }

    let {
        subject,
        children,
        showIri = true
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Get label reactively
    const label = $derived(subject ? getResourceLabel(store, subject) : '');
    const iri = $derived(subject?.termType === 'NamedNode' ? toCompactIri(subject.value) : subject?.value ?? '');
</script>

{#if subject}
    <div class="flex flex-col h-full border rounded-lg">
        <!-- Header -->
        <div class="p-4 border-b bg-muted/30">
            <h2 class="text-lg font-semibold">{label}</h2>
            {#if showIri && subject.termType === 'NamedNode'}
                <p class="text-sm text-muted-foreground font-mono mt-1">{iri}</p>
            {/if}
        </div>
        
        <!-- Content sections -->
        <ScrollArea class="flex-1">
            <div class="p-4 space-y-4">
                {#if children}
                    {@render children()}
                {:else}
                    <p class="text-sm text-muted-foreground text-center py-4">No sections configured</p>
                {/if}
            </div>
        </ScrollArea>
    </div>
{:else}
    <div class="flex items-center justify-center h-full border rounded-lg bg-muted/20">
        <p class="text-muted-foreground">Select a resource to view details</p>
    </div>
{/if}


