/**
 * Clownface Integration Layer
 * 
 * Provides a Clownface-based interface on top of N3.Store for fluent
 * graph traversal, manipulation, and SHACL path following.
 * 
 * Clownface is a graph traversal library inspired by Gremlin that works
 * with any RDF.js DatasetCore implementation (which N3.Store provides).
 * 
 * @see https://github.com/rdfjs/N3.js
 * @see https://github.com/zazuko/clownface
 * @see https://github.com/zazuko/clownface-shacl-path
 */

import clownface from 'clownface';
import type { GraphPointer, MultiPointer, AnyPointer } from 'clownface';
import type { Store as N3Store, DataFactory as N3DataFactory } from 'n3';
import { DataFactory } from 'n3';
import type { Term, NamedNode, BlankNode, Quad, DatasetCore } from '@rdfjs/types';
import { findNodes, fromNode, type ShaclPropertyPath } from 'clownface-shacl-path';
import namespace from '@rdfjs/namespace';

// Re-export useful types from clownface
export type { GraphPointer, MultiPointer, AnyPointer };
export type { ShaclPropertyPath };

const { namedNode } = DataFactory;

/****************************************************************************************
 * Namespace Prefixes (for Turtle serialization)
 * 
 * These string prefixes are used when serializing RDF to Turtle format.
 * For graph traversal, use the `ns` namespace builders below instead.
 */
export const PREFIXES = {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    owl: 'http://www.w3.org/2002/07/owl#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    schema: 'https://schema.org/',
    sh: 'http://www.w3.org/ns/shacl#',
    dash: 'http://datashapes.org/dash#',
    foaf: 'http://xmlns.com/foaf/0.1/',
    skos: 'http://www.w3.org/2004/02/skos/core#',
    rxyz: 'http://rosyc.xyz#',
} as const;

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
    rdf: namespace(PREFIXES.rdf),
    rdfs: namespace(PREFIXES.rdfs),
    owl: namespace(PREFIXES.owl),
    xsd: namespace(PREFIXES.xsd),
    schema: namespace(PREFIXES.schema),
    sh: namespace(PREFIXES.sh),
    dash: namespace(PREFIXES.dash),
    foaf: namespace(PREFIXES.foaf),
    skos: namespace(PREFIXES.skos),
    rxyz: namespace(PREFIXES.rxyz),
    
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
 * Clownface Store Wrapper
 * 
 * Wraps an N3.Store with a Clownface-based interface for fluent graph operations.
 * The underlying N3.Store is still accessible for direct operations when needed.
 */
export class ClownfaceStore {
    /** The underlying N3 store (RDF.js DatasetCore compatible) */
    readonly store: N3Store;

    constructor(store: N3Store) {
        this.store = store;
    }

    /**
     * Get the dataset size (number of quads)
     */
    get size(): number {
        return this.store.size;
    }

    /**
     * Create a graph pointer to the entire dataset (no specific node)
     * Use this to start queries that search across all subjects.
     * 
     * @example
     * // Find all subjects with a specific predicate
     * store.pointer().has(ns.rdf('type'), ns.schema('BlogPosting'))
     */
    pointer(): AnyPointer<Term, N3Store> {
        return clownface({ dataset: this.store }) as AnyPointer<Term, N3Store>;
    }

    /**
     * Create a graph pointer to a specific term or terms
     * 
     * @example
     * // Point to a specific resource
     * store.node(namedNode('http://example.org/post1'))
     * 
     * @example
     * // Point to multiple resources
     * store.node([namedNode('http://example.org/post1'), namedNode('http://example.org/post2')])
     */
    node<T extends Term>(term: T): GraphPointer<T, N3Store>;
    node<T extends Term>(terms: T[]): MultiPointer<T, N3Store>;
    node<T extends Term>(termOrTerms: T | T[]): GraphPointer<T, N3Store> | MultiPointer<T, N3Store> {
        if (Array.isArray(termOrTerms)) {
            return clownface({ dataset: this.store, term: termOrTerms });
        }
        return clownface({ dataset: this.store, term: termOrTerms });
    }

