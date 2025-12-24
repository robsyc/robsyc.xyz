<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import type { Snippet } from 'svelte';
    import { SvelteSet } from 'svelte/reactivity';
    import { Plus, GitBranchPlus, X, Search } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
    import { getRdfContext } from '../context';
    import TreeNode from './TreeNode.svelte';
    import { buildTreeNodes, getParents, getAncestors, type TreeNode as TreeNodeType } from '$lib/rdf/queries';
    import { toCompactIri } from '$lib/rdf/namespaces';
    import { createExpandableSet } from '$lib/utils/expandable.svelte';
    import { createDebounced } from '$lib/utils/debounce.svelte';

    interface Props {
        /** The rdf:type to browse (e.g., ns.rdfs('Class')) */
        resourceType: NamedNode;
        /** Property that defines parent-child (e.g., rdfs:subClassOf) */
        hierarchyPredicate?: NamedNode | null;
        /** Currently selected resource (primary selection for detail panel) */
        selected?: NamedNode | BlankNode | null;
        /** Check if a node is selected (supports multi-select highlighting) */
        isSelected?: (node: NamedNode | BlankNode) => boolean;
        /** Callback when selection changes (single click) */
        onselect?: (node: NamedNode | BlankNode | null) => void;
        /** Callback for shift+click multi-select toggle */
        ontoggle?: (resource: NamedNode | BlankNode) => void;
        /** Number of selected items (for Remove button label) */
        selectionCount?: number;
        /** Optional: custom node rendering */
        nodeContent?: Snippet<[{ node: NamedNode | BlankNode; label: string; depth: number }]>;
        /** Label for empty state */
        emptyLabel?: string;
        /** Type badge text */
        typeBadge?: string;
        /** Show toolbar actions */
        showToolbar?: boolean;
        /** Show search filter */
        showSearch?: boolean;
        /** Compact mode (less padding, smaller text) */
        compact?: boolean;
        /** Callback for adding a new resource */
        onadd?: (parent: NamedNode | BlankNode | null) => void;
        /** Callback for adding a child resource */
        onaddchild?: (parent: NamedNode | BlankNode) => void;
        /** Callback for removing resource(s) */
        onremove?: (resource: NamedNode | BlankNode) => void;
    }

    let {
        resourceType,
        hierarchyPredicate = null,
        selected = $bindable(null),
        isSelected: isSelectedProp,
        onselect,
        ontoggle,
        selectionCount = 0,
        nodeContent,
        emptyLabel = 'No resources found',
        typeBadge,
        showToolbar = true,
        showSearch = true,
        compact = false,
        onadd,
        onaddchild,
        onremove,
    }: Props = $props();

    const ctx = getRdfContext();
    const store = ctx.store;

    // Track manually expanded nodes
    const expanded = createExpandableSet();
    let searchQuery = $state('');
    
    // Debounce search query for performance (150ms delay)
    const debouncedSearch = createDebounced(() => searchQuery, 150);

    // Build tree reactively
    const treeNodes = $derived(buildTreeNodes(store, resourceType, hierarchyPredicate));
    const badge = $derived(typeBadge ?? toCompactIri(resourceType.value));
    
    // Get parent of selected node (for sibling creation)
    const selectedParent = $derived.by(() => {
        if (!selected || !hierarchyPredicate) return null;
        const parents = getParents(store, selected, hierarchyPredicate);
        return parents.length > 0 ? parents[0] : null;
    });
    
    const selectedAncestors = $derived.by(() => {
        if (!selected || !hierarchyPredicate) return null;
        return getAncestors(store, selected, hierarchyPredicate);
    });
    
    // Auto-expand ancestors of the current selection (without mutating manual expand state)
    const autoExpanded = $derived(selectedAncestors ?? new Set<string>());
    
    // Normalized search query (uses debounced value for filtering)
    const query = $derived(debouncedSearch.current.trim().toLowerCase());
    
    // Build set of node IDs that match search or have matching descendants
    function getMatchingIds(nodes: TreeNodeType[], q: string): SvelteSet<string> {
        const matches = new SvelteSet<string>();
        
        function check(node: TreeNodeType): boolean {
            const selfMatches = node.label.toLowerCase().includes(q);
            const childMatches = node.children.some(c => check(c));
            if (selfMatches || childMatches) {
                matches.add(node.term.value);
            }
            return selfMatches || childMatches;
        }
        
        nodes.forEach(check);
        return matches;
    }
    
    const matchingIds = $derived(query ? getMatchingIds(treeNodes, query) : new SvelteSet<string>());
    
    // Check if node directly matches search
    function nodeMatches(node: TreeNodeType): boolean {
        return query !== '' && node.label.toLowerCase().includes(query);
    }
    
    // Check if node has a matching descendant
    function hasMatchingDescendant(node: TreeNodeType): boolean {
        return node.children.some(c => matchingIds.has(c.term.value));
    }
    
    // Node is expanded if: manually expanded OR (searching and has matching descendants)
    function isNodeExpanded(node: TreeNodeType): boolean {
        if (expanded.has(node.term.value)) return true;
        if (autoExpanded.has(node.term.value)) return true;
        if (query && hasMatchingDescendant(node)) return true;
        return false;
    }
    
    // Node is visible if: not searching OR (matches or has matching descendants)
    function isVisible(node: TreeNodeType): boolean {
        return !query || matchingIds.has(node.term.value);
    }

    /**
     * Handle node click.
     * - Regular click: single selection
     * - Shift+click: toggle multi-selection (if ontoggle provided)
     */
    function handleNodeClick(node: NamedNode | BlankNode, event: MouseEvent) {
        if (event.shiftKey && ontoggle) {
            // Multi-select: toggle this node
            ontoggle(node);
        } else {
            // Single-select: set as only selected
            selected = node;
            onselect?.(node);
        }
    }

    /**
     * Check if a node is selected.
     * Uses the isSelected prop callback if provided (for multi-select support),
     * otherwise falls back to comparing with the selected prop.
     */
    function checkSelected(node: NamedNode | BlankNode): boolean {
        if (isSelectedProp) {
            return isSelectedProp(node);
        }
        return selected?.value === node.value;
    }
    
    // Handle add: creates sibling of selected (same parent), or top-level if nothing selected
    function handleAdd() {
        onadd?.(selectedParent);
    }
