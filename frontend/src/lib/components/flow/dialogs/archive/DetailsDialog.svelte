<script lang="ts">
    /**
     * DetailsDialog - Details View with Editable Annotations
     * 
     * Shows structured information based on the type (ObjectType or ObjectProperty).
     * Content computed only when dialog opens to avoid performance issues.
     * Annotations section now supports editing via AnnotationsSection component.
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
    import { detectObjectProperty } from '$lib/rdf/type-detection';
    import { getCompactURI, getLocalName } from '$lib/rdf/utils';
    
    // New editable annotations component
    import { AnnotationsSection } from './archive/annotations';

    interface Props {
        open: boolean;
        pointer: GraphPointer<NamedNode | BlankNode, Store>;
        iri: string;
        kind: 'objectType' | 'objectProperty';
        flags: ObjectTypeFlags | ObjectPropertyFlags;
    }

    let { open = $bindable(), pointer, iri, kind, flags }: Props = $props();
    
    // Section collapse states
    let hierarchyOpen = $state(true);
    let shaclOpen = $state(true);
    let domainRangeOpen = $state(true);
    let characteristicsOpen = $state(true);
    
    const objectFlags = $derived(kind === 'objectType' ? flags as ObjectTypeFlags : null);
    
    // For ObjectProperties, recalculate flags from the current pointer
    const propertyFlags = $derived.by(() => {
        if (kind !== 'objectProperty') return null;
        return detectObjectProperty(pointer);
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HIERARCHY (ObjectTypes) - Superclasses and Subclasses
    // ═══════════════════════════════════════════════════════════════════════════
    
    interface HierarchyEntry {
        iri: string;
        predicate: string;
        predicateLabel: string;
    }
    
    const hierarchy = $derived.by(() => {
        if (!open || kind !== 'objectType') return { superclasses: [] as HierarchyEntry[], subclasses: [] as HierarchyEntry[] };
        
        // Collect superclasses (parents) with their predicate
        const superclassMap = new Map<string, HierarchyEntry>();
        
        pointer.out(ns.rdfs('subClassOf')).values.forEach(v => {
            // rdfs:subClassOf is stronger - override if already exists via broader
            superclassMap.set(v, { iri: v, predicate: 'rdfs:subClassOf', predicateLabel: 'subClassOf' });
        });
        
        pointer.out(ns.skos('broader')).values.forEach(v => {
            // Only add broader if not already present via subClassOf
            if (!superclassMap.has(v)) {
                superclassMap.set(v, { iri: v, predicate: 'skos:broader', predicateLabel: 'broader' });
            }
        });
        
        // Collect subclasses (children) with their predicate
        const subclassMap = new Map<string, HierarchyEntry>();
        
        pointer.in(ns.rdfs('subClassOf')).values.forEach(v => {
            subclassMap.set(v, { iri: v, predicate: '^rdfs:subClassOf', predicateLabel: 'subClassOf' });
        });
        
        pointer.in(ns.skos('broader')).values.forEach(v => {
            // ^broader = narrower; only add if not already present
            if (!subclassMap.has(v)) {
                subclassMap.set(v, { iri: v, predicate: 'skos:narrower', predicateLabel: 'narrower' });
            }
        });
        
        return {
            superclasses: Array.from(superclassMap.values()),
            subclasses: Array.from(subclassMap.values())
        };
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SHACL PROPERTIES (NodeShapes)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const shaclProperties = $derived.by(() => {
        if (!open || kind !== 'objectType' || !objectFlags?.isNodeShape) return [];
        
        return pointer.out(ns.sh('property')).toArray().map((propPtr, index) => {
            const pathTerm = propPtr.out(ns.sh('path')).term;
            return {
                id: propPtr.term?.value ?? `prop-${index}`,
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
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DOMAIN/RANGE (ObjectProperties)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const domainRange = $derived.by(() => {
        if (!open || kind !== 'objectProperty') return null;
        return {
            domain: [...new Set(pointer.out(ns.rdfs('domain')).values)].map(v => ({ iri: v, local: getLocalName(v) })),
            range: [...new Set(pointer.out(ns.rdfs('range')).values)].map(v => ({ iri: v, local: getLocalName(v) })),
            domainIncludes: [...new Set(pointer.out(ns.schema('domainIncludes')).values)].map(v => ({ iri: v, local: getLocalName(v) })),
            rangeIncludes: [...new Set(pointer.out(ns.schema('rangeIncludes')).values)].map(v => ({ iri: v, local: getLocalName(v) })),
        };
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PROPERTY HIERARCHY (ObjectProperties)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const propertyHierarchy = $derived.by(() => {
        if (!open || kind !== 'objectProperty') return { parents: [] as string[], children: [] as string[] };
        
        return {
            parents: [...new Set(pointer.out(ns.rdfs('subPropertyOf')).values)],
            children: [...new Set(pointer.in(ns.rdfs('subPropertyOf')).values)],
        };
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PROPERTY CHARACTERISTICS (ObjectProperties)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const characteristics = $derived.by(() => {
        if (!open || kind !== 'objectProperty' || !propertyFlags) return [];
        const chars: { id: string; label: string }[] = [];
        if (propertyFlags.isFunctional) chars.push({ id: 'functional', label: 'Functional' });
        if (propertyFlags.isSymmetric) chars.push({ id: 'symmetric', label: 'Symmetric' });
        if (propertyFlags.isTransitive) chars.push({ id: 'transitive', label: 'Transitive' });
        if (propertyFlags.hasInverse) chars.push({ id: 'inverse', label: `owl:inverseOf ${getLocalName(propertyFlags.inverseIri!)}` });
        if (propertyFlags.hasPropertyChain) chars.push({ id: 'chain', label: 'Has Property Chain' });
        return chars;
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-4xl max-h-[95vh]">
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
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- ANNOTATIONS SECTION (Editable) -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
                {#if open}
                    <AnnotationsSection {pointer} {iri} />
                {/if}
                
                <Separator />
                
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- HIERARCHY SECTION (ObjectTypes) -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
                {#if kind === 'objectType'}
                    <Collapsible.Root bind:open={hierarchyOpen}>
                        <Collapsible.Trigger class="w-full">
                            <Button variant="ghost" class="w-full justify-start gap-2 font-semibold">
                                {#if hierarchyOpen}<ChevronDown class="h-4 w-4" />{:else}<ChevronRight class="h-4 w-4" />{/if}
                                Hierarchy
                                {#if hierarchy.superclasses.length > 0 || hierarchy.subclasses.length > 0}
                                    <Badge variant="secondary" class="ml-auto text-xs">
                                        {hierarchy.superclasses.length}↑ {hierarchy.subclasses.length}↓
                                    </Badge>
                                {/if}
                            </Button>
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <div class="pl-6 space-y-4 pt-2">
                                <!-- Superclasses -->
                                <div>
                                    <span class="text-sm font-medium text-muted-foreground">Superclasses</span>
                                    {#if hierarchy.superclasses.length > 0}
                                        <div class="mt-2 space-y-1">
                                            {#each hierarchy.superclasses as entry (`super-${entry.iri}-${entry.predicate}`)}
                                                <div class="flex items-center gap-2 text-sm">
                                                    <Badge variant="secondary" class="font-mono text-xs shrink-0">
                                                        {entry.predicateLabel}
                                                    </Badge>
                                                    <code class="text-xs truncate" title={entry.iri}>
                                                        {getLocalName(entry.iri)}
                                                    </code>
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <p class="text-sm text-muted-foreground italic mt-1">None (root class)</p>
                                    {/if}
                                </div>
                                
                                <!-- Subclasses -->
                                <div>
                                    <span class="text-sm font-medium text-muted-foreground">Subclasses</span>
                                    {#if hierarchy.subclasses.length > 0}
                                        <div class="mt-2 space-y-1">
                                            {#each hierarchy.subclasses as entry (`sub-${entry.iri}-${entry.predicate}`)}
                                                <div class="flex items-center gap-2 text-sm">
                                                    <Badge variant="outline" class="font-mono text-xs shrink-0">
                                                        {entry.predicateLabel}
                                                    </Badge>
                                                    <code class="text-xs truncate" title={entry.iri}>
                                                        {getLocalName(entry.iri)}
                                                    </code>
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <p class="text-sm text-muted-foreground italic mt-1">None</p>
                                    {/if}
                                </div>
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- SHACL PROPERTIES (NodeShapes) -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
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
                                    {#each shaclProperties as prop (prop.id)}
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
                
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- DOMAIN/RANGE (ObjectProperties) -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
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
                                            {#each domainRange.domain as d, idx (`domain-${idx}-${d.iri}`)}
                                                <Badge variant="secondary" title={d.iri}>{d.local}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if domainRange.domainIncludes.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">schema:domainIncludes</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.domainIncludes as d, idx (`domainInc-${idx}-${d.iri}`)}
                                                <Badge variant="outline" title={d.iri}>{d.local}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if domainRange.range.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">rdfs:range</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.range as r, idx (`range-${idx}-${r.iri}`)}
                                                <Badge variant="secondary" title={r.iri}>{r.local}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if domainRange.rangeIncludes.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">schema:rangeIncludes</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each domainRange.rangeIncludes as r, idx (`rangeInc-${idx}-${r.iri}`)}
                                                <Badge variant="outline" title={r.iri}>{r.local}</Badge>
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
                
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- CHARACTERISTICS (ObjectProperties) -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
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
                                    {#each characteristics as char (char.id)}
                                        <Badge variant="outline">{char.label}</Badge>
                                    {/each}
                                </div>
                            </div>
                        </Collapsible.Content>
                    </Collapsible.Root>
                    <Separator />
                {/if}
                
                <!-- ═══════════════════════════════════════════════════════════════ -->
                <!-- PROPERTY HIERARCHY (ObjectProperties) -->
                <!-- ═══════════════════════════════════════════════════════════════ -->
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
                                            {#each propertyHierarchy.parents as parent, idx (`propParent-${idx}-${parent}`)}
                                                <Badge variant="secondary" class="font-mono" title={parent}>{getLocalName(parent)}</Badge>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}
                                {#if propertyHierarchy.children.length > 0}
                                    <div>
                                        <span class="text-sm font-medium text-muted-foreground">Sub-properties</span>
                                        <div class="flex flex-wrap gap-1 mt-1">
                                            {#each propertyHierarchy.children as child, idx (`propChild-${idx}-${child}`)}
                                                <Badge variant="outline" class="font-mono" title={child}>{getLocalName(child)}</Badge>
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
