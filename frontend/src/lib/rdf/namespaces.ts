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
    foaf: 'http://xmlns.com/foaf/0.1/',
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
    // Classes
    BlogPosting: namedNode(`${PREFIXES.schema}BlogPosting`),
    Blog: namedNode(`${PREFIXES.schema}Blog`),
    Person: namedNode(`${PREFIXES.schema}Person`),
    SiteNavigationElement: namedNode(`${PREFIXES.schema}SiteNavigationElement`),
    // Properties
    headline: namedNode(`${PREFIXES.schema}headline`),
    author: namedNode(`${PREFIXES.schema}author`),
    datePublished: namedNode(`${PREFIXES.schema}datePublished`),
    dateModified: namedNode(`${PREFIXES.schema}dateModified`),
    abstract: namedNode(`${PREFIXES.schema}abstract`),
    keywords: namedNode(`${PREFIXES.schema}keywords`),
    articleBody: namedNode(`${PREFIXES.schema}articleBody`),
    hasPart: namedNode(`${PREFIXES.schema}hasPart`),
    blogPost: namedNode(`${PREFIXES.schema}blogPost`),
    name: namedNode(`${PREFIXES.schema}name`),
    description: namedNode(`${PREFIXES.schema}description`),
} as const;

export const SH = {
    // https://www.w3.org/TR/shacl/
    // https://www.validatingrdf.com/tutorial/eswc2025/slides/04_SHACL_Primer.pdf
    // Shape types
    NodeShape: namedNode(`${PREFIXES.sh}NodeShape`),
    PropertyShape: namedNode(`${PREFIXES.sh}PropertyShape`),
    // Targets
    targetClass: namedNode(`${PREFIXES.sh}targetClass`),
    targetNode: namedNode(`${PREFIXES.sh}targetNode`),
    // Property constraints
    property: namedNode(`${PREFIXES.sh}property`), // links a node shape to a property shape
    path: namedNode(`${PREFIXES.sh}path`), // the predicate IRI a property shape constrains
    datatype: namedNode(`${PREFIXES.sh}datatype`),
    class: namedNode(`${PREFIXES.sh}class`),
    nodeKind: namedNode(`${PREFIXES.sh}nodeKind`),
    node: namedNode(`${PREFIXES.sh}node`), // nested shape constraint
    // Cardinality
    minCount: namedNode(`${PREFIXES.sh}minCount`),
    maxCount: namedNode(`${PREFIXES.sh}maxCount`),
    // Shape metadata
    closed: namedNode(`${PREFIXES.sh}closed`),
    ignoredProperties: namedNode(`${PREFIXES.sh}ignoredProperties`),
    message: namedNode(`${PREFIXES.sh}message`),
    name: namedNode(`${PREFIXES.sh}name`),
    description: namedNode(`${PREFIXES.sh}description`),
    order: namedNode(`${PREFIXES.sh}order`), // TODO: more with DASH!
    group: namedNode(`${PREFIXES.sh}group`), // TODO: use to build shadcn forms!
    // Property path modifiers (for complex paths)
    inversePath: namedNode(`${PREFIXES.sh}inversePath`),
    alternativePath: namedNode(`${PREFIXES.sh}alternativePath`),
    // Node kinds (values for sh:nodeKind)
    IRI: namedNode(`${PREFIXES.sh}IRI`),
    BlankNode: namedNode(`${PREFIXES.sh}BlankNode`),
    Literal: namedNode(`${PREFIXES.sh}Literal`),
    BlankNodeOrIRI: namedNode(`${PREFIXES.sh}BlankNodeOrIRI`),
    BlankNodeOrLiteral: namedNode(`${PREFIXES.sh}BlankNodeOrLiteral`),
    IRIOrLiteral: namedNode(`${PREFIXES.sh}IRIOrLiteral`),
} as const;

export const XSD = {
    string: namedNode(`${PREFIXES.xsd}string`),
    integer: namedNode(`${PREFIXES.xsd}integer`),
    decimal: namedNode(`${PREFIXES.xsd}decimal`),
    float: namedNode(`${PREFIXES.xsd}float`),
    double: namedNode(`${PREFIXES.xsd}double`),
    boolean: namedNode(`${PREFIXES.xsd}boolean`),
    date: namedNode(`${PREFIXES.xsd}date`),
    dateTime: namedNode(`${PREFIXES.xsd}dateTime`),
    time: namedNode(`${PREFIXES.xsd}time`),
    anyURI: namedNode(`${PREFIXES.xsd}anyURI`),
} as const;

export const RXYZ = {
    x: namedNode(`${PREFIXES.rxyz}x`),
    y: namedNode(`${PREFIXES.rxyz}y`),
} as const;

export const FOAF = {
    Agent: namedNode(`${PREFIXES.foaf}Agent`),
} as const;

// Helper to create a namespaced named node
export function ns(
    prefix: keyof typeof PREFIXES, 
    localName: string
) {
    return namedNode(`${PREFIXES[prefix]}${localName}`);
}