    /**
     * Create a graph pointer to a named node by IRI string
     * 
     * @example
     * store.namedNode('http://rosyc.xyz#robsyc')
     *   .out(ns.schema('name'))
     *   .value  // 'robsyc'
     */
    namedNode(iri: string): GraphPointer<NamedNode, N3Store> {
        return clownface({ dataset: this.store }).namedNode(iri) as GraphPointer<NamedNode, N3Store>;
    }

    /**
     * Find all resources (subjects) of a given rdf:type
     * Returns a multi-pointer to all matching resources.
     * 
     * @example
     * store.byType(ns.schema('BlogPosting'))
     *   .forEach(post => console.log(post.out(ns.schema('headline')).value))
     */
    byType(typeNode: NamedNode): MultiPointer<NamedNode | BlankNode, N3Store> {
        return this.pointer().has(ns.rdf('type'), typeNode) as MultiPointer<NamedNode | BlankNode, N3Store>;
    }

    /**
     * Find all resources that match a SHACL NodeShape target
     * Supports sh:targetClass and sh:targetNode.
     * 
     * @example
     * // Get pointer to the shape, then find its targets
     * const shapePtr = store.namedNode('http://rosyc.xyz#BlogPostingShape');
     * const targets = store.byShapeTarget(shapePtr);
     */
    byShapeTarget(shapePointer: GraphPointer<NamedNode, N3Store>): MultiPointer<NamedNode | BlankNode, N3Store> {
        // Check for sh:targetClass
        const targetClass = shapePointer.out(ns.sh('targetClass'));
        if (targetClass.term) {
            return this.byType(targetClass.term as NamedNode);
        }

        // Check for sh:targetNode
        const targetNode = shapePointer.out(ns.sh('targetNode'));
        if (targetNode.term) {
            return this.node(targetNode.term as NamedNode);
        }

        // No valid target found - return empty pointer
        return this.node([]);
    }

    /**
     * Get all SHACL NodeShapes in the store
     */
    getNodeShapes(): MultiPointer<NamedNode | BlankNode, N3Store> {
        return this.byType(ns.sh('NodeShape'));
    }
}

/****************************************************************************************
 * SHACL Path Utilities
 * 
 * Leverages clownface-shacl-path for complete SHACL property path support.
 * This replaces our custom path parsing with the full spec implementation.
 */

/**
 * Follow a SHACL property path from a given pointer.
 * Handles all SHACL path types: predicate, inverse, sequence, alternative,
 * zeroOrMore, oneOrMore, zeroOrOne.
 * 
 * @param startPointer - The starting graph pointer
 * @param pathPointer - Pointer to the sh:path value (can be simple predicate or complex path)
 * @returns MultiPointer to all nodes reachable via the path
 * 
 * @example
 * // Simple predicate path: sh:path schema:name
 * const names = followPath(personPtr, namePathPtr);
 * 
 * @example
 * // Inverse path: sh:path [ sh:inversePath schema:sender ]
 * const sentMessages = followPath(agentPtr, inverseSenderPathPtr);
 */
export function followPath(
    startPointer: GraphPointer<Term, DatasetCore>,
    pathPointer: MultiPointer<Term, DatasetCore>
): MultiPointer<Term, DatasetCore> {
    return findNodes(startPointer, pathPointer);
}

/**
 * Parse a SHACL property path from a graph pointer to a ShaclPropertyPath object.
 * Useful when you need to inspect or manipulate the path structure.
 * 
 * @param pathPointer - Pointer to the sh:path value
 * @returns Parsed ShaclPropertyPath object
 */
export function parsePath(pathPointer: MultiPointer<Term, DatasetCore>): ShaclPropertyPath {
    // Handle both pointers and raw NamedNodes
    if (pathPointer.term?.termType === 'NamedNode') {
        return fromNode(pathPointer.term as NamedNode);
    }
    return fromNode(pathPointer);
}

/**
 * Check if a path pointer represents an inverse path
 * Inverse paths have the form: [ sh:inversePath <predicate> ]
 */
