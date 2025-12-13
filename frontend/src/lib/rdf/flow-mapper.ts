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
}

export interface FlowMapperResult {
    nodes: Node[];
    edges: Edge[];
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
 * Edge Predicates
 * NOTE: down the line we want to add more predicates (e.g. sh:node), toggle edge visibility
 * and handle this more granularly e.g.
 * - strict sh:NodeShape should not have subClassOf, only broader
 */

const OBJECT_TO_OBJECT_PREDICATES = [
    { pred: ns.rdfs('subClassOf'), label: 'subClassOf', type: 'subClassOf' as EdgeType },
    { pred: ns.skos('broader'), label: 'broader', type: 'broader' as EdgeType },
];

const PROPERTY_TO_PROPERTY_PREDICATES = [
    { pred: ns.rdfs('subPropertyOf'), label: 'subPropertyOf', type: 'subPropertyOf' as EdgeType },
];

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
            } as unknown as Record<string, unknown>,
        });
        nodeIds.add(info.iri);
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
            } as unknown as Record<string, unknown>,
        });
        nodeIds.add(info.iri);
    });

    // Helper to create edges
    const addEdge = (
        source: string, 
        target: string, 
        label: string, 
        edgeType: EdgeType,
        options?: { animated?: boolean; style?: string }
    ) => {
        if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
        const id = `${source}-${edgeType}-${target}`;
        if (edgeIds.has(id)) return;
        edgeIds.add(id);
        edges.push({ 
            id, 
            source, 
            target, 
            label,
            data: { edgeType },
            animated: options?.animated,
            style: options?.style,
        });
    };

    // TODO: edges should be rendered much more dynamically as they can quickly clutter up the UI

    // Create edges between ObjectTypes (hierarchy)
    for (const info of objectTypes) {
        for (const { pred, label, type } of OBJECT_TO_OBJECT_PREDICATES) {
            info.pointer.out(pred).terms.forEach(t => 
                // Swapped: parent (t.value) as source, child (info.iri) as target
                // This makes edges flow downward in hierarchy (parent's bottom → child's top)
                addEdge(t.value, info.iri, label, type)
            );
        }
        
        // Also check for sh:targetClass on NodeShapes pointing to classes
        if (info.flags.isNodeShape) {
            info.pointer.out(ns.sh('targetClass')).terms.forEach(t =>
                addEdge(t.value, info.iri, 'targetClass', 'targetClass', { style: 'stroke-dasharray: 5 5' })
            );
        }
    }

    // Create edges from ObjectProperties (domain/range)
    for (const info of objectProperties) {
        // Domain: ObjectType <-- ObjectProperty (edge from domain to property)
        if (info.domainIris) {
            for (const domainIri of info.domainIris) {
                if (nodeIds.has(domainIri)) {
                    addEdge(domainIri, info.iri, 'domain', 'domain');
                }
            }
        }
        
        // Range: ObjectProperty --> ObjectType
        if (info.rangeIris) {
            for (const rangeIri of info.rangeIris) {
                if (nodeIds.has(rangeIri)) {
                    addEdge(info.iri, rangeIri, 'range', 'range');
                }
            }
        }

        // schema:domainIncludes (weak semantics)
        if (info.domainIncludesIris) {
            for (const domainIri of info.domainIncludesIris) {
                if (nodeIds.has(domainIri)) {
                    addEdge(domainIri, info.iri, 'domainIncludes', 'domainIncludes', { style: 'stroke-dasharray: 3 3' });
                }
            }
        }

        // schema:rangeIncludes (weak semantics)
        if (info.rangeIncludesIris) {
            for (const rangeIri of info.rangeIncludesIris) {
                if (nodeIds.has(rangeIri)) {
                    addEdge(info.iri, rangeIri, 'rangeIncludes', 'rangeIncludes', { style: 'stroke-dasharray: 3 3' });
                }
            }
        }

        // Property-to-Property edges
        for (const { pred, label, type } of PROPERTY_TO_PROPERTY_PREDICATES) {
            info.pointer.out(pred).terms.forEach(t => 
                addEdge(info.iri, t.value, label, type)
            );
        }
    }

    return { nodes, edges };
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
