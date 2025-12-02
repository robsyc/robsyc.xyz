/**
 * Clownface-Based Flow Mapper
 * 
 * Converts RDF store contents to SvelteFlow nodes and edges using Clownface
 * GraphPointers instead of pre-extracted data.
 * 
 * This is the foundation for:
 * - Real-time updates when RDF changes
 * - Easy subgraph extraction for selected nodes
 * - Better SHACL alignment
 */

import type { Node, Edge } from '@xyflow/svelte';
import { DataFactory } from 'n3';
import type { NamedNode, BlankNode, Term } from '@rdfjs/types';
import type { Store } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { ns, type GraphPointer, type ClownfaceStore } from '$lib/rdf/clownface-store';
import { getLocalName } from './utils';
import { shouldVisualize, getNodeType as getDashNodeType, getLayoutHint } from './dash';

const { namedNode } = DataFactory;

/****************************************************************************************
 * Node Data Interfaces
 */

/**
 * Clownface-powered node data
 * Contains a GraphPointer instead of pre-extracted properties
 */
export interface ClownfaceNodeData {
    /** GraphPointer to this resource in the RDF store */
    pointer: GraphPointer<Term, Store>;
    /** GraphPointer to the SHACL shape (if applicable) */
    shapePointer?: GraphPointer<NamedNode, Store>;
    /** IRI of the resource (for convenience) */
    iri: string;
    /** Target class or node IRI from the shape */
    targetIRI?: string;
    /** Local name for display */
    targetLocalName?: string;
    /** Layout hint from DASH (horizontal, vertical, cluster) */
    layoutHint?: 'horizontal' | 'vertical' | 'cluster';
}

/****************************************************************************************
 * Position Extraction
 */

/**
 * Get position from rxyz:x and rxyz:y using Clownface
 */
function getPosition(pointer: GraphPointer<Term, Store>): { x: number; y: number } {
    const x = parseFloat(pointer.out(ns.rxyz('x')).value ?? '0') || 0;
    const y = parseFloat(pointer.out(ns.rxyz('y')).value ?? '0') || 0;
    return { x, y };
}

/****************************************************************************************
 * Node Type Registry
 */

/**
 * Shape targets to skip visualization (rendered inside parent nodes instead)
 * Action and Message are displayed within AgentNode and NavigationNode
 * TODO: perhaps we can encode this inside the shape itself?
 */
const SKIP_SHAPE_TARGETS = new Set(['Action', 'Message']);

/**
 * Map from shape target local name to SvelteFlow node type
 * Used as fallback when no DASH/rxyz: annotation is present
 */
const NODE_TYPE_MAP: Record<string, string> = {
    'BlogPosting': 'blog', // TODO: this should be updated; we want Blog node with postings underneath + pagination
    'SiteNavigationElement': 'navigation',
    'WelcomeNav': 'navigation',
    'robsyc': 'agent',
    // Future:
    // 'Person': 'person',
    // 'Project': 'project',
};

/**
 * Get the SvelteFlow node type for a shape
 * Checks in order:
 * 1. Explicit DASH/rxyz: annotation (rxyz:nodeType or rxyz:componentName)
 * 2. NODE_TYPE_MAP lookup by target local name
 * 3. 'shape' fallback
 * 
 * @param shapePtr - Pointer to the SHACL shape
 * @param targetLocalName - Fallback: local name of target class/node
 */
function getNodeTypeForShape(shapePtr: GraphPointer<Term, Store>, targetLocalName: string): string {
    // Check for explicit rxyz:nodeType or rxyz:componentName
    const explicitNodeType = shapePtr.out(ns.rxyz('nodeType')).value;
    if (explicitNodeType) {
        return explicitNodeType;
    }
    
    const componentName = shapePtr.out(ns.rxyz('componentName')).value;
    if (componentName) {
        return componentName;
    }
    
    // Fall back to hardcoded NODE_TYPE_MAP
    return NODE_TYPE_MAP[targetLocalName] ?? 'shape';
}

/****************************************************************************************
 * Main Conversion Function
 */

export interface FlowMapperOptions {
    /** Set of node IDs that already exist - skip creating these nodes */
    existingNodeIds?: Set<string>;
    /** Set of edge IDs that already exist - skip creating these edges */
    existingEdgeIds?: Set<string>;
}

/**
 * Convert RDF store contents to SvelteFlow nodes and edges using Clownface
 * 
 * Node data contains GraphPointers for lazy property access in components.
 * Shapes targeting Action or Message are skipped (rendered inside parent nodes).
 * 
 * @param rdfStore - The reactive RDF store
 * @param options - Optional parameters to skip already-existing nodes/edges
 * 
 * @example
 * const { nodes, edges } = quadsToFlowElements(rdfStore);
 * // nodes[0].data.pointer is a GraphPointer to the resource
 */
