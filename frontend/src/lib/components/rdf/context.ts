/**
 * RDF Editor Context
 * 
 * Provides shared state for RDF editing components via Svelte context.
 * Avoids prop drilling for store access and selected resource.
 */

import { getContext, setContext } from 'svelte';
import type { RdfStore } from '$lib/stores/rdf.svelte';
import type { NamedNode, BlankNode } from 'n3';

const RDF_CONTEXT_KEY = Symbol('rdf-editor');

export interface RdfEditorContext {
    /** The RDF store instance */
    store: RdfStore;
    /** Currently selected resource (reactive getter) */
    readonly selectedResource: NamedNode | BlankNode | null;
    /** Set the selected resource */
    setSelected: (resource: NamedNode | BlankNode | null) => void;
}

export function setRdfContext(context: RdfEditorContext): void {
    setContext(RDF_CONTEXT_KEY, context);
}

export function getRdfContext(): RdfEditorContext {
    return getContext<RdfEditorContext>(RDF_CONTEXT_KEY);
}


