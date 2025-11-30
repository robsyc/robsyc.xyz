/**
 * SHACL-Driven Flow Mapper
 * 
 * Converts RDF store contents to SvelteFlow nodes and edges using SHACL shapes
 * as the source of truth for entity type mapping and property extraction.
 */

import type { Node, Edge } from '@xyflow/svelte';
import { DataFactory } from 'n3';
import type { NamedNode, BlankNode } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { RXYZ, RDFS } from './namespaces';
import { 
    buildShapeRegistry, 
    type ShapeRegistry, 
    type NodeShape,
    type PropertyShape,
} from './shacl-parser';
import { 
    getLocalName, 
    shortenIRI, 
    termToNumber, 
    formatDate,
} from './utils';

const { namedNode } = DataFactory;

/** Type alias for subjects that can be either named or blank nodes */
type SubjectNode = NamedNode | BlankNode;

/****************************************************************************************
 * Node Data Interfaces
 * 
 * ShapeNodeData is the generic shape-driven data structure.
 * BlogNodeData is maintained for backward compatibility with BlogNode.svelte.
 */

/**
 * Generic shape-driven node data
 * Contains all properties extracted based on the shape definition
 */
export interface ShapeNodeData {
    iri: string;
    shapeIRI: string;
    shapeLabel?: string;
    targetClass: string;
    targetClassLocalName: string;
    // Dynamic properties extracted from shape - keyed by property path local name
    properties: Record<string, PropertyValue>;
}

/**
 * A property value extracted from RDF
 */
export interface PropertyValue {
    path: string;           // Full predicate IRI
    localName: string;      // Local name for display
    values: string[];       // All values (as strings)
    value: string;          // First value (convenience)
    datatype?: string;      // XSD datatype if known
    isMultiValued: boolean;
    isRequired: boolean;
}

/**
 * BlogNode data interface - maintained for backward compatibility
 * Maps ShapeNodeData properties to the expected BlogNode.svelte format
 */
export interface BlogNodeData {
    title: string;
    date: string;
    description: string;
    tags: string[];
    content: string;
    iri: string;
    // Include shape info for future use
    shapeIRI?: string;
}

/****************************************************************************************
 * Position Extraction
 */

/**
 * Get position from rxyz:x and rxyz:y predicates
 * Accepts both NamedNode and BlankNode subjects
 */
function getPosition(store: RdfStore, subject: SubjectNode): { x: number; y: number } {
    return {
        x: termToNumber(store.getValue(subject, RXYZ.x), 0),
        y: termToNumber(store.getValue(subject, RXYZ.y), 0),
    };
}

/****************************************************************************************
 * Shape-Driven Data Extraction
 */

/**
 * Extract a PropertyValue from the store based on a PropertyShape
 * Accepts both NamedNode and BlankNode subjects
 */
function extractPropertyValue(
    store: RdfStore, 
    subject: SubjectNode, 
    propShape: PropertyShape
): PropertyValue {
    const pathNode = namedNode(propShape.path);
    const terms = store.getValues(subject, pathNode);
    const values = terms.map(t => t.value);
    
    return {
        path: propShape.path,
        localName: propShape.pathLocalName,
        values,
        value: values[0] ?? '',
        datatype: propShape.datatype,
        isMultiValued: propShape.maxCount === undefined || propShape.maxCount > 1,
        isRequired: (propShape.minCount ?? 0) >= 1,
    };
}

/**
 * Extract all property values for a resource based on its shape
 * Accepts both NamedNode and BlankNode subjects
 */
function extractShapeData(
    store: RdfStore, 
    subject: SubjectNode, 
    shape: NodeShape
): ShapeNodeData {
    const properties: Record<string, PropertyValue> = {};
    
    // Extract each property defined in the shape
    for (const propShape of shape.properties) {
        const propValue = extractPropertyValue(store, subject, propShape);
        properties[propShape.pathLocalName] = propValue;
    }
    
    return {
        iri: subject.value,
        shapeIRI: shape.iri,
        shapeLabel: shape.label,
        targetClass: shape.targetClass,
        targetClassLocalName: shape.targetClassLocalName,
        properties,
    };
}

/**
 * Convert ShapeNodeData to BlogNodeData for backward compatibility
 * Maps the generic shape properties to the specific BlogNode format
 */
function shapeDataToBlogData(shapeData: ShapeNodeData): BlogNodeData {
    const props = shapeData.properties;
    
    return {
        title: props['headline']?.value ?? '',
        date: formatDate(props['datePublished']?.value ?? ''),
        description: props['abstract']?.value ?? '',
        tags: props['keywords']?.values ?? [],
        content: props['articleBody']?.value ?? '',
        iri: shapeData.iri,
        shapeIRI: shapeData.shapeIRI,
    };
}

/****************************************************************************************
 * Node Type Registry
 * 
 * Maps target class IRIs to SvelteFlow node types.
 * This is now derived from shapes but we maintain a mapping for custom node components.
 */

/**
 * Map from target class local name to SvelteFlow node type
 * Used to select which component renders the node
 */
const NODE_TYPE_MAP: Record<string, string> = {
    'BlogPosting': 'blog',
    'SiteNavigationElement': 'navigation',
    // Future node types:
    // 'Person': 'person',
    // 'Project': 'project',
};

