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

import type { NamedNode, BlankNode, Term } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { RDFS, SH, PREFIXES } from './namespaces';
import { getLocalName } from './utils';

/** Type alias for subjects that can be either named or blank nodes */
type SubjectNode = NamedNode | BlankNode;

/****************************************************************************************
 * Property Path Types
 * 
 * SHACL property paths can be complex (inverse, sequence, alternative, etc.)
 * We implement support for simple predicate paths and inverse paths.
 * See: https://www.w3.org/TR/shacl/#property-paths
 */

/** 
 * A SHACL property path - either a simple predicate IRI or an inverse path.
 * This is a simplified implementation; full SHACL supports sequence, alternative, etc.
 */
export type PropertyPath =
    | { type: 'Predicate'; iri: string }
    | { type: 'Inverse'; path: PropertyPath };

/**
 * Get the display name for a property path
 * For inverse paths, prefixes with "^" (SPARQL inverse syntax)
 */
export function getPathLocalName(path: PropertyPath): string {
    switch (path.type) {
        case 'Predicate':
            return getLocalName(path.iri);
        case 'Inverse':
            return `^${getPathLocalName(path.path)}`;
    }
}

/**
 * Get the primary IRI from a property path (the innermost predicate IRI)
 */
export function getPathIRI(path: PropertyPath): string {
    switch (path.type) {
        case 'Predicate':
            return path.iri;
        case 'Inverse':
            return getPathIRI(path.path);
    }
}

/****************************************************************************************
 * Parsed property shape with extracted constraints
 * - A property shape is referred to by a node shape via sh:property
 * - It describes the constraints on the relationship between the NodeShape's focus node and the reachable node
 * - sh:path is required, it specifies the relationship between the two nodes
 */
export interface PropertyShape {
    iri: string;
    path: PropertyPath;     // The property path this shape constrains (required!)
    pathLocalName: string;  // Local name for display (e.g., "headline" or "^sender") (see getPathLocalName)
    datatype?: string;      // XSD datatype if specified
    nodeKind?: string;      // sh:IRI, sh:BlankNode, sh:Literal, etc.
    class?: string;         // sh:class constraint (e.g., schema:Person)
    node?: string;          // sh:node constraint - IRI of a nested shape
    minCount?: number;
    maxCount?: number;
    message?: string;       // Validation message
    // Future: DASH UI hints
    // See: 
    // - semantically organized fields: https://www.shadcn-svelte.com/docs/components/field
    // - form builder(w/ json schema): https://www.shadcn-svelte.com/docs/components/form
    // shacl to json schema conversion https://github.com/comake/shacl-to-json-schema
    // or can we utilize these shadcn components + infuse shacl validation reports?
    // might be better/easier to just use shadcn field along with rdf-validate-shacl for validation feedback, not the form component
}

// IMPORTANT NOTE: any shape, both NodeShape and PropertyShape, can have sh:property
// In our current approach, PropertyShape doesn't itself cannot have properties, only constraints
// To build more towards spec compliance, we should look into a parent Shape interface from which both NodeShape and PropertyShape inherit
// Nice diagram here: https://www.w3.org/TR/shacl12-core/#constraints-section
//
// - SHACL defines two main kinds of shapes: NodeShape and PropertyShape. A shape is a “property shape” if (and only if) it has a sh:path. Other shapes (without sh:path) are node shapes.
// - A PropertyShape may include nested property constraints on the value nodes reachable via that path — via the sh:property parameter. Potentially useful with Breadcrumb navigation!
// - The value of sh:path is not always a simple IRI: it can be any “well-formed SHACL property path” (e.g. sequence, alternative, inverse, etc.)
// - Non-validating shape characteristics: https://www.w3.org/TR/shacl12-core/#nonValidation
// - Core constraints: https://www.w3.org/TR/shacl12-core/#core-components

/**
 * Parsed node shape with target specification and properties
 * 
 * A shape can target either:
 * - sh:targetClass: all instances of an rdf:type
 * - sh:targetNode: a specific named resource
 * 
 * At least one of targetClass or targetNode must be present.
 * NOTE: SHACL spec has a couple more ways to target a focus node for a shape: 
 * - sh:targetSubjectsOf: all subjects using this predicate
 * - sh:targetObjectsOf: all objects using this predicate
 * - implicitly when the NodeShape is also a rdfs:Class
 */
