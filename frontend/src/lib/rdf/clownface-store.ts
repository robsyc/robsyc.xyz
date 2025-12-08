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

// import clownface from 'clownface';
// import type { GraphPointer, MultiPointer, AnyPointer } from 'clownface';
// import type { Store as N3Store, DataFactory as N3DataFactory } from 'n3';
// import { DataFactory } from 'n3';
// import type { Term, NamedNode, BlankNode, Quad, DatasetCore } from '@rdfjs/types';
// import { findNodes, fromNode, type ShaclPropertyPath } from 'clownface-shacl-path';
// import namespace from '@rdfjs/namespace';


// /****************************************************************************************
//  * SHACL Path Utilities
//  * 
//  * Leverages clownface-shacl-path for complete SHACL property path support.
//  * This replaces our custom path parsing with the full spec implementation.
//  */

// /**
//  * Follow a SHACL property path from a given pointer.
//  * Handles all SHACL path types: predicate, inverse, sequence, alternative,
//  * zeroOrMore, oneOrMore, zeroOrOne.
//  * 
//  * @param startPointer - The starting graph pointer
//  * @param pathPointer - Pointer to the sh:path value (can be simple predicate or complex path)
//  * @returns MultiPointer to all nodes reachable via the path
//  * 
//  * @example
//  * // Simple predicate path: sh:path schema:name
//  * const names = followPath(personPtr, namePathPtr);
//  * 
//  * @example
//  * // Inverse path: sh:path [ sh:inversePath schema:sender ]
//  * const sentMessages = followPath(agentPtr, inverseSenderPathPtr);
//  */
// export function followPath(
//     startPointer: GraphPointer<Term, DatasetCore>,
//     pathPointer: MultiPointer<Term, DatasetCore>
// ): MultiPointer<Term, DatasetCore> {
//     return findNodes(startPointer, pathPointer);
// }

// /**
//  * Parse a SHACL property path from a graph pointer to a ShaclPropertyPath object.
//  * Useful when you need to inspect or manipulate the path structure.
//  * 
//  * @param pathPointer - Pointer to the sh:path value
//  * @returns Parsed ShaclPropertyPath object
//  */
// export function parsePath(pathPointer: MultiPointer<Term, DatasetCore>): ShaclPropertyPath {
//     // Handle both pointers and raw NamedNodes
//     if (pathPointer.term?.termType === 'NamedNode') {
//         return fromNode(pathPointer.term as NamedNode);
//     }
//     return fromNode(pathPointer);
// }

// /**
//  * Check if a path pointer represents an inverse path
//  * Inverse paths have the form: [ sh:inversePath <predicate> ]
//  */
// export function isInversePath(pathPointer: GraphPointer<Term, DatasetCore>): boolean {
//     const inversePath = pathPointer.out(ns.sh('inversePath'));
//     return inversePath.term !== undefined;
// }

// /**
//  * Get the inner predicate IRI from any path (handles inverse paths too)
//  */
// export function getPathPredicateIRI(pathPointer: GraphPointer<Term, DatasetCore>): string | undefined {
//     // Simple predicate path - path IS the predicate
//     if (pathPointer.term?.termType === 'NamedNode') {
//         return pathPointer.term.value;
//     }

//     // Complex path - check for inverse
//     if (pathPointer.term?.termType === 'BlankNode') {
//         const inversePath = pathPointer.out(ns.sh('inversePath'));
//         if (inversePath.term?.termType === 'NamedNode') {
//             return inversePath.term.value;
//         }
//         // Could add support for other path types here
//     }

//     return undefined;
// }

/****************************************************************************************
 * Subgraph Extraction
 * 
 * Utilities for extracting subgraphs from selected nodes.
 * Essential for the "lasso selection" feature.
 * 
 * TODO: we should make this part of the rdf.svelte store
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
// export function extractSubgraph(
//     pointers: GraphPointer<Term, DatasetCore> | GraphPointer<Term, DatasetCore>[],
//     depth: number = 1
// ): Quad[] {
//     const ptrArray = Array.isArray(pointers) ? pointers : [pointers];
//     const collectedQuads = new Set<string>();
//     const result: Quad[] = [];

//     function collectQuadsForPointer(ptr: GraphPointer<Term, DatasetCore>, currentDepth: number) {
//         if (!ptr.term || currentDepth > depth) return;

//         const dataset = ptr.dataset;
//         if (!dataset) return;

//         // Get all quads where this term is the subject
//         for (const quad of dataset.match(ptr.term, null, null, null)) {
//             const quadKey = `${quad.subject.value}|${quad.predicate.value}|${quad.object.value}`;
//             if (!collectedQuads.has(quadKey)) {
//                 collectedQuads.add(quadKey);
//                 result.push(quad as Quad);

//                 // Recursively collect for object if it's a node
//                 if (currentDepth < depth && 
//                     (quad.object.termType === 'NamedNode' || quad.object.termType === 'BlankNode')) {
//                     const objectPtr = clownface({ dataset, term: quad.object }) as GraphPointer<Term, DatasetCore>;
//                     collectQuadsForPointer(objectPtr, currentDepth + 1);
//                 }
//             }
//         }

//         // Also get quads where this term is the object (for inverse relationships)
//         for (const quad of dataset.match(null, null, ptr.term, null)) {
//             const quadKey = `${quad.subject.value}|${quad.predicate.value}|${quad.object.value}`;
//             if (!collectedQuads.has(quadKey)) {
//                 collectedQuads.add(quadKey);
//                 result.push(quad as Quad);
//             }
//         }
//     }

//     for (const ptr of ptrArray) {
//         collectQuadsForPointer(ptr, 0);
//     }

//     return result;
// }

