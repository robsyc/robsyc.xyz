<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { getRdfContext } from '../context';
    import { getParents, getResourceLabel } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';
    import { SectionGroup, SectionItem } from '../shared';
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

    // Use context navigation as fallback if props aren't provided
    const navigateToResource = $derived(onnavigate ?? ctx.navigation.toResource);
    const navigateToPredicate = $derived(onpredicateclick ?? ctx.navigation.toPredicate);

    // Normalize to array of predicates (support both single and multiple)
    const normalizedPredicates = $derived(predicates ?? (predicate ? [predicate] : []));

    // Build hierarchy groups
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

    const totalCount = $derived(hierarchyGroups.reduce((sum, g) => sum + g.parents.length, 0));
    const primaryPredicate = $derived(normalizedPredicates[0]);
</script>

<BaseSection
    title={label}
    count={totalCount}
    {collapsed}
    emptyMessage="No parent resources"
    onadd={onadd && primaryPredicate ? () => onadd?.(subject, primaryPredicate) : undefined}
    addTitle="Add parent"
>
    <div class="divide-y">
        {#each hierarchyGroups as group (group.predicate.value)}
            {#if group.parents.length > 0 || hierarchyGroups.length > 1}
                <SectionGroup
                    label={group.predicateLabel}
                    count={group.parents.length}
                    collapsible={false}
                    onnavigate={navigateToPredicate ? () => navigateToPredicate?.(group.predicate) : undefined}
                    onadd={onadd && hierarchyGroups.length > 1 ? () => onadd?.(subject, group.predicate) : undefined}
                    addTitle="Add {group.predicateLabel}"
                >
                    {#each group.parents as parent (parent.value)}
                        {@const parentLabel = getResourceLabel(store, parent)}
                        {@const parentIri = parent.termType === 'NamedNode' ? toCompactIri(parent.value) : parent.value}
                        
                        <SectionItem
                            label={parentLabel}
                            sublabel={parentIri}
                            navigable={!!navigateToResource}
                            onnavigate={navigateToResource ? () => navigateToResource?.(parent) : undefined}
                            onedit={onedit ? () => onedit?.(subject, group.predicate, parent) : undefined}
                            onremove={onremove ? () => onremove?.(subject, group.predicate, parent) : undefined}
                        />
                    {/each}
                </SectionGroup>
            {/if}
        {/each}
    </div>
</BaseSection>
