/**
 * Namespace Definitions and Utilities
 * 
 * Defines namespaces and utilities for working with RDF IRIs.
 */

import { DataFactory } from 'n3';
import type { NamedNode } from 'n3';

const { namedNode } = DataFactory;

export const PREFIXES: Record<string, string> = {
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    owl: 'http://www.w3.org/2002/07/owl#',
    sh: 'http://www.w3.org/ns/shacl#',
    shui: 'http://www.w3.org/ns/shacl-ui#',
    skos: 'http://www.w3.org/2004/02/skos/core#',
    schema: 'https://schema.org/',
    rxyz: 'http://robsyc.xyz/',
};

function createNamespace(baseIri: string): (localName: string) => NamedNode {
    return (localName: string) => namedNode(`${baseIri}${localName}`);
}

export const ns = {
    xsd: createNamespace(PREFIXES.xsd),
    rdf: createNamespace(PREFIXES.rdf),
    rdfs: createNamespace(PREFIXES.rdfs),
    owl: createNamespace(PREFIXES.owl),
    sh: createNamespace(PREFIXES.sh),
    shui: createNamespace(PREFIXES.shui),
    skos: createNamespace(PREFIXES.skos),
    schema: createNamespace(PREFIXES.schema),
    rxyz: createNamespace(PREFIXES.rxyz),
    
    /** Create a NamedNode from a full IRI string */
    fromIri: (iri: string): NamedNode => namedNode(iri),
};

/****************************************************************************************
 * Utility Functions
 */

/** Get compact CURIE from IRI (e.g., "http://www.w3.org/2000/01/rdf-schema#label" → "rdfs:label") */
export function toCompactIri(iri: string): string {
    for (const [prefix, baseIri] of Object.entries(PREFIXES)) {
        if (iri.startsWith(baseIri)) {
            return `${prefix}:${iri.substring(baseIri.length)}`;
        }
    }
    return iri;
}

/** Get local name from IRI */
export function getLocalName(iri: string): string {
    const hashIndex = iri.lastIndexOf('#');
    const slashIndex = iri.lastIndexOf('/');
    const separatorIndex = Math.max(hashIndex, slashIndex);
    return separatorIndex >= 0 ? iri.substring(separatorIndex + 1) : iri;
}

/** Common language tags for UI */
export const commonLanguageTags = ['en', 'nl', 'de', 'fr', 'es'];
