<script lang="ts">
    /**
     * SerializeDialog - RDF Serialization View
     * 
     * Extracts and displays quads for the resource in Turtle format.
     * For ObjectTypes: includes sh:property shapes if NodeShape.
     * For ObjectProperties: includes related shapes.
     */
    import { Writer, type Quad } from 'n3';
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { ScrollArea } from "$lib/components/ui/scroll-area/index.js";
    import { Copy, Check } from "@lucide/svelte";
    
    import type { GraphPointer } from 'clownface';
    import type { NamedNode, BlankNode } from '@rdfjs/types';
    import type { Store } from 'n3';
    import { ns } from '$lib/stores/rdf.svelte';
    import { getCompactURI } from '$lib/rdf/utils';

    interface Props {
        open: boolean;
        pointer: GraphPointer<NamedNode | BlankNode, Store>;
        iri: string;
        kind: 'objectType' | 'objectProperty';
    }

    let { open = $bindable(), pointer, iri, kind }: Props = $props();
    let copied = $state(false);
    
    const PREFIXES: Record<string, string> = {
        rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        owl: 'http://www.w3.org/2002/07/owl#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        sh: 'http://www.w3.org/ns/shacl#',
        skos: 'http://www.w3.org/2004/02/skos/core#',
        schema: 'https://schema.org/',
        rxyz: 'http://robsyc.xyz/',
    };
    
    function extractQuads(): Quad[] {
        if (!pointer.term || !pointer.dataset) return [];
        
        const quads: Quad[] = [];
        const seen = new Set<string>();
        const dataset = pointer.dataset;
        const subject = pointer.term;
        
        const addQuad = (q: Quad) => {
            const key = `${q.subject.value}|${q.predicate.value}|${q.object.value}`;
            if (!seen.has(key)) { seen.add(key); quads.push(q); }
        };
        
        // Recursively add quads for blank nodes
        const addBlankNodeQuads = (bn: any, depth = 0) => {
            if (depth > 5) return; // Prevent infinite recursion
            for (const bnQ of dataset.match(bn, null, null, null)) {
                addQuad(bnQ as Quad);
                if ((bnQ as Quad).object.termType === 'BlankNode') {
                    addBlankNodeQuads((bnQ as Quad).object, depth + 1);
                }
            }
        };
        
        // Direct outgoing triples from the resource
        for (const q of dataset.match(subject as any, null, null, null)) {
            addQuad(q as Quad);
            if (q.object.termType === 'BlankNode') {
                addBlankNodeQuads(q.object);
            }
        }
        
        // For ObjectTypes: include sh:property targets (PropertyShapes)
        if (kind === 'objectType') {
            for (const propPtr of pointer.out(ns.sh('property')).toArray()) {
                if (propPtr.term) {
                    for (const q of dataset.match(propPtr.term as any, null, null, null)) {
                        addQuad(q as Quad);
                        if (q.object.termType === 'BlankNode') {
                            addBlankNodeQuads(q.object);
                        }
                    }
                }
            }
        }
        
        return quads;
    }
    
    function serialize(quads: Quad[]): string {
        if (quads.length === 0) return '# No triples found.';
        const writer = new Writer({ format: 'Turtle', prefixes: PREFIXES });
        writer.addQuads(quads);
        let result = '';
        writer.end((err, out) => { result = err ? `# Error: ${err.message}` : out; });
        return result;
    }
    
    const quads = $derived.by(() => open ? extractQuads() : []);
    const turtleText = $derived.by(() => open ? serialize(quads) : '');
    
    async function copyToClipboard() {
        await navigator.clipboard.writeText(turtleText);
        copied = true;
        setTimeout(() => copied = false, 2000);
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-3xl max-h-[85vh]">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                RDF Serialization
                <Badge variant="outline" class="font-mono text-xs">Turtle</Badge>
            </Dialog.Title>
            <Dialog.Description>
                <code class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{getCompactURI(iri)}</code>
                <span class="text-xs ml-2">({quads.length} triples)</span>
            </Dialog.Description>
        </Dialog.Header>
        
        <div class="relative">
            <Button variant="outline" size="sm" class="absolute top-2 right-2 z-10" onclick={copyToClipboard}>
                {#if copied}<Check class="h-4 w-4 mr-1 text-green-500" />Copied{:else}<Copy class="h-4 w-4 mr-1" />Copy{/if}
            </Button>
            <ScrollArea class="h-[50vh] w-full rounded-md border bg-muted/30 p-4">
                <pre class="text-xs font-mono whitespace-pre-wrap break-words">{turtleText}</pre>
            </ScrollArea>
        </div>
    </Dialog.Content>
</Dialog.Root>