export interface NodeShape {
    iri: string;
    label?: string;
    comment?: string;
    // Target specification (at least one required)
    targetClass?: string;        // The rdf:type this shape targets (sh:targetClass)
    targetNode?: string;         // A specific node IRI this shape targets (sh:targetNode)
    targetLocalName: string;     // Local name of the target for display (from either targetClass or targetNode)
    // NOTE: there are multiple ways to target a focus node for a shape
    // sh:targetNode, sh:targetClass, sh:targetSubjectsOf, sh:targetObjectsOf, and implicitly when the NodeShape is also a rdfs:Class
    properties: PropertyShape[];
    closed: boolean;
    ignoredProperties: string[]; // NOTE: not yet implemented
}

// NOTE:
// - the shacl 1.2 spec (stable but still in draft) document is well-structured and clear but some features are very complex (namely reification related)
// - our implementation doesn't necessarily need to be fully compliant (we're building a **blog**), but our foundations should be solid for future compliance with 1.2
// - we should document our code thoroughly to express where gaps exist and reference the spec where appropriate
// - our JS interface should allow for: form generation, form population, form parsing, validation feedback, ...
// - below is a crude draft of a more spec compliant interface; needs double-checking!
//
// Potential alternative interface (WIP):
//
// // First, a type for PropertyPath, not just a string
// export type PropertyPath =
//   | { type: 'Predicate'; iri: string }
//   | { type: 'Inverse'; path: PropertyPath }
//   | { type: 'Sequence'; items: PropertyPath[] }
//   | { type: 'Alternative'; options: PropertyPath[] }
//   | { type: 'ZeroOrOne'; path: PropertyPath }
//   | { type: 'ZeroOrMore'; path: PropertyPath }
//   | { type: 'OneOrMore'; path: PropertyPath };
//
// // Base interface for any Shape (node or property — or even nested shape)
// export interface Shape {
//     iri: string;             // optional IRI or blank-node identifier
//
//     // Validation characteristics (for validation reports)
//     deactivated?: boolean;   // from sh:deactivated — allow disabling shapes
//     message?: string;        // from sh:message — validation message
//     severity?: string;       // from sh:severity — validation severity
//
//     // Non-validating shape characteristics (metadata)
//     label?: string;          // from rdfs:label
//     comment?: string;        // from rdfs:comment
//     codeIdentifier?: string; // from sh:codeIdentifier — helpful for code generation
//   }

//   // Property-shape: constraints on values reachable via a path
//   export interface PropertyShape extends Shape {
//     path: PropertyPath;      // required: the SHACL property path
//
//     // Constraint parameters (https://www.w3.org/TR/shacl12-core/#core-components)
//     // value type
//     class?: string;          // sh:class constraint: required RDF type of value node(s)
//     datatype?: string;       // e.g. xsd:string, etc.
//     nodeKind?: sh:NodeKind: sh:BlankNode, sh:IRI, sh:Literal sh:BlankNodeOrIRI, sh:BlankNodeOrLiteral, sh:IRIOrLiteral, and sh:TripleTerm.
//     // cardinality
//     minCount?: number;
//     maxCount?: number;
//     // value range: sh:minExclusive, sh:minInclusive, sh:maxExclusive, sh:maxInclusive
//     // string-based: sh:minLength, sh:maxLength, sh:pattern, sh:singleLine, sh:languageIn, sh:uniqueLang
//     // list-based: sh:memberShape, sh:minListLength, sh:maxListLength, sh:uniqueMembers
//     // property-pair: sh:equals, sh:disjoint, sh:lessThan, sh:lessThanOrEquals
//     // logical: sh:or, sh:and, sh:not, sh:xone
//     // shape-based: sh:node, sh:property, sh:someValue, sh:qualifiedValueShape, sh:qualifiedMinCount, sh:qualifiedMaxCount, ...
//     // others: sh:closed, sh:ignoredProperties, sh:in, sh:hasValue
//     
//     // Non-validating shape characteristics (metadata)
//     name?: string;           // from sh:name
//     description?: string;    // from sh:description (or rdfs:comment / rdf:label for node-shape)
//     order?: number;          // from sh:order — UI ordering
//     group?: string;          // optional grouping key (from sh:group)
//     defaultValue?: any;      // from sh:defaultValue — for pre-populating forms
//     values?: any;            
//   }
  
