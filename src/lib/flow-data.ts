import type { Node, Edge } from '@xyflow/svelte';

// Define the initial nodes
export const initialNodes: Node[] = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 0, y: 0 }
  },
  {
    id: '2',
    type: 'default',
    data: { label: 'Node' },
    position: { x: 0, y: 150 }
  }
];

// Define the initial edges
export const initialEdges: Edge[] = [
  {
    id: '1-2',
    type: 'default',
    source: '1',
    target: '2',
    label: 'Edge Text'
  }
];