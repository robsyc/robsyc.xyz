/**
 * Flow Mapper - RDF to SvelteFlow Conversion
 * 
 * Converts RDF ObjectTypes and LinkTypes to SvelteFlow nodes and edges.
 */

import type { Node, Edge } from '@xyflow/svelte';
import type { GraphPointer } from 'clownface';
import type { NamedNode, BlankNode } from '@rdfjs/types';
import type { Store } from 'n3';
import { ns, type RdfStore } from '$lib/stores/rdf.svelte';
import {
    findAllObjectTypes,
    findAllLinkTypes,
    type ObjectTypeFlags,
    type LinkTypeFlags,
    type PropertyShapeInfo,
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

export interface LinkTypeNodeData {
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    iri: string;
    flags: LinkTypeFlags;
    /** Info from wrapping PropertyShape */
    propertyShape?: PropertyShapeInfo;
    /** rdfs:domain ObjectType IRI */
    domainIri?: string;
    /** rdfs:range ObjectType IRI */
    rangeIri?: string;
}

export interface FlowMapperResult {
    nodes: Node[];
    edges: Edge[];
}

/****************************************************************************************
 * Position Utilities
 */

function getPosition(
    pointer: GraphPointer<NamedNode | BlankNode, Store>,
    index: number,
    isLinkType: boolean
): { x: number; y: number } {
    const x = parseFloat(pointer.out(ns.rxyz('x')).value ?? '') || NaN;
    const y = parseFloat(pointer.out(ns.rxyz('y')).value ?? '') || NaN;

    if (!isNaN(x) && !isNaN(y)) return { x, y };

    // Auto-layout: ObjectTypes left, LinkTypes center
    const col = isLinkType ? 1 : 0;
    return {
        x: 50 + col * 400,
        y: 50 + index * 250,
    };
}

/****************************************************************************************
 * Edge Predicates
 */

const OBJECT_TO_OBJECT_PREDICATES = [
    ns.skos('broader'), ns.skos('narrower'),
    ns.rdfs('subClassOf'), ns.owl('equivalentClass'),
];

const LINK_TO_LINK_PREDICATES = [
    ns.skos('broader'), ns.skos('narrower'),
    ns.rdfs('subPropertyOf'), ns.owl('equivalentProperty'),
];

/****************************************************************************************
 * Main Mapper
 */

export function mapRdfToFlow(store: RdfStore): FlowMapperResult {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    const objectTypes = findAllObjectTypes(store);
    const linkTypes = findAllLinkTypes(store);

    // Create ObjectType nodes
    objectTypes.forEach((info, index) => {
        nodes.push({
            id: info.iri,
            type: 'objectType',
            position: getPosition(info.pointer, index, false),
            data: { pointer: info.pointer, iri: info.iri, flags: info.flags } as unknown as Record<string, unknown>,
        });
        nodeIds.add(info.iri);
    });

    // Create LinkType nodes
    linkTypes.forEach((info, index) => {
        nodes.push({
            id: info.iri,
            type: 'linkType',
            position: getPosition(info.pointer, index, true),
            data: {
                pointer: info.pointer,
                iri: info.iri,
                flags: info.flags,
                propertyShape: info.propertyShape,
                domainIri: info.domainIri,
                rangeIri: info.rangeIri,
            } as unknown as Record<string, unknown>,
        });
        nodeIds.add(info.iri);
    });

    // Helper to create edges
    const addEdge = (source: string, target: string, label: string, predicate?: string) => {
        if (!nodeIds.has(source) || !nodeIds.has(target) || source === target) return;
        const id = predicate ? `${source}-${predicate}-${target}` : `${source}-${label}-${target}`;
        if (edgeIds.has(id)) return;
        edgeIds.add(id);
        edges.push({ id, source, target, label });
    };

    // Create edges between ObjectTypes
    for (const info of objectTypes) {
        for (const pred of OBJECT_TO_OBJECT_PREDICATES) {
            info.pointer.out(pred).terms.forEach(t => 
                addEdge(info.iri, t.value, getLocalName(pred.value), pred.value)
            );
        }
    }

    // Create edges from LinkTypes (domain/range)
    for (const info of linkTypes) {
        // Domain: ObjectType <-- LinkType (source is domain, target is LinkType)
        if (info.domainIri && nodeIds.has(info.domainIri)) {
            addEdge(info.domainIri, info.iri, 'domain');
        }
        
        // Range: LinkType --> ObjectType
        if (info.rangeIri && nodeIds.has(info.rangeIri)) {
            addEdge(info.iri, info.rangeIri, 'range');
        }

        // Also check PropertyShape's sh:node for range if no rdfs:range
        if (!info.rangeIri && info.propertyShape?.nodeTargetIri && nodeIds.has(info.propertyShape.nodeTargetIri)) {
            addEdge(info.iri, info.propertyShape.nodeTargetIri, 'sh:node');
        }

        // Link-to-Link edges
        for (const pred of LINK_TO_LINK_PREDICATES) {
            info.pointer.out(pred).terms.forEach(t => 
                addEdge(info.iri, t.value, getLocalName(pred.value), pred.value)
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
    return pointer.out(ns.rdfs('comment')).value;
}