//   // Node-shape: constraints on focus nodes (instances)
//   export interface NodeShape extends Shape {
//     targetClass?: string;     // sh:targetClass
//     targetNode?: string;      // sh:targetNode (for specific individuals)
//     targetSubjectsOf?: string;  // sh:targetSubjectsOf — apply shape to all subjects using this predicate
//     targetObjectsOf?: string;   // sh:targetObjectsOf — apply to all objects
//     properties: PropertyShape[];
//     closed?: boolean;         // sh:closed
//     ignoredProperties?: string[];  // sh:ignoredProperties
//     // Additional constraint combos: or / and / not / qualifiedValueShapes etc. could also go here
//   }
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Parse a SHACL property path from the store
 * 
 * Handles:
 * - Simple predicate paths: sh:path schema:name → { type: 'Predicate', iri: 'schema:name' }
 * - Inverse paths: sh:path [ sh:inversePath schema:sender ] → { type: 'Inverse', path: { type: 'Predicate', iri: 'schema:sender' } }
 * 
 * @param store - RDF store to query
 * @param pathTerm - The term representing the path (NamedNode for simple paths, BlankNode for complex paths)
 * @returns PropertyPath or null if invalid
 */
function parsePropertyPath(store: RdfStore, pathTerm: Term): PropertyPath | null {
    // Simple predicate path: sh:path is a NamedNode IRI
    if (pathTerm.termType === 'NamedNode') {
        return { type: 'Predicate', iri: pathTerm.value };
    }
    
    // Complex path: sh:path is a BlankNode containing path modifiers
    if (pathTerm.termType === 'BlankNode') {
        // Check for inverse path: [ sh:inversePath <predicate> ]
        const inversePath = store.getValue(pathTerm as BlankNode, SH.inversePath);
        if (inversePath) {
            const innerPath = parsePropertyPath(store, inversePath);
            if (innerPath) {
                return { type: 'Inverse', path: innerPath };
            }
        }
        
        // TODO: Add support for other path types (sequence, alternative, etc.)
        console.warn(`[SHACL] Unsupported complex property path: ${pathTerm.value}`);
        return null;
    }
    
    console.warn(`[SHACL] Invalid path term type: ${pathTerm.termType}`);
    return null;
}

/**
 * Parse a single PropertyShape from the store
 * Accepts both NamedNode (external reference) and BlankNode (inline definition)
 */
function parsePropertyShape(store: RdfStore, shapeNode: SubjectNode): PropertyShape | null {
    const pathTerm = store.getValue(shapeNode, SH.path);
    if (!pathTerm) {
        console.warn(`[SHACL] PropertyShape ${shapeNode.value} has no sh:path`);
        return null;
    }

    // Parse the property path (handles simple and complex paths)
    const path = parsePropertyPath(store, pathTerm);
    if (!path) {
        console.warn(`[SHACL] PropertyShape ${shapeNode.value} has invalid sh:path`);
        return null;
    }

    const datatype = store.getValue(shapeNode, SH.datatype);
    const nodeKind = store.getValue(shapeNode, SH.nodeKind);
    const shClass = store.getValue(shapeNode, SH.class);
    const shNode = store.getValue(shapeNode, SH.node);
    const minCount = store.getValue(shapeNode, SH.minCount);
    const maxCount = store.getValue(shapeNode, SH.maxCount);
    const message = store.getValue(shapeNode, SH.message);

    return {
        iri: shapeNode.value,
        path,
        pathLocalName: getPathLocalName(path),
        datatype: datatype?.value,
        nodeKind: nodeKind?.value,
        class: shClass?.value,
        node: shNode?.value,
        minCount: minCount ? parseInt(minCount.value, 10) : undefined,
        maxCount: maxCount ? parseInt(maxCount.value, 10) : undefined,
        message: message?.value,
    };
}

