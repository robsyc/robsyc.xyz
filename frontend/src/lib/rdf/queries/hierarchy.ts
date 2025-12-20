/**
 * Hierarchy Queries
 * 
 * Query utilities for hierarchical RDF structures (rdfs:subClassOf, rdfs:subPropertyOf, etc.)
 */

import type { NamedNode, BlankNode } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import { ns, getLocalName } from '$lib/rdf/namespaces';

type NodeTerm = NamedNode | BlankNode;

export interface LabelOptions {
    /** Preferred language tag (e.g., 'en'). If omitted, first label wins. */
    lang?: string;
    /** Predicate priority for labels (first match wins) */
    predicates?: NamedNode[];
}

export const DEFAULT_LABEL_PREDICATES: NamedNode[] = [
    ns.skos('prefLabel'),
    ns.rdfs('label'),
    ns.sh('name'),
    ns.schema('name'),
];

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
 * Get the label for a resource using a prioritized predicate list, with caching.
 */
export function getResourceLabel(
    store: RdfStore,
    term: NamedNode | BlankNode,
    lang?: string,
    options?: Omit<LabelOptions, 'lang'>
): string {
    store.version; // reactive

    const predicates = options?.predicates ?? DEFAULT_LABEL_PREDICATES;
    const predicatesKey = predicates.map(p => p.value).join('|');
    const langKey = lang ?? '';

    const cache = getLabelCache(store, predicatesKey, langKey);
    const cached = cache.get(term.value);
    if (cached !== undefined) return cached;

    const label = resolveLabelUncached(store, term, { lang, predicates });
    cache.set(term.value, label);
    return label;
}

type LabelCache = Map<string, string>;
type LabelCacheBucket = { version: number; byPredicates: Map<string, Map<string, LabelCache>> };
const labelCache = new WeakMap<RdfStore, LabelCacheBucket>();

function getLabelCache(store: RdfStore, predicatesKey: string, langKey: string): LabelCache {
    let bucket = labelCache.get(store);
    if (!bucket || bucket.version !== store.version) {
        bucket = { version: store.version, byPredicates: new Map() };
        labelCache.set(store, bucket);
    }

    let byLang = bucket.byPredicates.get(predicatesKey);
    if (!byLang) {
        byLang = new Map();
        bucket.byPredicates.set(predicatesKey, byLang);
    }

    let cache = byLang.get(langKey);
    if (!cache) {
        cache = new Map();
        byLang.set(langKey, cache);
    }

    return cache;
}

function resolveLabelUncached(store: RdfStore, term: NodeTerm, options: LabelOptions): string {
    const predicates = options.predicates ?? DEFAULT_LABEL_PREDICATES;
    const lang = options.lang;

    for (const pred of predicates) {
        const quads = store.getQuads(term, pred, null);
        if (quads.length === 0) continue;

        // Prefer matching language label when available
        if (lang) {
            for (const q of quads) {
                const obj = q.object;
                if (obj.termType !== 'Literal') continue;
                if ('language' in obj && obj.language === lang) return obj.value;
            }
        }

        // Otherwise, first literal wins
        for (const q of quads) {
            const obj = q.object;
            if (obj.termType === 'Literal') return obj.value;
        }
    }

    return term.termType === 'NamedNode' ? getLocalName(term.value) : term.value;
}

/**
 * Predicate-scoped hierarchy adjacency index.
 * This avoids repeated `store.getQuads(...)` scans for getParents/getChildren/tree building.
 */
interface HierarchyIndex {
    version: number;
    parentsByChild: Map<string, NodeTerm[]>;
    childrenByParent: Map<string, NodeTerm[]>;
}

const hierarchyIndexCache = new WeakMap<RdfStore, Map<string, HierarchyIndex>>();

function isNodeTerm(term: unknown): term is NodeTerm {
    return !!term && (
        (term as NodeTerm).termType === 'NamedNode' ||
        (term as NodeTerm).termType === 'BlankNode'
    );
}

