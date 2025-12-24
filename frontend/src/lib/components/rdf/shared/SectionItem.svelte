<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Pencil, Trash2, ExternalLink } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';

    interface BadgeInfo {
        text: string;
        variant?: 'default' | 'secondary' | 'outline' | 'destructive';
    }

    interface Props {
        /** Primary display text (alternative to children) */
        label?: string;
        /** Secondary text (IRI, compact form) */
        sublabel?: string;
        /** Optional badges (language tag, datatype, etc.) */
        badges?: BadgeInfo[];
        /** Whether clicking the item navigates */
        navigable?: boolean;
        /** External link (opens in new tab) */
        external?: boolean;
        /** Callback when item is clicked for navigation */
        onnavigate?: () => void;
        /** Callback for edit button */
        onedit?: () => void;
        /** Callback for remove button */
        onremove?: () => void;
        /** Custom content (overrides label/sublabel) */
        children?: Snippet;
        /** Optional additional actions before edit/remove */
        actions?: Snippet;
        /** Additional class for the row */
        class?: string;
    }

    let {
        label,
        sublabel,
        badges,
        navigable = false,
        external = false,
        onnavigate,
        onedit,
        onremove,
        children,
        actions,
        class: className = ''
    }: Props = $props();

    const hasActions = $derived(!!actions || !!onedit || !!onremove);
    const isClickable = $derived(navigable && onnavigate);

    function handleClick() {
        if (external && sublabel) {
            window.open(sublabel, '_blank', 'noopener,noreferrer');
        } else {
            onnavigate?.();
        }
    }
</script>

<div class="flex items-center justify-between group py-1 {className}">
    <div class="min-w-0 flex-1">
        {#if children}
            {@render children()}
        {:else if label}
            {#if isClickable}
                <button
                    type="button"
                    class="flex flex-col items-start min-w-0 text-left hover:text-primary cursor-pointer"
                    onclick={handleClick}
                >
                    <span class="text-sm font-medium truncate hover:underline flex items-center gap-1">
                        {label}
                        {#if external}
                            <ExternalLink class="h-3 w-3 shrink-0" />
                        {/if}
                    </span>
                    {#if sublabel}
                        <span class="text-xs text-muted-foreground font-mono truncate">{sublabel}</span>
                    {/if}
                </button>
            {:else}
                <div class="flex flex-col items-start min-w-0">
                    <span class="text-sm font-medium truncate">{label}</span>
                    {#if sublabel}
                        <span class="text-xs text-muted-foreground font-mono truncate">{sublabel}</span>
                    {/if}
                </div>
            {/if}
            
            {#if badges && badges.length > 0}
                <div class="flex items-center gap-1 mt-0.5">
                    {#each badges as badge (badge.text)}
                        <Badge variant={badge.variant ?? 'outline'} class="text-xs h-5 px-1.5">
                            {badge.text}
                        </Badge>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
    
    {#if hasActions}
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
            {#if actions}
                {@render actions()}
            {/if}
            {#if onedit}
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6"
                    onclick={onedit}
                    title="Edit"
                >
                    <Pencil class="h-3 w-3" />
                </Button>
            {/if}
            {#if onremove}
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-6 w-6 text-destructive"
                    onclick={onremove}
                    title="Remove"
                >
                    <Trash2 class="h-3 w-3" />
                </Button>
            {/if}
        </div>
    {/if}
</div>

