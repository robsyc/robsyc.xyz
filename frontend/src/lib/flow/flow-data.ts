import type { Node, Edge } from '@xyflow/svelte';
// import type { CustomNode } from './types';

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
];