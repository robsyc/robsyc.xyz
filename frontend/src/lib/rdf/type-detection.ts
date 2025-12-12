/**
 * Type Detection Utilities for RDF Schema Elements
 * 
 * Identifies ObjectTypes and LinkTypes from RDF data:
 * - ObjectTypes: rdfs:Class, owl:Class, sh:NodeShape (or combinations)
 * - LinkTypes: owl:ObjectProperty (the relationship), optionally wrapped by sh:PropertyShape
 */

import type { GraphPointer } from 'clownface';
import type { NamedNode, BlankNode, Term } from '@rdfjs/types';
import type { Store } from 'n3';
import { ns, type RdfStore } from '$lib/stores/rdf.svelte';

/****************************************************************************************
 * Type Flags Interfaces
 */

/** Semantic type flags for ObjectTypes (classes/shapes) */
export interface ObjectTypeFlags {
    isRdfsClass: boolean; // rdfs:Class and not rdf:Property
    isOwlClass: boolean;  // owl:Class (implies isRdfsClass)
    isNodeShape: boolean; // sh:NodeShape
    // NOTE: sh:ShapeClass implies isRdfsClass and isNodeShape
}

/** Combined result for ObjectType detection */
export interface ObjectTypeInfo {
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    iri: string;
    flags: ObjectTypeFlags;
}

/** Semantic type flags for LinkTypes (relationships connecting ObjectTypes) */
export interface LinkTypeFlags {
    isObjectProperty: boolean;  // owl:ObjectProperty
    hasPropertyShape: boolean;  // Has a wrapping sh:PropertyShape
}

/** Info about the wrapping PropertyShape (if any) */
export interface PropertyShapeInfo {
    /** IRI of the PropertyShape */
    shapeIri: string;
    /** Pointer to the PropertyShape */
    shapePointer: GraphPointer<NamedNode | BlankNode, Store>;
    /** sh:node target (the target ObjectType) */
    nodeTargetIri?: string;
    /** sh:minCount */
    minCount?: string;
    /** sh:maxCount */
    maxCount?: string;
    /** sh:message */
    message?: string;
}

/** Combined result for LinkType detection */
export interface LinkTypeInfo {
    /** Pointer to the ObjectProperty */
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    /** IRI of the ObjectProperty */
    iri: string;
    flags: LinkTypeFlags;
    /** Info from wrapping PropertyShape (if any) */
    propertyShape?: PropertyShapeInfo;
    /** rdfs:domain (from the property itself) */
    domainIri?: string;
    /** rdfs:range (from the property itself) */
    rangeIri?: string;
}

/****************************************************************************************
 * Type Detection Functions
 */

/** Detect ObjectType flags for a given pointer */
export function detectObjectType(pointer: GraphPointer<Term, Store>): ObjectTypeFlags {
    if (!pointer.term) {
        return { isRdfsClass: false, isOwlClass: false, isNodeShape: false };
    }

    const types = pointer.out(ns.rdf('type')).terms;
    const typeSet = new Set(types.map(t => t.value));

    const isRdfsClass = typeSet.has(ns.rdfs('Class').value);
    const isOwlClass = typeSet.has(ns.owl('Class').value);
    const isNodeShape = typeSet.has(ns.sh('NodeShape').value);

    return {
        isRdfsClass: isRdfsClass || isOwlClass,
        isOwlClass,
        isNodeShape,
    };
}

/** Detect LinkType flags for a given pointer (owl:ObjectProperty) */
export function detectLinkType(pointer: GraphPointer<Term, Store>): LinkTypeFlags {
    if (!pointer.term) {
        return { isObjectProperty: false, hasPropertyShape: false };
    }

    const hasPropertyShape = pointer.in(ns.sh('path')).value !== undefined;

    return { isObjectProperty: true, hasPropertyShape };
    // ObjectProperty is already checked for in the caller
}

/** Check if a resource qualifies as an ObjectType */
export function isObjectType(flags: ObjectTypeFlags): boolean {
    return flags.isRdfsClass || flags.isOwlClass || flags.isNodeShape;
}

