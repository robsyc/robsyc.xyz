import CardNode from './CardNode.svelte';
import AgentNode from './AgentNode.svelte';

// Export all custom node components
export {
  CardNode,
  AgentNode
};

// Export a nodeTypes object for easy use with SvelteFlow
export const nodeTypes = {
  card: CardNode,
  agent: AgentNode
}; 