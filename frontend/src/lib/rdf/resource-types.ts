/**
 * Resource Type Configuration
 * 
 * Defines the resource types supported by the application for viewing and editing.
 * Each resource type has configuration for:
 * - Type detection (rdf:type values)
 * - Hierarchy predicate(s)
 * - UI labels and badges
 * 
 * This is separate from type-detection.ts which handles low-level type flag detection.
 * This module provides high-level configuration for the UI components.
 */

import type { NamedNode, BlankNode } from 'n3';
import { ns } from './namespaces';
import type { RdfStore } from '$lib/stores/rdf.svelte';

/******************************************************************************
 * Resource Type Configuration
 *****************************************************************************/

export interface ResourceTypeConfig {
    /** Unique identifier for this resource type */
    id: string;
    /** Human-readable label */
    label: string;
    /** Plural label for tabs/lists */
    pluralLabel: string;
    /** The rdf:type(s) that identify this resource type */
    typeIris: NamedNode[];
    /** The predicate(s) that define hierarchy (e.g., rdfs:subClassOf) */
    hierarchyPredicates: NamedNode[];
    /** Badge text shown in UI (e.g., "rdfs:Class") */
    badge: string;
    /** Label for empty state */
    emptyLabel: string;
    /** Order for display (lower = first) */
    order: number;
}

/******************************************************************************
 * Resource Type Registry
 * 
 * Defines all supported resource types. Add new types here to extend the app.
 *****************************************************************************/

export const RESOURCE_TYPES: Record<string, ResourceTypeConfig> = {
    annotationProperty: {
        id: 'annotationProperty',
        label: 'Annotation Property',
        pluralLabel: 'Annotation Properties',
        typeIris: [ns.owl('AnnotationProperty')],
        hierarchyPredicates: [ns.rdfs('subPropertyOf')],
        badge: 'owl:AnnotationProperty',
        emptyLabel: 'No annotation properties found',
        order: 0,
    },

    class: {
        id: 'class',
        label: 'Class',
        pluralLabel: 'Classes',
        typeIris: [ns.rdfs('Class')],
        hierarchyPredicates: [ns.rdfs('subClassOf')],
        badge: 'rdfs:Class',
        emptyLabel: 'No classes found',
        order: 1,
    },
    
    // Future: sh:NodeShape
    nodeShape: {
        id: 'nodeShape',
        label: 'Node Shape',
        pluralLabel: 'Node Shapes',
        typeIris: [ns.sh('NodeShape')],
        hierarchyPredicates: [ns.sh('node')], // sh:node defines shape inheritance
        badge: 'sh:NodeShape',
        emptyLabel: 'No node shapes found',
        order: 2,
    },

    propertyShape: {
        id: 'propertyShape',
        label: 'Property Shape',
        pluralLabel: 'Property Shapes',
        typeIris: [ns.sh('PropertyShape')],
        hierarchyPredicates: [], // no inheritance
        badge: 'sh:PropertyShape',
        emptyLabel: 'No property shapes found',
        order: 3,
    },
    
    // Future: owl:Class (distinct from rdfs:Class for OWL-specific features)
    owlClass: {
        id: 'owlClass',
        label: 'OWL Class',
        pluralLabel: 'OWL Classes',
        typeIris: [ns.owl('Class')],
        hierarchyPredicates: [ns.rdfs('subClassOf')],
        badge: 'owl:Class',
        emptyLabel: 'No OWL classes found',
        order: 4,
    },
    
    // Future: owl:DatatypeProperty
    datatypeProperty: {
        id: 'datatypeProperty',
        label: 'Datatype Property',
        pluralLabel: 'Datatype Properties',
        typeIris: [ns.owl('DatatypeProperty')],
        hierarchyPredicates: [ns.rdfs('subPropertyOf')],
        badge: 'owl:DatatypeProperty',
        emptyLabel: 'No datatype properties found',
        order: 5,
    },

    // Future: owl:ObjectProperty
    objectProperty: {
        id: 'objectProperty',
        label: 'Object Property',
        pluralLabel: 'Object Properties',
        typeIris: [ns.owl('ObjectProperty')],
        hierarchyPredicates: [ns.rdfs('subPropertyOf')],
        badge: 'owl:ObjectProperty',
        emptyLabel: 'No object properties found',
        order: 6,
    },

} as const;

