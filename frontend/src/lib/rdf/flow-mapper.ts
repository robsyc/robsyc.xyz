import type { Node, Edge } from '@xyflow/svelte';
import { DataFactory } from 'n3';
import type { NamedNode, Term } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { SCHEMA, RXYZ, RDF, PREFIXES } from './namespaces';

const { namedNode } = DataFactory;

/**
 * BlogNode data interface matching BlogNode.svelte expectations
 */
export interface BlogNodeData {
    title: string;
    date: string;
    description: string;
    tags: string[];
    content: string;
    // Store the original IRI for triple inspection
    iri: string;
}
// TODO
// - arbitary complex annotations w/ triples, not just the main entity's IRI and first neighbours...
// - we should use different kinds of UI nodes for different kinds of entities (shacl shapes, owl classes, data)
// - a single blog instance is thus data according to its shape & semantically annoated w/ owl inference (e.g. Person is a Primate)

/**
 * Registry mapping rdf:type IRIs to SvelteFlow node types
 */
export const NODE_TYPE_REGISTRY: Record<string, string> = {
    [SCHEMA.BlogPosting.value]: 'blog',
    // Add more mappings as needed:
    // [SCHEMA.Person.value]: 'person',
};

/**
 * Get the SvelteFlow node type for an RDF resource based on its rdf:type
 */
function getNodeType(store: RdfStore, subject: NamedNode): string | null {
    const types = store.getValues(subject, RDF.type);
    
    for (const typeNode of types) {
        const nodeType = NODE_TYPE_REGISTRY[typeNode.value];
        if (nodeType) {
            return nodeType;
        }
    }
    
    return null;
}

/****************************************************************************************
 * Extract a string value from an RDF term
 * These helper functions are used to extract values for populating a BlogNodeData object
 */
function termToString(term: Term | undefined): string {
    if (!term) return '';
    return term.value;
}
/**
 * Extract a number from an RDF term (for coordinates)
 */
function termToNumber(term: Term | undefined, defaultValue: number = 0): number {
    if (!term) return defaultValue;
    const num = parseFloat(term.value);
    return isNaN(num) ? defaultValue : num;
}

/**
 * Format a date string for display (from xsd:dateTime or xsd:date)
 * NOTE: same here (why not UTC?)
 */
function formatDate(term: Term | undefined): string {
    if (!term) return '';
    const value = term.value;
    // Try to parse as date and format nicely
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

/****************************************************************************************
 * Convert a BlogPosting resource to BlogNode data
 */
function blogPostingToNodeData(store: RdfStore, subject: NamedNode): BlogNodeData {
    const keywords = store.getValues(subject, SCHEMA.keywords);
    
    return {
        // NOTE: store.getValue gets the first match, might need more logic like most recently authored (future)
        title: termToString(store.getValue(subject, SCHEMA.headline)),
        date: formatDate(store.getValue(subject, SCHEMA.datePublished)),
        description: termToString(store.getValue(subject, SCHEMA.abstract)),
        tags: keywords.map(k => k.value),
        content: termToString(store.getValue(subject, SCHEMA.articleBody)),
        iri: subject.value,
    };
}

/**
 * Get position from rxyz:x and rxyz:y predicates
 */
function getPosition(store: RdfStore, subject: NamedNode): { x: number; y: number } {
    return {
        x: termToNumber(store.getValue(subject, RXYZ.x), 0),
        y: termToNumber(store.getValue(subject, RXYZ.y), 0),
    };
}

/****************************************************************************************
 * Convert RDF store contents to SvelteFlow nodes and edges
 * Two passes:
 * 1. Create nodes for all visualizable resources using a switch statement to the node data builder
 * 2. Create edges for object properties pointing to other *visualizable* nodes (direct links only)
 */
export function quadsToFlowElements(store: RdfStore): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Track which IRIs have been converted to nodes (for edge creation)
    const nodeIRIs = new Set<string>();
    
    // First pass: create nodes for all visualizable resources
    for (const [typeIRI, nodeType] of Object.entries(NODE_TYPE_REGISTRY)) {
        const subjects = store.getResourcesByType(typeIRI);
        
        for (const subject of subjects) {
            const position = getPosition(store, subject);
            
            // Get node-specific data based on type
            let data: BlogNodeData | { iri: string };
            
            switch (nodeType) {
                case 'blog':
                    data = blogPostingToNodeData(store, subject);
                    break;
                default:
                    // Generic fallback: include IRI
                    data = { iri: subject.value };
            }
            
            nodes.push({
                id: subject.value, // node id is the IRI of the resource
                type: nodeType, // node type is determined w/ NODE_TYPE_REGISTRY
                position,
                data: data as Record<string, unknown>,
            });
            
            nodeIRIs.add(subject.value);
        }
    }
    
    // Second pass: create edges for object properties pointing to other nodes
    // (e.g., schema:author pointing to a Person node)
    // NOTE: Currently not yet utilized by the data, there also is no Person node type
    for (const nodeIRI of nodeIRIs) {
        const quads = store.getQuads(namedNode(nodeIRI), null, null, null);
        
        for (const quad of quads) {
            // Only consider named node objects (not literals)
            if (quad.object.termType === 'NamedNode') {
                const targetIRI = quad.object.value;
                
                // Only create edge if target is also a visualized node
                // NOTE: only direct links are supported, also what if 
                // - graph pattern we want to express is indirect & type dependent (e.g. tags used in a person's blog posts)
                // - multiple predicates between two individual nodes
                // - special edges (inverse, transitive, etc.)
                // - edges treated as nodes (maybe too far fetched since we filter out non-UI visualizable resources)
                if (nodeIRIs.has(targetIRI)) {
                    edges.push({
                        id: `${nodeIRI}-${quad.predicate.value}-${targetIRI}`,
                        source: nodeIRI,
                        target: targetIRI,
                        label: getPredicateLabel(quad.predicate.value),
                    });
                }
            }
        }
    }
    
    return { nodes, edges };
}

