<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { getRdfContext } from '../context';
    import { getAnnotationsGrouped, removeAnnotation, type AnnotationValue } from '$lib/rdf/queries';
    import { PREFIXES } from '$lib/rdf/namespaces';
    import { SectionGroup, SectionItem } from '../shared';
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
        onedit,
        onpredicateclick,
        onvalueclick
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Use context navigation as fallback if props aren't provided
    const navigateToPredicate = $derived(onpredicateclick ?? ctx.navigation.toPredicate);
    const navigateToResource = $derived(onvalueclick ?? ctx.navigation.toResource);

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
                navigateToResource?.(obj as NamedNode);
            } else {
                window.open(obj.value, '_blank', 'noopener,noreferrer');
            }
        }
    }

    function isNamedNodeValue(value: AnnotationValue): boolean {
        return value.quad.object.termType === 'NamedNode';
    }

    function getValueBadges(value: AnnotationValue): Array<{ text: string; variant?: 'outline' | 'secondary' }> {
        const badges: Array<{ text: string; variant?: 'outline' | 'secondary' }> = [];
        if (value.language) {
            badges.push({ text: `@${value.language}`, variant: 'secondary' });
        }
        return badges;
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
            <SectionGroup
                label={group.label}
                count={group.values.length}
                onnavigate={navigateToPredicate ? () => navigateToPredicate?.(group.predicate) : undefined}
            >
                {#each group.values as value (value.quad.object.value + (value.language ?? ''))}
                    {@const isLink = isNamedNodeValue(value)}
                    {@const isExternal = isLink && !isInternalUri(value.quad.object.value)}
                    {@const isInternal = isLink && isInternalUri(value.quad.object.value)}
                    
                    <SectionItem
                        label={value.displayValue}
                        badges={getValueBadges(value)}
                        navigable={isLink}
                        external={isExternal}
                        onnavigate={isInternal ? () => handleValueClick(value) : (isExternal ? () => handleValueClick(value) : undefined)}
                        onedit={onedit ? () => onedit?.(value) : undefined}
                        onremove={() => handleRemove(value)}
                    />
                {/each}
            </SectionGroup>
        {/each}
    </div>
</BaseSection>