/**
 * Parse a NodeShape and its property shapes from the store
 * Accepts both NamedNode and BlankNode for the shape itself
 * 
 * Supports both sh:targetClass (instance-based targeting) and sh:targetNode (specific node targeting)
 */
function parseNodeShape(store: RdfStore, shapeNode: SubjectNode): NodeShape | null {
    const targetClass = store.getValue(shapeNode, SH.targetClass);
    const targetNode = store.getValue(shapeNode, SH.targetNode);
    
    if (!targetClass && !targetNode) {
        console.warn(`[SHACL] NodeShape ${shapeNode.value} has neither sh:targetClass nor sh:targetNode`);
        return null;
    }

    // Determine the target local name for display
    const targetLocalName = targetClass 
        ? getLocalName(targetClass.value)
        : getLocalName(targetNode!.value);

    // Get metadata
    const label = store.getValue(shapeNode, RDFS.label);
    const comment = store.getValue(shapeNode, RDFS.comment);
    const closed = store.getValue(shapeNode, SH.closed);

    // Get property shapes (can be NamedNode references or inline BlankNode definitions)
    const propertyRefs = store.getValues(shapeNode, SH.property);
    const properties: PropertyShape[] = [];

    for (const propRef of propertyRefs) {
        // Handle both NamedNode (external reference) and BlankNode (inline definition)
        if (propRef.termType === 'NamedNode' || propRef.termType === 'BlankNode') {
            const propShape = parsePropertyShape(store, propRef as SubjectNode);
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
        iri: shapeNode.value,
        label: label?.value,
        comment: comment?.value,
        targetClass: targetClass?.value,
        targetNode: targetNode?.value,
        targetLocalName,
        properties,
        closed: closed?.value === 'true',
        ignoredProperties,
    };
}

/****************************************************************************************
 * Registry of node shapes indexed by target IRI (either targetClass or targetNode)
 * 
 * The registry uses a single Map that indexes shapes by their target:
 * - For sh:targetClass shapes: indexed by the class IRI
 * - For sh:targetNode shapes: indexed by the specific node IRI
 */
export type ShapeRegistry = Map<string, NodeShape>;

/**
 * Build a shape registry from all NodeShapes in the store
 * Returns a Map where keys are either targetClass IRIs or targetNode IRIs
 */
export function buildShapeRegistry(store: RdfStore): ShapeRegistry {
    const registry: ShapeRegistry = new Map();
    
    // Find all sh:NodeShape instances (can be NamedNodes or BlankNodes)
    const nodeShapes = store.getResourcesByType(SH.NodeShape);
    console.log(`[SHACL] Found ${nodeShapes.length} NodeShape(s) in store`);
    
    for (const shapeNode of nodeShapes) {
        const shape = parseNodeShape(store, shapeNode);
        if (shape) {
            // Index by targetClass if present
            if (shape.targetClass) {
                registry.set(shape.targetClass, shape);
            }
            // Index by targetNode if present
            if (shape.targetNode) {
                registry.set(shape.targetNode, shape);
            }
            
            const propNames = shape.properties.map(p => p.pathLocalName).join(', ');
            const targetType = shape.targetClass ? 'class' : 'node';
            console.log(`[SHACL] ✓ ${shape.targetLocalName} shape (${targetType}): ${shape.properties.length} properties [${propNames}]`);
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
    const excludedPathIRIs = new Set([
        `${PREFIXES.rxyz}x`,
        `${PREFIXES.rxyz}y`,
    ]);
    
    return shape.properties.filter(prop => !excludedPathIRIs.has(getPathIRI(prop.path)));
}

/**
 * Get coordinate properties from a shape
 */
export function getCoordinateProperties(shape: NodeShape): { x?: PropertyShape; y?: PropertyShape } {
    const xProp = shape.properties.find(p => getPathIRI(p.path) === `${PREFIXES.rxyz}x`);
    const yProp = shape.properties.find(p => getPathIRI(p.path) === `${PREFIXES.rxyz}y`);
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

