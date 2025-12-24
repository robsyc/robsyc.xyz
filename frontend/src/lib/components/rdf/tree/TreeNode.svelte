<script lang="ts">
    import type { NamedNode, BlankNode } from 'n3';
    import type { Snippet } from 'svelte';
    import { ChevronRight, ChevronDown } from '@lucide/svelte';
    import { IriTooltip } from '../shared';
    import type { TreeNode as TreeNodeType } from '$lib/rdf/queries';
    import TreeNode from './TreeNode.svelte';

    interface Props {
        /** The tree node to render */
        node: TreeNodeType;
        /** Depth for indentation */
        depth: number;
        /** Whether this node is expanded */
        isExpanded: boolean;
        /** Whether this node is visible (passes search filter) */
        isVisible: boolean;
        /** Whether this node matches the search query */
        matchesSearch: boolean;
        /** Whether this node is selected */
        isSelected: boolean;
        /** Compact mode (less padding, smaller text) */
        compact?: boolean;
        /** Callback to toggle expand state */
        onexpandtoggle: (nodeId: string) => void;
        /** Callback when node is clicked (receives MouseEvent for shift-click) */
        onnodeclick: (node: NamedNode | BlankNode, event: MouseEvent) => void;
        /** Check if a child node is expanded */
        checkExpanded: (node: TreeNodeType) => boolean;
        /** Check if a child node is visible */
        checkVisible: (node: TreeNodeType) => boolean;
        /** Check if a child node matches search */
        checkMatchesSearch: (node: TreeNodeType) => boolean;
        /** Check if a child node is selected */
        checkSelected: (node: NamedNode | BlankNode) => boolean;
        /** Optional custom content snippet */
        nodeContent?: Snippet<[{ node: NamedNode | BlankNode; label: string; depth: number }]>;
    }

    let {
        node,
        depth,
        isExpanded,
        isVisible,
        matchesSearch,
        isSelected,
        compact = false,
        onexpandtoggle,
        onnodeclick,
        checkExpanded,
        checkVisible,
        checkMatchesSearch,
        checkSelected,
        nodeContent
    }: Props = $props();
</script>

{#if isVisible}
    <div class="flex flex-col">
        <div 
            class="flex items-center gap-0.5 rounded hover:bg-muted/50 transition-colors {matchesSearch && !isSelected ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}"
            class:bg-muted={isSelected}
            class:py-1={!compact}
            class:py-0.5={compact}
            style="padding-left: {depth * (compact ? 12 : 14) + 4}px"
        >
            <button
                type="button"
                class="p-0.5 hover:bg-muted rounded shrink-0"
                class:invisible={!node.hasChildren}
                onclick={(e) => { e.stopPropagation(); onexpandtoggle(node.term.value); }}
            >
                {#if isExpanded}
                    <ChevronDown class="h-3 w-3 text-muted-foreground" />
                {:else}
                    <ChevronRight class="h-3 w-3 text-muted-foreground" />
                {/if}
            </button>
            
            <IriTooltip
                term={node.term}
                class="flex-1 text-left min-w-0 truncate pr-2 {compact ? 'text-xs' : 'text-sm'}"
                onclick={(e: MouseEvent) => onnodeclick(node.term, e)}
            >
                {#if nodeContent}
                    {@render nodeContent({ node: node.term, label: node.label, depth })}
                {:else}
                    {node.label}
                {/if}
            </IriTooltip>
        </div>
        
        {#if node.hasChildren && isExpanded}
            {#each node.children as child (child.term.value)}
                <TreeNode
                    node={child}
                    depth={depth + 1}
                    isExpanded={checkExpanded(child)}
                    isVisible={checkVisible(child)}
                    matchesSearch={checkMatchesSearch(child)}
                    isSelected={checkSelected(child.term)}
                    {compact}
                    {onexpandtoggle}
                    {onnodeclick}
                    {checkExpanded}
                    {checkVisible}
                    {checkMatchesSearch}
                    {checkSelected}
                    {nodeContent}
                />
            {/each}
        {/if}
    </div>
{/if}
