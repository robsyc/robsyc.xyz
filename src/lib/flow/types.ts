import type { Node, Edge } from '@xyflow/svelte';

// Custom node data types
export interface CardNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
}

// Agent node data type
export interface AgentNodeData extends Record<string, unknown> {
  name: string;
  initials: string;
  avatarSrc?: string;
  message: string;
}

// Extended node type with our custom node types
export type CustomNode = Node<CardNodeData | AgentNodeData>;

// Re-export the Edge type for convenience
export type { Edge }; 