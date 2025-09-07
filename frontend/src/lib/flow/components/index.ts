import CardNode from './CardNode.svelte';

// Export all custom node components
export {
  CardNode,
};

// Export a nodeTypes object for easy use with SvelteFlow
export const nodeTypes = {
  card: CardNode,
}; 