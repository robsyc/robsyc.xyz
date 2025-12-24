import type { BlankNode, NamedNode } from 'n3';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import type { ResourceTypeId } from '$lib/rdf/resource-types';
import { getResourceTypes, isShapeClass, getHierarchyPredicatesForResource } from '$lib/rdf/resource-types';
import { ns } from '$lib/rdf/namespaces';

/******************************************************************************
 * View Profile Types
 * 
 * ViewProfileId represents how a resource should be presented in the UI.
 * It is derived from ResourceTypeId (RDF-based type detection) plus:
 * - 'shapeClass': A dual-type resource (rdfs:Class + sh:NodeShape) or SHACL 1.2 sh:ShapeClass type
 * - 'unknown': Fallback for resources with no recognized type
 * 
 * This separation allows UI decisions to be distinct from RDF type detection.
 * 
 * Relationship to ResourceTypeId:
 * - Most ViewProfileIds map 1:1 to a ResourceTypeId (same string value)
 * - 'shapeClass' is a UI-only concept (rdfs:Class + sh:NodeShape combined)
 * - 'unknown' is a fallback when no matching ResourceType is found
 * - ResourceTypeId is used for preferredTab to link back to tab navigation
 *****************************************************************************/

/**
 * ViewProfileId combines RDF-detected types with UI-specific profiles.
 * 
 * Values that match ResourceTypeId: 'annotationProperty', 'class', 'nodeShape', 'propertyShape'
 * UI-only values: 'shapeClass', 'unknown'
 */
export type ViewProfileId =
	| 'annotationProperty'  // maps to ResourceTypeId 'annotationProperty'
	| 'class'               // maps to ResourceTypeId 'class'
	| 'nodeShape'           // maps to ResourceTypeId 'nodeShape'
	| 'propertyShape'       // maps to ResourceTypeId 'propertyShape'
	| 'shapeClass'          // UI-only: dual rdfs:Class + sh:NodeShape
	| 'unknown';            // UI-only: no recognized type

/**
 * Check if a ViewProfileId corresponds to a ResourceTypeId.
 * Useful for converting between the two type systems.
 * 
 * NOTE: Currently unused - kept for future type-narrowing use cases.
 */
export function isResourceTypeId(id: ViewProfileId): id is ViewProfileId & ResourceTypeId {
	return id !== 'shapeClass' && id !== 'unknown';
}

export interface ViewProfile {
	id: ViewProfileId;
	/**
	 * Preferred tab to show this resource under (if available in the current UI).
	 * This is the "UI composition" decision layer.
	 */
	preferredTab: ResourceTypeId | null;
}

/******************************************************************************
 * Section Configuration for Dynamic Panel Assembly
 *****************************************************************************/

export type SectionType = 'annotation' | 'hierarchy' | 'target' | 'propertyShapes';

export interface SectionConfig {
	/** Section type identifier */
	type: SectionType;
	/** Section title override (optional) */
	title?: string;
	/** Section-specific props */
	props: Record<string, unknown>;
}

/**
 * Get the sections to display for a resource based on its types AND the active tab.
 * This centralizes the logic for determining which UI sections to show.
 * 
 * When a resource has multiple types (e.g., rdfs:Class + sh:NodeShape), the sections
 * shown depend on which tab is currently active:
 * - Classes tab: show class-related sections (Annotations, Hierarchy with rdfs:subClassOf)
 * - Node Shapes tab: show SHACL sections (Annotations, Targets, PropertyShapes, Hierarchy with sh:node)
 * 
 * @param store - The RDF store
 * @param resource - The resource to get sections for
 * @param activeTab - The currently active tab (determines which sections to show)
 * @returns Array of section configurations in display order
 */
export function getSectionsForResource(
	store: RdfStore,
	resource: NamedNode | BlankNode,
	activeTab?: ResourceTypeId
): SectionConfig[] {
	store.version; // reactive

	const sections: SectionConfig[] = [];
	const profile = getViewProfile(store, resource);
	
	// Determine effective view mode based on active tab
	// If the resource is a ShapeClass (dual type), use the active tab to determine sections
	const effectiveProfile: ViewProfileId = (profile.id === 'shapeClass' && activeTab)
		? (activeTab as ViewProfileId)  // Use tab to determine view (safe cast: ResourceTypeId subset of ViewProfileId)
		: profile.id;

	// 1. Annotations section - always present for any resource
	sections.push({
		type: 'annotation',
		props: {}
	});

	// 2. Target section - only for NodeShape view (not when viewing as Class)
	if (effectiveProfile === 'nodeShape') {
		if (hasTargets(store, resource)) {
			sections.push({
				type: 'target',
				props: {}
			});
		}
	}

	// 3. Hierarchy section - filtered by effective profile
	const hierarchyPredicates = getHierarchyPredicatesForResource(store, resource);
	const filteredPredicates = filterHierarchyPredicates(hierarchyPredicates, effectiveProfile);
	
	if (filteredPredicates.length > 0) {
		sections.push({
			type: 'hierarchy',
			title: getHierarchySectionTitle(effectiveProfile),
			props: {
				predicates: filteredPredicates
			}
		});
	}

	// 4. PropertyShapes section - only for NodeShape view (not when viewing as Class)
	if (effectiveProfile === 'nodeShape') {
		if (hasPropertyShapes(store, resource)) {
			sections.push({
				type: 'propertyShapes',
				props: {}
			});
		}
	}

	return sections;
}

