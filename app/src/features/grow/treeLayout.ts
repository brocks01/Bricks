import type { TreeNode } from '../../api/nodes';

/**
 * Where the parts of the tree go in a 300 x 300 picture (the ground is at y = 210). Pure: nodes in, shapes out.
 *  - The trunk rises from the ground; it gets thicker with the level and with how steady the person's habits are.
 *  - Every area (a top-level branch of the person's tree) is a branch, spread in a fan. Work that hangs straight under the root gets the middle branch.
 *    A branch is thicker the steadier the habits on it are (a habit's strength is its `badge.value`, 0 to 1): repeating something strengthens the stem.
 *  - Every counted node (goal, task, habit, event) below a branch is one leaf on it, in the order it was made. Closed = grown (green), anything else = not grown yet.
 *  - From level 2 a busy branch (six leaves or more) puts out a twig, so a higher tree is fuller. The tree also gets taller with the level.
 *  - Under the ground are the roots: the person's health. More days moved and more walks make more, longer and thicker roots.
 *  - A branch shows at most MAX_PER_BRANCH leaves and the whole tree at most MAX_LEAVES, so a very busy tree stays a picture; green ones are kept first.
 */
export const MAX_PER_BRANCH = 16;
export const MAX_LEAVES = 64;
export const GROUND = 210;
const COUNTED = ['goal', 'task', 'habit', 'event'];

export interface Branch { key: string; d: string; width: number }
export interface LeafShape { key: string; x: number; y: number; rot: number; grown: boolean; stem: string }
export interface RootShape { key: string; d: string; width: number }
export interface TreeShapes { trunk: string; trunkWidth: number; branches: Branch[]; leaves: LeafShape[]; roots: RootShape[]; shown: number; total: number }
export interface TreeOptions { level?: number; roots?: number }

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const pt = (t: number, p0: [number, number], c: [number, number], p1: [number, number]): [number, number] => [
  (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
  (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
];
const f = (n: number) => n.toFixed(1);

export function layoutTree(nodes: TreeNode[], opts: TreeOptions = {}): TreeShapes {
  const level = Math.max(1, Math.floor(opts.level ?? 1));
  const grow = 1 + Math.min(0.3, (level - 1) * 0.06); // a higher tree is taller
  const top: [number, number] = [150, GROUND - 82 * grow];
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
  // How steady the habits on each branch are: the average of their figures. No habits, no extra thickness.
  const steadiness = (k: string) => {
    const hs = (groups.get(k) ?? []).filter((n) => n.type === 'habit');
    return hs.length ? clamp01(hs.reduce((s, h) => s + (h.badge?.value ?? 0), 0) / hs.length) : 0;
  };
  const all = work.filter((n) => n.type === 'habit');
  const overall = all.length ? clamp01(all.reduce((s, h) => s + (h.badge?.value ?? 0), 0) / all.length) : 0;
  const trunkWidth = 6 + Math.min(5, level - 1) + overall * 3;
  const trunk = `M150 ${GROUND} C150 ${GROUND - 30} 148 ${GROUND - 70 * grow} ${top[0]} ${f(top[1])}`;

  // The middle branch is for work with no area; it exists only when there is some.
  const keys = [...groups.keys()].filter((k) => k !== 'root' || (groups.get('root')?.length ?? 0) > 0);
  const branches: Branch[] = [];
  const leaves: LeafShape[] = [];
  let budget = MAX_LEAVES;
  const spread = keys.length <= 1 ? [16] : keys.length === 2 ? [-34, 34] : keys.map((_, i) => -58 + (116 * i) / (keys.length - 1));

  const place = (key: string, list: TreeNode[], p0: [number, number], c: [number, number], p1: [number, number], flip: number) => {
    list.forEach((n, i) => {
      const t = (i + 1) / (list.length + 1);
      const [x, y] = pt(t, p0, c, p1);
      const side = (i % 2 === 0 ? 1 : -1) * flip;
      const along = (Math.atan2(p1[1] - c[1], p1[0] - c[0]) * 180) / Math.PI;
      const lx = x + side * 5;
      const ly = y + (side > 0 ? -3 : 3);
      leaves.push({ key: n.nid, x: lx, y: ly, rot: along + side * 38, grown: n.status === 'closed', stem: `M${f(x)} ${f(y)} L${f(lx)} ${f(ly)}` });
    });
    void key;
  };

  keys.forEach((k, bi) => {
    const a = (spread[bi] * Math.PI) / 180;
    const len = (96 + (bi % 2) * 12) * grow;
    const p0: [number, number] = [top[0], top[1] + 6];
    const end: [number, number] = [top[0] + Math.sin(a) * len, top[1] - Math.cos(a) * len + 8];
    const ctrl: [number, number] = [top[0] + Math.sin(a) * len * 0.35, top[1] - Math.cos(a) * len * 0.75];
    branches.push({ key: k, d: `M${p0[0]} ${f(p0[1])} Q${f(ctrl[0])} ${f(ctrl[1])} ${f(end[0])} ${f(end[1])}`, width: 2.6 + steadiness(k) * 5 });
    const mine = [...(groups.get(k) ?? [])].sort((x, y) => Number(y.status === 'closed') - Number(x.status === 'closed')).slice(0, Math.min(MAX_PER_BRANCH, budget));
    budget -= mine.length;
    // From level 2 a busy branch puts out a twig, and every third leaf hangs on it.
    const twigged = level >= 2 && mine.length >= 6;
    const onTwig = twigged ? mine.filter((_, i) => i % 3 === 2) : [];
    const onBranch = twigged ? mine.filter((_, i) => i % 3 !== 2) : mine;
    place(k, onBranch, p0, ctrl, end, 1);
    if (twigged) {
      const t0 = 0.45;
      const s0 = pt(t0, p0, ctrl, end);
      const dir = bi % 2 === 0 ? 1 : -1;
      const te: [number, number] = [s0[0] + dir * 38, s0[1] - 30];
      const tc: [number, number] = [s0[0] + dir * 12, s0[1] - 22];
      branches.push({ key: `${k}:twig`, d: `M${f(s0[0])} ${f(s0[1])} Q${f(tc[0])} ${f(tc[1])} ${f(te[0])} ${f(te[1])}`, width: 1.8 + steadiness(k) * 2.5 });
      place(`${k}:twig`, onTwig, s0, tc, te, dir);
    }
  });

  // The roots: the person's health. Always a few short ones; more, longer and thicker as health grows.
  const hs = clamp01(opts.roots ?? 0);
  const count = 3 + Math.round(hs * 4);
  const roots: RootShape[] = Array.from({ length: count }, (_, i) => {
    const a = (count === 1 ? 0 : -62 + (124 * i) / (count - 1)) * (Math.PI / 180);
    const len = (26 + hs * 56) * (0.85 + ((i * 37) % 30) / 100);
    const end: [number, number] = [150 + Math.sin(a) * len * 1.15, GROUND + Math.min(86, 8 + Math.cos(a) * len)];
    const ctrl: [number, number] = [150 + Math.sin(a) * len * 0.3, GROUND + 6 + Math.cos(a) * len * 0.55];
    return { key: `root${i}`, d: `M150 ${GROUND} Q${f(ctrl[0])} ${f(ctrl[1])} ${f(end[0])} ${f(end[1])}`, width: 1.4 + hs * 3 * (1 - Math.abs(a) / 2.2) };
  });

  return { trunk, trunkWidth, branches, leaves, roots, shown: leaves.length, total: work.length };
}
