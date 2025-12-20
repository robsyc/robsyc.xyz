/**
 * SHACL Queries
 * 
 * Query utilities for SHACL shapes (NodeShapes and PropertyShapes).
 */

import type { NamedNode, BlankNode, Term } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { ns, toCompactIri } from '$lib/rdf/namespaces';
import { getResourceLabel } from './hierarchy';
import { toSparql } from 'clownface-shacl-path';

/******************************************************************************
 * Target Queries (for sh:NodeShape)
 *****************************************************************************/

export interface ShapeTarget {
    /** Target type: 'class', 'node', 'subjectsOf', 'objectsOf' */
    type: 'class' | 'node' | 'subjectsOf' | 'objectsOf';
    /** The predicate used (e.g., sh:targetClass) */
    predicate: NamedNode;
    /** The target value */
    value: Term;
    /** Display-friendly label */
    displayValue: string;
}

/**
 * Get all targets defined for a shape.
 * Supports: sh:targetClass, sh:targetNode, sh:targetSubjectsOf, sh:targetObjectsOf
 */
export function getShapeTargets(
    store: RdfStore,
    shape: NamedNode | BlankNode
): ShapeTarget[] {
    store.version; // reactive
    
    const targets: ShapeTarget[] = [];
    
    // sh:targetClass
    for (const q of store.getQuads(shape, ns.sh('targetClass'), null)) {
        targets.push({
            type: 'class',
            predicate: ns.sh('targetClass'),
            value: q.object,
            displayValue: q.object.termType === 'NamedNode' 
                ? getResourceLabel(store, q.object as NamedNode)
                : q.object.value
        });
    }
    
    // sh:targetNode
    for (const q of store.getQuads(shape, ns.sh('targetNode'), null)) {
        targets.push({
            type: 'node',
            predicate: ns.sh('targetNode'),
            value: q.object,
            displayValue: q.object.termType === 'NamedNode'
                ? toCompactIri(q.object.value)
                : q.object.value
        });
    }
    
    // sh:targetSubjectsOf
    for (const q of store.getQuads(shape, ns.sh('targetSubjectsOf'), null)) {
        targets.push({
            type: 'subjectsOf',
            predicate: ns.sh('targetSubjectsOf'),
            value: q.object,
            displayValue: q.object.termType === 'NamedNode'
                ? getResourceLabel(store, q.object as NamedNode)
                : q.object.value
        });
    }
    
    // sh:targetObjectsOf
    for (const q of store.getQuads(shape, ns.sh('targetObjectsOf'), null)) {
        targets.push({
            type: 'objectsOf',
            predicate: ns.sh('targetObjectsOf'),
            value: q.object,
            displayValue: q.object.termType === 'NamedNode'
                ? getResourceLabel(store, q.object as NamedNode)
                : q.object.value
        });
    }
    
    return targets;
}

/******************************************************************************
 * PropertyShape Queries
 * TODO: check with official specification and consider clownface-shacl-path
 *****************************************************************************/

export interface PropertyShapeInfo {
    /** The PropertyShape resource (NamedNode or BlankNode) */
    shape: NamedNode | BlankNode;
    /** sh:path - the property this shape constrains */
    path: Term | null;
    /** Display string for sh:path (supports complex SHACL paths) */
    pathDisplay: string | null;
    /** sh:name - human-readable name */
    name: string | null;
    /** sh:description */
    description: string | null;
    /** sh:order for sorting */
    order: number | null;
    /** sh:datatype constraint */
    datatype: NamedNode | null;
    /** sh:minCount constraint */
    minCount: number | null;
    /** sh:maxCount constraint */
    maxCount: number | null;
    /** Additional constraints as key-value pairs */
    constraints: Record<string, string>;
}

/**
 * Get all PropertyShapes linked to a NodeShape via sh:property.
 */
export function getPropertyShapes(
    store: RdfStore,
    nodeShape: NamedNode | BlankNode
): PropertyShapeInfo[] {
    store.version; // reactive
    
    const shapes: PropertyShapeInfo[] = [];
    
    for (const q of store.getQuads(nodeShape, ns.sh('property'), null)) {
        const propShape = q.object;
        if (propShape.termType !== 'NamedNode' && propShape.termType !== 'BlankNode') continue;
        
        shapes.push(buildPropertyShapeInfo(store, propShape as NamedNode | BlankNode));
    }
    
    // Sort by sh:order, then by name
    shapes.sort((a, b) => {
        if (a.order !== null && b.order !== null) return a.order - b.order;
        if (a.order !== null) return -1;
        if (b.order !== null) return 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
    });
    
    return shapes;
}

