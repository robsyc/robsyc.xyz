/**
 * Type Detection Utilities for RDF Schema Elements
 * 
 * Identifies ObjectTypes and ObjectProperties from RDF data:
 * - ObjectTypes: rdfs:Class, owl:Class, sh:NodeShape (or combinations)
 * - ObjectProperties: owl:ObjectProperty (relationships between ObjectTypes)
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
    // NOTE: sh:ShapeClass (SHACL 1.2) implies isRdfsClass and isNodeShape
}

/** Combined result for ObjectType detection */
export interface ObjectTypeInfo {
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    iri: string;
    flags: ObjectTypeFlags;
}

/** Semantic type flags for ObjectProperties (relationships connecting ObjectTypes) */
export interface ObjectPropertyFlags {
    isObjectProperty: boolean;  // owl:ObjectProperty
    isFunctional: boolean;      // owl:FunctionalProperty
    isSymmetric: boolean;       // owl:SymmetricProperty
    isTransitive: boolean;      // owl:TransitiveProperty
    hasInverse: boolean;        // has owl:inverseOf
    inverseIri?: string;        // IRI of the inverse property
    hasPropertyChain: boolean;  // has owl:propertyChainAxiom
}

/** Combined result for ObjectProperty detection */
export interface ObjectPropertyInfo {
    pointer: GraphPointer<NamedNode | BlankNode, Store>;
    iri: string;
    flags: ObjectPropertyFlags;
    // should we even store this range/domain stuff in the info or just query when needed to display the domain edges?
    domainIris?: string[]; // rdfs 
    rangeIris?: string[]; 
    domainIncludesIris?: string[]; // schema
    rangeIncludesIris?: string[];
    /** Pointer to the inverse property (if any) */
    inversePointer?: GraphPointer<NamedNode | BlankNode, Store>;
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

/** Detect ObjectProperty flags for a given pointer */
export function detectObjectProperty(pointer: GraphPointer<Term, Store>): ObjectPropertyFlags {
    if (!pointer.term) {
        return { 
            isObjectProperty: false, 
            isFunctional: false,
            isSymmetric: false,
            isTransitive: false,
            hasInverse: false,
            hasPropertyChain: false,
        };
    }

    const types = pointer.out(ns.rdf('type')).terms;
    const typeSet = new Set(types.map(t => t.value));
    
    const inversePtr = pointer.out(ns.owl('inverseOf'));
    const inverseIri = inversePtr.value;

    return {
        isObjectProperty: typeSet.has(ns.owl('ObjectProperty').value),
        isFunctional: typeSet.has(ns.owl('FunctionalProperty').value),
        isSymmetric: typeSet.has(ns.owl('SymmetricProperty').value),
        isTransitive: typeSet.has(ns.owl('TransitiveProperty').value),
        hasInverse: !!inverseIri,
        inverseIri,
        hasPropertyChain: !!pointer.out(ns.owl('propertyChainAxiom')).term, // range is a rdf:List
    };
}

/** Check if a resource qualifies as an ObjectType */
export function isObjectType(flags: ObjectTypeFlags): boolean {
    return flags.isRdfsClass || flags.isOwlClass || flags.isNodeShape;
}

/** Check if a resource qualifies as an ObjectProperty */
export function isObjectProperty(flags: ObjectPropertyFlags): boolean {
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

/** Find all ObjectProperties in the store */
export function findAllObjectProperties(store: RdfStore): ObjectPropertyInfo[] {
    const results: ObjectPropertyInfo[] = [];
    const seen = new Set<string>();

    const processCandidate = (subject: NamedNode | BlankNode) => {
        const iri = subject.value;
        if (seen.has(iri)) return;
        seen.add(iri);

        const pointer = store.pointer(iri) as GraphPointer<NamedNode | BlankNode, Store>;
        const flags = detectObjectProperty(pointer);

        if (isObjectProperty(flags)) {
            // Get domain/range from the property itself
            const domainIris = pointer.out(ns.rdfs('domain')).values;
            const rangeIris = pointer.out(ns.rdfs('range')).values;
            
            // Get schema:domainIncludes/rangeIncludes (weak semantics)
            const domainIncludesIris = pointer.out(ns.schema('domainIncludes')).values;
            const rangeIncludesIris = pointer.out(ns.schema('rangeIncludes')).values;
            
            // Get inverse pointer if exists
            let inversePointer: GraphPointer<NamedNode | BlankNode, Store> | undefined;
            if (flags.inverseIri) {
                inversePointer = store.pointer(flags.inverseIri) as GraphPointer<NamedNode | BlankNode, Store>;
            }

            results.push({ 
                pointer, 
                iri, 
                flags, 
                domainIris: domainIris.length > 0 ? domainIris : undefined, 
                rangeIris: rangeIris.length > 0 ? rangeIris : undefined,
                domainIncludesIris: domainIncludesIris.length > 0 ? domainIncludesIris : undefined,
                rangeIncludesIris: rangeIncludesIris.length > 0 ? rangeIncludesIris : undefined,
                inversePointer,
            });
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

/** Get semantic badges for an ObjectProperty */
export function getObjectPropertyBadges(flags: ObjectPropertyFlags): string[] {
    const badges: string[] = [];
    if (flags.isObjectProperty) badges.push('owl:ObjectProperty');
    if (flags.isFunctional) badges.push('Functional');
    if (flags.isSymmetric) badges.push('Symmetric');
    if (flags.isTransitive) badges.push('Transitive');
    return badges;
}