/**
 * Flow Mapper - RDF to SvelteFlow Conversion
 * 
 * Converts RDF ObjectTypes and ObjectProperties to SvelteFlow nodes and edges.
 */

import type { Node, Edge } from '@xyflow/svelte';
import type { GraphPointer } from 'clownface';
import type { NamedNode, BlankNode } from '@rdfjs/types';
import type { Store } from 'n3';
import { ns, type RdfStore } from '$lib/stores/rdf.svelte';
import {
    findAllObjectTypes,
    findAllObjectProperties,
    type ObjectTypeFlags,
    type ObjectPropertyFlags,
} from './type-detection';
import { getLocalName } from './utils';

/****************************************************************************************
 * Node Data Interfaces
 */

export interface ObjectTypeNodeData {
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    iri: string;
    flags: ObjectTypeFlags;
    /** True if this type has no parents (root node for progressive rendering) */
    isRoot: boolean;
}

export interface ObjectPropertyNodeData {
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    iri: string;
    flags: ObjectPropertyFlags;
    /** rdfs:domain ObjectType IRIs (can be multiple = intersection, unless explicitly stated union of classes) */
    domainIris?: string[];
    rangeIris?: string[];
    /** schema:domainIncludes IRIs (weak semantics) */
    domainIncludesIris?: string[];
    rangeIncludesIris?: string[];
    /** Pointer to inverse property */
    inversePointer?: GraphPointer<NamedNode | BlankNode, Store>;
    /** True if this property has no parent properties (root for progressive rendering) */
    // NOTE: visualizing all ObjectProperties on the UI can get overwhelming quickly since
    // - typically not as hierarchically structured as ObjectTypes
    // - domain/range edges wire everything up, creating a hairball of edges
    // So this might not be the best approach...
    isRoot: boolean;
}

export interface FlowMapperResult {
    nodes: Node[];
    edges: Edge[];
    /** IDs of root ObjectType nodes (no parents) for progressive rendering */
    rootNodeIds: string[];
}

/****************************************************************************************
 * Edge Types for visual distinction
 */
export type EdgeType = 
    | 'subClassOf' 
    | 'broader' 
    | 'subPropertyOf'
    | 'domain' 
    | 'range'
    | 'domainIncludes'
    | 'rangeIncludes'
    | 'targetClass'
    | 'shNode';

/****************************************************************************************
 * Position Utilities
 * NOTE: In the future we may want to use a more sophisticated layout algorithm like force-directed graph layout
 * This is supported with SvelteFlow
 */

function getPosition(
    pointer: GraphPointer<NamedNode | BlankNode, Store>,
    index: number,
    isObjectProperty: boolean
): { x: number; y: number } {
    const x = parseFloat(pointer.out(ns.rxyz('x')).value ?? '') || NaN;
    const y = parseFloat(pointer.out(ns.rxyz('y')).value ?? '') || NaN;

    if (!isNaN(x) && !isNaN(y)) return { x, y };

    // Auto-layout: ObjectTypes left, ObjectProperties center
    const col = isObjectProperty ? 1 : 0;
    return {
        x: 50 + col * 450,
        y: 50 + index * 200,
    };
}


/****************************************************************************************
 * Main Mapper
 * NOTE: down the line we don't want to load all nodes and edges at once
 * - begin with just top object types and object properties
 * - load more nodes through hierarchy toggles and load links between object types & object properties on demand
 */

