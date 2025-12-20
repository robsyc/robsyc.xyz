<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { Trash2, ExternalLink } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { getRdfContext } from '../context';
    import { getShapeTargets, type ShapeTarget } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';
    import { IriTooltip } from '../shared';
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

    function handleNavigate(target: ShapeTarget) {
        if (target.value.termType === 'NamedNode' || target.value.termType === 'BlankNode') {
            onnavigate?.(target.value as NamedNode | BlankNode);
        }
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
    {#each Object.entries(groupedTargets) as [type, typeTargets] (type)}
        {#if typeTargets.length > 0}
            <div class="py-2 px-3 border-b last:border-b-0">
                <div class="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span class="w-3"></span>
                    <span class="font-medium">{typeLabels[type]}</span>
                    {#if typeTargets.length > 1}
                        <Badge variant="secondary" class="text-xs h-5">
                            {typeTargets.length}
                        </Badge>
                    {/if}
                </div>
                
                <div class="space-y-1 pl-5">
                    {#each typeTargets as target (target.value.value)}
                        {@const isNavigable = target.value.termType === 'NamedNode' || target.value.termType === 'BlankNode'}
                        {@const compactIri = target.value.termType === 'NamedNode' ? toCompactIri(target.value.value) : target.value.value}
                        
                        <div class="flex items-center justify-between group py-1">
                            {#if isNavigable && target.value.termType === 'NamedNode'}
                                <IriTooltip
                                    term={target.value as NamedNode}
                                    class="flex flex-col items-start min-w-0 text-left {onnavigate ? 'hover:text-primary cursor-pointer' : ''}"
                                    onclick={onnavigate ? () => handleNavigate(target) : undefined}
                                >
                                    <span class="text-sm font-medium truncate {onnavigate ? 'hover:underline' : ''}">{target.displayValue}</span>
                                    <span class="text-xs text-muted-foreground font-mono truncate">{compactIri}</span>
                                </IriTooltip>
                            {:else}
                                <div class="flex flex-col items-start min-w-0">
                                    <span class="text-sm font-medium truncate">{target.displayValue}</span>
                                    <span class="text-xs text-muted-foreground font-mono truncate">{compactIri}</span>
                                </div>
                            {/if}
                            
                            {#if onremove}
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        class="h-6 w-6 text-destructive"
                                        onclick={() => onremove?.(subject, target)}
                                        title="Remove"
                                    >
                                        <Trash2 class="h-3 w-3" />
                                    </Button>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    {/each}
</BaseSection>