/**
 * Filter hierarchy predicates based on the effective view profile.
 * - For class view: only show rdfs:subClassOf
 * - For nodeShape view: only show sh:node
 * - For others: show all
 */
function filterHierarchyPredicates(
	predicates: NamedNode[],
	effectiveProfile: ViewProfileId
): NamedNode[] {
	if (effectiveProfile === 'class') {
		return predicates.filter(p => p.value === ns.rdfs('subClassOf').value);
	}
	if (effectiveProfile === 'nodeShape') {
		return predicates.filter(p => p.value === ns.sh('node').value);
	}
	// For shapeClass or unknown, show all predicates
	return predicates;
}

/**
 * Get appropriate title for hierarchy section based on profile type.
 */
function getHierarchySectionTitle(profileId: ViewProfileId): string {
	switch (profileId) {
		case 'class':
		case 'shapeClass':
			return 'Superclasses';
		case 'annotationProperty':
			return 'Parent Properties';
		case 'nodeShape':
			return 'Shape Hierarchy';
		default:
			return 'Hierarchy';
	}
}

/**
 * Check if a resource should show the property shapes section.
 */
export function hasPropertyShapes(store: RdfStore, resource: NamedNode | BlankNode): boolean {
	store.version; // reactive
	return store.getQuads(resource, ns.sh('property'), null).length > 0;
}

/**
 * Check if a resource should show the targets section.
 */
export function hasTargets(store: RdfStore, resource: NamedNode | BlankNode): boolean {
	store.version; // reactive
	return (
		store.getQuads(resource, ns.sh('targetClass'), null).length > 0 ||
		store.getQuads(resource, ns.sh('targetNode'), null).length > 0 ||
		store.getQuads(resource, ns.sh('targetSubjectsOf'), null).length > 0 ||
		store.getQuads(resource, ns.sh('targetObjectsOf'), null).length > 0
	);
}

/**
 * Decide how a resource should be presented in the UI.
 * This is intentionally separate from raw RDF type detection.
 */
export function getViewProfile(store: RdfStore, resource: NamedNode | BlankNode): ViewProfile {
	store.version; // reactive

	// SHACL 1.2 ShapeClass: dual rdfs:Class + sh:NodeShape
	if (isShapeClass(store, resource)) {
		return { id: 'shapeClass', preferredTab: 'class' };
	}

	const types = getResourceTypes(store, resource);
	if (types.length === 0) {
		return { id: 'unknown', preferredTab: null };
	}

	// Pick a stable "preferred" tab for common types.
	// Note: tabs may not exist in the current route, so callers must check availability.
	const ids = new Set(types.map((t) => t.id as ResourceTypeId));
	if (ids.has('annotationProperty')) return { id: 'annotationProperty', preferredTab: 'annotationProperty' };
	if (ids.has('class')) return { id: 'class', preferredTab: 'class' };
	if (ids.has('nodeShape')) return { id: 'nodeShape', preferredTab: 'nodeShape' };
	if (ids.has('propertyShape')) return { id: 'propertyShape', preferredTab: 'propertyShape' };

	// Fallback to first detected type config
	return { id: 'unknown', preferredTab: types[0].id as ResourceTypeId };
}

/**
 * Choose the best available tab for a resource given the current route's tab set.
 */
export function chooseTabForResource(
	store: RdfStore,
	resource: NamedNode | BlankNode,
	availableTabs: ReadonlySet<string>
): ResourceTypeId | null {
	const profile = getViewProfile(store, resource);
	if (profile.preferredTab && availableTabs.has(profile.preferredTab)) {
		return profile.preferredTab;
	}

	// Otherwise choose the first compatible resource type that exists in availableTabs
	const types = getResourceTypes(store, resource);
	for (const t of types) {
		if (availableTabs.has(t.id)) return t.id as ResourceTypeId;
	}

	return null;
}
