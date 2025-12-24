<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { DataFactory } from 'n3';
    import { onMount } from 'svelte';
    import { Download, RefreshCw } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Separator } from '$lib/components/ui/separator/index.js';
    import * as UnderlineTabs from '$lib/components/ui/underline-tabs/index.js';
    import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { 
        setRdfContext,
        createRdfContext,
        HierarchyTree,
        ResourceDetailPanel,
        AnnotationSection,
        HierarchySection,
        TargetSection,
        PropertyShapeSection,
        LiteralEditorDialog,
        CreateResourceDialog,
        HierarchyEditorDialog
    } from '$lib/components/rdf';
    import { createKeyedSelectionState } from '$lib/utils/selection.svelte';
    import { 
        removeResourceRecursive, 
        removeHierarchyRelation,
        getResourceLabel, 
        getChildren, 
        type AnnotationValue 
    } from '$lib/rdf/queries';
    import {
        type ResourceTypeId,
        getViewableResourceTypes,
        getPrimaryTypeIri,
        getPrimaryHierarchyPredicate
    } from '$lib/rdf/resource-types';
    import { chooseTabForResource, getSectionsForResource } from '$lib/rdf/view-profiles';
    import { createDialogState, createConfirmDialog } from '$lib/utils/dialog.svelte';

    // Get resource types to display as tabs (from centralized config)
    const TABS = getViewableResourceTypes();

    // Active tab state (using resource type ID)
    let activeTab = $state<ResourceTypeId>('class');
    const currentTabConfig = $derived(TABS.find(t => t.id === activeTab)!);
    const currentHierarchyPredicate = $derived(getPrimaryHierarchyPredicate(currentTabConfig));

    // Selection state using keyed selection utility (per-tab with multi-select support)
    const selections = createKeyedSelectionState(TABS.map(t => t.id));
    const activeSelection = $derived(selections.get(activeTab));
    const selectedResource = $derived(activeSelection.selected);
    
    // Loading state
    let isLoading = $state(true);
    let loadError = $state<string | null>(null);

    // Dialog state using utilities
    const annotationDialog = createDialogState<{
        subject: NamedNode | BlankNode;
        predicate?: NamedNode;
        editingValue?: AnnotationValue;
    }>();

    const createResourceDialog = createDialogState<{
        parent: NamedNode | BlankNode | null;
    }>();

    const hierarchyDialog = createDialogState<{
        subject: NamedNode | BlankNode;
        predicate: NamedNode;
        existingParent: NamedNode | BlankNode | null;
    }>();

    const confirmDialog = createConfirmDialog();

    // Navigation callbacks for cross-component navigation
    // Defined before context so they can be included in it
    function navigateToResource(resource: NamedNode | BlankNode) {
        const availableTabs = new Set(TABS.map(t => t.id));
        const tab = chooseTabForResource(rdfStore, resource, availableTabs);

        if (tab) {
            activeTab = tab;
            selections.setSelected(tab, resource);
            return;
        }

        // Fallback: stay on current tab
        activeSelection.select(resource);
    }

    function navigateToPredicate(predicate: NamedNode) {
        // Navigate to annotation property tab and select the predicate
        activeTab = 'annotationProperty';
        selections.setSelected('annotationProperty', predicate);
    }

    // Set up context with store, selection, and navigation
    // Uses getSelection() pattern so tab switches update the active selection
    setRdfContext(createRdfContext({
        store: rdfStore,
        getSelection: () => activeSelection,
        navigation: {
            toResource: navigateToResource,
            toPredicate: navigateToPredicate,
        }
    }));

    // Store size for display
    const storeSize = $derived(rdfStore.size);

    /**************************************************************************
     * Data Loading
     **************************************************************************/
    
    async function loadData() {
        isLoading = true;
        loadError = null;
        try {
            await Promise.all([
                rdfStore.load({ url: '/graphs/tests/01-basic-classes.ttl' }),
                rdfStore.load({ url: '/graphs/tests/02-simple-shacl.ttl' }),
                rdfStore.load({ url: '/graphs/config/owlAnnotationProperty.ttl' })
            ]);
            console.log(`Loaded ${rdfStore.size} quads`);
        } catch (error) {
            console.error('Failed to load RDF data:', error);
            loadError = error instanceof Error ? error.message : 'Failed to load data';
        } finally {
            isLoading = false;
        }
    }

    onMount(loadData);

    async function handleReload() {
        rdfStore.clear();
        selections.clearAll();
        await loadData();
    }

    function handleExport() {
        const turtle = rdfStore.serialize({ format: 'turtle' });
        const blob = new Blob([turtle], { type: 'text/turtle' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'export.ttl';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**************************************************************************
     * Annotation Handlers
     **************************************************************************/
    
    const annotationHandlers = {
        add: (subject: NamedNode | BlankNode) => {
            annotationDialog.show({ subject });
        },
        edit: (value: AnnotationValue) => {
            annotationDialog.show({
                subject: value.quad.subject as NamedNode | BlankNode,
                predicate: value.quad.predicate as NamedNode,
                editingValue: value
            });
        },
    };

    /**************************************************************************
     * Resource CRUD Handlers
     **************************************************************************/
    
    const resourceHandlers = {
        add: (parent: NamedNode | BlankNode | null) => {
            createResourceDialog.show({ parent });
        },
        addChild: (parent: NamedNode | BlankNode) => {
            createResourceDialog.show({ parent });
        },
        created: (resource: NamedNode) => {
            activeSelection.select(resource);
        },
        /**
         * Remove handler - handles both single and multi-select deletion.
         * When multi-select is active, deletes all selected resources.
         * When single-select, deletes just the passed resource.
         */
        remove: (resource: NamedNode | BlankNode) => {
            const config = currentTabConfig;
            const predicate = getPrimaryHierarchyPredicate(config);
            const count = activeSelection.count;
            
            // Multi-select: delete all selected resources
            if (count > 1) {
                confirmDialog.show({
                    title: `Delete ${count} ${config.pluralLabel}?`,
                    description: `This will permanently delete ${count} selected ${config.label.toLowerCase()}s and all their properties.`,
                    onConfirm: () => {
                        const selectedIris = activeSelection.getSelectedIris();
                        rdfStore.transaction(() => {
                            for (const iri of selectedIris) {
                                const node = DataFactory.namedNode(iri);
                                removeResourceRecursive(rdfStore, node, predicate);
                            }
                        });
                        activeSelection.clear();
                    }
                });
                return;
            }
            
            // Single-select: delete just this resource
            const label = getResourceLabel(rdfStore, resource);
            const children = predicate ? getChildren(rdfStore, resource, predicate) : [];
            
            let description = `This will permanently delete the ${config.label.toLowerCase()} "${label}".`;
            if (children.length > 0) {
                description += ` This will also delete ${children.length} child${children.length > 1 ? 'ren' : ''} and all their properties.`;
            }
            
            confirmDialog.show({
                title: `Delete ${config.label}?`,
                description,
                onConfirm: () => {
                    removeResourceRecursive(rdfStore, resource, predicate);
                    activeSelection.clear();
                }
            });
        },
    };

    /**************************************************************************
     * Hierarchy Handlers
     **************************************************************************/
    
    const hierarchyHandlers = {
        add: (subject: NamedNode | BlankNode, predicate: NamedNode) => {
            hierarchyDialog.show({ subject, predicate, existingParent: null });
        },
        edit: (subject: NamedNode | BlankNode, predicate: NamedNode, existingParent: NamedNode | BlankNode) => {
            hierarchyDialog.show({ subject, predicate, existingParent });
        },
        remove: (subject: NamedNode | BlankNode, predicate: NamedNode, object: NamedNode | BlankNode) => {
            const subjectLabel = getResourceLabel(rdfStore, subject);
            const objectLabel = getResourceLabel(rdfStore, object);
            
            confirmDialog.show({
                title: 'Remove Relationship?',
                description: `Remove "${subjectLabel}" as a subtype of "${objectLabel}"?`,
                onConfirm: () => {
                    removeHierarchyRelation(rdfStore, subject, predicate, object);
                }
            });
        },
    };

    /**************************************************************************
     * Navigation Handlers (wrapper for prop-based navigation)
     * Components can also use context.navigation directly
     **************************************************************************/
    
    const navigationHandlers = {
        select: (resource: NamedNode | BlankNode | null) => {
            activeSelection.select(resource);
        },
        toPredicate: navigateToPredicate,
        toResource: navigateToResource,
    };
</script>

<svelte:head>
    <title>RDF View | robsyc.xyz</title>
</svelte:head>

<div class="h-screen flex flex-col">
    <!-- Header -->
    <header class="border-b bg-background">
        <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-4">
                <h1 class="text-lg font-semibold">RDF View</h1>
                <Separator orientation="vertical" class="h-6" />
                <Badge variant="outline" class="font-mono">
                    {storeSize} quads
                </Badge>
            </div>
            
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" onclick={handleReload} disabled={isLoading}>
                    <RefreshCw class="h-4 w-4 mr-2 {isLoading ? 'animate-spin' : ''}" />
                    Reload
                </Button>
                <Button variant="outline" size="sm" onclick={handleExport}>
                    <Download class="h-4 w-4 mr-2" />
                    Export TTL
                </Button>
            </div>
        </div>
    </header>
    
    <!-- Main content -->
    <main class="flex-1 min-h-0 flex flex-col">
        {#if isLoading}
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <RefreshCw class="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                    <p class="text-muted-foreground">Loading RDF data...</p>
                </div>
            </div>
        {:else if loadError}
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <p class="text-destructive mb-2">{loadError}</p>
                    <Button variant="outline" onclick={handleReload}>Try Again</Button>
                </div>
            </div>
        {:else}
            <!-- Tabs for switching resource types -->
            <div class="px-4 pt-2">
                <UnderlineTabs.Root bind:value={activeTab}>
                    <UnderlineTabs.List>
                        {#each TABS as tab (tab.id)}
                            <UnderlineTabs.Trigger value={tab.id}>{tab.pluralLabel}</UnderlineTabs.Trigger>
                        {/each}
                    </UnderlineTabs.List>
                </UnderlineTabs.Root>
            </div>
            
            <!-- Content area -->
            <div class="flex-1 min-h-0 p-4">
                <div class="grid grid-cols-2 gap-4 h-full">
                    <!-- Left: Resource hierarchy browser -->
                    <HierarchyTree
                        resourceType={getPrimaryTypeIri(currentTabConfig)}
                        hierarchyPredicate={currentHierarchyPredicate}
                        selected={selectedResource}
                        isSelected={(node) => activeSelection.isSelected(node)}
                        onselect={navigationHandlers.select}
                        ontoggle={(resource) => activeSelection.toggle(resource, true)}
                        selectionCount={activeSelection.count}
                        typeBadge={currentTabConfig.badge}
                        emptyLabel={currentTabConfig.emptyLabel}
                        onadd={resourceHandlers.add}
                        onaddchild={resourceHandlers.addChild}
                        onremove={resourceHandlers.remove}
                    />
                    
                    <!-- Right: Detail panel with dynamic sections -->
                    <ResourceDetailPanel subject={selectedResource}>
                        {#if selectedResource}
                            {@const sections = getSectionsForResource(rdfStore, selectedResource, activeTab)}
                            {#each sections as section (section.type)}
                                {#if section.type === 'annotation'}
                                    <AnnotationSection 
                                        subject={selectedResource}
                                        onadd={annotationHandlers.add}
                                        onedit={annotationHandlers.edit}
                                        onpredicateclick={navigationHandlers.toPredicate}
                                        onvalueclick={navigationHandlers.toResource}
                                    />
                                {:else if section.type === 'target'}
                                    <TargetSection
                                        subject={selectedResource}
                                        onnavigate={navigationHandlers.toResource}
                                    />
                                {:else if section.type === 'hierarchy'}
                                    <HierarchySection
                                        subject={selectedResource}
                                        predicates={section.props.predicates as import('n3').NamedNode[]}
                                        label={section.title}
                                        onnavigate={navigationHandlers.select}
                                        onpredicateclick={navigationHandlers.toPredicate}
                                        onadd={hierarchyHandlers.add}
                                        onedit={hierarchyHandlers.edit}
                                        onremove={hierarchyHandlers.remove}
                                    />
                                {:else if section.type === 'propertyShapes'}
                                    <PropertyShapeSection
                                        subject={selectedResource}
                                        onpathclick={navigationHandlers.toPredicate}
                                    />
                                {/if}
                            {/each}
                        {/if}
                    </ResourceDetailPanel>
                </div>
            </div>
        {/if}
    </main>
</div>

<!-- Create Resource Dialog (generic for current tab) -->
{#if createResourceDialog.open && createResourceDialog.data}
    <CreateResourceDialog
        open={createResourceDialog.open}
        resourceType={getPrimaryTypeIri(currentTabConfig)}
        parent={createResourceDialog.data.parent}
        hierarchyPredicate={currentHierarchyPredicate ?? undefined}
        typeLabel={currentTabConfig.label}
        oncreate={resourceHandlers.created}
        onclose={createResourceDialog.close}
    />
{/if}

<!-- Add/Edit Annotation Dialog -->
{#if annotationDialog.open && annotationDialog.data}
    <LiteralEditorDialog
        open={annotationDialog.open}
        subject={annotationDialog.data.subject}
        predicate={annotationDialog.data.predicate}
        existingValue={annotationDialog.data.editingValue}
        onsubmit={annotationDialog.close}
        onclose={annotationDialog.close}
    />
{/if}

<!-- Hierarchy Editor Dialog (for adding/editing subClassOf/subPropertyOf) -->
{#if hierarchyDialog.open && hierarchyDialog.data}
    <HierarchyEditorDialog
        open={hierarchyDialog.open}
        subject={hierarchyDialog.data.subject}
        predicate={hierarchyDialog.data.predicate}
        existingParent={hierarchyDialog.data.existingParent}
        resourceType={getPrimaryTypeIri(currentTabConfig)}
        dialogTitle={hierarchyDialog.data.existingParent 
            ? (activeTab === 'class' ? 'Edit Superclass' : 'Edit Parent Property')
            : (activeTab === 'class' ? 'Add Superclass' : 'Add Parent Property')}
        onsubmit={hierarchyDialog.close}
        onclose={hierarchyDialog.close}
    />
{/if}

<!-- Confirmation Dialog -->
{#if confirmDialog.open && confirmDialog.data}
    <AlertDialog.Root open={confirmDialog.open} onOpenChange={(open) => !open && confirmDialog.close()}>
        <AlertDialog.Content>
            <AlertDialog.Header>
                <AlertDialog.Title>{confirmDialog.data.title}</AlertDialog.Title>
                <AlertDialog.Description>{confirmDialog.data.description}</AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                <AlertDialog.Action onclick={confirmDialog.execute}>Continue</AlertDialog.Action>
            </AlertDialog.Footer>
        </AlertDialog.Content>
    </AlertDialog.Root>
{/if}
