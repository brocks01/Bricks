import { api } from './client';

export type NodeType = 'root' | 'area' | 'goal' | 'task' | 'habit' | 'event' | 'metric';
export type NodeStatus = 'open' | 'active' | 'paused' | 'closed' | 'skipped' | 'blocked' | 'archived';

/** One card of the person's tree. `counts` are everything below it, by status. */
export interface TreeNode {
  nid: string;
  type: NodeType;
  kind: string;
  title: string;
  parent_id: string;
  path: string[];
  depth: number;
  order: number;
  status: NodeStatus;
  progress: number;
  key: string;
  counts: { open?: number; active?: number; blocked?: number; paused?: number; closed?: number };
}

export interface Tree {
  nodes: TreeNode[];
  truncated: boolean;
  leaves: number; // closed work: the green leaves
  growing: number; // work still open: leaves that have not grown yet
}

export const getTree = () => api<Tree>('GET', '/v1/nodes/tree');