/**
 * Get the SvelteFlow node type for a shape's target class
 * Falls back to 'shape' for generic shape-based rendering
 */
function getNodeTypeForShape(shape: NodeShape): string {
    return NODE_TYPE_MAP[shape.targetClassLocalName] ?? 'shape';
}

/****************************************************************************************
 * Main Conversion Functions
 */

/** Options for quadsToFlowElements */
export interface FlowMapperOptions {
    /** Set of node IDs that already exist - skip creating these nodes */
    existingNodeIds?: Set<string>;
    /** Set of edge IDs that already exist - skip creating these edges */
    existingEdgeIds?: Set<string>;
}

/**
 * Convert RDF store contents to SvelteFlow nodes and edges
 * Uses SHACL shapes to determine which resources to visualize and how
 * Supports both NamedNode and BlankNode subjects
 * 
 * @param dataStore - Store containing instance data (data.ttl)
 * @param shapeStore - Store containing SHACL shapes (shapes.ttl) - can be same as dataStore
 * @param options - Optional parameters to skip already-existing nodes/edges
 * 
 * @example
 * // First load: create all nodes and edges
 * const elements = quadsToFlowElements(rdfStore);
 * 
 * @example
 * // Subsequent loads: only create new nodes/edges
 * const existingNodeIds = new Set(nodes.map(n => n.id));
 * const existingEdgeIds = new Set(edges.map(e => e.id));
 * const newElements = quadsToFlowElements(rdfStore, undefined, { existingNodeIds, existingEdgeIds });
 */
export function quadsToFlowElements(
    dataStore: RdfStore, 
    shapeStore?: RdfStore,
    options?: FlowMapperOptions
): { nodes: Node[]; edges: Edge[]; shapeRegistry: ShapeRegistry } {
    // Use same store for shapes if not provided separately
    const shapesStore = shapeStore ?? dataStore;
    
    // Build shape registry from loaded shapes
    const shapeRegistry = buildShapeRegistry(shapesStore);
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Track all node IDs (includes existing + new, for edge creation)
    const allNodeIds = new Set<string>(options?.existingNodeIds ?? []);
    // Map from node ID to the original subject term (for edge creation)
    const subjectMap = new Map<string, SubjectNode>();
    
    // For each shape, find instances of its target class and create nodes
    // 1st forward pass: NODES
    for (const [targetClassIRI, shape] of shapeRegistry) {
        const subjects = dataStore.getResourcesByType(targetClassIRI);
        const nodeType = getNodeTypeForShape(shape);
        
        let newCount = 0;
        for (const subject of subjects) {
            // Use subject.value as ID (works for both NamedNode and BlankNode)
            const nodeId = subject.value;
            
            // Track for edge creation regardless of whether we create the node
            subjectMap.set(nodeId, subject);
            
            // Skip if node already exists
            if (options?.existingNodeIds?.has(nodeId)) {
                allNodeIds.add(nodeId);
                continue;
            }
            
            const position = getPosition(dataStore, subject);
            
            // Extract data based on shape
            const shapeData = extractShapeData(dataStore, subject, shape);
            
            // Convert to specific node data format based on node type
            let data: BlogNodeData | ShapeNodeData;
            if (nodeType === 'blog') {
                data = shapeDataToBlogData(shapeData);
            } else {
                data = shapeData;
            }
            
            nodes.push({
                id: nodeId,
                type: nodeType,
                position,
                data: data as unknown as Record<string, unknown>,
            });
            
            allNodeIds.add(nodeId);
            newCount++;
        }
        
        if (newCount > 0) {
            console.log(`[FlowMapper] Created ${newCount} new ${shape.targetClassLocalName} node(s) → nodeType: "${nodeType}"`);
        }
    }
    
    // Create edges for object properties pointing to other visualized nodes
    // 2nd forward pass: EDGES
    for (const [nodeId, subject] of subjectMap) {
        // Query using the original term (works for both NamedNode and BlankNode)
        const quads = dataStore.getQuads(subject, null, null, null);
        
        for (const quad of quads) {
            // Check if the object is a node we've visualized (NamedNode or BlankNode)
            if (quad.object.termType === 'NamedNode' || quad.object.termType === 'BlankNode') {
                const targetId = quad.object.value;
                
                if (allNodeIds.has(targetId)) {
                    const edgeId = `${nodeId}-${quad.predicate.value}-${targetId}`;
                    
                    // Skip if edge already exists
                    if (options?.existingEdgeIds?.has(edgeId)) {
                        continue;
                    }
                    
                    const edgeLabel = getLocalName(quad.predicate.value);
                    edges.push({
                        id: `${nodeId}-${quad.predicate.value}-${targetId}`,
                        source: nodeId,
                        target: targetId,
                        label: edgeLabel,
                    });
                    console.log(`[FlowMapper] Edge: ${getLocalName(nodeId)} -[${edgeLabel}]-> ${getLocalName(targetId)}`);
                }
            }
        }
    }
    
    console.log(`[FlowMapper] ✓ Created ${nodes.length} new nodes and ${edges.length} new edges from ${shapeRegistry.size} shapes`);
    
    return { nodes, edges, shapeRegistry };
}