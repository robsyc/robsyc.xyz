<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import { onMount } from 'svelte';
    import { Download, RefreshCw } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Separator } from '$lib/components/ui/separator/index.js';
    import * as UnderlineTabs from '$lib/components/ui/underline-tabs/index.js';
    import { rdfStore } from '$lib/stores/rdf.svelte';
    import { ns } from '$lib/rdf/namespaces';
    import { 
        setRdfContext,
        HierarchyTree,
        ResourceDetailPanel,
        AnnotationSection,
        HierarchySection,
        LiteralEditorDialog,
        CreateResourceDialog
    } from '$lib/components/rdf';
    import { removeResourceRecursive, getResourceLabel, getChildren, type AnnotationValue } from '$lib/rdf/queries';

    // Tab configuration for different resource types
    type TabId = 'classes' | 'properties';
    
    interface TabConfig {
        id: TabId;
        label: string;
        resourceType: NamedNode;
        hierarchyPredicate: NamedNode;
        typeBadge: string;
        typeLabel: string;
        emptyLabel: string;
    }
    
    const TABS: TabConfig[] = [
        {
            id: 'properties',
            label: 'Annotation Properties',
            resourceType: ns.owl('AnnotationProperty'),
            hierarchyPredicate: ns.rdfs('subPropertyOf'),
            typeBadge: 'owl:AnnotationProperty',
            typeLabel: 'Property',
            emptyLabel: 'No annotation properties found'
        },
        {
            id: 'classes',
            label: 'Classes',
            resourceType: ns.rdfs('Class'),
            hierarchyPredicate: ns.rdfs('subClassOf'),
            typeBadge: 'rdfs:Class',
            typeLabel: 'Class',
            emptyLabel: 'No classes found'
        }
        // TODO: sh:NodeShape, named sh:PropertyShape, owl:Class, owl:ObjectProperty, owl:DatatypeProperty
    ];

    // Active tab state
    let activeTab = $state<TabId>('classes');
    const currentTabConfig = $derived(TABS.find(t => t.id === activeTab)!);

    // Selected resource state (per tab to preserve selection when switching)
    let selectedByTab = $state<Record<TabId, NamedNode | BlankNode | null>>({
        classes: null,
        properties: null
    });
    const selectedResource = $derived(selectedByTab[activeTab]);
    
    // Loading state
    let isLoading = $state(true);
    let loadError = $state<string | null>(null);

    // Annotation dialog state
    let showAnnotationDialog = $state(false);
    let annotationSubject = $state<NamedNode | BlankNode | null>(null);
    let annotationPredicate = $state<NamedNode | undefined>(undefined);
    let editingValue = $state<AnnotationValue | undefined>(undefined);

    // Create resource dialog state
    let showCreateDialog = $state(false);
    let createParent = $state<NamedNode | BlankNode | null>(null);

    // Set up context
    setRdfContext({
        store: rdfStore,
        get selectedResource() { return selectedResource; },
        setSelected: (resource) => { selectedByTab[activeTab] = resource; }
    });

    // Load data on mount
    onMount(async () => {
        try {
            isLoading = true;
            loadError = null;
            
            // Load both TTL files
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
    });

    // Export to Turtle
    function handleExport() {
        const turtle = rdfStore.serialize({ format: 'turtle' });
        
        // Create a blob and download
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

    // Reload data
    async function handleReload() {
        rdfStore.clear();
        isLoading = true;
        loadError = null;
        
        try {
            await Promise.all([
                rdfStore.load({ url: '/graphs/tests/01-basic-classes.ttl' }),
                rdfStore.load({ url: '/graphs/config/owlAnnotationProperty.ttl' })
            ]);
            selectedByTab = { classes: null, properties: null };
        } catch (error) {
            loadError = error instanceof Error ? error.message : 'Failed to reload data';
        } finally {
            isLoading = false;
        }
    }

    // Open add annotation dialog
    function openAddAnnotationDialog(subject: NamedNode | BlankNode) {
        annotationSubject = subject;
        annotationPredicate = undefined;
        editingValue = undefined;
        showAnnotationDialog = true;
    }

    // Open add annotation dialog with pre-selected predicate
    function openAddValueDialog(subject: NamedNode | BlankNode, predicate: NamedNode) {
        annotationSubject = subject;
        annotationPredicate = predicate;
        editingValue = undefined;
        showAnnotationDialog = true;
    }

    // Open edit annotation dialog
    function openEditDialog(value: AnnotationValue) {
        annotationSubject = value.quad.subject as NamedNode | BlankNode;
        annotationPredicate = value.quad.predicate as NamedNode;
        editingValue = value;
        showAnnotationDialog = true;
    }

    // Store size for display
    const storeSize = $derived(rdfStore.size);

    // Resource CRUD handlers (generic for any tab)
    function handleAddResource() {
        createParent = null;
        showCreateDialog = true;
    }

    function handleAddChildResource(parent: NamedNode | BlankNode) {
        createParent = parent;
        showCreateDialog = true;
    }

    function handleResourceCreated(resource: NamedNode) {
        selectedByTab[activeTab] = resource;
    }

    function handleRemoveResource(resource: NamedNode | BlankNode) {
        const config = currentTabConfig;
        const label = getResourceLabel(rdfStore, resource);
        const children = getChildren(rdfStore, resource, config.hierarchyPredicate);
        
        let message = `Delete ${config.typeLabel.toLowerCase()} "${label}"?`;
        if (children.length > 0) {
            message += `\n\nThis will also delete ${children.length} child${children.length > 1 ? 'ren' : ''} and all their properties.`;
        }
        
        if (!confirm(message)) return;
        
        removeResourceRecursive(rdfStore, resource, config.hierarchyPredicate);
        selectedByTab[activeTab] = null;
    }
    
    // Handle selection change from tree
    function handleSelectionChange(resource: NamedNode | BlankNode | null) {
        selectedByTab[activeTab] = resource;
    }
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
                            <UnderlineTabs.Trigger value={tab.id}>{tab.label}</UnderlineTabs.Trigger>
                        {/each}
                    </UnderlineTabs.List>
                </UnderlineTabs.Root>
            </div>
            
            <!-- Content area -->
            <div class="flex-1 min-h-0 p-4">
                <div class="grid grid-cols-2 gap-4 h-full">
                    <!-- Left: Resource hierarchy browser -->
                    <HierarchyTree
                        resourceType={currentTabConfig.resourceType}
                        hierarchyPredicate={currentTabConfig.hierarchyPredicate}
                        selected={selectedResource}
                        onselect={handleSelectionChange}
                        typeBadge={currentTabConfig.typeBadge}
                        emptyLabel={currentTabConfig.emptyLabel}
                        onadd={handleAddResource}
                        onaddchild={handleAddChildResource}
                        onremove={handleRemoveResource}
                    />
                    
                    <!-- Right: Detail panel with sections -->
                    <ResourceDetailPanel subject={selectedResource}>
                        {#if selectedResource}
                            <AnnotationSection 
                                subject={selectedResource}
                                onadd={openAddAnnotationDialog}
                                onaddvalue={openAddValueDialog}
                                onedit={openEditDialog}
                            />
                            <HierarchySection
                                subject={selectedResource}
                                predicate={currentTabConfig.hierarchyPredicate}
                                label={activeTab === 'classes' ? 'Superclasses' : 'Parent Properties'}
                                direction="outgoing"
                                onnavigate={handleSelectionChange}
                            />
                            <HierarchySection
                                subject={selectedResource}
                                predicate={currentTabConfig.hierarchyPredicate}
                                label={activeTab === 'classes' ? 'Subclasses' : 'Child Properties'}
                                direction="incoming"
                                onnavigate={handleSelectionChange}
                            />
                        {/if}
                    </ResourceDetailPanel>
                </div>
            </div>
        {/if}
    </main>
</div>

<!-- Add/Edit Annotation Dialog -->
{#if annotationSubject}
    <LiteralEditorDialog
        bind:open={showAnnotationDialog}
        subject={annotationSubject}
        predicate={annotationPredicate}
        existingValue={editingValue}
        onsubmit={() => { showAnnotationDialog = false; }}
        onclose={() => { showAnnotationDialog = false; }}
    />
{/if}

<!-- Create Resource Dialog (generic for current tab) -->
<CreateResourceDialog
    bind:open={showCreateDialog}
    resourceType={currentTabConfig.resourceType}
    parent={createParent}
    hierarchyPredicate={currentTabConfig.hierarchyPredicate}
    typeLabel={currentTabConfig.typeLabel}
    oncreate={handleResourceCreated}
/>


