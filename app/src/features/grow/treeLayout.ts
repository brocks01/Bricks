import type { TreeNode } from '../../api/nodes';

/**
 * Where the parts of the tree go in a 300 x 236 picture. Pure: nodes in, shapes out.
 *  - The trunk rises from the ground at the middle.
 *  - Every area (a top-level branch of the person's tree) is a branch, spread in a fan. Work that hangs straight under the root gets the middle branch.
 *  - Every counted node (goal, task, habit, event) below a branch is one leaf on it, in the order it was made. Closed = grown (green), anything else = not grown yet.
 *  - A branch shows at most MAX_PER_BRANCH leaves and the whole tree at most MAX_LEAVES, so a very busy tree stays a picture and not a smear; the green ones are kept first.
 */
export const MAX_PER_BRANCH = 16;
export const MAX_LEAVES = 64;
const COUNTED = ['goal', 'task', 'habit', 'event'];

export interface Branch { key: string; d: string; width: number }
export interface LeafShape { key: string; x: number; y: number; rot: number; grown: boolean }
export interface TreeShapes { trunk: string; branches: Branch[]; leaves: LeafShape[]; shown: number; total: number }

const TRUNK_TOP = { x: 150, y: 128 };

export function layoutTree(nodes: TreeNode[]): TreeShapes {
  const trunk = `M150 230 C150 200 148 160 ${TRUNK_TOP.x} ${TRUNK_TOP.y}`;
  const root = nodes.find((n) => n.type === 'root');
  const areas = nodes.filter((n) => n.type === 'area' && n.parent_id === root?.nid);
  const work = nodes.filter((n) => COUNTED.includes(n.type));
  const branchOf = (n: TreeNode) => areas.find((a) => n.path.includes(a.nid))?.nid ?? 'root';
  const groups = new Map<string, TreeNode[]>();
  for (const a of areas) groups.set(a.nid, []);
  for (const n of work) {
    const k = branchOf(n);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(n);
  }
  // The middle branch is for work with no area; it exists only when there is some.
  const keys = [...groups.keys()].filter((k) => k !== 'root' || (groups.get('root')?.length ?? 0) > 0);
  const branches: Branch[] = [];
  const leaves: LeafShape[] = [];
  let budget = MAX_LEAVES;
  const spread = keys.length <= 1 ? [16] : keys.length === 2 ? [-34, 34] : keys.map((_, i) => -58 + (116 * i) / (keys.length - 1));
  keys.forEach((k, bi) => {
    const a = (spread[bi] * Math.PI) / 180;
    const len = 96 + (bi % 2) * 12;
    const end = { x: TRUNK_TOP.x + Math.sin(a) * len, y: TRUNK_TOP.y - Math.cos(a) * len + 8 };
    const ctrl = { x: TRUNK_TOP.x + Math.sin(a) * len * 0.35, y: TRUNK_TOP.y - Math.cos(a) * len * 0.75 };
    branches.push({ key: k, d: `M${TRUNK_TOP.x} ${TRUNK_TOP.y + 6} Q${ctrl.x.toFixed(1)} ${ctrl.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`, width: 3.4 });
    const mine = [...(groups.get(k) ?? [])].sort((x, y) => Number(y.status === 'closed') - Number(x.status === 'closed')).slice(0, Math.min(MAX_PER_BRANCH, budget));
    budget -= mine.length;
    mine.forEach((n, i) => {
      const t = (i + 1) / (mine.length + 1);
      // a point on the curve, then a nudge to alternate sides so the leaves sit on both sides of the branch
      const x = (1 - t) * (1 - t) * TRUNK_TOP.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x;
      const y = (1 - t) * (1 - t) * (TRUNK_TOP.y + 6) + 2 * (1 - t) * t * ctrl.y + t * t * end.y;
      const side = i % 2 === 0 ? 1 : -1;
      const along = (Math.atan2(end.y - ctrl.y, end.x - ctrl.x) * 180) / Math.PI;
      leaves.push({ key: n.nid, x: x + side * 4, y: y + (side > 0 ? -3 : 3), rot: along + side * 38, grown: n.status === 'closed' });
    });
  });
  return { trunk, branches, leaves, shown: leaves.length, total: work.length };
}
