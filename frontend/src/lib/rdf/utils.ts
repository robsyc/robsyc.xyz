/**
 * RDF Utility Functions
 * 
 * Common utilities for working with RDF data, IRIs, and N3 terms.
 * Extracted from shacl-parser.ts and flow-mapper.ts for reuse.
 */

import type { Term } from 'n3';
import { PREFIXES, ns } from './clownface-store';
import type { RdfStore } from '$lib/stores/rdf.svelte';

/****************************************************************************************
 * IRI Utilities
 */

/**
 * Extract local name from an IRI (after # or last /)
 * 
 * @example
 * getLocalName('https://schema.org/BlogPosting') // 'BlogPosting'
 * getLocalName('http://rosyc.xyz#me') // 'me'
 */
export function getLocalName(iri: string): string {
    const hashIndex = iri.lastIndexOf('#');
    const slashIndex = iri.lastIndexOf('/');
    const separatorIndex = Math.max(hashIndex, slashIndex);
    return separatorIndex >= 0 ? iri.substring(separatorIndex + 1) : iri;
}

/**
 * Shorten an IRI using known prefixes for display
 * 
 * @example
 * shortenIRI('https://schema.org/BlogPosting') // 'schema:BlogPosting'
 * shortenIRI('http://rosyc.xyz#me') // 'rxyz:me'
 */
export function shortenIRI(iri: string): string {
    for (const [prefix, namespace] of Object.entries(PREFIXES)) {
        if (iri.startsWith(namespace)) {
            return `${prefix}:${iri.substring(namespace.length)}`;
        }
    }
    return iri;
}

/****************************************************************************************
 * N3 Term Conversion Utilities
 */

/**
 * Convert an N3 Term to a string value
 * Returns empty string if term is undefined
 */
export function termToString(term: Term | undefined): string {
    if (!term) return '';
    return term.value;
}

/**
 * Convert an N3 Term to a number
 * Returns defaultValue if term is undefined or not a valid number
 */
export function termToNumber(term: Term | undefined, defaultValue: number = 0): number {
    if (!term) return defaultValue;
    const num = parseFloat(term.value);
    return isNaN(num) ? defaultValue : num;
}

/****************************************************************************************
 * Date Formatting Utilities
 */

/**
 * Format a date string for display (from xsd:dateTime or xsd:date)
 * Uses locale-aware formatting with en-US defaults
 * 
 * @example
 * formatDate('2025-01-15T10:30:00') // 'Jan 15, 2025'
 */
export function formatDate(value: string): string {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        }
    } catch {
        // Fall through to return raw value
    }
    return value;
}

/**
 * Format a date string for ISO display (UTC)
 * 
 * @example
 * formatDateISO('2025-01-15T10:30:00') // '2025-01-15'
 */
export function formatDateISO(value: string): string {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
    } catch {
        // Fall through to return raw value
    }
    return value;
}

/****************************************************************************************
 * Triple Formatting Utilities
 * TODO: we should better use a parser/writer into Turtle or some other format (N3.js)
 */

/**
 * Format an RDF quad/triple for display as N-Triples-like string
 * Handles literals with datatypes and language tags
 */
export function formatTriple(
    subject: string,
    predicate: string,
    object: { value: string; termType: string; language?: string; datatype?: { value: string } }
): string {
    const subjectShort = shortenIRI(subject);
    const predicateShort = shortenIRI(predicate);
    
    let objectStr: string;
    if (object.termType === 'Literal') {
        const value = object.value.length > 100 
            ? object.value.substring(0, 100) + '...' 
            : object.value;
        objectStr = `"${value}"`;
        if (object.language) {
            objectStr += `@${object.language}`;
        } else if (object.datatype && !object.datatype.value.includes('string')) {
            objectStr += `^^${shortenIRI(object.datatype.value)}`;
        }
    } else {
        objectStr = shortenIRI(object.value);
    }
    
    return `${subjectShort} ${predicateShort} ${objectStr} .`;
}

/**
 * Get a human-readable label for a predicate IRI
 * Uses the store to check for rdfs:label, falls back to local name
 */
export function getPredicateLabel(predicateIRI: string, store?: RdfStore): string {
    if (store) {
        const label = store.cf.namedNode(predicateIRI).out(ns.rdfs('label')).value;
        if (label) return label;
    }
    return getLocalName(predicateIRI);
}

