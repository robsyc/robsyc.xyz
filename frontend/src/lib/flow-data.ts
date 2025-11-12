import type { Node, Edge } from '@xyflow/svelte';

// Define the initial nodes
export const initialNodes: Node[] = [
  // {
  //   id: '0',
  //   type: 'input',
  //   data: { label: 'Hello' },
  //   position: { x: -100, y: 200 }
  // },
  // {
  //   id: '1',
  //   type: 'default',
  //   data: { label: 'World!' },
  //   position: { x: 60, y: 300 }
  // },
  {
    id: '3',
    type: 'blog',
    data: {
      title: 'Blog Post',
      tags: ['Svelte', 'Tailwind', 'Flow'],
      date: '2025-01-01', 
      description: 'This is a blog post about the blog node types.',
      content: 'Blog node types are a powerful way to present richer flow content.\n\n # Title\n\nPretty cool to write `code` in markdown. or even more code in code blocks.\n\n```javascript\nconst x = 1;\nconsole.log(x);\n```'
    },
    position: { x: 0, y: 0 }
  }
];

// Define the initial edges
export const initialEdges: Edge[] = [
  // {
  //   id: '0-1',
  //   type: 'default',
  //   source: '0',
  //   target: '1',
  //   label: 'EDGE!',
  //   animated: true
  // },
  // {
  //   id: '1-card-1',
  //   type: 'default',
  //   source: '1',
  //   target: 'card-1',
  //   label: 'custom card'
  // }
];