<script lang="ts">
    import type { Snippet } from 'svelte';
    import { Plus, ChevronDown, ChevronRight } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';

    interface Props {
        /** Section title */
        title: string;
        /** Item count for badge */
        count: number;
        /** Initially collapsed? */
        collapsed?: boolean;
        /** Empty state message */
        emptyMessage?: string;
        /** Callback for add button (if provided, shows add button) */
        onadd?: () => void;
        /** Add button title */
        addTitle?: string;
        /** Section content */
        children?: Snippet;
    }

    let {
        title,
        count,
        collapsed = false,
        emptyMessage = 'No items',
        onadd,
        addTitle = 'Add',
        children
    }: Props = $props();

    // Section collapsed state (intentionally captures initial value)
    // svelte-ignore state_referenced_locally
    let isCollapsed = $state(collapsed);
</script>

<div class="border rounded-lg">
    <!-- Section header -->
    <button
        type="button"
        class="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
        onclick={() => isCollapsed = !isCollapsed}
    >
        <div class="flex items-center gap-2">
            {#if isCollapsed}
                <ChevronRight class="h-4 w-4 text-muted-foreground" />
            {:else}
                <ChevronDown class="h-4 w-4 text-muted-foreground" />
            {/if}
            <span class="font-medium text-sm">{title}</span>
            <Badge variant="outline" class="text-xs">
                {count}
            </Badge>
        </div>
        
        {#if onadd}
            <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                onclick={(e) => { e.stopPropagation(); onadd?.(); }}
                title={addTitle}
            >
                <Plus class="h-4 w-4" />
            </Button>
        {/if}
    </button>
    
    <!-- Section content -->
    {#if !isCollapsed}
        <div class="border-t">
            {#if count === 0}
                <p class="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
            {:else if children}
                {@render children()}
            {/if}
        </div>
    {/if}
</div>
