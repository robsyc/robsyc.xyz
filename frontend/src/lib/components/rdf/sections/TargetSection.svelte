<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { getRdfContext } from '../context';
    import { getShapeTargets, type ShapeTarget } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';
    import { SectionGroup, SectionItem } from '../shared';
    import BaseSection from './BaseSection.svelte';

    interface Props {
        /** The NodeShape to show targets for */
        subject: NamedNode | BlankNode;
        /** Section title */
        title?: string;
        /** Initially collapsed? */
        collapsed?: boolean;
        /** Callback when a target resource is clicked for navigation */
        onnavigate?: (resource: NamedNode | BlankNode) => void;
        /** Callback to add a new target */
        onadd?: (subject: NamedNode | BlankNode) => void;
        /** Callback to remove a target */
        onremove?: (subject: NamedNode | BlankNode, target: ShapeTarget) => void;
    }

    let {
        subject,
        title = 'Targets',
        collapsed = false,
        onnavigate,
        onadd,
        onremove
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Use context navigation as fallback if prop isn't provided
    const navigateToResource = $derived(onnavigate ?? ctx.navigation.toResource);

    // Get targets for this shape
    const targets = $derived(getShapeTargets(store, subject));

    // Group targets by type for display
    const groupedTargets = $derived.by(() => {
        const groups: Record<string, ShapeTarget[]> = {
            class: [],
            node: [],
            subjectsOf: [],
            objectsOf: []
        };
        for (const target of targets) {
            groups[target.type].push(target);
        }
        return groups;
    });

    // Labels for target types
    const typeLabels: Record<string, string> = {
        class: 'Target Class',
        node: 'Target Node',
        subjectsOf: 'Subjects Of',
        objectsOf: 'Objects Of'
    };

    function isNavigable(target: ShapeTarget): boolean {
        return target.value.termType === 'NamedNode' || target.value.termType === 'BlankNode';
    }
</script>

<BaseSection
    {title}
    count={targets.length}
    {collapsed}
    emptyMessage="No targets defined"
    onadd={onadd ? () => onadd?.(subject) : undefined}
    addTitle="Add target"
>
    <div class="divide-y">
        {#each Object.entries(groupedTargets) as [type, typeTargets] (type)}
            {#if typeTargets.length > 0}
                <SectionGroup
                    label={typeLabels[type]}
                    count={typeTargets.length}
                    collapsible={false}
                >
                    {#each typeTargets as target (target.value.value)}
                        {@const canNavigate = isNavigable(target)}
                        {@const compactIri = target.value.termType === 'NamedNode' ? toCompactIri(target.value.value) : target.value.value}
                        
                        <SectionItem
                            label={target.displayValue}
                            sublabel={compactIri}
                            navigable={canNavigate && !!navigateToResource}
                            onnavigate={canNavigate && navigateToResource ? () => navigateToResource?.(target.value as NamedNode | BlankNode) : undefined}
                            onremove={onremove ? () => onremove?.(subject, target) : undefined}
                        />
                    {/each}
                </SectionGroup>
            {/if}
        {/each}
    </div>
</BaseSection>
