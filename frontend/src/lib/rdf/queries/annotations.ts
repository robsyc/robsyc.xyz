/**
 * Annotation Queries
 * 
 * Queries the RDF store for owl:AnnotationProperty values.
 * Used for viewing and editing annotations on any RDF resource.
 */

import type { NamedNode, BlankNode, Quad, Term } from 'n3';
import { DataFactory } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { ns, toCompactIri } from '$lib/rdf/namespaces';
import { getResourceLabel } from './hierarchy';

const { namedNode, literal, quad } = DataFactory;

export interface AnnotationValue {
    /** The full quad for this annotation */
    quad: Quad;
    /** Display-friendly value (handles language tags, datatypes) */
    displayValue: string;
    /** The raw value */
    value: string;
    /** Language tag if present */
    language?: string;
    /** Datatype IRI if present */
    datatype?: string;
}

export interface AnnotationGroup {
    /** The predicate (annotation property) */
    predicate: NamedNode;
    /** Label for the predicate */
    label: string;
    /** All values for this predicate */
    values: AnnotationValue[];
}

/**
 * Get all annotation properties available in the store
 */
export function getAnnotationProperties(store: RdfStore): NamedNode[] {
    store.version;
    
    const properties = store.getResourcesByType(ns.owl('AnnotationProperty'));
    return properties.filter((p): p is NamedNode => p.termType === 'NamedNode');
}

/**
 * Get annotations for a specific resource, grouped by predicate
 */
export function getAnnotationsGrouped(
    store: RdfStore,
    subject: NamedNode | BlankNode
): AnnotationGroup[] {
    store.version;
    
    // Get all annotation properties
    const annotationProps = getAnnotationProperties(store);
    const annotationPropSet = new Set(annotationProps.map(p => p.value));
    
    // Get all quads for this subject where predicate is an annotation property
    const allQuads = store.getQuads(subject, null, null);
    
    // Group by predicate
    const groups = new Map<string, { predicate: NamedNode; values: AnnotationValue[] }>();
    
    for (const q of allQuads) {
        if (q.predicate.termType !== 'NamedNode') continue;
        if (!annotationPropSet.has(q.predicate.value)) continue;
        
        const predicateKey = q.predicate.value;
        
        if (!groups.has(predicateKey)) {
            groups.set(predicateKey, {
                predicate: q.predicate as NamedNode,
                values: []
            });
        }
        
        const group = groups.get(predicateKey)!;
        group.values.push(quadToAnnotationValue(q));
    }
    
    // Convert to array and add labels
    return Array.from(groups.values()).map(group => ({
        predicate: group.predicate,
        label: getResourceLabel(store, group.predicate),
        values: group.values
    }));
}

/**
 * Get all annotations for a resource as a flat list
 */
export function getAnnotations(
    store: RdfStore,
    subject: NamedNode | BlankNode
): AnnotationValue[] {
    const groups = getAnnotationsGrouped(store, subject);
    return groups.flatMap(g => g.values);
}

/**
 * Convert a quad to an AnnotationValue with compact URI display
 */
function quadToAnnotationValue(q: Quad): AnnotationValue {
    const obj = q.object;
    
    if (obj.termType === 'Literal') {
        const lang = 'language' in obj ? obj.language : undefined;
        const datatype = 'datatype' in obj ? obj.datatype?.value : undefined;
        
        let displayValue = obj.value;
        if (lang) {
            displayValue = `"${obj.value}"@${lang}`;
        } else if (datatype && datatype !== ns.xsd('string').value) {
            displayValue = `"${obj.value}"^^${toCompactIri(datatype)}`;
        }
        
        return {
            quad: q,
            displayValue,
            value: obj.value,
            language: lang,
            datatype
        };
    }
    
    // For named nodes or blank nodes - use compact IRI
    return {
        quad: q,
        displayValue: obj.termType === 'NamedNode' ? toCompactIri(obj.value) : obj.value,
        value: obj.value
    };
}

/**
 * Add an annotation to a resource
 */
export function addAnnotation(
    store: RdfStore,
    subject: NamedNode | BlankNode,
    predicate: NamedNode,
    value: string,
    options?: { language?: string; datatype?: NamedNode }
): void {
    let object: Term;
    
    if (options?.language) {
        object = literal(value, options.language);
    } else if (options?.datatype) {
        object = literal(value, options.datatype);
    } else {
        object = literal(value);
    }
    
    store.addQuad(subject, predicate, object);
}

/**
 * Remove an annotation (specific quad)
 */
export function removeAnnotation(
    store: RdfStore,
    annotationQuad: Quad
): void {
    store.removeQuad(annotationQuad);
}

/**
 * Update an annotation (remove old, add new)
 */
export function updateAnnotation(
    store: RdfStore,
    oldQuad: Quad,
    newValue: string,
    options?: { language?: string; datatype?: NamedNode }
): void {
    removeAnnotation(store, oldQuad);
    addAnnotation(
        store,
        oldQuad.subject as NamedNode | BlankNode,
        oldQuad.predicate as NamedNode,
        newValue,
        options
    );
}