export function quadsToFlowElements(
    rdfStore: RdfStore,
    options?: FlowMapperOptions
): { nodes: Node[]; edges: Edge[] } {
    const cf = rdfStore.cf;
    const store = rdfStore.store;
    
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Track all node IDs for edge creation
    const allNodeIds = new Set<string>(options?.existingNodeIds ?? []);
    // Map from node ID to pointer (for edge creation)
    const pointerMap = new Map<string, GraphPointer<Term, Store>>();
    
    // Get all SHACL NodeShapes
    const shapes = cf.getNodeShapes();
    
    // Track processed shapes to avoid duplicates
    const processedShapeIRIs = new Set<string>();
    
    // Process each shape
    shapes.forEach(shapePtr => {
        const shapeIRI = shapePtr.term?.value;
        if (!shapeIRI || processedShapeIRIs.has(shapeIRI)) return;
        processedShapeIRIs.add(shapeIRI);
        
        // Determine target
        const targetClass = shapePtr.out(ns.sh('targetClass'));
        const targetNode = shapePtr.out(ns.sh('targetNode'));
        
        let targetIRI: string | undefined;
        let targetLocalName: string;
        let subjectPointers: GraphPointer<Term, Store>[] = [];
        
        if (targetClass.term) {
            // sh:targetClass - find all instances of the class
            targetIRI = targetClass.term.value;
            targetLocalName = getLocalName(targetIRI);
            subjectPointers = cf.byType(targetClass.term as NamedNode).toArray();
        } else if (targetNode.term) {
            // sh:targetNode - target a specific node
            targetIRI = targetNode.term.value;
            targetLocalName = getLocalName(targetIRI);
            subjectPointers = [cf.namedNode(targetIRI)];
        } else {
            // No valid target
            return;
        }
        
        // Skip shapes that are rendered inside parent nodes (Action, Message)
        if (SKIP_SHAPE_TARGETS.has(targetLocalName)) {
            return;
        }
        // TODO: this is redundant here... what should we pick?
        // Check if this shape should be visualized (DASH support)
        if (!shouldVisualize(shapePtr)) {
            return; // Skip non-visualized shapes
        }
        
        const nodeType = getNodeTypeForShape(shapePtr, targetLocalName);
        const layoutHint = getLayoutHint(shapePtr);
        let newCount = 0;
        
        for (const subjectPtr of subjectPointers) {
            const nodeId = subjectPtr.term?.value;
            if (!nodeId) continue;
            
            // Track for edge creation
            pointerMap.set(nodeId, subjectPtr);
            
            // Skip if already exists
            if (options?.existingNodeIds?.has(nodeId)) {
                allNodeIds.add(nodeId);
                continue;
            }
            
            const position = getPosition(subjectPtr);
            
            // Create node data with GraphPointer
            const nodeData: ClownfaceNodeData = {
                pointer: subjectPtr,
                shapePointer: shapePtr as GraphPointer<NamedNode, Store>,
                iri: nodeId,
                targetIRI,
                targetLocalName,
                layoutHint,
            };
            
            nodes.push({
                id: nodeId,
                type: nodeType,
                position,
                data: nodeData as unknown as Record<string, unknown>,
            });
            
            allNodeIds.add(nodeId);
            newCount++;
        }
        
    });
    
    // Create edges for object properties pointing to visualized nodes
    for (const [nodeId, pointer] of pointerMap) {
        // Get all outgoing predicates and their objects
        const dataset = pointer.dataset;
        if (!dataset || !pointer.term) continue;
        
        for (const quad of dataset.match(pointer.term as any, null, null, null)) {
            // Check if the object is a visualized node
            if (quad.object.termType === 'NamedNode' || quad.object.termType === 'BlankNode') {
                const targetId = quad.object.value;
                
                if (allNodeIds.has(targetId)) {
                    const edgeId = `${nodeId}-${quad.predicate.value}-${targetId}`;
                    
                    // Skip if already exists
                    if (options?.existingEdgeIds?.has(edgeId)) continue;
                    
                    const edgeLabel = getLocalName(quad.predicate.value);
                    edges.push({
                        id: edgeId,
                        source: nodeId,
                        target: targetId,
                        label: edgeLabel,
                    });
                }
            }
        }
    }
    
    return { nodes, edges };
}

/****************************************************************************************
 * Subgraph Extraction
 * 
 * Extract quads for selected nodes - key for "lasso selection" feature
 */

import { extractSubgraph } from '$lib/rdf/clownface-store';
import { Writer } from 'n3';
import { PREFIXES } from './clownface-store';

/**
 * Extract and serialize the subgraph for selected nodes
 * 
 * @param nodeDataArray - Array of ClownfaceNodeData from selected nodes
 * @param format - Output format: 'turtle' or 'ntriples'
 * @returns Serialized RDF string
 * 
 * @example
 * const selectedNodes = nodes.filter(n => selected.has(n.id));
 * const turtle = serializeSelectedNodes(selectedNodes.map(n => n.data), 'turtle');
 */
export function serializeSelectedNodes(
    nodeDataArray: ClownfaceNodeData[],
    format: 'turtle' | 'ntriples' = 'turtle'
): string {
    // Collect all pointers
    const pointers = nodeDataArray
        .map(data => data.pointer)
        .filter((p): p is GraphPointer<Term, Store> => p !== undefined);
    
    if (pointers.length === 0) return '';
    
    // Extract subgraph quads
    const quads = extractSubgraph(pointers, 2); // depth 2 to capture nested structures
    // TODO: make this depth configurable
    
    // Serialize
    const writer = new Writer({
        format: format === 'turtle' ? 'Turtle' : 'N-Triples',
        prefixes: format === 'turtle' ? PREFIXES : undefined,
    }); // TODO: use turtle prettifier here
    
    writer.addQuads(quads);
    
    let result = '';
    writer.end((error, output) => {
        if (error) throw error;
        result = output;
    });
    
    return result;
}