export type ResourceTypeId = keyof typeof RESOURCE_TYPES;

/******************************************************************************
 * Utility Functions
 *****************************************************************************/

/** Get resource type config by ID */
export function getResourceType(id: ResourceTypeId): ResourceTypeConfig {
    return RESOURCE_TYPES[id];
}

/** Get all resource type configs sorted by order */
export function getAllResourceTypes(): ResourceTypeConfig[] {
    return Object.values(RESOURCE_TYPES).sort((a, b) => a.order - b.order);
}

/** Get primary type IRI for a resource type (first in the list) */
export function getPrimaryTypeIri(config: ResourceTypeConfig): NamedNode {
    return config.typeIris[0];
}

/** Get primary hierarchy predicate for a resource type (first in the list) */
export function getPrimaryHierarchyPredicate(config: ResourceTypeConfig): NamedNode | null {
    return config.hierarchyPredicates[0] ?? null;
}

/**
 * Detect which resource types exist in the store (have at least one instance).
 * Useful for dynamically showing only relevant tabs.
 */
export function detectActiveResourceTypes(store: RdfStore): ResourceTypeConfig[] {
    store.version; // Make reactive
    
    return getAllResourceTypes().filter(config => {
        // Check if any type IRI has instances
        return config.typeIris.some(typeIri => {
            const instances = store.getResourcesByType(typeIri);
            return instances.length > 0;
        });
    });
}

/**
 * Get the resource types that a specific resource belongs to.
 * A resource can be multiple types (e.g., sh:ShapeClass is both rdfs:Class and sh:NodeShape).
 */
export function getResourceTypes(
    store: RdfStore,
    resource: NamedNode | BlankNode
): ResourceTypeConfig[] {
    store.version; // Make reactive
    
    const resourceTypes = store.getQuads(resource, ns.rdf('type'), null)
        .map(q => q.object.value);
    const resourceTypeSet = new Set(resourceTypes);
    
    return getAllResourceTypes().filter(config => 
        config.typeIris.some(typeIri => resourceTypeSet.has(typeIri.value))
    );
}

/**
 * Check if a resource is a "Shape Class" (sh:ShapeClass in SHACL 1.2).
 * This is when a resource is both rdfs:Class and sh:NodeShape.
 */
export function isShapeClass(
    store: RdfStore,
    resource: NamedNode | BlankNode
): boolean {
    store.version; // Make reactive
    
    const types = store.getQuads(resource, ns.rdf('type'), null)
        .map(q => q.object.value);
    const typeSet = new Set(types);
    
    const isClass = typeSet.has(ns.rdfs('Class').value) || typeSet.has(ns.owl('Class').value);
    const isNodeShape = typeSet.has(ns.sh('NodeShape').value);
    
    return isClass && isNodeShape;
}

/**
 * Get all hierarchy predicates that apply to a resource.
 * For a ShapeClass, this includes both rdfs:subClassOf and sh:node.
 */
export function getHierarchyPredicatesForResource(
    store: RdfStore,
    resource: NamedNode | BlankNode
): NamedNode[] {
    const resourceTypes = getResourceTypes(store, resource);
    const predicateSet = new Set<string>();
    const predicates: NamedNode[] = [];
    
    for (const config of resourceTypes) {
        for (const predicate of config.hierarchyPredicates) {
            if (!predicateSet.has(predicate.value)) {
                predicateSet.add(predicate.value);
                predicates.push(predicate);
            }
        }
    }
    
    return predicates;
}

/**
 * Find resource type config by checking if a resource has the given type IRI.
 * Returns the first matching config, or undefined if none match.
 */
export function findResourceTypeByTypeIri(
    store: RdfStore,
    resource: NamedNode | BlankNode
): ResourceTypeConfig | undefined {
    const types = getResourceTypes(store, resource);
    return types[0]; // Return first matching config
}

/**
 * Get the subset of resource types to show as tabs.
 * Currently returns annotation properties and classes.
 */
export function getViewableResourceTypes(): ResourceTypeConfig[] {
    // For now, only show these types in the view
    // Future: could be configurable or include all active types
    return [
        RESOURCE_TYPES.annotationProperty,
        RESOURCE_TYPES.class,
    ];
}