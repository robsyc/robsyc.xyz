<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import type { Snippet } from 'svelte';
    import * as Tooltip from '$lib/components/ui/tooltip/index.js';
    import { toCompactIri } from '$lib/rdf/namespaces';

    interface Props {
        /** The term to show IRI for */
        term: NamedNode | BlankNode;
        /** Content to wrap with tooltip */
        children: Snippet;
        /** Show compact IRI instead of full IRI */
        compact?: boolean;
        /** Additional class for the trigger */
        class?: string;
        /** Click handler for the trigger (optionally receives MouseEvent for shift-click detection) */
        onclick?: ((event: MouseEvent) => void) | (() => void);
    }

    let {
        term,
        children,
        compact = false,
        class: className = '',
        onclick
    }: Props = $props();

    const displayIri = $derived(
        term.termType === 'NamedNode' 
            ? (compact ? toCompactIri(term.value) : term.value)
            : term.value
    );
    
    function handleClick(event: MouseEvent) {
        onclick?.(event);
    }
</script>

<Tooltip.Root>
    <Tooltip.Trigger class={className} onclick={handleClick}>
        {@render children()}
    </Tooltip.Trigger>
    <Tooltip.Content>
        <code class="text-xs font-mono">{displayIri}</code>
    </Tooltip.Content>
</Tooltip.Root>