/**
 * Build PropertyShapeInfo from a PropertyShape resource.
 */
function buildPropertyShapeInfo(
    store: RdfStore,
    shape: NamedNode | BlankNode
): PropertyShapeInfo {
    const info: PropertyShapeInfo = {
        shape,
        path: null,
        pathDisplay: null,
        name: null,
        description: null,
        order: null,
        datatype: null,
        minCount: null,
        maxCount: null,
        constraints: {}
    };
    
    // sh:path
    const pathQuads = store.getQuads(shape, ns.sh('path'), null);
    if (pathQuads.length > 0) {
        info.path = pathQuads[0].object;
        info.pathDisplay = formatShaclPath(store, info.path);
    }
    
    // sh:name
    const nameQuads = store.getQuads(shape, ns.sh('name'), null);
    if (nameQuads.length > 0) {
        info.name = nameQuads[0].object.value;
    }
    
    // sh:description
    const descQuads = store.getQuads(shape, ns.sh('description'), null);
    if (descQuads.length > 0) {
        info.description = descQuads[0].object.value;
    }
    
    // sh:order
    const orderQuads = store.getQuads(shape, ns.sh('order'), null);
    if (orderQuads.length > 0) {
        const orderValue = parseInt(orderQuads[0].object.value, 10);
        if (!isNaN(orderValue)) info.order = orderValue;
    }
    
    // sh:datatype
    const datatypeQuads = store.getQuads(shape, ns.sh('datatype'), null);
    if (datatypeQuads.length > 0 && datatypeQuads[0].object.termType === 'NamedNode') {
        info.datatype = datatypeQuads[0].object as NamedNode;
    }
    
    // sh:minCount
    const minCountQuads = store.getQuads(shape, ns.sh('minCount'), null);
    if (minCountQuads.length > 0) {
        const value = parseInt(minCountQuads[0].object.value, 10);
        if (!isNaN(value)) info.minCount = value;
    }
    
    // sh:maxCount
    const maxCountQuads = store.getQuads(shape, ns.sh('maxCount'), null);
    if (maxCountQuads.length > 0) {
        const value = parseInt(maxCountQuads[0].object.value, 10);
        if (!isNaN(value)) info.maxCount = value;
    }
    
    // Collect other common constraints
    const constraintPredicates = [
        'minLength', 'maxLength', 'pattern', 'minInclusive', 'maxInclusive',
        'minExclusive', 'maxExclusive', 'nodeKind', 'class', 'in', 'hasValue'
    ];
    
    for (const pred of constraintPredicates) {
        const quads = store.getQuads(shape, ns.sh(pred), null);
        if (quads.length > 0) {
            info.constraints[pred] = quads[0].object.value;
        }
    }
    
    return info;
}

/**
 * Format a SHACL `sh:path` value as a readable string.
 * - NamedNode: compact IRI
 * - BlankNode: try to render as SPARQL property path using clownface-shacl-path
 */
export function formatShaclPath(store: RdfStore, path: Term | null): string | null {
    if (!path) return null;

    if (path.termType === 'NamedNode') {
        return toCompactIri(path.value);
    }

    if (path.termType !== 'BlankNode') {
        return path.value;
    }

    try {
        const ptr = store.pointer(path);
        // toSparql() returns a SparqlTemplateResult which stringifies nicely
        return String(toSparql(ptr));
    } catch {
        return path.value;
    }
}

/**
 * Get a human-readable cardinality string from min/maxCount.
 */
export function getCardinalityLabel(minCount: number | null, maxCount: number | null): string {
    if (minCount === null && maxCount === null) return '';
    if (minCount === 1 && maxCount === 1) return 'exactly 1';
    if (minCount === 0 && maxCount === 1) return 'optional';
    if (minCount === 1 && maxCount === null) return '1 or more';
    if (minCount === null && maxCount !== null) return `0..${maxCount}`;
    if (minCount !== null && maxCount === null) return `${minCount}+`;
    return `${minCount ?? 0}..${maxCount}`;
}
