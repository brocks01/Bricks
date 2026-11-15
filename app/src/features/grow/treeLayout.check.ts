// Run: npx tsx src/features/grow/treeLayout.check.ts  (the drawing rules of the tree, no screen needed)
import type { TreeNode } from '../../api/nodes';
import { layoutTree, MAX_LEAVES, MAX_PER_BRANCH } from './treeLayout';

let failed = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`); if (!ok) failed += 1; };
let seq = 0;
const n = (type: TreeNode['type'], parent: TreeNode | null, status: TreeNode['status'] = 'open', key = ''): TreeNode => ({
  nid: `${type[0].toUpperCase()}${++seq}`, type, kind: '', title: type, parent_id: parent?.nid ?? '', path: parent ? [...parent.path, parent.nid] : [], depth: parent ? parent.depth + 1 : 0, order: seq, status, progress: 0, key, counts: {},
});
const root = n('root', null, 'active');
const move = n('area', root, 'open', 'move');
const give = n('area', root, 'open', 'give');

const empty = layoutTree([root]);
check('an empty tree is a bare trunk', empty.leaves.length === 0 && empty.branches.length === 0 && empty.total === 0);

const small = layoutTree([root, move, give, n('task', move, 'closed'), n('task', move, 'open'), n('event', give, 'closed')]);
check('one branch per area and one leaf per piece of work', small.branches.length === 2 && small.leaves.length === 3 && small.total === 3);
check('closed work is a grown leaf, open work is not', small.leaves.filter((l) => l.grown).length === 2 && small.leaves.filter((l) => !l.grown).length === 1);
check('areas and the root are never leaves', !small.leaves.some((l) => l.key.startsWith('A') || l.key.startsWith('R')));

const loose = layoutTree([root, n('goal', root, 'closed')]);
check('work straight under the root gets the middle branch', loose.branches.length === 1 && loose.branches[0].key === 'root' && loose.leaves.length === 1);

const many: TreeNode[] = [root, move, give];
for (let i = 0; i < 40; i += 1) many.push(n('task', move, i % 3 === 0 ? 'closed' : 'open'), n('task', give, 'closed'));
const dense = layoutTree(many);
check('a busy branch shows at most its share', dense.leaves.length <= MAX_LEAVES && dense.leaves.length === 2 * MAX_PER_BRANCH && dense.total === 80);
check('green leaves are kept first when a branch is cut (14 closed of 40 on the first branch)', dense.leaves.slice(0, 14).every((l) => l.grown) && dense.leaves.slice(14, MAX_PER_BRANCH).every((l) => !l.grown));
check('every leaf is inside the picture', dense.leaves.every((l) => l.x > 0 && l.x < 300 && l.y > 0 && l.y < 236));
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
