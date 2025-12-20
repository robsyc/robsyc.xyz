import { Store, Parser, Writer, DataFactory, Reasoner } from 'n3';
import type { Quad, NamedNode, BlankNode, Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from 'n3';

import clownface from 'clownface';
import type { GraphPointer, MultiPointer, AnyPointer } from 'clownface';

// Re-export namespaces from centralized location
export { ns } from '$lib/rdf/namespaces';
import { ns, PREFIXES } from '$lib/rdf/namespaces';

// N3.DataFactory will give you the factory functions to create triples and quads
// http://rdf.js.org/#datafactory-interface
const { namedNode, literal, quad } = DataFactory;

/****************************************************************************************
 * Reactive RDF Store wrapper around N3.Store using Svelte 5 runes.
 * Provides methods to load, query, and manipulate RDF triples.
 */
export class RdfStore {
    // Reactive version counter - increment to trigger re-derivation
    version = $state(0);

    // Batch mutation support: group multiple store writes into one reactive invalidation
    #batchDepth = 0;
    #dirty = false;

    // N3.Store for in-memory triple storage
    // If you are using multiple stores, you can reduce memory consumption by allowing them to share an entity index
    #store = new Store();
    get store(): Store {
        return this.#store;
    }

    #touch(): void {
        if (this.#batchDepth > 0) {
            this.#dirty = true;
        } else {
            this.version++;
        }
    }

    /**
     * Batch multiple mutations into a single reactive invalidation.
     * Safe for nesting.
     */
    transaction<T>(fn: () => T): T {
        this.#batchDepth++;
        try {
            return fn();
        } finally {
            this.#batchDepth--;
            if (this.#batchDepth === 0 && this.#dirty) {
                this.#dirty = false;
                this.version++;
            }
        }
    }

    /**
     * Async variant of transaction().
     * Note: batching only covers mutations performed within the awaited callback.
     */
    async transactionAsync<T>(fn: () => Promise<T>): Promise<T> {
        this.#batchDepth++;
        try {
            return await fn();
        } finally {
            this.#batchDepth--;
            if (this.#batchDepth === 0 && this.#dirty) {
                this.#dirty = false;
                this.version++;
            }
        }
    }

    /** Alias for transaction() */
    batch<T>(fn: () => T): T {
        return this.transaction(fn);
    }
    
    /**
     * Get current quad count (reactive)
     */
    get size(): number {
        // Access version to make this reactive
        this.version;
        return this.#store.size;
    }

    /**
     * Create a graph pointer:
     * - no args -> dataset pointer
     * - single term/IRI -> pointer
     * - array -> multi-pointer
     */
    pointer(termOrTerms?: string | Term | Array<string | Term>): AnyPointer<Term, Store> {
        // Normalize the input to terms, allowing strings, Terms, and arrays thereof
        const toTerm = (t: string | Term) => typeof t === 'string' ? namedNode(t) : t;
        let term: Term | Term[] | undefined = undefined;
        if (termOrTerms !== undefined) {
            term = Array.isArray(termOrTerms) ? termOrTerms.map(toTerm) : toTerm(termOrTerms);
        }
        return term === undefined
            ? clownface({ dataset: this.store }) as AnyPointer<Term, Store>
            : clownface({ dataset: this.store, term }) as AnyPointer<Term, Store>;
    }

    /**
     * Load RDF data from either a URL or raw text.
     * Returns the number of new quads added.
     */
    async load(options: { url?: string; text?: string; baseIRI?: string }): Promise<number> {
        const { url, text, baseIRI } = options;

        if (!url && !text) {
            throw new Error('Provide either url or text to load RDF data');
        }

        let triples: string;
        if (text !== undefined) {
            triples = text;
        } else {
            const response = await fetch(url!);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            triples = await response.text();
        }
        const parser = new Parser({ baseIRI: baseIRI ?? url });

        const sizeBefore = this.#store.size;
        this.#store.addQuads(parser.parse(triples));
        const added = this.#store.size - sizeBefore;

        if (added > 0) {
            this.#touch();
        }

        return added;
    }


    /**
     * Add a single quad to the store
     */
    addQuad(subject: Quad_Subject, predicate: Quad_Predicate, object: Quad_Object, graph?: Quad_Graph): void {
        this.#store.addQuad(subject, predicate, object, graph);
        this.#touch();
    }

    /**
     * Add multiple quads to the store
     */
    addQuads(quads: Quad[]): void {
        this.#store.addQuads(quads);
        if (quads.length > 0) {
            this.#touch();
        }
    }

    /**
     * Remove a quad from the store
     */
    removeQuad(quad: Quad): void {
        this.#store.removeQuad(quad);
        this.#touch();
    }

    /**
     * Remove multiple quads from the store (single version increment for batch operations)
     */
    removeQuads(quads: Quad[]): void {
        for (const q of quads) {
            this.#store.removeQuad(q);
        }
        if (quads.length > 0) {
            this.#touch();
        }
    }

    /**
     * Get all quads matching a pattern (null = wildcard)
     */
    getQuads(
        subject?: Term | null,
        predicate?: Term | null,
        object?: Term | null,
        graph?: Term | null
    ): Quad[] {
        return this.#store.getQuads(subject ?? null, predicate ?? null, object ?? null, graph ?? null);
    }

    /**
     * Get all resources (subjects) of a given rdf:type using the N3 store.
     * Includes NamedNodes and BlankNodes;
     */
    getResourcesByType(typeIRI: string | NamedNode): (NamedNode | BlankNode)[] {
        const typeNode = typeof typeIRI === 'string' ? namedNode(typeIRI) : typeIRI;
        const subjects = new Set<string>();
        const results: (NamedNode | BlankNode)[] = [];

        for (const q of this.#store.getQuads(null, ns.rdf('type'), typeNode, null)) {
            if (q.subject.termType === 'NamedNode' || q.subject.termType === 'BlankNode') {
                if (!subjects.has(q.subject.value)) {
                    subjects.add(q.subject.value);
                    results.push(q.subject as NamedNode | BlankNode);
                }
            }
        }

        return results;
    }

    /**
     * Convenience: get a pointer (or multi-pointer) for all resources of a type.
     */
    pointersByType(typeIRI: string | NamedNode) {
        this.version; // reactive
        return this.pointer(this.getResourcesByType(typeIRI));
    }

    /**
     * Serialize quads using a chosen format.
     * Defaults to Turtle with PREFIXES.
     */
    serialize(options?: { 
        format?: 'turtle' ; // | 'turtle*' | 'n-triples' | 'trig' | 'trig*' | 'n-quads' ; 
        quads?: Quad[]; 
    }): string {
        const quadsToWrite = options?.quads ?? this.#store.getQuads(null, null, null, null);
        const writer = new Writer({ 
            format: options?.format ?? 'turtle', 
            prefixes: PREFIXES 
        });
        writer.addQuads(quadsToWrite);

        let result = '';
        writer.end((error, output) => {
            if (error) throw error;
            result = output;
        });
        return result;
    }

    /**
     * Clear all quads from the store
     */
    clear(): void {
        this.#store = new Store(); // renew the store
        this.#touch();  // trigger a re-derivation
    }
}

// Default global store instance
export const rdfStore = new RdfStore();