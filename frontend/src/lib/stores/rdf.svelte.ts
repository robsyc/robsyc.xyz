import { Store, Parser, Writer, DataFactory, Reasoner } from 'n3';
import type { Quad, NamedNode, BlankNode, Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from 'n3';

import clownface from 'clownface';
import type { GraphPointer, MultiPointer, AnyPointer } from 'clownface';

import SHACLValidator from 'rdf-validate-shacl'
import { findNodes, fromNode, type ShaclPropertyPath } from 'clownface-shacl-path';
import namespace from '@rdfjs/namespace';

// N3.DataFactory will give you the factory functions to create triples and quads
// http://rdf.js.org/#datafactory-interface
const { namedNode, literal, quad } = DataFactory;

/****************************************************************************************
 * Namespace Builders
 * 
 * Using @rdfjs/namespace for cleaner, type-safe namespace handling.
 * These create factory functions that produce NamedNodes for any local name.
 * 
 * @example
 * ns.schema('BlogPosting') // returns namedNode('https://schema.org/BlogPosting')
 * ns.sh('property')        // returns namedNode('http://www.w3.org/ns/shacl#property')
 */
export const ns = {
    rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    rdfs: namespace('http://www.w3.org/2000/01/rdf-schema#'),
    owl: namespace('http://www.w3.org/2002/07/owl#'),
    xsd: namespace('http://www.w3.org/2001/XMLSchema#'),
    sh: namespace('http://www.w3.org/ns/shacl#'),
    shui: namespace('http://www.w3.org/ns/shacl-ui#'),
    foaf: namespace('http://xmlns.com/foaf/0.1/'),
    skos: namespace('http://www.w3.org/2004/02/skos/core#'),
    schema: namespace('https://schema.org/'),
    rxyz: namespace('http://rosyc.xyz#'),
    
    /**
     * Create a NamedNode from a full IRI string.
     * Useful when you have an IRI from RDF data and need to use it for traversal.
     * 
     * @example
     * const propertyIri = shapePointer.out(ns.rxyz('containerProperty')).value;
     * const predicate = ns.fromIri(propertyIri); // NamedNode for traversal
     */
    fromIri: (iri: string): NamedNode => namedNode(iri),
};

/****************************************************************************************
 * Reactive RDF Store wrapper around N3.Store using Svelte 5 runes.
 * Provides methods to load, query, and manipulate RDF triples.
 */
export class RdfStore {
    // Reactive version counter - increment to trigger re-derivation
    version = $state(0);

    // Track loaded sources
    #loadedUrls = new Set<string>();

    // N3.Store for in-memory triple storage
    // If you are using multiple stores, you can reduce memory consumption by allowing them to share an entity index
    #store = new Store();
    get store(): Store {
        return this.#store;
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
    async load(options: { url?: string; text?: string; baseIRI?: string; force?: boolean }): Promise<number> {
        const { url, text, baseIRI, force } = options;

        if (!url && !text) {
            throw new Error('Provide either url or text to load RDF data');
        }

        if (url && !force && this.#loadedUrls.has(url)) {
            console.log(`[RdfStore] Already loaded: ${url}`);
            return 0;
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
            this.version++;
            if (url) this.#loadedUrls.add(url);
        }

        return added;
    }


    /**
     * Add a single quad to the store
     */
    addQuad(subject: Quad_Subject, predicate: Quad_Predicate, object: Quad_Object, graph?: Quad_Graph): void {
        this.#store.addQuad(subject, predicate, object, graph);
        this.version++;
    }

    /**
     * Add multiple quads to the store
     */
    addQuads(quads: Quad[]): void {
        this.#store.addQuads(quads);
        this.version++;
    }

    /**
     * Remove a quad from the store
     */
    removeQuad(quad: Quad): void {
        this.#store.removeQuad(quad);
        this.version++;
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
        format?: 'turtle' | 'turtle*' | 'n-triples' | 'trig' | 'trig*' | 'n-quads' ; 
        quads?: Quad[]; 
    }): string {
        const format = (options?.format ?? 'turtle').toLowerCase();
        const quadsToWrite = options?.quads ?? this.#store.getQuads(null, null, null, null);


        // TODO: add prefixes from ns?
        // TODO: add option to use turtle pretty print
        const writer = new Writer( { format: format });
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
        this.#loadedUrls.clear();  // clear the loaded URLs
        this.version++;  // increment the version to trigger a re-derivation
    }
}

// Default global store instance
export const rdfStore = new RdfStore();
