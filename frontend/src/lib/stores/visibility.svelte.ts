/**
 * Visibility Store for Progressive Node Rendering
 * 
 * Manages which nodes and edges are visible on the SvelteFlow canvas.
 * Supports:
 * - Progressive disclosure: start with initial nodes only
 * - Expand/collapse: toggle children visibility via hierarchy edges
 * - Lock: keep specific nodes visible regardless of collapse actions
 */

import type { Node, Edge } from '@xyflow/svelte';

export interface VisibilityState {
    visibleNodes: Set<string>;
    visibleEdges: Set<string>;
    lockedNodes: Set<string>;
    expandedNodes: Set<string>; // Nodes whose children are visible
}

/**
 * Create a visibility store with reactive state
 */
export function createVisibilityStore() {
    // Reactive state using Svelte 5 runes
    let visibleNodes = $state(new Set<string>());
    let visibleEdges = $state(new Set<string>());
    let lockedNodes = $state(new Set<string>());
    let expandedNodes = $state(new Set<string>());
    
    // Version counter - increments on every visibility mutation
    // Used by page components to react to visibility changes
    let visibilityVersion = $state(0);
    
    // All nodes/edges in the graph (for reference)
    let allNodes = $state<Node[]>([]);
    let allEdges = $state<Edge[]>([]);
    
    // Edge lookup: nodeId -> { parentEdges, childEdges }
    let edgeIndex = $state<Map<string, { parentEdges: Edge[]; childEdges: Edge[] }>>(new Map());
    
    /**
     * Build edge index for fast lookups
     */
    function buildEdgeIndex(edges: Edge[]) {
        const index = new Map<string, { parentEdges: Edge[]; childEdges: Edge[] }>();
        
        for (const edge of edges) {
            // Initialize if needed
            if (!index.has(edge.source)) {
                index.set(edge.source, { parentEdges: [], childEdges: [] });
            }
            if (!index.has(edge.target)) {
                index.set(edge.target, { parentEdges: [], childEdges: [] });
            }
            
            // For hierarchy edges (subClassOf, broader), the source is the parent
            // The edge flows from parent (source) to child (target)
            // So target's parentEdges include this edge, source's childEdges include this edge
            index.get(edge.target)!.parentEdges.push(edge);
            index.get(edge.source)!.childEdges.push(edge);
        }
        
        return index;
    }
    
    /**
     * Initialize the store with all nodes/edges and show only root nodes
     */
    function initWithRoots(nodes: Node[], edges: Edge[], rootNodeIds: string[]) {
        allNodes = nodes;
        allEdges = edges;
        edgeIndex = buildEdgeIndex(edges);
        
        // Clear state
        visibleNodes = new Set(rootNodeIds);
        visibleEdges = new Set();
        lockedNodes = new Set();
        expandedNodes = new Set();
        
        // Update edge visibility
        updateEdgeVisibility();
    }
    
    /**
     * Initialize showing all nodes (for when progressive rendering is disabled)
     */
    function initShowAll(nodes: Node[], edges: Edge[]) {
        allNodes = nodes;
        allEdges = edges;
        edgeIndex = buildEdgeIndex(edges);
        
        visibleNodes = new Set(nodes.map(n => n.id));
        visibleEdges = new Set(edges.map(e => e.id));
        lockedNodes = new Set();
        expandedNodes = new Set(nodes.map(n => n.id)); // All expanded
    }
    
    /**
     * Update edge visibility based on which nodes are visible
     * An edge is visible only if both source and target are visible
     */
    function updateEdgeVisibility() {
        const newVisibleEdges = new Set<string>();
        
        for (const edge of allEdges) {
            if (visibleNodes.has(edge.source) && visibleNodes.has(edge.target)) {
                newVisibleEdges.add(edge.id);
            }
        }
        
        visibleEdges = newVisibleEdges;
    }
    
    /**
     * Expand a node: show its children
     */
    function expandNode(nodeId: string) {
        const nodeEdges = edgeIndex.get(nodeId);
        if (!nodeEdges) return;
        
        // Add child nodes to visible set
        for (const edge of nodeEdges.childEdges) {
            visibleNodes.add(edge.target);
        }
        
        expandedNodes.add(nodeId);
        visibleNodes = new Set(visibleNodes); // Trigger reactivity
        updateEdgeVisibility();
        visibilityVersion++; // Signal visibility change
    }
    
    /**
     * Collapse a node: hide its children (unless locked)
     */
    function collapseNode(nodeId: string) {
        const nodeEdges = edgeIndex.get(nodeId);
        if (!nodeEdges) return;
        
        // Collect nodes to potentially hide
        const nodesToHide = new Set<string>();
        
        for (const edge of nodeEdges.childEdges) {
            const childId = edge.target;
            
            // Don't hide locked nodes
            if (lockedNodes.has(childId)) continue;
            
            // Check if child has other visible parents
            const childEdges = edgeIndex.get(childId);
            if (childEdges) {
                const hasOtherVisibleParent = childEdges.parentEdges.some(
                    e => e.source !== nodeId && visibleNodes.has(e.source) && expandedNodes.has(e.source)
                );
                if (hasOtherVisibleParent) continue;
            }
            
            nodesToHide.add(childId);
            
            // Recursively collapse children of this node
            collapseDescendants(childId, nodesToHide);
        }
        
        // Remove nodes from visible set
        for (const id of nodesToHide) {
            visibleNodes.delete(id);
            expandedNodes.delete(id);
        }
        
        expandedNodes.delete(nodeId);
        visibleNodes = new Set(visibleNodes); // Trigger reactivity
        expandedNodes = new Set(expandedNodes);
        updateEdgeVisibility();
        visibilityVersion++; // Signal visibility change
    }
    
    /**
     * Recursively collect descendants to hide
     */
    function collapseDescendants(nodeId: string, nodesToHide: Set<string>) {
        const nodeEdges = edgeIndex.get(nodeId);
        if (!nodeEdges) return;
        
        for (const edge of nodeEdges.childEdges) {
            const childId = edge.target;
            
            if (lockedNodes.has(childId) || nodesToHide.has(childId)) continue;
            
            nodesToHide.add(childId);
            collapseDescendants(childId, nodesToHide);
        }
    }
    
    /**
     * Toggle node expansion
     */
    function toggleNode(nodeId: string) {
        if (expandedNodes.has(nodeId)) {
            collapseNode(nodeId);
        } else {
            expandNode(nodeId);
        }
    }
    
    /**
     * Toggle node lock status
     */
    function toggleLock(nodeId: string) {
        if (lockedNodes.has(nodeId)) {
            lockedNodes.delete(nodeId);
        } else {
            lockedNodes.add(nodeId);
        }
        lockedNodes = new Set(lockedNodes); // Trigger reactivity
    }
    
    /**
     * Show a specific node (and optionally its parents)
     */
    function showNode(nodeId: string, showParents = false) {
        visibleNodes.add(nodeId);
        
        if (showParents) {
            const nodeEdges = edgeIndex.get(nodeId);
            if (nodeEdges) {
                for (const edge of nodeEdges.parentEdges) {
                    visibleNodes.add(edge.source);
                }
            }
        }
        
        visibleNodes = new Set(visibleNodes);
        updateEdgeVisibility();
        visibilityVersion++; // Signal visibility change
    }
    
    /**
     * Hide a specific node (unless locked)
     */
    function hideNode(nodeId: string) {
        if (lockedNodes.has(nodeId)) return;
        
        visibleNodes.delete(nodeId);
        visibleNodes = new Set(visibleNodes);
        updateEdgeVisibility();
        visibilityVersion++; // Signal visibility change
    }
    
    /**
     * Check if a node is visible
     */
    function isVisible(nodeId: string): boolean {
        return visibleNodes.has(nodeId);
    }
    
    /**
     * Check if a node is expanded
     */
    function isExpanded(nodeId: string): boolean {
        return expandedNodes.has(nodeId);
    }
    
    /**
     * Check if a node is locked
     */
    function isLocked(nodeId: string): boolean {
        return lockedNodes.has(nodeId);
    }
    
    /**
     * Check if a node has children that can be expanded
     */
    function hasChildren(nodeId: string): boolean {
        const nodeEdges = edgeIndex.get(nodeId);
        return nodeEdges ? nodeEdges.childEdges.length > 0 : false;
    }
    
    /**
     * Check if a node has visible children
     */
    function hasVisibleChildren(nodeId: string): boolean {
        const nodeEdges = edgeIndex.get(nodeId);
        if (!nodeEdges) return false;
        
        return nodeEdges.childEdges.some(e => visibleNodes.has(e.target));
    }
    
    /**
     * Get filtered nodes based on visibility
     */
    function getVisibleNodes(): Node[] {
        return allNodes.filter(n => visibleNodes.has(n.id));
    }
    
    /**
     * Get filtered edges based on visibility
     */
    function getVisibleEdges(): Edge[] {
        return allEdges.filter(e => visibleEdges.has(e.id));
    }
    
    return {
        // State getters (reactive)
        get visibleNodes() { return visibleNodes; },
        get visibleEdges() { return visibleEdges; },
        get lockedNodes() { return lockedNodes; },
        get expandedNodes() { return expandedNodes; },
        get allNodes() { return allNodes; },
        get allEdges() { return allEdges; },
        get visibilityVersion() { return visibilityVersion; },
        
        // Initialization
        initWithRoots,
        initShowAll,
        
        // Node visibility actions
        expandNode,
        collapseNode,
        toggleNode,
        toggleLock,
        showNode,
        hideNode,
        
        // Query methods
        isVisible,
        isExpanded,
        isLocked,
        hasChildren,
        hasVisibleChildren,
        getVisibleNodes,
        getVisibleEdges,
    };
}

// Singleton instance
export const visibilityStore = createVisibilityStore();
