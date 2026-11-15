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
  badge?: { value: number | null; label: string; status: string }; // for a habit, `value` is how steady it is (0 to 1)
}

export interface Tree {
  nodes: TreeNode[];
  truncated: boolean;
  leaves: number; // closed work: the green leaves
  growing: number; // work still open: leaves that have not grown yet
  level: number; // every 10 leaves
  habits: Habit[];
  roots: { strength: number; moved_days: number; walks: number }; // the person's health over the last four weeks
}

export interface Habit { nid: string; title: string; kind: 'daily' | 'weekly'; strength: number; streak: number; done_today: boolean }

export const getTree = () => api<Tree>('GET', '/v1/nodes/tree');

export const addGoal = (title: string) => api<TreeNode>('POST', '/v1/nodes/goal', { title });
export const addStep = (goalNid: string, title: string) => api<TreeNode>('POST', '/v1/nodes', { type: 'task', title, parent_id: goalNid });
export const setStatus = (nid: string, status: 'open' | 'closed') => api<{ ignored: boolean }>('POST', `/v1/nodes/${nid}/badge`, { badge: { status } });
export const archiveNode = (nid: string) => api<{ archived: number }>('POST', `/v1/nodes/${nid}/archive`);
export const addHabit = (title: string, kind: 'daily' | 'weekly') => api<TreeNode>('POST', '/v1/nodes/habit', { title, kind });
export const logHabit = (nid: string, undo = false) => api<{ nid: string; strength: number; streak: number; done_today: boolean }>('POST', `/v1/nodes/${nid}/log`, { undo });
