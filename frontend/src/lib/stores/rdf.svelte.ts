import { Store, Parser, Writer, DataFactory, Reasoner } from 'n3';
import type { Quad, NamedNode, BlankNode, Term, Quad_Subject, Quad_Predicate, Quad_Object, Quad_Graph } from 'n3';
import SHACLValidator from 'rdf-validate-shacl'
import { fetchGraph, type GraphName, type FetchGraphOptions } from '$lib/rdf/api';
import { 
    ClownfaceStore, 
    createClownfaceStore, 
    ns,
    PREFIXES,
    type GraphPointer,
    type MultiPointer,
    type AnyPointer,
} from '$lib/rdf/clownface-store';

// N3.DataFactory will give you the factory functions to create triples and quads
// http://rdf.js.org/#datafactory-interface
const { namedNode, literal, quad } = DataFactory;

/**
 * Reactive RDF Store wrapper around N3.Store using Svelte 5 runes.
 * Provides methods to load, query, and manipulate RDF triples.
 *  - Reactive version counter for triggering derived computations
 *  - loadFromUrl(url) - Fetch and parse TTL from static files
 *  - loadFromBackend(graphName, options) - Fetch named graph from backend API with optional targetClass filter
 *  - loadTurtle(content) - Parse turtle strings
 *  - getResourcesByType(typeIRI) - Query resources by rdf:type
 *  - getResourceData(subject) - Get all predicates/objects for a subject
 *  - getValue/getValues - Single/multiple value helpers
 *  - toNTriples/toTurtle - Serialization methods
 *  - clear() - Clear all quads from the store
 */
export class RdfStore {

    // N3.Store for in-memory triple storage
    // If you are using multiple stores, you can reduce memory consumption by allowing them to share an entity index
    #store = new Store();
    
    // Clownface wrapper for fluent graph traversal
    #clownface: ClownfaceStore;
    
    // Reactive version counter - increment to trigger re-derivation
    version = $state(0);
    
    // Track loaded sources
    #loadedUrls = new Set<string>();

    // Parser for Turtle/N-Triples/etc
    // N3.Parser transforms Turtle, TriG, N-Triples, or N-Quads document into quads through a callback
    // can parse Node.js streams as they grow, returning quads as soon as they're ready
    #parser = new Parser();
    // Node.js streams: http://nodejs.org/api/stream.html
    // RDF.js sink: http://rdf.js.org/#sink-interface

    constructor() {
        this.#clownface = createClownfaceStore(this.#store);
    }


    /**
     * Get the underlying N3 store (for advanced queries)
     */
    get store(): Store {
        return this.#store;
    }

    /**
     * Get the Clownface store wrapper for fluent graph traversal
     * 
     * @example
     * // Use Clownface for elegant graph queries
     * rdfStore.cf.byType(ns.schema('BlogPosting'))
     *   .out(ns.schema('headline'))
     *   .values
     */
    get cf(): ClownfaceStore {
        // Access version to make derived computations reactive
        this.version;
        return this.#clownface;
    }

    /**
     * Create a graph pointer to a specific IRI
     * Shorthand for cf.namedNode()
     * 
     * @example
     * const agentPtr = rdfStore.pointer('http://rosyc.xyz#robsyc');
     * const name = agentPtr.out(ns.schema('name')).value;
     */
    pointer(iri: string) {
        // Access version to make derived computations reactive
        this.version;
        return this.#clownface.namedNode(iri);
    }

