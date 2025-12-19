/**
 * Datatype Hints
 * 
 * Suggests appropriate datatypes for annotation properties based on:
 * 1. Direct property IRI mapping
 * 2. Parent properties via rdfs:subPropertyOf (inherited hints)
 */

import type { NamedNode } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { ns } from '$lib/rdf/namespaces';
import type { DatatypeKey } from './datatypes';

/**
 * Static mapping from property IRIs to suggested datatypes.
 * These are well-known annotation properties with expected value types.
 */
export const PROPERTY_DATATYPE_HINTS: Record<string, DatatypeKey> = {
    // Label family - typically language-tagged strings
    [ns.rdfs('label').value]: 'langString',
    [ns.skos('prefLabel').value]: 'langString',
    [ns.skos('altLabel').value]: 'langString',
    [ns.skos('hiddenLabel').value]: 'langString',
    
    // Comment/description family - typically language-tagged strings
    [ns.rdfs('comment').value]: 'langString',
    [ns.skos('definition').value]: 'langString',
    [ns.skos('note').value]: 'langString',
    [ns.skos('editorialNote').value]: 'langString',
    [ns.skos('scopeNote').value]: 'langString',
    [ns.skos('historyNote').value]: 'langString',
    [ns.skos('example').value]: 'langString',
    
    // IRI reference properties
    [ns.rdfs('seeAlso').value]: 'anyURI',
    [ns.rdfs('isDefinedBy').value]: 'anyURI',
};

/**
 * Get suggested datatype for a property, checking parent properties via rdfs:subPropertyOf.
 * 
 * The lookup strategy:
 * 1. Check if property IRI is directly in PROPERTY_DATATYPE_HINTS
 * 2. If not found, check parent properties recursively
 * 3. Return undefined if no hint found
 * 
 * @param store - The RDF store to query for parent properties
 * @param propertyIri - The property IRI to get hint for
 * @param maxDepth - Maximum recursion depth (prevents infinite loops)
 * @returns Suggested datatype key or undefined
 */
export function getSuggestedDatatype(
    store: RdfStore,
    propertyIri: string | NamedNode,
    maxDepth: number = 5
): DatatypeKey | undefined {
    const iri = typeof propertyIri === 'string' ? propertyIri : propertyIri.value;
    
    // Check direct mapping first
    if (PROPERTY_DATATYPE_HINTS[iri]) {
        return PROPERTY_DATATYPE_HINTS[iri];
    }
    
    // Base case: max depth reached
    if (maxDepth <= 0) {
        return undefined;
    }
    
    // Check parent properties via rdfs:subPropertyOf
    const parentQuads = store.getQuads(
        ns.fromIri(iri),
        ns.rdfs('subPropertyOf'),
        null
    );
    
    for (const quad of parentQuads) {
        if (quad.object.termType === 'NamedNode') {
            const parentHint = getSuggestedDatatype(store, quad.object.value, maxDepth - 1);
            if (parentHint) {
                return parentHint;
            }
        }
    }
    
    return undefined;
}

/**
 * Check if a property typically expects a language-tagged string
 */
export function expectsLangString(
    store: RdfStore,
    propertyIri: string | NamedNode
): boolean {
    return getSuggestedDatatype(store, propertyIri) === 'langString';
}

/**
 * Check if a property typically expects an IRI reference
 */
export function expectsIriReference(
    store: RdfStore,
    propertyIri: string | NamedNode
): boolean {
    return getSuggestedDatatype(store, propertyIri) === 'anyURI';
}
