<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
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
        HierarchyTree,
        ResourceDetailPanel,
        AnnotationSection,
        HierarchySection,
        LiteralEditorDialog,
        CreateResourceDialog,
        HierarchyEditorDialog
    } from '$lib/components/rdf';
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
        getPrimaryHierarchyPredicate,
        getHierarchyPredicatesForResource
    } from '$lib/rdf/resource-types';
    import { chooseTabForResource } from '$lib/rdf/view-profiles';

    // Get resource types to display as tabs (from centralized config)
    const TABS = getViewableResourceTypes();

    // Active tab state (using resource type ID)
    let activeTab = $state<ResourceTypeId>('class');
    const currentTabConfig = $derived(TABS.find(t => t.id === activeTab)!);
    const currentHierarchyPredicate = $derived(getPrimaryHierarchyPredicate(currentTabConfig));

    // Selected resource state (per tab to preserve selection when switching)
    let selectedByTab = $state<Record<string, NamedNode | BlankNode | null>>(
        Object.fromEntries(TABS.map(t => [t.id, null]))
    );
    const selectedResource = $derived(selectedByTab[activeTab]);
    
    // Loading state
    let isLoading = $state(true);
    let loadError = $state<string | null>(null);

    // Dialog state
    let annotationDialogOpen = $state(false);
    let annotationSubject = $state<NamedNode | BlankNode | null>(null);
    let annotationPredicate = $state<NamedNode | undefined>(undefined);
    let annotationEditingValue = $state<AnnotationValue | undefined>(undefined);

    let createDialogOpen = $state(false);
    let createParent = $state<NamedNode | BlankNode | null>(null);

    let hierarchyDialogOpen = $state(false);
    let hierarchySubject = $state<NamedNode | BlankNode | null>(null);
    let hierarchyPredicate = $state<NamedNode | null>(null);
    let hierarchyExistingParent = $state<NamedNode | BlankNode | null>(null);

    // Confirmation dialog state
    let confirmDialogOpen = $state(false);
    let confirmDialogTitle = $state('');
    let confirmDialogDescription = $state('');
    let confirmDialogAction = $state<(() => void) | null>(null);

    function showConfirmDialog(title: string, description: string, onConfirm: () => void) {
        confirmDialogTitle = title;
        confirmDialogDescription = description;
        confirmDialogAction = onConfirm;
        confirmDialogOpen = true;
    }

    function handleConfirmDialogAction() {
        confirmDialogAction?.();
        confirmDialogOpen = false;
    }

    // Set up context
    setRdfContext({
        store: rdfStore,
        get selectedResource() { return selectedResource; },
        setSelected: (resource) => { selectedByTab[activeTab] = resource; }
    });

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
        selectedByTab = Object.fromEntries(TABS.map(t => [t.id, null]));
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
            annotationSubject = subject;
            annotationPredicate = undefined;
            annotationEditingValue = undefined;
            annotationDialogOpen = true;
        },
        addValue: (subject: NamedNode | BlankNode, predicate: NamedNode) => {
            annotationSubject = subject;
            annotationPredicate = predicate;
            annotationEditingValue = undefined;
            annotationDialogOpen = true;
        },
        edit: (value: AnnotationValue) => {
            annotationSubject = value.quad.subject as NamedNode | BlankNode;
            annotationPredicate = value.quad.predicate as NamedNode;
            annotationEditingValue = value;
            annotationDialogOpen = true;
        },
        close: () => {
            annotationDialogOpen = false;
        },
    };

    /**************************************************************************
     * Resource CRUD Handlers
     **************************************************************************/
    
    const resourceHandlers = {
        add: (parent: NamedNode | BlankNode | null) => {
            createParent = parent;
            createDialogOpen = true;
        },
        addChild: (parent: NamedNode | BlankNode) => {
            createParent = parent;
            createDialogOpen = true;
        },
        created: (resource: NamedNode) => {
            selectedByTab[activeTab] = resource;
        },
        remove: (resource: NamedNode | BlankNode) => {
            const config = currentTabConfig;
            const predicate = getPrimaryHierarchyPredicate(config);
            const label = getResourceLabel(rdfStore, resource);
            const children = predicate ? getChildren(rdfStore, resource, predicate) : [];
            
            let description = `This will permanently delete the ${config.label.toLowerCase()} "${label}".`;
            if (children.length > 0) {
                description += ` This will also delete ${children.length} child${children.length > 1 ? 'ren' : ''} and all their properties.`;
            }
            
            showConfirmDialog(
                `Delete ${config.label}?`,
                description,
                () => {
                    removeResourceRecursive(rdfStore, resource, predicate);
                    selectedByTab[activeTab] = null;
                }
            );
        },
    };

    /**************************************************************************
     * Hierarchy Handlers
     **************************************************************************/
    
    const hierarchyHandlers = {
        add: (subject: NamedNode | BlankNode, predicate: NamedNode) => {
            hierarchySubject = subject;
            hierarchyPredicate = predicate;
            hierarchyExistingParent = null;
            hierarchyDialogOpen = true;
        },
        edit: (subject: NamedNode | BlankNode, predicate: NamedNode, existingParent: NamedNode | BlankNode) => {
            hierarchySubject = subject;
            hierarchyPredicate = predicate;
            hierarchyExistingParent = existingParent;
            hierarchyDialogOpen = true;
        },
        remove: (subject: NamedNode | BlankNode, predicate: NamedNode, object: NamedNode | BlankNode) => {
            const subjectLabel = getResourceLabel(rdfStore, subject);
            const objectLabel = getResourceLabel(rdfStore, object);
            
            showConfirmDialog(
                'Remove Relationship?',
                `Remove "${subjectLabel}" as a subtype of "${objectLabel}"?`,
                () => {
                    removeHierarchyRelation(rdfStore, subject, predicate, object);
                }
            );
        },
        close: () => {
            hierarchyDialogOpen = false;
        },
    };

    /**************************************************************************
     * Navigation Handlers
     **************************************************************************/
    
    const navigationHandlers = {
        select: (resource: NamedNode | BlankNode | null) => {
            selectedByTab[activeTab] = resource;
        },
        toPredicate: (predicate: NamedNode) => {
            // Navigate to annotation property tab and select the predicate
            activeTab = 'annotationProperty';
            selectedByTab.annotationProperty = predicate;
        },
        toResource: (resource: NamedNode) => {
            const availableTabs = new Set(Object.keys(selectedByTab));
            const tab = chooseTabForResource(rdfStore, resource, availableTabs);

            if (tab && selectedByTab[tab] !== undefined) {
                activeTab = tab;
                selectedByTab[tab] = resource;
                return;
            }

            // Fallback: stay on current tab
            selectedByTab[activeTab] = resource;
        },
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
                        onselect={navigationHandlers.select}
                        typeBadge={currentTabConfig.badge}
                        emptyLabel={currentTabConfig.emptyLabel}
                        onadd={resourceHandlers.add}
                        onaddchild={resourceHandlers.addChild}
                        onremove={resourceHandlers.remove}
                    />
                    
                    <!-- Right: Detail panel with sections -->
                    <ResourceDetailPanel subject={selectedResource}>
                        {#if selectedResource}
                            {@const hierarchyPredicates = getHierarchyPredicatesForResource(rdfStore, selectedResource)}
                            <AnnotationSection 
                                subject={selectedResource}
                                onadd={annotationHandlers.add}
                                onaddvalue={annotationHandlers.addValue}
                                onedit={annotationHandlers.edit}
                                onpredicateclick={navigationHandlers.toPredicate}
                                onvalueclick={navigationHandlers.toResource}
                            />
                            {#if hierarchyPredicates.length > 0 || currentHierarchyPredicate}
                                <HierarchySection
                                    subject={selectedResource}
                                    predicates={hierarchyPredicates.length > 0 ? hierarchyPredicates : currentHierarchyPredicate ? [currentHierarchyPredicate] : []}
                                    onnavigate={navigationHandlers.select}
                                    onpredicateclick={navigationHandlers.toPredicate}
                                    onadd={hierarchyHandlers.add}
                                    onedit={hierarchyHandlers.edit}
                                    onremove={hierarchyHandlers.remove}
                                />
                            {/if}
                        {/if}
                    </ResourceDetailPanel>
                </div>
            </div>
        {/if}
    </main>
</div>

<!-- Create Resource Dialog (generic for current tab) -->
<CreateResourceDialog
    bind:open={createDialogOpen}
    resourceType={getPrimaryTypeIri(currentTabConfig)}
    parent={createParent}
    hierarchyPredicate={currentHierarchyPredicate ?? undefined}
    typeLabel={currentTabConfig.label}
    oncreate={resourceHandlers.created}
/>

<!-- Add/Edit Annotation Dialog -->
{#if annotationSubject && annotationDialogOpen}
    <LiteralEditorDialog
        bind:open={annotationDialogOpen}
        subject={annotationSubject}
        predicate={annotationPredicate}
        existingValue={annotationEditingValue}
        onsubmit={annotationHandlers.close}
        onclose={annotationHandlers.close}
    />
{/if}

<!-- Hierarchy Editor Dialog (for adding/editing subClassOf/subPropertyOf) -->
{#if hierarchySubject && hierarchyPredicate}
    <HierarchyEditorDialog
        bind:open={hierarchyDialogOpen}
        subject={hierarchySubject}
        predicate={hierarchyPredicate}
        existingParent={hierarchyExistingParent}
        resourceType={getPrimaryTypeIri(currentTabConfig)}
        dialogTitle={hierarchyExistingParent 
            ? (activeTab === 'class' ? 'Edit Superclass' : 'Edit Parent Property')
            : (activeTab === 'class' ? 'Add Superclass' : 'Add Parent Property')}
        onsubmit={hierarchyHandlers.close}
        onclose={hierarchyHandlers.close}
    />
{/if}

<!-- Confirmation Dialog -->
<AlertDialog.Root bind:open={confirmDialogOpen}>
    <AlertDialog.Content>
        <AlertDialog.Header>
            <AlertDialog.Title>{confirmDialogTitle}</AlertDialog.Title>
            <AlertDialog.Description>{confirmDialogDescription}</AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer>
            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
            <AlertDialog.Action onclick={handleConfirmDialogAction}>Continue</AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