function getHierarchyIndex(store: RdfStore, hierarchyPredicate: NamedNode): HierarchyIndex {
    store.version; // reactive

    let byPredicate = hierarchyIndexCache.get(store);
    if (!byPredicate) {
        byPredicate = new Map();
        hierarchyIndexCache.set(store, byPredicate);
    }

    const key = hierarchyPredicate.value;
    const cached = byPredicate.get(key);
    if (cached && cached.version === store.version) {
        return cached;
    }

    const parentsByChild = new Map<string, NodeTerm[]>();
    const childrenByParent = new Map<string, NodeTerm[]>();

    const push = (map: Map<string, NodeTerm[]>, k: string, v: NodeTerm) => {
        const arr = map.get(k);
        if (arr) arr.push(v);
        else map.set(k, [v]);
    };

    for (const q of store.getQuads(null, hierarchyPredicate, null)) {
        const child = q.subject;
        const parent = q.object;
        if (!isNodeTerm(child) || !isNodeTerm(parent)) continue;
        push(parentsByChild, child.value, parent);
        push(childrenByParent, parent.value, child);
    }

    const built: HierarchyIndex = {
        version: store.version,
        parentsByChild,
        childrenByParent,
    };

    byPredicate.set(key, built);
    return built;
}

/**
 * Get parent resources via a hierarchy predicate
 * e.g., for rdfs:subClassOf, returns the classes this resource is a subclass of
 */
export function getParents(
    store: RdfStore,
    subject: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode | null | undefined
): (NamedNode | BlankNode)[] {
    store.version;
    if (!hierarchyPredicate) return [];
    const index = getHierarchyIndex(store, hierarchyPredicate);
    return index.parentsByChild.get(subject.value) ?? [];
}

/**
 * Get child resources via a hierarchy predicate (inverse)
 * e.g., for rdfs:subClassOf, returns the classes that are subclasses of this resource
 */
export function getChildren(
    store: RdfStore,
    object: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode | null | undefined
): (NamedNode | BlankNode)[] {
    store.version;
    if (!hierarchyPredicate) return [];
    const index = getHierarchyIndex(store, hierarchyPredicate);
    return index.childrenByParent.get(object.value) ?? [];
}

/**
 * Get root resources (resources of a type that have no parents)
 */
