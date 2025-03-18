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
      message: [
        "Hello! I am robsyc's agent :)\nWelcome to my site!",
        "Would you like to be shown around?",
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
      ]
    },
    position: { x: -150, y: 0 }
  },
  {
    id: '1',
    type: 'input',
    data: { label: 'Hello' },
    position: { x: -100, y: 200 }
  },
  {
    id: '2',
    type: 'default',
    data: { label: 'World!' },
    position: { x: 60, y: 300 }
  },
  // {
  //   id: '3',
  //   type: 'card',
  //   data: { 
  //     label: 'Card Node',
  //     description: 'This is our first custom node!'
  //   },
  //   position: { x: 400, y: 150 }
  // }
];

// Define the initial edges
export const initialEdges: Edge[] = [
  {
    id: '1-2',
    type: 'default',
    source: '1',
    target: '2',
    label: 'EDGE!',
    animated: true
  },
  // {
  //   id: '1-3',
  //   type: 'default',
  //   source: '1',
  //   target: '3',
  //   label: 'EDGE'
  // }
];