export function mapRdfToFlow(store: RdfStore): FlowMapperResult {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const rootNodeIds: string[] = [];

    // Create ObjectType nodes
    const objectTypes = findAllObjectTypes(store);
    objectTypes.forEach((info, index) => {
        nodes.push({
            id: info.iri,
            type: 'objectType',
            position: getPosition(info.pointer, index, false),
            data: { 
                pointer: info.pointer, 
                iri: info.iri, 
                flags: info.flags,
                isRoot: info.isRoot,
            } as unknown as Record<string, unknown>,
        });
        nodeIds.add(info.iri);
        
        // Track root nodes for progressive rendering
        if (info.isRoot) {
            rootNodeIds.push(info.iri);
        }
    });

    // Create ObjectProperty nodes (consolidate inverse pairs)
    const objectProperties = findAllObjectProperties(store);
    const processedInverses = new Set<string>();
    objectProperties.forEach((info, index) => {
        // Skip if this is the "secondary" side of an inverse pair
        if (processedInverses.has(info.iri)) return;
        
        // Mark inverse as processed to avoid duplicates
        if (info.flags.inverseIri) {
            processedInverses.add(info.flags.inverseIri);
        }

        nodes.push({
            id: info.iri,
            type: 'objectProperty',
            position: getPosition(info.pointer, index, true),
            data: {
                pointer: info.pointer,
                iri: info.iri,
                flags: info.flags,
                domainIris: info.domainIris,
                rangeIris: info.rangeIris,
                domainIncludesIris: info.domainIncludesIris,
                rangeIncludesIris: info.rangeIncludesIris,
                inversePointer: info.inversePointer,
                isRoot: info.isRoot,
            } as unknown as Record<string, unknown>,
        });
        nodeIds.add(info.iri);
        
        // Track root properties for progressive rendering
        if (info.isRoot) {
            rootNodeIds.push(info.iri);
        }
    });

    /**
     * Get edge styling based on edge type
     * - Hierarchy edges: solid, thicker stroke
     * - Domain/Range edges: animated, thinner stroke  
     * - Weak semantics (Includes): dashed, animated
     * - targetClass: dashed, like hierarchy
     */
    const getEdgeStyle = (edgeType: EdgeType): { style?: string } => {
        switch (edgeType) {
            // Hierarchy edges - solid, prominent
            case 'subClassOf':
            case 'subPropertyOf':
                return { style: 'stroke-width: 2px' };
            case 'broader':
                return { style: 'stroke-width: 2px; opacity: 0.7' };
            // Domain/range - thinner, for horizontal flow
            case 'domain':
            case 'range':
                return { style: 'stroke-width: 1.5px' };
            // Weak semantics - dashed
            case 'domainIncludes':
            case 'rangeIncludes':
                return { style: 'stroke-width: 1.5px; stroke-dasharray: 4 2; opacity: 0.8' };
            // Shape targeting
            case 'targetClass':
                return { style: 'stroke-width: 2px; stroke-dasharray: 5 3' };
            case 'shNode':
                return { style: 'stroke-width: 1.5px; stroke-dasharray: 3 2' };
            default:
                return {};
        }
    };

    // Helper to create edges with semantic handle connections
    const addEdge = (
        source: string, 
        target: string, 
        label: string, 
        edgeType: EdgeType,
        options?: { 
            animated?: boolean; 
            style?: string;
            sourceHandle?: 'top' | 'bottom' | 'left' | 'right';
            targetHandle?: 'top' | 'bottom' | 'left' | 'right';
        }
    ) => {
        if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
        const id = `${source}-${edgeType}-${target}`;
        if (edgeIds.has(id)) return;
        edgeIds.add(id);
        
        // Get base styling for this edge type
        const baseStyle = getEdgeStyle(edgeType);
        // Merge with any custom style options
        const mergedStyle = options?.style 
            ? `${baseStyle.style || ''}; ${options.style}`.trim().replace(/^;/, '')
            : baseStyle.style;
        
        edges.push({ 
            id, 
            source, 
            target, 
            label,
            data: { edgeType },
            animated: options?.animated,
            style: mergedStyle,
            sourceHandle: options?.sourceHandle,
            targetHandle: options?.targetHandle,
        });
    };

    // Track strong edges to skip weaker semantics (edge consolidation)
    // subClassOf implies broader, domain implies domainIncludes, range implies rangeIncludes
    const hierarchyEdgePairs = new Set<string>(); // "source->target" pairs with subClassOf
    const domainEdgePairs = new Set<string>();    // "source->target" pairs with domain
    const rangeEdgePairs = new Set<string>();     // "source->target" pairs with range

    // Create edges between ObjectTypes (hierarchy)
    // Hierarchy edges use vertical handles: parent's bottom → child's top
    // Process subClassOf FIRST (stronger semantics), then broader
    for (const info of objectTypes) {
        // First pass: rdfs:subClassOf (stronger semantics)
        info.pointer.out(ns.rdfs('subClassOf')).terms.forEach(t => {
            const pairKey = `${t.value}->${info.iri}`;
            hierarchyEdgePairs.add(pairKey);
            addEdge(t.value, info.iri, 'subClassOf', 'subClassOf', {
                sourceHandle: 'bottom',
                targetHandle: 'top',
            });
        });
        
        // Second pass: skos:broader (weaker semantics) - skip if subClassOf exists
        info.pointer.out(ns.skos('broader')).terms.forEach(t => {
            const pairKey = `${t.value}->${info.iri}`;
            if (!hierarchyEdgePairs.has(pairKey)) {
                addEdge(t.value, info.iri, 'broader', 'broader', {
                    sourceHandle: 'bottom',
                    targetHandle: 'top',
                });
            }
        });
        
        // sh:targetClass on NodeShapes pointing to classes (vertical, dashed styling from getEdgeStyle)
        if (info.flags.isNodeShape) {
            info.pointer.out(ns.sh('targetClass')).terms.forEach(t =>
                addEdge(t.value, info.iri, 'targetClass', 'targetClass', { 
                    sourceHandle: 'bottom',
                    targetHandle: 'top',
                })
            );
        }
    }

    // Create edges from ObjectProperties (domain/range)
    // Domain/range edges use horizontal handles for semantic flow
    for (const info of objectProperties) {
        // Domain: ObjectType's right → ObjectProperty's left (stronger semantics first)
        if (info.domainIris) {
            for (const domainIri of info.domainIris) {
                if (nodeIds.has(domainIri)) {
                    const pairKey = `${domainIri}->${info.iri}`;
                    domainEdgePairs.add(pairKey);
                    addEdge(domainIri, info.iri, 'domain', 'domain', {
                        sourceHandle: 'right',
                        targetHandle: 'left',
                        animated: true,
                    });
                }
            }
        }
        
        // Range: ObjectProperty's right → ObjectType's left (stronger semantics first)
        if (info.rangeIris) {
            for (const rangeIri of info.rangeIris) {
                if (nodeIds.has(rangeIri)) {
                    const pairKey = `${info.iri}->${rangeIri}`;
                    rangeEdgePairs.add(pairKey);
                    addEdge(info.iri, rangeIri, 'range', 'range', {
                        sourceHandle: 'right',
                        targetHandle: 'left',
                        animated: true,
                    });
                }
            }
        }

        // schema:domainIncludes (weaker semantics) - skip if domain exists for same pair
        if (info.domainIncludesIris) {
            for (const domainIri of info.domainIncludesIris) {
                if (nodeIds.has(domainIri)) {
                    const pairKey = `${domainIri}->${info.iri}`;
                    if (!domainEdgePairs.has(pairKey)) {
                        addEdge(domainIri, info.iri, 'domainIncludes', 'domainIncludes', { 
                            sourceHandle: 'right',
                            targetHandle: 'left',
                            animated: true,
                        });
                    }
                }
            }
        }

        // schema:rangeIncludes (weaker semantics) - skip if range exists for same pair
        if (info.rangeIncludesIris) {
            for (const rangeIri of info.rangeIncludesIris) {
                if (nodeIds.has(rangeIri)) {
                    const pairKey = `${info.iri}->${rangeIri}`;
                    if (!rangeEdgePairs.has(pairKey)) {
                        addEdge(info.iri, rangeIri, 'rangeIncludes', 'rangeIncludes', { 
                            sourceHandle: 'right',
                            targetHandle: 'left',
                            animated: true,
                        });
                    }
                }
            }
        }

        // Property hierarchy edges (subPropertyOf) - vertical handles
        info.pointer.out(ns.rdfs('subPropertyOf')).terms.forEach(t => {
            // Parent (t.value) as source, child (info.iri) as target
            addEdge(t.value, info.iri, 'subPropertyOf', 'subPropertyOf', {
                sourceHandle: 'bottom',
                targetHandle: 'top',
            });
        });
    }

    return { nodes, edges, rootNodeIds };
}

/****************************************************************************************
 * Utility Functions for Components
 */

export function getLabel(pointer: GraphPointer<NamedNode | BlankNode, Store>): string {
    return pointer.out(ns.rdfs('label')).value ?? (pointer.term ? getLocalName(pointer.term.value) : 'Unknown');
}

export function getComment(pointer: GraphPointer<NamedNode | BlankNode, Store>): string | undefined {
    return pointer.out(ns.rdfs('comment')).value ?? 'No rdfs:comment defined';
}