</script>

<div class="flex flex-col h-full border rounded-lg overflow-hidden">
    <!-- Header with badge, search, and toolbar -->
    <div class="p-2 border-b bg-muted/30 space-y-2 shrink-0">
        <div class="flex items-center justify-between">
            <Badge variant="secondary" class="text-xs">{badge}</Badge>
            {#if showToolbar}
                <div class="flex items-center gap-1">
                    {#if onadd}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            class="h-6 w-6" 
                            onclick={handleAdd} 
                            title={selected ? "Add sibling" : "Add new"}
                        >
                            <Plus class="h-3.5 w-3.5" />
                        </Button>
                    {/if}
                    {#if onaddchild && selected && hierarchyPredicate}
                        <Button variant="ghost" size="icon" class="h-6 w-6" onclick={() => onaddchild?.(selected!)} title="Add child">
                            <GitBranchPlus class="h-3.5 w-3.5" />
                        </Button>
                    {/if}
                    {#if onremove && selected}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            class="h-6 w-6" 
                            onclick={() => onremove?.(selected!)} 
                            title={selectionCount > 1 ? `Remove ${selectionCount} selected` : "Remove"}
                        >
                            <X class="h-3.5 w-3.5" />
                        </Button>
                    {/if}
                </div>
            {/if}
        </div>
        {#if showSearch}
            <div class="relative">
                <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search..."
                    class="w-full h-7 pl-7 pr-2 text-xs rounded border bg-background"
                    bind:value={searchQuery}
                />
            </div>
        {/if}
    </div>
    
    <!-- Tree content -->
    <ScrollArea class="flex-1">
        <div class="p-1.5">
            {#if treeNodes.length === 0}
                <p class="text-xs text-muted-foreground text-center py-3">{emptyLabel}</p>
            {:else}
                {#each treeNodes as node (node.term.value)}
                    <TreeNode
                        {node}
                        depth={0}
                        isExpanded={isNodeExpanded(node)}
                        isVisible={isVisible(node)}
                        matchesSearch={nodeMatches(node)}
                        isSelected={checkSelected(node.term)}
                        {compact}
                        onexpandtoggle={(id) => expanded.toggle(id)}
                        onnodeclick={handleNodeClick}
                        checkExpanded={isNodeExpanded}
                        checkVisible={isVisible}
                        checkMatchesSearch={nodeMatches}
                        {checkSelected}
                        {nodeContent}
                    />
                {/each}
                {#if query && matchingIds.size === 0}
                    <p class="text-xs text-muted-foreground text-center py-3">No matches</p>
                {/if}
            {/if}
        </div>
    </ScrollArea>
</div>
