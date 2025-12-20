<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { AlertCircle } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { getRdfContext } from '../context';
    import { ResourceSelector } from '../shared';
    import { addHierarchyRelation, removeHierarchyRelation, getResourceLabel, getParents, getChildren } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';

    interface Props {
        open?: boolean;
        /** The subject resource (e.g., the class to add a parent to) */
        subject: NamedNode | BlankNode;
        /** The hierarchy predicate (e.g., rdfs:subClassOf) */
        predicate: NamedNode;
        /** Existing parent being edited (for edit mode) */
        existingParent?: NamedNode | BlankNode | null;
        /** The rdf:type to filter parent resources by */
        resourceType?: NamedNode;
        /** Label for the dialog (e.g., "Add Superclass") */
        dialogTitle?: string;
        /** Callback when relationship is added/updated */
        onsubmit?: () => void;
        /** Callback when dialog closes */
        onclose?: () => void;
    }

    let {
        open = $bindable(false),
        subject,
        predicate,
        existingParent = null,
        resourceType,
        dialogTitle,
        onsubmit,
        onclose
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Edit mode detection
    const isEditMode = $derived(existingParent !== null);
    const computedTitle = $derived(dialogTitle ?? (isEditMode ? 'Edit Parent' : 'Add Parent'));

    // Form state
    let selectedParent = $state<NamedNode | BlankNode | null>(null);

    // Reset/initialize form when dialog opens
    $effect(() => {
        if (open) {
            selectedParent = existingParent ?? null;
        }
    });

    // Labels for display
    const subjectLabel = $derived(getResourceLabel(store, subject));
    const predicateLabel = $derived(getResourceLabel(store, predicate));

    // Get resources to exclude (self + descendants + existing parents except one being edited)
    const excludedResources = $derived.by(() => {
        const excluded: (NamedNode | BlankNode)[] = [subject];
        const seen = new Set<string>([subject.value]);
        
        // Collect all descendants recursively (to prevent cycles)
        function collectDescendants(current: NamedNode | BlankNode) {
            for (const child of getChildren(store, current, predicate)) {
                if (!seen.has(child.value)) {
                    seen.add(child.value);
                    excluded.push(child);
                    collectDescendants(child);
                }
            }
        }
        collectDescendants(subject);
        
        // Add existing parents (no duplicate relationships) - but allow the one being edited
        for (const parent of getParents(store, subject, predicate)) {
            if (existingParent?.value !== parent.value && !seen.has(parent.value)) {
                excluded.push(parent);
            }
        }
        
        return excluded;
    });

    // Preview
    const preview = $derived.by(() => {
        if (!selectedParent) return '';
        const s = toCompactIri(subject.value);
        const p = toCompactIri(predicate.value);
        const o = toCompactIri(selectedParent.value);
        return `${s} ${p} ${o} .`;
    });

    // Valid if parent selected and (add mode OR parent changed in edit mode)
    const isValid = $derived(
        selectedParent !== null && 
        (!isEditMode || selectedParent.value !== existingParent?.value)
    );

    function handleSubmit() {
        if (!isValid || !selectedParent) return;
        
        // In edit mode, remove the old relationship first
        if (isEditMode && existingParent) {
            removeHierarchyRelation(store, subject, predicate, existingParent);
        }
        
        // Add the new relationship
        addHierarchyRelation(store, subject, predicate, selectedParent);
        
        onsubmit?.();
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
            <Dialog.Title>{computedTitle}</Dialog.Title>
            <Dialog.Description>
                {isEditMode ? 'Change' : 'Add'} a <span class="font-mono text-xs">{predicateLabel}</span> relationship for <span class="font-mono text-xs">{subjectLabel}</span>
            </Dialog.Description>
        </Dialog.Header>

        <div class="space-y-4 py-4">
            <!-- Info about cycle prevention -->
            {#if excludedResources.length > 1}
                <div class="flex items-start gap-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                    <AlertCircle class="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Some resources are hidden to prevent circular hierarchies.</span>
                </div>
            {/if}
            
            <!-- Parent selector -->
            <div class="space-y-2">
                <span class="text-sm font-medium">Select Parent</span>
                <ResourceSelector
                    {resourceType}
                    bind:selected={selectedParent}
                    exclude={excludedResources}
                    placeholder="Search for a resource..."
                />
            </div>

            <!-- Preview -->
            {#if preview}
                <div class="p-3 bg-muted rounded-lg">
                    <p class="text-xs text-muted-foreground mb-1">Preview:</p>
                    <code class="text-xs font-mono block">{preview}</code>
                </div>
            {/if}
        </div>

        <Dialog.Footer class="flex items-center">
            {#if !isValid}
                <p class="text-xs text-muted-foreground mr-auto">
                    {isEditMode ? 'Select a different parent' : 'Select a parent resource'}
                </p>
            {/if}
            <div class="flex gap-2">
                <Button variant="outline" size="sm" onclick={handleClose}>Cancel</Button>
                <Button size="sm" onclick={handleSubmit} disabled={!isValid}>
                    {isEditMode ? 'Update' : 'Add'}
                </Button>
            </div>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
