/**
 * Hierarchy Queries
 * 
 * Query utilities for hierarchical RDF structures (rdfs:subClassOf, rdfs:subPropertyOf, etc.)
 */

import type { NamedNode, BlankNode } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { ns, getLocalName } from '$lib/rdf/namespaces';

export interface HierarchyNode {
    /** The RDF resource */
    term: NamedNode | BlankNode;
    /** Display label (from rdfs:label or local name) */
    label: string;
    /** Parent terms via the hierarchy predicate */
    parents: (NamedNode | BlankNode)[];
    /** Child terms (inverse of hierarchy predicate) */
    children: (NamedNode | BlankNode)[];
    /** Whether this is a root node (no parents) */
    isRoot: boolean;
}

/**
 * Get the label for a resource (rdfs:label or local name)
 */
export function getResourceLabel(store: RdfStore, term: NamedNode | BlankNode, lang?: string): string {
    // Access version to make this reactive
    store.version;
    
    const labels = store.getQuads(term, ns.rdfs('label'), null);
    
    if (labels.length === 0) {
        return term.termType === 'NamedNode' ? getLocalName(term.value) : term.value;
    }
    
    // Prefer language-tagged label if lang specified
    if (lang) {
        const langLabel = labels.find(q => 
            q.object.termType === 'Literal' && 
            'language' in q.object && 
            q.object.language === lang
        );
        if (langLabel) {
            return langLabel.object.value;
        }
    }
    
    // Return first label found
    return labels[0].object.value;
}

/**
 * Get parent resources via a hierarchy predicate
 * e.g., for rdfs:subClassOf, returns the classes this resource is a subclass of
 */
export function getParents(
    store: RdfStore,
    subject: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode
): (NamedNode | BlankNode)[] {
    store.version;
    return store.getQuads(subject, hierarchyPredicate, null)
        .map(q => q.object)
        .filter((o): o is NamedNode | BlankNode => 
            o.termType === 'NamedNode' || o.termType === 'BlankNode'
        );
}

/**
 * Get child resources via a hierarchy predicate (inverse)
 * e.g., for rdfs:subClassOf, returns the classes that are subclasses of this resource
 */
export function getChildren(
    store: RdfStore,
    object: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode
): (NamedNode | BlankNode)[] {
    store.version;
    return store.getQuads(null, hierarchyPredicate, object)
        .map(q => q.subject)
        .filter((s): s is NamedNode | BlankNode => 
            s.termType === 'NamedNode' || s.termType === 'BlankNode'
        );
}

/**
 * Get root resources (resources of a type that have no parents)
 */
export function getRootResources(
    store: RdfStore,
    resourceType: NamedNode,
    hierarchyPredicate: NamedNode
): (NamedNode | BlankNode)[] {
    store.version;
    
    const allResources = store.getResourcesByType(resourceType);
    return allResources.filter(resource => {
        const parents = getParents(store, resource, hierarchyPredicate);
        // A root has no parents OR only parents that are not of the same type
        return parents.length === 0 || parents.every(parent => {
            const parentTypes = store.getQuads(parent, ns.rdf('type'), null);
            return !parentTypes.some(q => q.object.value === resourceType.value);
        });
    });
}

/**
 * Build a hierarchy node with full information
 */
export function buildHierarchyNode(
    store: RdfStore,
    term: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode,
    lang?: string
): HierarchyNode {
    store.version;
    
    const parents = getParents(store, term, hierarchyPredicate);
    const children = getChildren(store, term, hierarchyPredicate);
    
    return {
        term,
        label: getResourceLabel(store, term, lang),
        parents,
        children,
        isRoot: parents.length === 0
    };
}

/**
 * Build a tree structure for display
 */
export interface TreeNode {
    term: NamedNode | BlankNode;
    label: string;
    children: TreeNode[];
    hasChildren: boolean;
}

/**
 * Build tree nodes starting from root resources
 */
export function buildTreeNodes(
    store: RdfStore,
    resourceType: NamedNode,
    hierarchyPredicate: NamedNode,
    lang?: string,
    maxDepth: number = 10
): TreeNode[] {
    store.version;
    
    const roots = getRootResources(store, resourceType, hierarchyPredicate);
    
    function buildNode(term: NamedNode | BlankNode, depth: number): TreeNode {
        const children = depth < maxDepth 
            ? getChildren(store, term, hierarchyPredicate)
            : [];
        
        return {
            term,
            label: getResourceLabel(store, term, lang),
            children: children.map(child => buildNode(child, depth + 1)),
            hasChildren: children.length > 0
        };
    }
    
    return roots.map(root => buildNode(root, 0));
}

/**
 * Create a new resource with a type and optional parent
 */
export function createResource(
    store: RdfStore,
    localName: string,
    resourceType: NamedNode,
    parent?: NamedNode | BlankNode,
    hierarchyPredicate?: NamedNode,
    baseNamespace: (localName: string) => NamedNode = ns.rxyz
): NamedNode {
    const subject = baseNamespace(localName);
    store.addQuad(subject, ns.rdf('type'), resourceType);
    if (parent && hierarchyPredicate) {
        store.addQuad(subject, hierarchyPredicate, parent);
    }
    return subject;
}

/**
 * Remove a resource and all its triples (as subject or object)
 */
export function removeResource(
    store: RdfStore,
    resource: NamedNode | BlankNode
): void {
    // Remove all quads where this resource is the subject
    const asSubject = store.getQuads(resource, null, null);
    for (const quad of asSubject) {
        store.removeQuad(quad);
    }
    
    // Remove all quads where this resource is the object
    const asObject = store.getQuads(null, null, resource);
    for (const quad of asObject) {
        store.removeQuad(quad);
    }
}

/**
 * Recursively remove a resource, its properties, and all children in a hierarchy.
 * Uses Clownface for clean graph traversal.
 * 
 * @param store - The RDF store
 * @param resource - The resource to delete
 * @param hierarchyPredicate - The predicate defining children (e.g., rdfs:subClassOf)
 *                             Children are found via: ?child hierarchyPredicate resource
 */
export function removeResourceRecursive(
    store: RdfStore,
    resource: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode
): void {
    // Find all children (resources that have this resource as parent via hierarchyPredicate)
    // e.g., ?child rdfs:subClassOf resource
    const children = getChildren(store, resource, hierarchyPredicate);
    
    // Recursively delete all children first
    for (const child of children) {
        removeResourceRecursive(store, child, hierarchyPredicate);
    }
    
    // Now delete all triples where this resource is the subject (its properties)
    const outgoing = store.getQuads(resource, null, null);
    for (const quad of outgoing) {
        store.removeQuad(quad);
    }
    
    // Delete all triples where this resource is the object (references to it)
    const incoming = store.getQuads(null, null, resource);
    for (const quad of incoming) {
        store.removeQuad(quad);
    }
}
