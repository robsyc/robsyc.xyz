<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Plus, ChevronDown, ChevronRight } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';

    interface Props {
        /** Group header label */
        label: string;
        /** Item count for badge (optional) */
        count?: number;
        /** Whether group is expanded (bindable) */
        expanded?: boolean;
        /** Whether group can be collapsed (default: true if count > 1) */
        collapsible?: boolean;
        /** Callback when label is clicked for navigation */
        onnavigate?: () => void;
        /** Callback for add button */
        onadd?: () => void;
        /** Add button title */
        addTitle?: string;
        /** Group content */
        children?: Snippet;
    }

    let {
        label,
        count,
        expanded = $bindable(true),
        collapsible,
        onnavigate,
        onadd,
        addTitle = 'Add',
        children
    }: Props = $props();

    // Default collapsible based on count
    const canCollapse = $derived(collapsible ?? (count !== undefined && count > 1));
</script>

<div class="py-2 px-3">
    <!-- Group header -->
    <div class="flex items-center justify-between group/header">
        <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <!-- Expand/collapse button or spacer -->
            {#if canCollapse}
                <button
                    type="button"
                    class="flex items-center gap-1 hover:text-foreground p-0"
                    onclick={() => expanded = !expanded}
                >
                    {#if expanded}
                        <ChevronDown class="h-3 w-3" />
                    {:else}
                        <ChevronRight class="h-3 w-3" />
                    {/if}
                </button>
            {:else}
                <span class="w-3"></span>
            {/if}
            
            <!-- Label (optionally clickable for navigation) -->
            {#if onnavigate}
                <button
                    type="button"
                    class="font-medium hover:text-foreground hover:underline cursor-pointer"
                    onclick={onnavigate}
                >
                    {label}
                </button>
            {:else}
                <span class="font-medium">{label}</span>
            {/if}
            
            <!-- Count badge -->
            {#if count !== undefined && count > 1}
                <Badge variant="secondary" class="text-xs h-5">
                    {count}
                </Badge>
            {/if}
        </div>
        
        <!-- Add button -->
        {#if onadd}
            <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6 opacity-0 group-hover/header:opacity-100 transition-opacity"
                onclick={onadd}
                title={addTitle}
            >
                <Plus class="h-3 w-3" />
            </Button>
        {/if}
    </div>
    
    <!-- Group content -->
    {#if expanded && children}
        <div class="mt-1 space-y-1 pl-5">
            {@render children()}
        </div>
    {:else if !expanded && count !== undefined}
        <div class="mt-1 pl-5">
            <span class="text-sm text-muted-foreground">
                {count} item{count !== 1 ? 's' : ''}
            </span>
        </div>
    {/if}
</div>