    /**
     * Find all resources of a given rdf:type using Clownface
     * More ergonomic alternative to getResourcesByType
     * 
     * @example
     * rdfStore.byType(ns.schema('BlogPosting'))
     *   .forEach(post => console.log(post.out(ns.schema('headline')).value))
     */
    byType(typeNode: NamedNode) {
        // Access version to make derived computations reactive
        this.version;
        return this.#clownface.byType(typeNode);
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
     * Load and parse Turtle content from a URL (for static files or development)
     */
    async loadFromUrl(url: string): Promise<void> {
        if (this.#loadedUrls.has(url)) {
            console.log(`[RdfStore] Already loaded: ${url}`);
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            const turtleContent = await response.text();
            this.loadTurtle(turtleContent, url);
            this.#loadedUrls.add(url);
            console.log(`[RdfStore] Loaded ${url}, store now has ${this.#store.size} quads`);
        } catch (error) {
            console.error(`[RdfStore] Error loading ${url}:`, error);
            throw error;
        }
    }

    /**
     * Load a named graph from the backend API
     * 
     * Always fetches from the backend, but N3.Store handles deduplication internally.
     * Returns the number of NEW quads added (0 if all quads already existed).
     * 
     * @param graphName - The graph to load: 'home', 'data', or 'shapes'
     * @param options - Optional parameters including targetClass filter
     * @returns Number of new quads added to the store
     * 
     * @example
     * // Load home graph (entry point)
     * const newQuads = await rdfStore.loadFromBackend('home');
     * 
     * @example
     * // Load shapes for a specific class
     * const newQuads = await rdfStore.loadFromBackend('shapes', { targetClass: 'schema:BlogPosting' });
     */
    async loadFromBackend(graphName: GraphName, options?: FetchGraphOptions): Promise<number> {
        const logKey = options?.targetClass 
            ? `${graphName}:${options.targetClass}`
            : graphName;

        try {
            const sizeBefore = this.#store.size;
            const turtleContent = await fetchGraph(graphName, options);
            
            // Parse and add quads - N3.Store deduplicates automatically
            const parser = new Parser();
            const quads = parser.parse(turtleContent);
            this.#store.addQuads(quads);
            
            const newQuads = this.#store.size - sizeBefore;
            
            if (newQuads > 0) {
                this.version++;
                console.log(`[RdfStore] Loaded ${newQuads} new quads from '${logKey}', store now has ${this.#store.size} quads`);
            } else {
                console.log(`[RdfStore] No new quads from '${logKey}' (all ${quads.length} quads already in store)`);
            }
            
            return newQuads;
        } catch (error) {
            console.error(`[RdfStore] Error loading '${logKey}' from backend:`, error);
            throw error;
        }
    }

    /**
     * Parse and add Turtle string to the store
     */
    loadTurtle(turtleContent: string, baseIRI?: string): void {
        const parser = new Parser({ baseIRI });
        const quads = parser.parse(turtleContent);
        this.#store.addQuads(quads);
        this.version++;
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
     * Get all resources (subjects) of a given rdf:type 
     *   - fetches resources where `?resource a typeIRI`
     *   - e.g. `?resource a schema:BlogPosting`
     *   - includes both NamedNode and BlankNode subjects
     */
    getResourcesByType(typeIRI: string | NamedNode): (NamedNode | BlankNode)[] {
        const typeNode = typeof typeIRI === 'string' ? namedNode(typeIRI) : typeIRI;
        const quads = this.#store.getQuads(null, ns.rdf('type'), typeNode, null);
        
        // Return unique subjects (NamedNodes and BlankNodes)
        const subjects = new Set<string>();
        const result: (NamedNode | BlankNode)[] = [];
        
        for (const q of quads) {
            const subjectValue = q.subject.value;
            if (!subjects.has(subjectValue) && 
                (q.subject.termType === 'NamedNode' || q.subject.termType === 'BlankNode')) {
                subjects.add(subjectValue);
                result.push(q.subject as NamedNode | BlankNode);
            }
        }
        
        return result;
    }

    /**
     * Get all data for a specific resource (subject)
     * Returns a Map of predicate IRI -> array of object values
     */
    getResourceData(subjectIRI: string | NamedNode): Map<string, Term[]> {
        const subjectNode = typeof subjectIRI === 'string' ? namedNode(subjectIRI) : subjectIRI;
        const quads = this.#store.getQuads(subjectNode, null, null, null);
        
        const data = new Map<string, Term[]>();
        for (const q of quads) {
            const predIRI = q.predicate.value;
            if (!data.has(predIRI)) {
                data.set(predIRI, []);
            }
            data.get(predIRI)!.push(q.object);
        }
        
        return data;
    }

    /**
     * Get a single value for a predicate (first match)
     */
    getValue(subject: Term | string, predicate: Term | string): Term | undefined {
        const subjectNode = typeof subject === 'string' ? namedNode(subject) : subject;
        const predicateNode = typeof predicate === 'string' ? namedNode(predicate) : predicate;
        const quads = this.#store.getQuads(subjectNode, predicateNode, null, null);
        return quads[0]?.object;
    }

    /**
     * Get all values for a predicate
     */
    getValues(subject: Term | string, predicate: Term | string): Term[] {
        const subjectNode = typeof subject === 'string' ? namedNode(subject) : subject;
        const predicateNode = typeof predicate === 'string' ? namedNode(predicate) : predicate;
        const quads = this.#store.getQuads(subjectNode, predicateNode, null, null);
        return quads.map(q => q.object);
    }

    /**
     * Serialize quads to N-Triples format
     */
    toNTriples(quads?: Quad[]): string {
        const writer = new Writer({ format: 'N-Triples' });
        const quadsToWrite = quads ?? this.#store.getQuads(null, null, null, null);
        writer.addQuads(quadsToWrite);
        
        let result = '';
        writer.end((error, output) => {
            if (error) throw error;
            result = output;
        });
        return result;
    }

    /**
     * Serialize quads to Turtle format
     */
    toTurtle(quads?: Quad[]): string {
        const writer = new Writer({ prefixes: PREFIXES });
        const quadsToWrite = quads ?? this.#store.getQuads(null, null, null, null);
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
        this.#clownface = createClownfaceStore(this.#store); // renew clownface wrapper
        this.#loadedUrls.clear();  // clear the loaded URLs
        this.version++;  // increment the version to trigger a re-derivation
    }
}

// Default global store instance
export const rdfStore = new RdfStore();

// Re-export Clownface utilities for convenience
export { ns, type GraphPointer, type MultiPointer, type AnyPointer } from '$lib/rdf/clownface-store';
export { 
    followPath, 
    parsePath, 
    isInversePath, 
    getPathPredicateIRI,
    extractSubgraph,
} from '$lib/rdf/clownface-store';
