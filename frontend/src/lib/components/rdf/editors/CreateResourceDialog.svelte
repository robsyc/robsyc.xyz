<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { getRdfContext } from '../context';
    import { createResource, getResourceLabel } from '$lib/rdf/queries';
    import { ns, toCompactIri, PREFIXES } from '$lib/rdf/namespaces';

    interface Props {
        open?: boolean;
        /** The rdf:type for the new resource (e.g., rdfs:Class) */
        resourceType: NamedNode;
        /** Optional parent resource for hierarchy */
        parent?: NamedNode | BlankNode | null;
        /** Predicate for parent relationship (e.g., rdfs:subClassOf) */
        hierarchyPredicate?: NamedNode;
        /** Label for the type (e.g., "Class", "Property") */
        typeLabel?: string;
        /** Callback when resource is created */
        oncreate?: (resource: NamedNode) => void;
        /** Callback when dialog closes */
        onclose?: () => void;
    }

    let {
        open = $bindable(false),
        resourceType,
        parent = null,
        hierarchyPredicate,
        typeLabel = 'Resource',
        oncreate,
        onclose
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Form state
    let localName = $state('');
    let selectedNamespace = $state('rxyz');

    // Reset form when dialog opens
    $effect(() => {
        if (open) {
            localName = '';
            selectedNamespace = 'rxyz';
        }
    });

    // Validation
    const isValidLocalName = $derived(/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(localName));
    const fullIri = $derived(`${PREFIXES[selectedNamespace]}${localName}`);
    const compactIri = $derived(`${selectedNamespace}:${localName}`);

    // Check if IRI already exists
    const iriExists = $derived.by(() => {
        if (!localName) return false;
        const quads = store.getQuads(ns.fromIri(fullIri), null, null);
        return quads.length > 0;
    });

    const statusMessage = $derived.by(() => {
        if (!localName.trim()) return 'Enter a local name';
        if (!isValidLocalName) return 'Invalid name (use letters, numbers, _ or -)';
        if (iriExists) return 'Resource already exists';
        return null;
    });

    const isValid = $derived(!statusMessage);

    // Parent label for display
    const parentLabel = $derived(parent ? getResourceLabel(store, parent) : null);

    function handleSubmit() {
        if (!isValid) return;

        const newResource = createResource(
            store,
            localName,
            resourceType,
            parent ?? undefined,
            hierarchyPredicate,
            (name) => ns.fromIri(`${PREFIXES[selectedNamespace]}${name}`)
        );

        oncreate?.(newResource);
        open = false;
    }

    function handleClose() {
        onclose?.();
        open = false;
    }
</script>

<Dialog.Root bind:open onOpenChange={(o) => !o && handleClose()}>
    <Dialog.Content class="max-w-md">
        <Dialog.Header>
            <Dialog.Title>
                {#if parent}
                    Add Sub-{typeLabel}
                {:else}
                    Add {typeLabel}
                {/if}
            </Dialog.Title>
            <Dialog.Description>
                {#if parent}
                    Creating a new {typeLabel.toLowerCase()} under <span class="font-mono text-xs">{parentLabel}</span>
                {:else}
                    Create a new {typeLabel.toLowerCase()} of type <span class="font-mono text-xs">{toCompactIri(resourceType.value)}</span>
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
            <!-- Namespace selector -->
            <div class="space-y-2">
                <Label class="text-sm">Namespace</Label>
                <div class="flex gap-2">
                    {#each ['rxyz', 'schema'] as prefix (prefix)}
                        <button
                            type="button"
                            class="px-3 py-1.5 text-sm rounded border transition-colors"
                            class:bg-primary={selectedNamespace === prefix}
                            class:text-primary-foreground={selectedNamespace === prefix}
                            class:hover:bg-muted={selectedNamespace !== prefix}
                            onclick={() => selectedNamespace = prefix}
                        >
                            {prefix}:
                        </button>
                    {/each}
                </div>
                <p class="text-xs text-muted-foreground font-mono">{PREFIXES[selectedNamespace]}</p>
            </div>

            <!-- Local name input -->
            <div class="space-y-2">
                <Label for="local-name" class="text-sm">Local Name</Label>
                <Input
                    id="local-name"
                    bind:value={localName}
                    placeholder="e.g., Person, Topic, MyClass"
                    class="font-mono"
                />
                {#if localName}
                    <p class="text-xs text-muted-foreground">
                        Full IRI: <span class="font-mono">{compactIri}</span>
                    </p>
                {/if}
            </div>

            <!-- Preview -->
            {#if isValid}
                <div class="p-3 bg-muted rounded-lg">
                    <p class="text-xs text-muted-foreground mb-1">Preview:</p>
                    <code class="text-xs font-mono block">
                        {compactIri} a {toCompactIri(resourceType.value)} .
                    </code>
                    {#if parent && hierarchyPredicate}
                        <code class="text-xs font-mono block">
                            {compactIri} {toCompactIri(hierarchyPredicate.value)} {toCompactIri(parent.value)} .
                        </code>
                    {/if}
                </div>
            {/if}
        </div>

        <Dialog.Footer class="flex items-center">
            {#if statusMessage}
                <p class="text-xs text-muted-foreground mr-auto">{statusMessage}</p>
            {/if}
            <div class="flex gap-2">
                <Button variant="outline" size="sm" onclick={handleClose}>Cancel</Button>
                <Button size="sm" onclick={handleSubmit} disabled={!isValid}>Create</Button>
            </div>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
