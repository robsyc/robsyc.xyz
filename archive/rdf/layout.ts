/**
 * ELK Layout Integration for SvelteFlow
 * 
 * Uses elkjs to compute automatic tree layouts for RDF graph visualizations.
 * NOTE: in the future we may introduce other (force-directed) layouts
 */

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/svelte';

// ELK types
interface ElkNode {
    id: string;
    width: number;
    height: number;
    x?: number;
    y?: number;
}

interface ElkEdge {
    id: string;
    sources: string[];
    targets: string[];
}

interface ElkGraph {
    id: string;
    layoutOptions: Record<string, string>;
    children: ElkNode[];
    edges: ElkEdge[];
}

interface ElkLayoutResult {
    children?: Array<{ id: string; x?: number; y?: number }>;
}

/**
 * Layout options for ELK tree layout
 */
export interface LayoutOptions {
    nodeSpacing?: number;  // Horizontal spacing between sibling nodes
    layerSpacing?: number; // Vertical spacing between parent and child layers
}

/**
 * Default layout options tuned for type hierarchies
 */
export const defaultLayoutOptions: LayoutOptions = {
    nodeSpacing: 100,
    layerSpacing: 150,
};

/**
 * Default node dimensions by type
 */
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
    objectType: { width: 320, height: 140 },
    objectProperty: { width: 208, height: 160 },
    default: { width: 200, height: 100 },
};

/**
 * Get node dimensions based on type
 */
function getNodeDimensions(node: Node): { width: number; height: number } {
    const type = node.type ?? 'default';
    return NODE_DIMENSIONS[type] ?? NODE_DIMENSIONS.default;
}

/**
 * Build ELK layout options for tree layout
 */
function buildLayoutOptions(options?: LayoutOptions): Record<string, string> {
    const nodeSpacing = options?.nodeSpacing ?? defaultLayoutOptions.nodeSpacing ?? 100;
    const layerSpacing = options?.layerSpacing ?? defaultLayoutOptions.layerSpacing ?? 150;
    
    return {
        // Use mrtree algorithm - optimized for tree structures
        'elk.algorithm': 'mrtree',
        'elk.direction': 'DOWN',
        // Spacing configuration
        'elk.spacing.nodeNode': String(nodeSpacing),
        'elk.mrtree.spacing.nodeNode': String(nodeSpacing),
        // Compaction for better use of space
        'elk.mrtree.compaction': 'true',
    };
}

/**
 * Apply ELK tree layout to SvelteFlow nodes
 * 
 * @param nodes - SvelteFlow nodes to layout
 * @param edges - SvelteFlow edges for layout computation (only hierarchy edges affect layout)
 * @param options - Layout spacing options
 * @returns Promise with positioned nodes
 */
export async function layoutWithELK(
    nodes: Node[],
    edges: Edge[],
    options?: LayoutOptions
): Promise<Node[]> {
    if (nodes.length === 0) {
        return [];
    }
    
    const elk = new ELK();
    
    // Filter edges to only include hierarchy edges (vertical) for layout computation
    // This ensures domain/range edges don't affect the tree structure
    const hierarchyEdges = edges.filter(edge => {
        const edgeType = edge.data?.edgeType;
        return edgeType === 'subClassOf' || 
               edgeType === 'broader' || 
               edgeType === 'subPropertyOf' ||
               edgeType === 'targetClass';
    });
    
    // Build ELK graph
    const elkGraph: ElkGraph = {
        id: 'root',
        layoutOptions: buildLayoutOptions(options),
        children: nodes.map(node => {
            const dims = getNodeDimensions(node);
            return {
                id: node.id,
                width: dims.width,
                height: dims.height,
            };
        }),
        edges: hierarchyEdges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
        })),
    };
    
    try {
        const layouted = await elk.layout(elkGraph) as ElkLayoutResult;
        
        // Map positions back to nodes
        return nodes.map(node => {
            const elkNode = layouted.children?.find(n => n.id === node.id);
            if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
                return {
                    ...node,
                    position: { x: elkNode.x, y: elkNode.y },
                };
            }
            return node;
        });
    } catch (error) {
        console.error('[Layout] ELK layout failed:', error);
        // Return original nodes if layout fails
        return nodes;
    }
}

/**
 * Position a new child node relative to its parent
 * Used for incremental updates when expanding nodes
 */
export function positionChildNode(
    parentPos: { x: number; y: number },
    siblingIndex: number,
    siblingCount: number,
    options?: LayoutOptions
): { x: number; y: number } {
    const nodeSpacing = options?.nodeSpacing ?? defaultLayoutOptions.nodeSpacing ?? 100;
    const layerSpacing = options?.layerSpacing ?? defaultLayoutOptions.layerSpacing ?? 150;
    
    // Center children under parent with proper horizontal distribution
    const totalWidth = (siblingCount - 1) * (NODE_DIMENSIONS.objectType.width + nodeSpacing);
    const startX = parentPos.x - totalWidth / 2;
    const childX = startX + siblingIndex * (NODE_DIMENSIONS.objectType.width + nodeSpacing);
    
    return {
        x: childX,
        y: parentPos.y + layerSpacing + NODE_DIMENSIONS.objectType.height,
    };
}
