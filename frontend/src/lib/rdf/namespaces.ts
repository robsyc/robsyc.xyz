import { DataFactory } from 'n3';

const { namedNode } = DataFactory;

// Common namespace prefixes
export const PREFIXES = {
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    owl: 'http://www.w3.org/2002/07/owl#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    schema: 'https://schema.org/',
    sh: 'http://www.w3.org/ns/shacl#',
    dash: 'http://datashapes.org/dash#',
    rxyz: 'http://rosyc.xyz#',
} as const;

// Commonly used named nodes
export const RDF = {
    type: namedNode(`${PREFIXES.rdf}type`),
} as const;

export const RDFS = {
    label: namedNode(`${PREFIXES.rdfs}label`),
    comment: namedNode(`${PREFIXES.rdfs}comment`),
} as const;

export const SCHEMA = {
    BlogPosting: namedNode(`${PREFIXES.schema}BlogPosting`),
    Person: namedNode(`${PREFIXES.schema}Person`),
    headline: namedNode(`${PREFIXES.schema}headline`),
    author: namedNode(`${PREFIXES.schema}author`),
    datePublished: namedNode(`${PREFIXES.schema}datePublished`),
    dateModified: namedNode(`${PREFIXES.schema}dateModified`),
    abstract: namedNode(`${PREFIXES.schema}abstract`),
    keywords: namedNode(`${PREFIXES.schema}keywords`),
    articleBody: namedNode(`${PREFIXES.schema}articleBody`),
} as const;

export const SH = {
    NodeShape: namedNode(`${PREFIXES.sh}NodeShape`),
    targetClass: namedNode(`${PREFIXES.sh}targetClass`),
    property: namedNode(`${PREFIXES.sh}property`),
    path: namedNode(`${PREFIXES.sh}path`),
    datatype: namedNode(`${PREFIXES.sh}datatype`),
    minCount: namedNode(`${PREFIXES.sh}minCount`),
    maxCount: namedNode(`${PREFIXES.sh}maxCount`),
} as const;

export const RXYZ = {
    x: namedNode(`${PREFIXES.rxyz}x`),
    y: namedNode(`${PREFIXES.rxyz}y`),
} as const;

// Helper to create a namespaced named node
export function ns(prefix: keyof typeof PREFIXES, localName: string) {
    return namedNode(`${PREFIXES[prefix]}${localName}`);
}

