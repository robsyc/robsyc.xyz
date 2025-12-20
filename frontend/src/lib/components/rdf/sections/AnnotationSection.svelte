<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ExternalLink, ArrowUpRight } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { getRdfContext } from '../context';
    import { getAnnotationsGrouped, removeAnnotation, type AnnotationValue } from '$lib/rdf/queries';
    import { PREFIXES } from '$lib/rdf/namespaces';
    import { IriTooltip } from '../shared';
    import { createExpandableSet } from '$lib/utils/expandable.svelte';
    import BaseSection from './BaseSection.svelte';

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
        /** Callback when clicking on a predicate to navigate to it */
        onpredicateclick?: (predicate: NamedNode) => void;
        /** Callback when clicking on a NamedNode value to navigate to it */
        onvalueclick?: (resource: NamedNode) => void;
    }

    let {
        subject,
        title = 'Annotations',
        collapsed = false,
        onadd,
        onaddvalue,
        onedit,
        onpredicateclick,
        onvalueclick
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Track expanded property groups
    const expandedGroups = createExpandableSet();

    // Get annotations reactively
    const annotationGroups = $derived(getAnnotationsGrouped(store, subject));
    const totalCount = $derived(annotationGroups.reduce((acc, g) => acc + g.values.length, 0));

    // Check if a URI is internal (in our known namespaces)
    function isInternalUri(uri: string): boolean {
        return Object.values(PREFIXES).some(prefix => uri.startsWith(prefix));
    }

    function handleRemove(value: AnnotationValue) {
        removeAnnotation(store, value.quad);
    }

    function handleValueClick(value: AnnotationValue) {
        const obj = value.quad.object;
        if (obj.termType === 'NamedNode') {
            if (isInternalUri(obj.value)) {
                onvalueclick?.(obj as NamedNode);
            } else {
                window.open(obj.value, '_blank', 'noopener,noreferrer');
            }
        }
    }

    function isNamedNodeValue(value: AnnotationValue): boolean {
        return value.quad.object.termType === 'NamedNode';
    }
</script>

<BaseSection
    {title}
    count={totalCount}
    {collapsed}
    emptyMessage="No annotations"
    onadd={onadd ? () => onadd?.(subject) : undefined}
    addTitle="Add annotation"
>
    <div class="divide-y">
        {#each annotationGroups as group (group.predicate.value)}
            {@const isGroupExpanded = group.values.length <= 1 || expandedGroups.has(group.predicate.value)}
            
            <div class="py-2 px-3">
                <!-- Property header -->
                <div class="flex items-center justify-between group/header">
                    <div class="flex items-center gap-2 text-sm text-muted-foreground">
                        <button
                            type="button"
                            class="flex items-center gap-1 hover:text-foreground"
                            onclick={() => expandedGroups.toggle(group.predicate.value)}
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
                        </button>
                        <IriTooltip
                            term={group.predicate}
                            class="font-medium hover:text-foreground hover:underline cursor-pointer"
                            onclick={() => onpredicateclick?.(group.predicate)}
                        >
                            {group.label}
                        </IriTooltip>
                        {#if group.values.length > 1}
                            <Badge variant="secondary" class="text-xs h-5">
                                {group.values.length}
                            </Badge>
                        {/if}
                    </div>
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
                            {@const isLink = isNamedNodeValue(value)}
                            {@const isExternal = isLink && !isInternalUri(value.quad.object.value)}
                            {@const isInternal = isLink && isInternalUri(value.quad.object.value)}
                            <div class="flex items-center justify-between group">
                                {#if isLink}
                                    <button
                                        type="button"
                                        class="text-sm break-all text-left text-primary hover:underline flex items-center gap-1"
                                        onclick={() => handleValueClick(value)}
                                    >
                                        {value.displayValue}
                                        {#if isExternal}
                                            <ExternalLink class="h-3 w-3 shrink-0" />
                                        {/if}
                                    </button>
                                {:else}
                                    <span class="text-sm break-all">{value.displayValue}</span>
                                {/if}
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {#if isInternal && onvalueclick}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="h-6 w-6"
                                            onclick={() => handleValueClick(value)}
                                            title="Go to resource"
                                        >
                                            <ArrowUpRight class="h-3 w-3" />
                                        </Button>
                                    {/if}
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
                    {@const firstValue = group.values[0]}
                    {@const isLink = isNamedNodeValue(firstValue)}
                    <div class="mt-1 pl-5">
                        {#if isLink}
                            <button
                                type="button"
                                class="text-sm text-primary hover:underline"
                                onclick={() => handleValueClick(firstValue)}
                            >
                                {firstValue.displayValue}
                            </button>
                        {:else}
                            <span class="text-sm text-muted-foreground">
                                {firstValue.displayValue}
                            </span>
                        {/if}
                        {#if group.values.length > 1}
                            <span class="text-sm text-muted-foreground ml-1">+{group.values.length - 1} more</span>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</BaseSection>
