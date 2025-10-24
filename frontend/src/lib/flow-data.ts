import type { Node, Edge } from '@xyflow/svelte';

// Define the initial nodes
export const initialNodes: Node[] = [
  {
    id: '0',
    type: 'input',
    data: { label: 'Hello' },
    position: { x: -100, y: 200 }
  },
  {
    id: '1',
    type: 'default',
    data: { label: 'World!' },
    position: { x: 60, y: 300 }
  },
  {
    id: '3',
    type: 'card',
    data: {
      title: 'Custom node',
      description: 'Use custom node types to present richer flow content.',
      content: 'Custom node content'
    },
    position: { x: 240, y: 200 }
  }
];

// Define the initial edges
export const initialEdges: Edge[] = [
  {
    id: '0-1',
    type: 'default',
    source: '0',
    target: '1',
    label: 'EDGE!',
    animated: true
  },
  {
    id: '1-card-1',
    type: 'default',
    source: '1',
    target: 'card-1',
    label: 'custom card'
  }
];