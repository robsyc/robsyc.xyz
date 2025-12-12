<script lang="ts">
    /**
     * DetailsDialog - Read-only Details View
     * 
     * Shows structured information based on the type (ObjectType or LinkType).
     * Content computed only when dialog opens to avoid performance issues.
     */
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import * as Collapsible from "$lib/components/ui/collapsible/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import { ChevronDown, ChevronRight, ExternalLink } from "@lucide/svelte";
    
    import type { GraphPointer } from 'clownface';
    import type { NamedNode, BlankNode } from '@rdfjs/types';
    import type { Store } from 'n3';
    import { ns } from '$lib/stores/rdf.svelte';
    import type { ObjectTypeFlags, LinkTypeFlags, PropertyShapeInfo } from '$lib/rdf/type-detection';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';

    interface Props {
        open: boolean;
        pointer: GraphPointer<NamedNode | BlankNode, Store>;
        iri: string;
        kind: 'objectType' | 'linkType';
        flags: ObjectTypeFlags | LinkTypeFlags;
        propertyShape?: PropertyShapeInfo;
    }

    let { open = $bindable(), pointer, iri, kind, flags, propertyShape }: Props = $props();
    
    let annotationsOpen = $state(true);
    let shaclOpen = $state(true);
    let domainRangeOpen = $state(true);
    
    const objectFlags = $derived(kind === 'objectType' ? flags as ObjectTypeFlags : null);
    const linkFlags = $derived(kind === 'linkType' ? flags as LinkTypeFlags : null);
    
    // Annotations
    const annotations = $derived.by(() => {
        if (!open) return { label: null, comment: null, seeAlso: [] as string[] };
        return {
            label: pointer.out(ns.rdfs('label')).value,
            comment: pointer.out(ns.rdfs('comment')).value,
            seeAlso: pointer.out(ns.rdfs('seeAlso')).values,
        };
    });
    
    // SHACL properties (for NodeShapes)
    const shaclProperties = $derived.by(() => {
        if (!open || kind !== 'objectType' || !objectFlags?.isNodeShape) return [];
        
        return pointer.out(ns.sh('property')).toArray().map(propPtr => {
            const pathTerm = propPtr.out(ns.sh('path')).term;
            return {
                path: pathTerm ? getLocalName(pathTerm.value) : '?',
                pathIri: pathTerm?.value ?? '',
                datatype: propPtr.out(ns.sh('datatype')).value ? getLocalName(propPtr.out(ns.sh('datatype')).value!) : undefined,
                nodeTarget: propPtr.out(ns.sh('node')).value ? getLocalName(propPtr.out(ns.sh('node')).value!) : undefined,
                minCount: propPtr.out(ns.sh('minCount')).value,
                maxCount: propPtr.out(ns.sh('maxCount')).value,
                message: propPtr.out(ns.sh('message')).value,
            };
        }).filter(p => p.pathIri);
    });
    
    // Domain/Range (for LinkTypes)
    const domainRange = $derived.by(() => {
        if (!open || kind !== 'linkType') return null;
        return {
            domain: pointer.out(ns.rdfs('domain')).values.map(v => getLocalName(v)),
            range: pointer.out(ns.rdfs('range')).values.map(v => getLocalName(v)),
        };
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-2xl max-h-[85vh]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                Details
                <Badge variant="outline" class="font-mono text-xs">
                    {kind === 'objectType' ? 'ObjectType' : 'LinkType'}
                </Badge>
            </Dialog.Title>
            <Dialog.Description>
                <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{getCompactURI(iri)}</code>
            </Dialog.Description>
        </Dialog.Header>
        
        <ScrollArea class="h-[60vh] pr-4">
            <div class="space-y-4">
                <!-- Annotations -->
                <Collapsible.Root bind:open={annotationsOpen}>
                    <Collapsible.Trigger class="w-full">
                        <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                            {#if annotationsOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                            Annotations
                        </Button>
                    </Collapsible.Trigger>
                    <Collapsible.Content>
                        <div class="pl-6 space-y-3 pt-2">
                            {#if annotations.label}
                                <div>
                                    <span class="text-sm font-medium text-muted-foreground">rdfs:label</span>
                                    <p class="text-sm">{annotations.label}</p>
                                </div>
                            {/if}
                            {#if annotations.comment}
                                <div>
                                    <span class="text-sm font-medium text-muted-foreground">rdfs:comment</span>
                                    <p class="text-sm whitespace-pre-wrap">{annotations.comment}</p>
                                </div>
                            {/if}
                            {#if annotations.seeAlso.length > 0}
                                <div>
                                    <span class="text-sm font-medium text-muted-foreground">rdfs:seeAlso</span>
                                    <div class="flex flex-wrap gap-1 mt-1">
                                        {#each annotations.seeAlso as link (link)}
                                            <a href={link} target="_blank" class="text-xs text-primary hover:underline inline-flex items-center gap-1">
                                                {getLocalName(link)}<ExternalLink class="h-3 w-3" />
                                            </a>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            {#if !annotations.label && !annotations.comment && annotations.seeAlso.length === 0}
                                <p class="text-sm text-muted-foreground italic">No annotations defined</p>
                            {/if}
                        </div>
                    </Collapsible.Content>
                </Collapsible.Root>
                
                <Separator />
                
                <!-- SHACL Properties (ObjectTypes with NodeShape) -->
                {#if kind === 'objectType' && objectFlags?.isNodeShape}
                    <Collapsible.Root bind:open={shaclOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if shaclOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                SHACL Properties
                                <Badge variant="secondary" class="ml-auto">{shaclProperties.length}</Badge>
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-3 pt-2">
                                {#if shaclProperties.length === 0}
                                    <p class="text-sm text-muted-foreground italic">No sh:property constraints</p>
                                {:else}
                                    {#each shaclProperties as prop (prop.pathIri)}
                                        <div class="border rounded-md p-3 space-y-2">
                                            <div class="flex items-center gap-2">
                                                <Badge variant="outline" class="font-mono">{prop.path}</Badge>
                                                {#if prop.nodeTarget}
                                                    <span class="text-xs text-muted-foreground">→</span>
                                                    <Badge variant="secondary" class="font-mono">{prop.nodeTarget}</Badge>
                                                {/if}
                                            </div>
                                            <div class="flex flex-wrap gap-2 text-xs">
                                                {#if prop.datatype}
                                                    <span class="text-muted-foreground">datatype: <code>{prop.datatype}</code></span>
                                                {/if}
                                                {#if prop.minCount || prop.maxCount}
                                                    <span class="text-muted-foreground">cardinality: [{prop.minCount ?? '0'}..{prop.maxCount ?? '*'}]</span>
                                                {/if}
                                            </div>
                                            {#if prop.message}
                                                <p class="text-xs text-muted-foreground italic">{prop.message}</p>
                                            {/if}
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- Domain/Range (for LinkTypes) -->
                {#if kind === 'linkType' && domainRange}
                    <Collapsible.Root bind:open={domainRangeOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if domainRangeOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                Domain & Range
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-3 pt-2">
                                {#if domainRange.domain.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">rdfs:domain</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.domain as d (d)}
                                                <Badge variant="secondary">{d}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if domainRange.range.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">rdfs:range</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.range as r (r)}
                                                <Badge variant="secondary">{r}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if domainRange.domain.length === 0 && domainRange.range.length === 0}
                                    <p class="text-sm text-muted-foreground italic">No domain/range defined</p>
                                {/if}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- PropertyShape Constraints (for LinkTypes with wrapping shape) -->
                {#if kind === 'linkType' && propertyShape}
                    <Collapsible.Root bind:open={shaclOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if shaclOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                PropertyShape Constraints
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-3 pt-2">
                                <div class="text-xs text-muted-foreground mb-2">
                                    Shape: <code class="bg-muted px-1 rounded">{getCompactURI(propertyShape.shapeIri)}</code>
                                </div>
                                {#if propertyShape.nodeTargetIri}
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm text-muted-foreground">sh:node</span>
                                        <Badge variant="secondary" class="font-mono">{getLocalName(propertyShape.nodeTargetIri)}</Badge>
                                    </div>
                                {/if}
                                {#if propertyShape.minCount || propertyShape.maxCount}
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm text-muted-foreground">Cardinality</span>
                                        <code class="text-sm">[{propertyShape.minCount ?? '0'}..{propertyShape.maxCount ?? '*'}]</code>
                                    </div>
                                {/if}
                                {#if propertyShape.message}
                                    <div>
                                        <span class="text-sm text-muted-foreground">sh:message</span>
                                        <p class="text-sm italic">{propertyShape.message}</p>
                                    </div>
                                {/if}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                {/if}
            </div>
        </ScrollArea>
    </Dialog.Content>
</Dialog.Root>