export function isInversePath(pathPointer: GraphPointer<Term, DatasetCore>): boolean {
    const inversePath = pathPointer.out(ns.sh('inversePath'));
    return inversePath.term !== undefined;
}

/**
 * Get the inner predicate IRI from any path (handles inverse paths too)
 */
export function getPathPredicateIRI(pathPointer: GraphPointer<Term, DatasetCore>): string | undefined {
    // Simple predicate path - path IS the predicate
    if (pathPointer.term?.termType === 'NamedNode') {
        return pathPointer.term.value;
    }

    // Complex path - check for inverse
    if (pathPointer.term?.termType === 'BlankNode') {
        const inversePath = pathPointer.out(ns.sh('inversePath'));
        if (inversePath.term?.termType === 'NamedNode') {
            return inversePath.term.value;
        }
        // Could add support for other path types here
    }

    return undefined;
}

/****************************************************************************************
 * Subgraph Extraction
 * 
 * Utilities for extracting subgraphs from selected nodes.
 * Essential for the "lasso selection" feature.
 */

/**
 * Extract all quads connected to a set of pointers.
 * Follows outgoing edges to capture the immediate neighborhood.
 * 
 * @param pointers - One or more graph pointers to extract
 * @param depth - How many levels of outgoing edges to follow (default: 1)
 * @returns Array of quads forming the subgraph
 * 
 * @example
 * // Extract subgraph for selected nodes
 * const selectedPtrs = nodes.map(n => store.namedNode(n.id));
 * const quads = extractSubgraph(selectedPtrs);
 */
export function extractSubgraph(
    pointers: GraphPointer<Term, DatasetCore> | GraphPointer<Term, DatasetCore>[],
    depth: number = 1
): Quad[] {
    const ptrArray = Array.isArray(pointers) ? pointers : [pointers];
    const collectedQuads = new Set<string>();
    const result: Quad[] = [];

    function collectQuadsForPointer(ptr: GraphPointer<Term, DatasetCore>, currentDepth: number) {
        if (!ptr.term || currentDepth > depth) return;

        const dataset = ptr.dataset;
        if (!dataset) return;

        // Get all quads where this term is the subject
        for (const quad of dataset.match(ptr.term, null, null, null)) {
            const quadKey = `${quad.subject.value}|${quad.predicate.value}|${quad.object.value}`;
            if (!collectedQuads.has(quadKey)) {
                collectedQuads.add(quadKey);
                result.push(quad as Quad);

                // Recursively collect for object if it's a node
                if (currentDepth < depth && 
                    (quad.object.termType === 'NamedNode' || quad.object.termType === 'BlankNode')) {
                    const objectPtr = clownface({ dataset, term: quad.object }) as GraphPointer<Term, DatasetCore>;
                    collectQuadsForPointer(objectPtr, currentDepth + 1);
                }
            }
        }

        // Also get quads where this term is the object (for inverse relationships)
        for (const quad of dataset.match(null, null, ptr.term, null)) {
            const quadKey = `${quad.subject.value}|${quad.predicate.value}|${quad.object.value}`;
            if (!collectedQuads.has(quadKey)) {
                collectedQuads.add(quadKey);
                result.push(quad as Quad);
            }
        }
    }

    for (const ptr of ptrArray) {
        collectQuadsForPointer(ptr, 0);
    }

    return result;
}

/****************************************************************************************
 * Factory Function
 */

/**
 * Create a ClownfaceStore from an N3 Store
 * 
 * @example
 * import { Store } from 'n3';
 * import { createClownfaceStore } from '$lib/rdf/clownface-store';
 * 
 * const n3Store = new Store();
 * const cfStore = createClownfaceStore(n3Store);
 * 
 * // Now use fluent graph traversal
 * cfStore.byType(ns.schema('BlogPosting'))
 *   .out(ns.schema('headline'))
 *   .values
 */
export function createClownfaceStore(store: N3Store): ClownfaceStore {
    return new ClownfaceStore(store);
}

