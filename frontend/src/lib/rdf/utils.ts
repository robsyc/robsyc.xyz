/**
 * RDF Utility Functions
 * 
 * Common utilities for working with RDF data and URIs.
 */

import { ns, type RdfStore } from '$lib/stores/rdf.svelte';


/**
 * Get a human-readable label for a URI.
 *
 * @example
 * getLocalName('https://schema.org/BlogPosting') // 'BlogPosting'
 * getLocalName('http://rosyc.xyz#me') // 'me'
 * getLocalName('https://schema.org/BlogPosting', rdfStore) // rdfs:label if present, or 'BlogPosting'
 *
 * @param uri The IRI for which to get a human label
 * @param store Optional: a RdfStore instance to look up rdfs:label
 */
export function getLocalName(uri: string, store?: RdfStore): string {
    let label = uri;
    if (store) {
        for (const quad of store.store.getQuads(ns.fromIri(uri), ns.rdfs('label'), null, null)) {
            if (quad.object.termType === 'Literal') {
                label = quad.object.value;
                // Prefer an English label, otherwise take the first label found
                if ((quad.object.language && quad.object.language.toLowerCase() === 'en') || !quad.object.language) {
                    label = quad.object.value;
                    break;
                }
            }
        }
    } else {
        const hashIndex = uri.lastIndexOf('#');
        const slashIndex = uri.lastIndexOf('/');
        const separatorIndex = Math.max(hashIndex, slashIndex);
        label = separatorIndex >= 0 ? uri.substring(separatorIndex + 1) : uri;
    }
    return label;
}

/**
 * Get a compact URI (a CURIE) using known prefixes for display
 * 
 * @example
 * getCompactURI('https://schema.org/BlogPosting') // 'schema:BlogPosting'
 * getCompactURI('http://rosyc.xyz#me') // 'rxyz:me'
 */
export function getCompactURI(uri: string): string {
    for (const [prefix, namespace] of Object.entries(ns)) {
        const baseIRI = typeof namespace === 'function'
            ? undefined
            : (namespace as { value?: string })?.value;
        if (baseIRI && uri.startsWith(baseIRI)) {
            return `${prefix}:${uri.substring(baseIRI.length)}`;
        }
    }
    return uri;
}

/**
 * Format a date string for display.
 * 
 * If the format is 'iso', returns ISO date (YYYY-MM-DD).
 * If the format is 'display' or omitted, returns a locale-aware display string (e.g., 'Jan 15, 2025').
 * If parsing fails, returns the original value.
 * 
 * @example
 * formatDate('2025-01-15T10:30:00') // 'Jan 15, 2025'
 * formatDate('2025-01-15T10:30:00', 'iso') // '2025-01-15'
 */
export function formatDate(value: string, format: 'display' | 'iso' = 'display'): string {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            if (format === 'iso') {
                return date.toISOString().split('T')[0];
            } else {
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
        }
    } catch {
        // Fall through to return raw value
    }
    return value;
}