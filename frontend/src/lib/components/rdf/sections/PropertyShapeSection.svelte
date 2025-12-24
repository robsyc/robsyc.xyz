<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { ChevronDown, ChevronRight, Pencil, Trash2 } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { getRdfContext } from '../context';
    import { getPropertyShapes, getCardinalityLabel, type PropertyShapeInfo } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';
    import { IriTooltip } from '../shared';
    import { createExpandableSet } from '$lib/utils/expandable.svelte';
    import BaseSection from './BaseSection.svelte';

    interface Props {
        /** The NodeShape to show property shapes for */
        subject: NamedNode | BlankNode;
        /** Section title */
        title?: string;
        /** Initially collapsed? */
        collapsed?: boolean;
        /** Callback when a property shape is clicked for navigation */
        onnavigate?: (shape: NamedNode | BlankNode) => void;
        /** Callback when a path property is clicked */
        onpathclick?: (path: NamedNode) => void;
        /** Callback to add a new property shape */
        onadd?: (subject: NamedNode | BlankNode) => void;
        /** Callback to edit a property shape */
        onedit?: (subject: NamedNode | BlankNode, shape: PropertyShapeInfo) => void;
        /** Callback to remove a property shape */
        onremove?: (subject: NamedNode | BlankNode, shape: PropertyShapeInfo) => void;
    }

    let {
        subject,
        title = 'Properties',
        collapsed = false,
        onnavigate,
        onpathclick,
        onadd,
        onedit,
        onremove
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Use context navigation as fallback if prop isn't provided
    const navigateToPredicate = $derived(onpathclick ?? ctx.navigation.toPredicate);

    // Track expanded property shapes (for showing constraints)
    const expanded = createExpandableSet();

    // Get property shapes for this NodeShape
    const propertyShapes = $derived(getPropertyShapes(store, subject));

    // Get path display
    function getPathDisplay(shape: PropertyShapeInfo): { label: string; iri: string } {
        if (!shape.path) return { label: '(no path)', iri: '' };
        
        if (shape.path.termType === 'NamedNode') {
            return {
                label: shape.name ?? toCompactIri(shape.path.value),
                iri: toCompactIri(shape.path.value)
            };
        }
        
        // Complex path (blank node) - use precomputed display string when available
        return {
            label: shape.name ?? (shape.pathDisplay ?? 'Complex path'),
            iri: shape.pathDisplay ?? ''
        };
    }

    // Get constraint badges for summary display
    function getConstraintBadges(shape: PropertyShapeInfo): string[] {
        const badges: string[] = [];
        
        // Cardinality
        const cardinality = getCardinalityLabel(shape.minCount, shape.maxCount);
        if (cardinality) badges.push(cardinality);
        
        // Datatype
        if (shape.datatype) {
            badges.push(toCompactIri(shape.datatype.value));
        }
        
        // Pattern
        if (shape.constraints.pattern) {
            badges.push('pattern');
        }
        
        // Length constraints
        if (shape.constraints.minLength || shape.constraints.maxLength) {
            badges.push('length');
        }
        
        // Range constraints
        if (shape.constraints.minInclusive || shape.constraints.maxInclusive ||
            shape.constraints.minExclusive || shape.constraints.maxExclusive) {
            badges.push('range');
        }
        
        return badges;
    }
</script>

<BaseSection
    {title}
    count={propertyShapes.length}
    {collapsed}
    emptyMessage="No property shapes"
    onadd={onadd ? () => onadd?.(subject) : undefined}
    addTitle="Add property"
>
    <div class="divide-y">
        {#each propertyShapes as shape (shape.shape.value)}
            {@const pathInfo = getPathDisplay(shape)}
            {@const badges = getConstraintBadges(shape)}
            {@const isExpanded = expanded.has(shape.shape.value)}
            {@const hasDetails = shape.description || Object.keys(shape.constraints).length > 0}
            
            <div class="py-2 px-3">
                <!-- Property header -->
                <div class="flex items-center justify-between group/header">
                    <div class="flex items-center gap-2 min-w-0">
                        <!-- Expand button -->
                        <button
                            type="button"
                            class="p-0.5 hover:bg-muted rounded shrink-0"
                            class:invisible={!hasDetails}
                            onclick={() => expanded.toggle(shape.shape.value)}
                        >
                            {#if isExpanded}
                                <ChevronDown class="h-3 w-3 text-muted-foreground" />
                            {:else}
                                <ChevronRight class="h-3 w-3 text-muted-foreground" />
                            {/if}
                        </button>
                        
                        <!-- Path/name -->
                        {#if shape.path?.termType === 'NamedNode' && navigateToPredicate}
                            <IriTooltip
                                term={shape.path as NamedNode}
                                class="font-medium text-sm hover:text-primary hover:underline cursor-pointer truncate"
                                onclick={() => navigateToPredicate?.(shape.path as NamedNode)}
                            >
                                {pathInfo.label}
                            </IriTooltip>
                        {:else}
                            <span class="font-medium text-sm truncate">{pathInfo.label}</span>
                        {/if}
                        
                        <!-- Constraint badges -->
                        <div class="flex items-center gap-1 shrink-0">
                            {#each badges.slice(0, 3) as badge (badge)}
                                <Badge variant="outline" class="text-xs h-5 px-1.5">
                                    {badge}
                                </Badge>
                            {/each}
                            {#if badges.length > 3}
                                <Badge variant="outline" class="text-xs h-5 px-1.5">
                                    +{badges.length - 3}
                                </Badge>
                            {/if}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div class="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0">
                        {#if onedit}
                            <Button
                                variant="ghost"
                                size="icon"
                                class="h-6 w-6"
                                onclick={() => onedit?.(subject, shape)}
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
                                onclick={() => onremove?.(subject, shape)}
                                title="Remove"
                            >
                                <Trash2 class="h-3 w-3" />
                            </Button>
                        {/if}
                    </div>
                </div>
                
                <!-- Expanded details -->
                {#if isExpanded && hasDetails}
                    <div class="mt-2 pl-6 space-y-2 text-sm">
                        <!-- Description -->
                        {#if shape.description}
                            <p class="text-muted-foreground">{shape.description}</p>
                        {/if}
                        
                        <!-- Path IRI (if named) -->
                        {#if pathInfo.iri}
                            <div class="flex items-center gap-2">
                                <span class="text-muted-foreground">Path:</span>
                                <code class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{pathInfo.iri}</code>
                            </div>
                        {/if}
                        
                        <!-- Constraints grid -->
                        {#if Object.keys(shape.constraints).length > 0}
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                                {#each Object.entries(shape.constraints) as [key, value] (key)}
                                    <div class="flex items-center gap-2">
                                        <span class="text-muted-foreground">{key}:</span>
                                        <code class="text-xs font-mono bg-muted px-1.5 py-0.5 rounded truncate">{value}</code>
                                    </div>
                                {/each}
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</BaseSection>
