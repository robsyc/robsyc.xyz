/**
 * SHACL Shape Parser
 * 
 * Extracts SHACL NodeShape and PropertyShape information from an RDF store.
 * Used to dynamically generate UI node types and form fields from shape definitions.
 * 
 * https://www.w3.org/TR/shacl/
 * https://www.validatingrdf.com/tutorial/eswc2025/slides/04_SHACL_Primer.pdf
 * Shape: collection of targets and constraints components
 *  - Targets: specify which nodes in the data graph must conform to a shape (sh:targetNode, sh:targetClass)
 *      => https://www.w3.org/TR/shacl/#targets
 *  - Constraint components: Determine how to validate a node (sh:path, 
 *      => https://www.w3.org/TR/shacl/#core-components
 * 
 * 2 types of shapes:
 *  - NodeShape: constraints about shapes of nodes
 *      => Constraints about a focus node, targetted with sh:targetNode or sh:targetClass
 *  - PropertyShape: constraints on property path values of a node
 *      => Constraints about a given property and its values for the focus node
 *           sh:property associates a shape with a property shape
 *           sh:path identifies the path
 */

import type { NamedNode } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { RDFS, SH, PREFIXES } from './namespaces';
import { getLocalName } from './utils';

/****************************************************************************************
 * Parsed property shape with extracted constraints
 * A property shape is refferd to by a node shape via sh:property
 * It described the constraints on the relationship between 
 * the node shape's target and the property path e.g. its sh:path (URI of the predicate)
 */
export interface PropertyShape {
    iri: string;
    path: string;           // The predicate IRI this property constrains (required!)
    // NOTE: will a simple string suffice to capture the path?
    // In the future, we may interact with relevant but indirect attributes like
    // :me :hasICE [ a :nameAttribute . :value "Robbe" ]
    pathLocalName: string;  // Local name for display (e.g., "headline" from schema:headline) (see getLocalName)
    datatype?: string;      // XSD datatype if specified
    nodeKind?: string;      // sh:IRI, sh:BlankNode, sh:Literal, etc.
    class?: string;         // sh:class constraint (e.g., schema:Person)
    minCount?: number;
    maxCount?: number;
    message?: string;       // Validation message
    // Future: DASH UI hints
    // See: 
    // - semantically organized fields: https://www.shadcn-svelte.com/docs/components/field
    // - form builder(w/ json schema): https://www.shadcn-svelte.com/docs/components/form
    // shacl to json schema conversion https://github.com/comake/shacl-to-json-schema
    // or can we utilize these shadcn components + infuse shacl validation reports?
}

/**
 * Parsed node shape with target class and properties
 */
export interface NodeShape {
    iri: string;
    label?: string;
    comment?: string;
    targetClass: string; // The rdf:type this shape targets (required!)
    targetClassLocalName: string; // this is now based off the URI, not the rdf:label of the target class (see getLocalName)
    properties: PropertyShape[];
    closed: boolean;
    ignoredProperties: string[]; // NOTE: not yet implemented
}

/**
 * Parse a single PropertyShape from the store
 */
function parsePropertyShape(store: RdfStore, shapeIRI: NamedNode): PropertyShape | null {
    const path = store.getValue(shapeIRI, SH.path);
    if (!path) {
        console.warn(`[SHACL] PropertyShape ${shapeIRI.value} has no sh:path`);
        return null;
    }

    const datatype = store.getValue(shapeIRI, SH.datatype);
    const nodeKind = store.getValue(shapeIRI, SH.nodeKind);
    const shClass = store.getValue(shapeIRI, SH.class);
    const minCount = store.getValue(shapeIRI, SH.minCount);
    const maxCount = store.getValue(shapeIRI, SH.maxCount);
    const message = store.getValue(shapeIRI, SH.message);

    return {
        iri: shapeIRI.value,
        path: path.value,
        pathLocalName: getLocalName(path.value),
        datatype: datatype?.value,
        nodeKind: nodeKind?.value,
        class: shClass?.value,
        minCount: minCount ? parseInt(minCount.value, 10) : undefined,
        maxCount: maxCount ? parseInt(maxCount.value, 10) : undefined,
        message: message?.value,
    };
}

/**
 * Parse a NodeShape and its property shapes from the store
 */