/**
 * Get a human-readable label for a predicate IRI
 * (used in quadsToFlowElements to set the edge label)
 */
function getPredicateLabel(predicateIRI: string): string {
    // Extract local name from IRI
    // NOTE: is approach ignores that predicates can have labels themselves
    // we should perhaps pass on the store to this function to get the label
    const hashIndex = predicateIRI.lastIndexOf('#');
    const slashIndex = predicateIRI.lastIndexOf('/');
    const separatorIndex = Math.max(hashIndex, slashIndex);
    
    if (separatorIndex >= 0) {
        return predicateIRI.substring(separatorIndex + 1);
    }
    
    return predicateIRI;
}

/****************************************************************************************
 * Convert a SvelteFlow node back to RDF quads (for persistence)
 * NOTE: This is NOT being used in +page.svelte
 * Note: This is a simplified implementation for BlogPosting nodes
 * Ideally, this mapping should be inferred from SHACL somehow
 * Otherwise we will need both a blogPostingToNodeData & flowNodeToQuads function for each node type
 * Long term: would be nice to automatically build classes w/ methods from shacl in js or Pydantic maybe?
 */
export function flowNodeToQuads(node: Node): { subject: string; predicates: Array<{ p: string; o: string }> } {
    const data = node.data as unknown as BlogNodeData;
    const subject = data.iri || node.id;
    
    const predicates: Array<{ p: string; o: string }> = [
        { p: RDF.type.value, o: SCHEMA.BlogPosting.value },
        { p: SCHEMA.headline.value, o: data.title },
        { p: SCHEMA.abstract.value, o: data.description },
        { p: SCHEMA.articleBody.value, o: data.content },
        { p: RXYZ.x.value, o: String(node.position.x) },
        { p: RXYZ.y.value, o: String(node.position.y) },
    ];
    
    // Add tags as multiple keywords
    for (const tag of data.tags) {
        predicates.push({ p: SCHEMA.keywords.value, o: tag });
    }
    
    return { subject, predicates };
}

/**
 * Shorten an IRI using known prefixes for display
 */
export function shortenIRI(iri: string): string {
    for (const [prefix, namespace] of Object.entries(PREFIXES)) {
        if (iri.startsWith(namespace)) {
            return `${prefix}:${iri.substring(namespace.length)}`;
        }
    }
    return iri;
}

