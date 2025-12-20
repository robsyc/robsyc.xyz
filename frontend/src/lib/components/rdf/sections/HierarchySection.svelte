<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { Trash2, Pencil } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { getRdfContext } from '../context';
    import { getParents, getResourceLabel } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';
    import { IriTooltip } from '../shared';
    import BaseSection from './BaseSection.svelte';

    interface Props {
        /** The resource to show hierarchy for */
        subject: NamedNode | BlankNode;
        /** The predicate(s) defining the hierarchy. Supports single or multiple for ShapeClass. */
        predicate?: NamedNode;
        predicates?: NamedNode[];
        /** Section label (default: "Hierarchy") */
        label?: string;
        /** Initially collapsed? */
        collapsed?: boolean;
        /** Callback when a related resource is clicked for navigation */
        onnavigate?: (resource: NamedNode | BlankNode) => void;
        /** Callback when predicate is clicked for navigation */
        onpredicateclick?: (predicate: NamedNode) => void;
        /** Callback to add a new parent relationship */
        onadd?: (subject: NamedNode | BlankNode, predicate: NamedNode) => void;
        /** Callback to edit/change a parent relationship (opens editor dialog) */
        onedit?: (subject: NamedNode | BlankNode, predicate: NamedNode, existingParent: NamedNode | BlankNode) => void;
        /** Callback to remove a parent relationship */
        onremove?: (subject: NamedNode | BlankNode, predicate: NamedNode, object: NamedNode | BlankNode) => void;
    }

    let {
        subject,
        predicate,
        predicates,
        label = 'Hierarchy',
        collapsed = false,
        onnavigate,
        onpredicateclick,
        onadd,
        onedit,
        onremove
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Normalize to array of predicates (support both single and multiple)
    const normalizedPredicates = $derived(
        predicates ?? (predicate ? [predicate] : [])
    );

    // Build hierarchy groups: one group per predicate with its parents
    interface HierarchyGroup {
        predicate: NamedNode;
        predicateLabel: string;
        parents: (NamedNode | BlankNode)[];
    }

    const hierarchyGroups = $derived.by((): HierarchyGroup[] => {
        return normalizedPredicates.map(pred => ({
            predicate: pred,
            predicateLabel: getResourceLabel(store, pred),
            parents: getParents(store, subject, pred)
        }));
    });

    // Total count across all predicates
    const totalCount = $derived(
        hierarchyGroups.reduce((sum, g) => sum + g.parents.length, 0)
    );

    // For add button, use first predicate (or let caller handle with onadd callback)
    const primaryPredicate = $derived(normalizedPredicates[0]);

    function handleRemove(pred: NamedNode, parent: NamedNode | BlankNode) {
        onremove?.(subject, pred, parent);
    }

    function handleEdit(pred: NamedNode, parent: NamedNode | BlankNode) {
        onedit?.(subject, pred, parent);
    }

    function handleAdd(pred: NamedNode) {
        onadd?.(subject, pred);
    }
</script>

<BaseSection
    title={label}
    count={totalCount}
    {collapsed}
    emptyMessage="No parent resources"
    onadd={onadd && primaryPredicate ? () => handleAdd(primaryPredicate) : undefined}
    addTitle="Add parent"
>
    {#each hierarchyGroups as group (group.predicate.value)}
        {#if group.parents.length > 0 || hierarchyGroups.length > 1}
            <div class="py-2 px-3 {hierarchyGroups.length > 1 ? 'border-b last:border-b-0' : ''}">
                <!-- Predicate header -->
                <div class="flex items-center justify-between group/header">
                    <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <span class="w-3"></span>
                        <IriTooltip 
                            term={group.predicate}
                            class="font-medium hover:text-foreground hover:underline cursor-pointer"
                            onclick={() => onpredicateclick?.(group.predicate)}
                        >
                            {group.predicateLabel}
                        </IriTooltip>
                        {#if group.parents.length > 1}
                            <Badge variant="secondary" class="text-xs h-5">
                                {group.parents.length}
                            </Badge>
                        {/if}
                    </div>
                    <!-- Add button for this specific predicate (when multiple predicates) -->
                    {#if onadd && hierarchyGroups.length > 1}
                        <Button
                            variant="ghost"
                            size="icon"
                            class="h-6 w-6 opacity-0 group-hover/header:opacity-100 transition-opacity"
                            onclick={() => handleAdd(group.predicate)}
                            title="Add {group.predicateLabel}"
                        >
                            <span class="text-xs">+</span>
                        </Button>
                    {/if}
                </div>
                
                <!-- Parent resources list -->
                {#if group.parents.length > 0}
                    <div class="space-y-1 pl-5">
                        {#each group.parents as parent (parent.value)}
                            {@const parentLabel = getResourceLabel(store, parent)}
                            {@const parentIri = parent.termType === 'NamedNode' ? toCompactIri(parent.value) : parent.value}
                            
                            <div class="flex items-center justify-between group py-1">
                                <IriTooltip 
                                    term={parent}
                                    class="flex flex-col items-start min-w-0 text-left {onnavigate ? 'hover:text-primary cursor-pointer' : ''}"
                                    onclick={onnavigate ? () => onnavigate?.(parent) : undefined}
                                >
                                    <span class="text-sm font-medium truncate {onnavigate ? 'hover:underline' : ''}">{parentLabel}</span>
                                    <span class="text-xs text-muted-foreground font-mono truncate">{parentIri}</span>
                                </IriTooltip>
                                
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    {#if onedit}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            class="h-6 w-6"
                                            onclick={() => handleEdit(group.predicate, parent)}
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
                                            onclick={() => handleRemove(group.predicate, parent)}
                                            title="Remove"
                                        >
                                            <Trash2 class="h-3 w-3" />
                                        </Button>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {:else}
                    <p class="text-xs text-muted-foreground pl-5">None</p>
                {/if}
            </div>
        {/if}
    {/each}
</BaseSection>