export function getRootResources(
    store: RdfStore,
    resourceType: NamedNode,
    hierarchyPredicate: NamedNode | null | undefined
): (NamedNode | BlankNode)[] {
    store.version;
    
    const allResources = store.getResourcesByType(resourceType);
    if (!hierarchyPredicate) return allResources;
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
    hierarchyPredicate: NamedNode | null | undefined,
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
 * Build tree nodes starting from root resources.
 * Nodes are sorted alphabetically by label at each level.
 */
export function buildTreeNodes(
    store: RdfStore,
    resourceType: NamedNode,
    hierarchyPredicate: NamedNode | null | undefined,
    lang?: string,
    maxDepth: number = 10
): TreeNode[] {
    store.version;
    
    const roots = getRootResources(store, resourceType, hierarchyPredicate);
    
    function buildNode(term: NamedNode | BlankNode, depth: number): TreeNode {
        const children = hierarchyPredicate && depth < maxDepth 
            ? getChildren(store, term, hierarchyPredicate)
            : [];
        
        const label = getResourceLabel(store, term, lang);
        const childNodes = children
            .map(child => buildNode(child, depth + 1))
            .sort((a, b) => a.label.localeCompare(b.label));
        
        return {
            term,
            label,
            children: childNodes,
            hasChildren: children.length > 0
        };
    }
    
    return roots
        .map(root => buildNode(root, 0))
        .sort((a, b) => a.label.localeCompare(b.label));
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
    return store.transaction(() => {
        const subject = baseNamespace(localName);
        store.addQuad(subject, ns.rdf('type'), resourceType);
        if (parent && hierarchyPredicate) {
            store.addQuad(subject, hierarchyPredicate, parent);
        }
        return subject;
    });
}

/**
 * Remove a resource and all its triples (as subject or object), 
 * including recursively removing children in a hierarchy.
 * 
 * @param store - The RDF store
 * @param resource - The resource to delete
 * @param hierarchyPredicate - The predicate defining children (e.g., rdfs:subClassOf).
 *                             Children are found via: ?child hierarchyPredicate resource.
 *                             Pass a predicate that won't match anything for simple removal.
 */
export function removeResourceRecursive(
    store: RdfStore,
    resource: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode | null | undefined
): void {
    // Find all children (resources that have this resource as parent via hierarchyPredicate)
    // e.g., ?child rdfs:subClassOf resource
    const children = hierarchyPredicate ? getChildren(store, resource, hierarchyPredicate) : [];
    
    // Recursively delete all children first (only if hierarchy predicate is present)
    for (const child of children) {
        removeResourceRecursive(store, child, hierarchyPredicate);
    }
    
    // Collect all quads to remove in a single batch
    const outgoing = store.getQuads(resource, null, null);
    const incoming = store.getQuads(null, null, resource);
    store.removeQuads([...outgoing, ...incoming]);
}

/**
 * Remove a hierarchy relationship (e.g., subClassOf, subPropertyOf)
 */
export function removeHierarchyRelation(
    store: RdfStore,
    subject: NamedNode | BlankNode,
    predicate: NamedNode,
    object: NamedNode | BlankNode
): void {
    const quads = store.getQuads(subject, predicate, object);
    store.removeQuads(quads);
}

/**
 * Add a hierarchy relationship (e.g., subClassOf, subPropertyOf)
 */
export function addHierarchyRelation(
    store: RdfStore,
    subject: NamedNode | BlankNode,
    predicate: NamedNode,
    object: NamedNode | BlankNode
): void {
    store.addQuad(subject, predicate, object);
}

/**
 * Get all ancestors of a resource via a hierarchy predicate (transitive closure)
 * Used for cycle detection - if we're adding A subClassOf B, we need to ensure
 * B is not already a descendant of A (which would create a cycle)
 */
export function getAncestors(
    store: RdfStore,
    resource: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode | null | undefined,
    maxDepth: number = 50
): Set<string> {
    store.version;
    if (!hierarchyPredicate) return new Set();
    const ancestors = new Set<string>();
    const visited = new Set<string>();
    
    function collectAncestors(current: NamedNode | BlankNode, depth: number) {
        if (depth > maxDepth || visited.has(current.value)) return;
        visited.add(current.value);
        
        const parents = getParents(store, current, hierarchyPredicate);
        for (const parent of parents) {
            ancestors.add(parent.value);
            collectAncestors(parent, depth + 1);
        }
    }
    
    collectAncestors(resource, 0);
    return ancestors;
}

/**
 * Get all descendants of a resource via a hierarchy predicate (transitive closure)
 * Used for cycle detection
 */
export function getDescendants(
    store: RdfStore,
    resource: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode | null | undefined,
    maxDepth: number = 50
): Set<string> {
    store.version;
    if (!hierarchyPredicate) return new Set();
    const descendants = new Set<string>();
    const visited = new Set<string>();
    
    function collectDescendants(current: NamedNode | BlankNode, depth: number) {
        if (depth > maxDepth || visited.has(current.value)) return;
        visited.add(current.value);
        
        const children = getChildren(store, current, hierarchyPredicate);
        for (const child of children) {
            descendants.add(child.value);
            collectDescendants(child, depth + 1);
        }
    }
    
    collectDescendants(resource, 0);
    return descendants;
}

/**
 * Check if adding a hierarchy relation would create a cycle
 * A cycle would occur if: subject is an ancestor of object
 * (i.e., object is already a descendant of subject)
 */
export function wouldCreateCycle(
    store: RdfStore,
    subject: NamedNode | BlankNode,
    object: NamedNode | BlankNode,
    hierarchyPredicate: NamedNode | null | undefined
): boolean {
    if (!hierarchyPredicate) return false;
    // If subject equals object, it's definitely a cycle
    if (subject.value === object.value) return true;
    
    // Check if object is a descendant of subject
    const descendants = getDescendants(store, subject, hierarchyPredicate);
    return descendants.has(object.value);
}


