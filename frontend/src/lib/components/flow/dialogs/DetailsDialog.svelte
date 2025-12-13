<script lang="ts">
    /**
     * DetailsDialog - Read-only Details View
     * 
     * Shows structured information based on the type (ObjectType or ObjectProperty).
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
    import type { ObjectTypeFlags, ObjectPropertyFlags } from '$lib/rdf/type-detection';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';

    interface Props {
        open: boolean;
        pointer: GraphPointer<NamedNode | BlankNode, Store>;
        iri: string;
        kind: 'objectType' | 'objectProperty';
        flags: ObjectTypeFlags | ObjectPropertyFlags;
    }

    let { open = $bindable(), pointer, iri, kind, flags }: Props = $props();
    
    let annotationsOpen = $state(true);
    let hierarchyOpen = $state(true);
    let shaclOpen = $state(true);
    let domainRangeOpen = $state(true);
    let characteristicsOpen = $state(true);
    
    const objectFlags = $derived(kind === 'objectType' ? flags as ObjectTypeFlags : null);
    const propertyFlags = $derived(kind === 'objectProperty' ? flags as ObjectPropertyFlags : null);
    
    // Annotations
    const annotations = $derived.by(() => {
        if (!open) return { label: null, comment: null, seeAlso: [] as string[] };
        return {
            label: pointer.out(ns.rdfs('label')).value,
            comment: pointer.out(ns.rdfs('comment')).value,
            seeAlso: pointer.out(ns.rdfs('seeAlso')).values,
        };
    });
    
    // Hierarchy (for ObjectTypes)
    const hierarchy = $derived.by(() => {
        if (!open || kind !== 'objectType') return { parents: [], children: [] };
        
        const parents = [
            ...pointer.out(ns.rdfs('subClassOf')).values.map(v => ({ iri: v, type: 'subClassOf' })),
            ...pointer.out(ns.skos('broader')).values.map(v => ({ iri: v, type: 'broader' })),
        ];
        
        const children = [
            ...pointer.in(ns.rdfs('subClassOf')).values.map(v => ({ iri: v, type: 'subClassOf' })),
            ...pointer.in(ns.skos('broader')).values.map(v => ({ iri: v, type: 'narrower' })),
        ];
        
        return { parents, children };
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
                classTarget: propPtr.out(ns.sh('class')).value ? getLocalName(propPtr.out(ns.sh('class')).value!) : undefined,
                minCount: propPtr.out(ns.sh('minCount')).value,
                maxCount: propPtr.out(ns.sh('maxCount')).value,
                name: propPtr.out(ns.sh('name')).value,
                description: propPtr.out(ns.sh('description')).value,
            };
        }).filter(p => p.pathIri);
    });
    
    // Domain/Range (for ObjectProperties)
    const domainRange = $derived.by(() => {
        if (!open || kind !== 'objectProperty') return null;
        return {
            domain: pointer.out(ns.rdfs('domain')).values.map(v => getLocalName(v)),
            range: pointer.out(ns.rdfs('range')).values.map(v => getLocalName(v)),
            domainIncludes: pointer.out(ns.schema('domainIncludes')).values.map(v => getLocalName(v)),
            rangeIncludes: pointer.out(ns.schema('rangeIncludes')).values.map(v => getLocalName(v)),
        };
    });
    
    // Property hierarchy (for ObjectProperties)
    const propertyHierarchy = $derived.by(() => {
        if (!open || kind !== 'objectProperty') return { parents: [], children: [] };
        
        return {
            parents: pointer.out(ns.rdfs('subPropertyOf')).values.map(v => getLocalName(v)),
            children: pointer.in(ns.rdfs('subPropertyOf')).values.map(v => getLocalName(v)),
        };
    });
    
    // Property characteristics (for ObjectProperties)
    const characteristics = $derived.by(() => {
        if (!open || kind !== 'objectProperty' || !propertyFlags) return [];
        const chars: string[] = [];
        if (propertyFlags.isFunctional) chars.push('Functional');
        if (propertyFlags.isSymmetric) chars.push('Symmetric');
        if (propertyFlags.isTransitive) chars.push('Transitive');
        if (propertyFlags.hasInverse) chars.push(`Inverse: ${getLocalName(propertyFlags.inverseIri!)}`);
        if (propertyFlags.hasPropertyChain) chars.push('Has Property Chain');
        return chars;
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-2xl max-h-[85vh]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                Details
                <Badge variant="outline" class="font-mono text-xs">
                    {kind === 'objectType' ? 'ObjectType' : 'ObjectProperty'}
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
                
                <!-- Hierarchy (ObjectTypes) -->
                {#if kind === 'objectType' && (hierarchy.parents.length > 0 || hierarchy.children.length > 0)}
                    <Collapsible.Root bind:open={hierarchyOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if hierarchyOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                Class Hierarchy
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-3 pt-2">
                                {#if hierarchy.parents.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">Superclasses</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each hierarchy.parents as parent (parent.iri)}
                                                <Badge variant="secondary" class="font-mono">
                                                    {getLocalName(parent.iri)}
                                                    <span class="text-xs text-muted-foreground ml-1">({parent.type})</span>
                                                </Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if hierarchy.children.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">Subclasses</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each hierarchy.children as child (child.iri)}
                                                <Badge variant="outline" class="font-mono">
                                                    {getLocalName(child.iri)}
                                                    <span class="text-xs text-muted-foreground ml-1">({child.type})</span>
                                                </Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
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
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <Badge variant="outline" class="font-mono">{prop.path}</Badge>
                                                {#if prop.nodeTarget}
                                                    <span class="text-xs text-muted-foreground">→ sh:node</span>
                                                    <Badge variant="secondary" class="font-mono">{prop.nodeTarget}</Badge>
                                                {/if}
                                                {#if prop.classTarget}
                                                    <span class="text-xs text-muted-foreground">→ sh:class</span>
                                                    <Badge variant="secondary" class="font-mono">{prop.classTarget}</Badge>
                                                {/if}
                                            </div>
                                            {#if prop.name}
                                                <p class="text-sm font-medium">{prop.name}</p>
                                            {/if}
                                            <div class="flex flex-wrap gap-2 text-xs">
                                                {#if prop.datatype}
                                                    <span class="text-muted-foreground">datatype: <code>{prop.datatype}</code></span>
                                                {/if}
                                                {#if prop.minCount || prop.maxCount}
                                                    <span class="text-muted-foreground">cardinality: [{prop.minCount ?? '0'}..{prop.maxCount ?? '*'}]</span>
                                                {/if}
                                            </div>
                                            {#if prop.description}
                                                <p class="text-xs text-muted-foreground">{prop.description}</p>
                                            {/if}
                                        </div>
                                    {/each}
                                {/if}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- Domain/Range (for ObjectProperties) -->
                {#if kind === 'objectProperty' && domainRange}
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
                                {#if domainRange.domainIncludes.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">schema:domainIncludes</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.domainIncludes as d (d)}
                                                <Badge variant="outline">{d}</Badge>
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
                                {#if domainRange.rangeIncludes.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">schema:rangeIncludes</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.rangeIncludes as r (r)}
                                                <Badge variant="outline">{r}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if domainRange.domain.length === 0 && domainRange.range.length === 0 && domainRange.domainIncludes.length === 0 && domainRange.rangeIncludes.length === 0}
                                    <p class="text-sm text-muted-foreground italic">No domain/range defined</p>
                                {/if}
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- Property Characteristics (for ObjectProperties) -->
                {#if kind === 'objectProperty' && characteristics.length > 0}
                    <Collapsible.Root bind:open={characteristicsOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if characteristicsOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                Characteristics
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-2 pt-2">
                                <div class="flex flex-wrap gap-2">
                                    {#each characteristics as char (char)}
                                        <Badge variant="outline">{char}</Badge>
                                    {/each}
                                </div>
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- Property Hierarchy (for ObjectProperties) -->
                {#if kind === 'objectProperty' && (propertyHierarchy.parents.length > 0 || propertyHierarchy.children.length > 0)}
                    <Collapsible.Root bind:open={hierarchyOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if hierarchyOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                Property Hierarchy
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-3 pt-2">
                                {#if propertyHierarchy.parents.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">Super-properties</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each propertyHierarchy.parents as parent (parent)}
                                                <Badge variant="secondary" class="font-mono">{parent}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if propertyHierarchy.children.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">Sub-properties</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each propertyHierarchy.children as child (child)}
                                                <Badge variant="outline" class="font-mono">{child}</Badge>
                                            {/each}
                                        </div>
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