/** Check if a resource qualifies as a LinkType */
export function isLinkType(flags: LinkTypeFlags): boolean {
    return flags.isObjectProperty;
}

/****************************************************************************************
 * Finder Functions
 */

/** Find all ObjectTypes in the store */
export function findAllObjectTypes(store: RdfStore): ObjectTypeInfo[] {
    const results: ObjectTypeInfo[] = [];
    const seen = new Set<string>();

    const processCandidate = (subject: NamedNode | BlankNode) => {
        const iri = subject.value;
        if (seen.has(iri)) return;
        seen.add(iri);

        const pointer = store.pointer(iri) as GraphPointer<NamedNode | BlankNode, Store>;
        const flags = detectObjectType(pointer);

        if (isObjectType(flags)) {
            results.push({ pointer, iri, flags });
        }
    };

    const rdfType = ns.rdf('type') as any;
    
    for (const typeIri of [ns.rdfs('Class'), ns.owl('Class'), ns.sh('NodeShape')]) {
        for (const quad of store.getQuads(null, rdfType, typeIri as any)) {
            if (quad.subject.termType === 'NamedNode' || quad.subject.termType === 'BlankNode') {
                processCandidate(quad.subject);
            }
        }
    }

    return results;
}

/** Find all LinkTypes in the store (owl:ObjectProperty instances) */
export function findAllLinkTypes(store: RdfStore): LinkTypeInfo[] {
    const results: LinkTypeInfo[] = [];
    const seen = new Set<string>();

    const processCandidate = (subject: NamedNode | BlankNode) => {
        const iri = subject.value;
        if (seen.has(iri)) return;
        seen.add(iri);

        const pointer = store.pointer(iri) as GraphPointer<NamedNode | BlankNode, Store>;
        const flags = detectLinkType(pointer);

        if (isLinkType(flags)) {
            // Get domain/range from the property itself
            const domainIri = pointer.out(ns.rdfs('domain')).value;
            const rangeIri = pointer.out(ns.rdfs('range')).value;

            // Find wrapping PropertyShape (if any)
            let propertyShape: PropertyShapeInfo | undefined;
            const shapePointers = pointer.in(ns.sh('path')).toArray();
            
            for (const shapePtr of shapePointers) {
                // Check if this shape has sh:node (connects to ObjectType)
                const nodeTarget = shapePtr.out(ns.sh('node')).value;
                if (nodeTarget && shapePtr.term) {
                    propertyShape = {
                        shapeIri: shapePtr.term.value,
                        shapePointer: shapePtr as GraphPointer<NamedNode | BlankNode, Store>,
                        nodeTargetIri: nodeTarget,
                        minCount: shapePtr.out(ns.sh('minCount')).value,
                        maxCount: shapePtr.out(ns.sh('maxCount')).value,
                        message: shapePtr.out(ns.sh('message')).value,
                    };
                    break; // Use first PropertyShape with sh:node
                }
            }

            results.push({ pointer, iri, flags, propertyShape, domainIri, rangeIri });
        }
    };

    const rdfType = ns.rdf('type') as any;
    
    for (const quad of store.getQuads(null, rdfType, ns.owl('ObjectProperty') as any)) {
        if (quad.subject.termType === 'NamedNode' || quad.subject.termType === 'BlankNode') {
            processCandidate(quad.subject);
        }
    }

    return results;
}

/****************************************************************************************
 * Badge Utilities
 */

/** Get semantic badges for an ObjectType */
export function getObjectTypeBadges(flags: ObjectTypeFlags): string[] {
    const badges: string[] = [];
    if (flags.isOwlClass) badges.push('owl:Class');
    else if (flags.isRdfsClass) badges.push('rdfs:Class');
    if (flags.isNodeShape) badges.push('sh:NodeShape');
    return badges;
}

/** Get semantic badges for a LinkType */
export function getLinkTypeBadges(flags: LinkTypeFlags): string[] {
    const badges: string[] = [];
    if (flags.isObjectProperty) badges.push('owl:ObjectProperty');
    if (flags.hasPropertyShape) badges.push('sh:PropertyShape');
    return badges;
}