function parseNodeShape(store: RdfStore, shapeIRI: NamedNode): NodeShape | null {
    const targetClass = store.getValue(shapeIRI, SH.targetClass);
    if (!targetClass) {
        console.warn(`[SHACL] NodeShape ${shapeIRI.value} has no sh:targetClass`);
        return null;
    }

    // Get metadata
    const label = store.getValue(shapeIRI, RDFS.label);
    const comment = store.getValue(shapeIRI, RDFS.comment);
    const closed = store.getValue(shapeIRI, SH.closed);

    // Get property shapes
    const propertyRefs = store.getValues(shapeIRI, SH.property);
    const properties: PropertyShape[] = [];

    for (const propRef of propertyRefs) {
        if (propRef.termType === 'NamedNode') {
            const propShape = parsePropertyShape(store, propRef as NamedNode);
            if (propShape) {
                properties.push(propShape);
            }
        }
    }

    // Get ignored properties (for closed shapes)
    // Note: sh:ignoredProperties is an RDF list, simplified here
    // This will be a bit harder to parse
    // Might want a utility function to capture rdf:List (https://www.w3.org/TR/rdf-schema/#ch_collectionvocab)
    const ignoredProperties: string[] = [];

    return {
        iri: shapeIRI.value,
        label: label?.value,
        comment: comment?.value,
        targetClass: targetClass.value,
        targetClassLocalName: getLocalName(targetClass.value),
        properties,
        closed: closed?.value === 'true',
        ignoredProperties,
    };
}

/****************************************************************************************
 * Registry of node shapes indexed by target class IRI
 */
export type ShapeRegistry = Map<string, NodeShape>;

/**
 * Build a shape registry from all NodeShapes in the store
 * Returns a Map from targetClass IRI to NodeShape
 */
export function buildShapeRegistry(store: RdfStore): ShapeRegistry {
    const registry: ShapeRegistry = new Map();
    
    // Find all sh:NodeShape instances
    const nodeShapes = store.getResourcesByType(SH.NodeShape);
    console.log(`[SHACL] Found ${nodeShapes.length} NodeShape(s) in store`);
    
    for (const shapeIRI of nodeShapes) {
        const shape = parseNodeShape(store, shapeIRI);
        if (shape) {
            registry.set(shape.targetClass, shape);
            const propNames = shape.properties.map(p => p.pathLocalName).join(', ');
            console.log(`[SHACL] ✓ ${shape.targetClassLocalName} shape: ${shape.properties.length} properties [${propNames}]`);
        }
    }
    
    return registry;
}

/**
 * Get a shape for a given rdf:type IRI 
 */
export function getShapeForType(registry: ShapeRegistry, typeIRI: string): NodeShape | undefined {
    return registry.get(typeIRI);
}

/**
 * Get the display properties for a shape (excluding coordinates and metadata)
 * These are the properties that should be shown in the UI node
 */
export function getDisplayProperties(shape: NodeShape): PropertyShape[] {
    // Filter out coordinate properties and other non-display properties
    const excludedPaths = new Set([
        `${PREFIXES.rxyz}x`,
        `${PREFIXES.rxyz}y`,
    ]);
    
    return shape.properties.filter(prop => !excludedPaths.has(prop.path));
}

/**
 * Get coordinate properties from a shape
 */
export function getCoordinateProperties(shape: NodeShape): { x?: PropertyShape; y?: PropertyShape } {
    const xProp = shape.properties.find(p => p.path === `${PREFIXES.rxyz}x`);
    const yProp = shape.properties.find(p => p.path === `${PREFIXES.rxyz}y`);
    return { x: xProp, y: yProp };
}

/**
 * Check if a property is required (minCount >= 1)
 */
export function isRequired(prop: PropertyShape): boolean {
    return (prop.minCount ?? 0) >= 1;
}

/**
 * Check if a property allows multiple values (maxCount > 1 or undefined)
 */
export function isMultiValued(prop: PropertyShape): boolean {
    return prop.maxCount === undefined || prop.maxCount > 1;
}

/**
 * Determine the appropriate input type for a property based on its datatype
 * 
 * TODO: map to shadcn elements i.e. a form builder (perhaps separate utility functions)
 */
export function getInputType(prop: PropertyShape): 'text' | 'number' | 'date' | 'datetime' | 'textarea' | 'reference' {
    if (prop.nodeKind === `${PREFIXES.sh}IRI` || prop.class) {
        return 'reference';
    }
    
    switch (prop.datatype) {
        case `${PREFIXES.xsd}integer`:
        case `${PREFIXES.xsd}decimal`:
        case `${PREFIXES.xsd}float`:
        case `${PREFIXES.xsd}double`:
            return 'number';
        case `${PREFIXES.xsd}date`:
            return 'date';
        case `${PREFIXES.xsd}dateTime`:
            return 'datetime';
        case `${PREFIXES.xsd}string`:
        default:
            // Use textarea for potentially long text (heuristic based on property name)
            if (prop.pathLocalName.toLowerCase().includes('body') || 
                prop.pathLocalName.toLowerCase().includes('content') ||
                prop.pathLocalName.toLowerCase().includes('description')) {
                return 'textarea';
            }
            return 'text';
    }
}

