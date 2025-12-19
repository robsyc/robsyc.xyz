<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from '@lucide/svelte';
    import { SvelteSet } from 'svelte/reactivity';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { getRdfContext } from '../context';
    import { getAnnotationsGrouped, removeAnnotation, type AnnotationGroup, type AnnotationValue } from '$lib/rdf/queries';

    interface Props {
        /** The resource being annotated */
        subject: NamedNode | BlankNode;
        /** Section title */
        title?: string;
        /** Initially collapsed? */
        collapsed?: boolean;
        /** Callback for adding a new annotation */
        onadd?: (subject: NamedNode | BlankNode) => void;
        /** Callback for adding a value to a specific property */
        onaddvalue?: (subject: NamedNode | BlankNode, predicate: NamedNode) => void;
        /** Callback for editing an annotation */
        onedit?: (value: AnnotationValue) => void;
    }

    let {
        subject,
        title = 'Annotations',
        collapsed = false,
        onadd,
        onaddvalue,
        onedit
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Section collapsed state (intentionally initialized from prop once)
    // svelte-ignore state_referenced_locally
    let isCollapsed = $state(collapsed);

    // Track expanded property groups
    let expandedGroups = new SvelteSet<string>();

    // Get annotations reactively
    const annotationGroups = $derived(getAnnotationsGrouped(store, subject));

    function toggleGroup(predicateValue: string) {
        if (expandedGroups.has(predicateValue)) {
            expandedGroups.delete(predicateValue);
        } else {
            expandedGroups.add(predicateValue);
        }
    }

    function handleRemove(value: AnnotationValue) {
        removeAnnotation(store, value.quad);
    }
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
                {annotationGroups.reduce((acc, g) => acc + g.values.length, 0)}
            </Badge>
        </div>
        
        {#if onadd}
            <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7"
                onclick={(e) => { e.stopPropagation(); onadd?.(subject); }}
                title="Add annotation"
            >
                <Plus class="h-4 w-4" />
            </Button>
        {/if}
    </button>
    
    <!-- Section content -->
    {#if !isCollapsed}
        <div class="border-t">
            {#if annotationGroups.length === 0}
                <p class="text-sm text-muted-foreground text-center py-4">No annotations</p>
            {:else}
                <div class="divide-y">
                    {#each annotationGroups as group (group.predicate.value)}
                        {@const isGroupExpanded = group.values.length <= 1 || expandedGroups.has(group.predicate.value)}
                        
                        <div class="py-2 px-3">
                            <!-- Property header -->
                            <div class="flex items-center justify-between group/header">
                                <button
                                    type="button"
                                    class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                                    onclick={() => toggleGroup(group.predicate.value)}
                                    disabled={group.values.length <= 1}
                                >
                                    {#if group.values.length > 1}
                                        {#if isGroupExpanded}
                                            <ChevronDown class="h-3 w-3" />
                                        {:else}
                                            <ChevronRight class="h-3 w-3" />
                                        {/if}
                                    {:else}
                                        <span class="w-3"></span>
                                    {/if}
                                    <span class="font-medium">{group.label}</span>
                                    {#if group.values.length > 1}
                                        <Badge variant="secondary" class="text-xs h-5">
                                            {group.values.length}
                                        </Badge>
                                    {/if}
                                </button>
                                {#if onaddvalue}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-6 w-6 opacity-0 group-hover/header:opacity-100 transition-opacity"
                                        onclick={() => onaddvalue?.(subject, group.predicate)}
                                        title="Add value"
                                    >
                                        <Plus class="h-3 w-3" />
                                    </Button>
                                {/if}
                            </div>
                            
                            <!-- Values -->
                            {#if isGroupExpanded}
                                <div class="mt-1 space-y-1 pl-5">
                                    {#each group.values as value (value.quad.object.value + (value.language ?? ''))}
                                        <div class="flex items-center justify-between group">
                                            <span class="text-sm break-all">{value.displayValue}</span>
                                            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {#if onedit}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        class="h-6 w-6"
                                                        onclick={() => onedit?.(value)}
                                                        title="Edit"
                                                    >
                                                        <Pencil class="h-3 w-3" />
                                                    </Button>
                                                {/if}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    class="h-6 w-6 text-destructive"
                                                    onclick={() => handleRemove(value)}
                                                    title="Remove"
                                                >
                                                    <Trash2 class="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {:else}
                                <div class="mt-1 pl-5">
                                    <span class="text-sm text-muted-foreground">
                                        {group.values[0].displayValue}
                                        {#if group.values.length > 1}
                                            <span class="ml-1">+{group.values.length - 1} more</span>
                                        {/if}
                                    </span>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
