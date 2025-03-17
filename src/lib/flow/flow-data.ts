import type { Node, Edge } from '@xyflow/svelte';
import type { CustomNode } from './types';

// Define the initial nodes
export const initialNodes: CustomNode[] = [
  {
    id: '0',
    type: 'agent',
    data: { 
      name: 'robsyc',
      avatarSrc: '/assets/pf.jpg',
      initials: 'RC',
      message: `Hello! I am an robsyc's agent.
      Welcome to my site!
      Would you like for me to show you around?
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`
    },
    position: { x: -200, y: 0 }
  },
  {
    id: '1',
    type: 'input',
    data: { label: 'Input Node' },
    position: { x: 200, y: 0 }
  },
  {
    id: '2',
    type: 'default',
    data: { label: 'Default Node' },
    position: { x: 200, y: 150 }
  },
  {
    id: '3',
    type: 'card',
    data: { 
      label: 'Card Node',
      description: 'This is our first custom node!'
    },
    position: { x: 400, y: 150 }
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
  },
  {
    id: '1-3',
    type: 'default',
    source: '1',
    target: '3',
    label: 'EDGE'
  }
];