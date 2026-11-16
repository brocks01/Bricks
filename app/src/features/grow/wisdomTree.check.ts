// Run: npx tsx src/features/grow/wisdomTree.check.ts  (the drawing rules of the Tree of Wisdom, no screen needed)
import { CAPACITY, distanceToWood, GROUND_Y, layoutWisdomTree, MIN_GAP, PLACES, VIEW, WOOD } from './wisdomTree';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`); if (!ok) failed += 1; };

check('the same input gives the same output', JSON.stringify(layoutWisdomTree(37)) === JSON.stringify(layoutWisdomTree(37)));
const bare = layoutWisdomTree(0);
check('no leaves yet: bare branches, a trunk and no leaf', bare.leaves.length === 0 && bare.wood.length === WOOD.length && bare.trunk.length > 0);
check('a count that is not a whole, positive number draws no extra leaf', layoutWisdomTree(-3).leaves.length === 0 && layoutWisdomTree(NaN).leaves.length === 0 && layoutWisdomTree(2.9).leaves.length === 2);
check('the skeleton is six main limbs, each with branches and twigs', [0, 1, 2, 3, 4, 5].every((i) => WOOD.filter((w) => w.limb === i && w.gen === 1).length === 1 && WOOD.filter((w) => w.limb === i && w.gen === 2).length >= 2 && WOOD.filter((w) => w.limb === i && w.gen === 3).length >= 4));
check('each generation is thinner than the one before', Math.min(...WOOD.filter((w) => w.gen === 1).map((w) => w.w)) > Math.max(...WOOD.filter((w) => w.gen === 2).map((w) => w.w)) && Math.min(...WOOD.filter((w) => w.gen === 2).map((w) => w.w)) > Math.max(...WOOD.filter((w) => w.gen === 3).map((w) => w.w)));
check('about 150 places', CAPACITY >= 130 && CAPACITY <= 160, String(CAPACITY));
check('the places are numbered 1, 2, 3... in the order they fill', PLACES.every((p, i) => p.n === i + 1));
check('leaf n keeps its place as the count rises', [1, 5, 20, 60, CAPACITY].every((n) => layoutWisdomTree(n).leaves.every((p, i) => p === PLACES[i])) && layoutWisdomTree(60).leaves.slice(0, 20).every((p, i) => p === layoutWisdomTree(20).leaves[i]));
const closest = Math.min(...PLACES.flatMap((a, i) => PLACES.slice(i + 1).map((b) => Math.hypot(a.cx - b.cx, a.cy - b.cy))));
check('no two places are closer than the minimum', closest >= MIN_GAP - 0.2, closest.toFixed(2)); // 0.2: the places are rounded to one decimal
check('every place is on the picture, above the ground', PLACES.every((p) => p.cx > 0 && p.cx < VIEW && p.cy > 0 && p.cy < GROUND_Y && p.x > 0 && p.x < VIEW && p.y > 0 && p.y < GROUND_Y));
const far = Math.max(...PLACES.map((p) => distanceToWood(p.x, p.y)));
check('every leaf stem sits on a branch or twig', far <= 1.5, far.toFixed(2));
const perLimb = (n: number) => [0, 1, 2, 3, 4, 5].map((i) => layoutWisdomTree(n).leaves.filter((p) => p.limb === i).length);
const at20 = perLimb(20);
check('after 20 leaves no main limb has more than about twice another', Math.min(...at20) > 0 && Math.max(...at20) <= 2 * Math.min(...at20) + 1, at20.join(','));
const at6 = perLimb(6);
check('the first six leaves go one to each limb', at6.every((n) => n === 1), at6.join(','));
check('the first leaves alternate left and right', PLACES.slice(0, 6).map((p) => (p.limb < 3 ? 'L' : 'R')).join('') === 'LRLRLR', PLACES.slice(0, 6).map((p) => p.limb).join(''));
const reach = (p: { cx: number; cy: number }) => Math.hypot(p.cx - 200, p.cy - 270);
check('on each limb the inner places fill before the outer ones', [0, 1, 2, 3, 4, 5].every((i) => { const l = PLACES.filter((p) => p.limb === i); return l.every((p, k) => k === 0 || reach(p) >= reach(l[k - 1]) - 0.2); }));
check('beyond capacity the number of leaves drawn stops at capacity', layoutWisdomTree(CAPACITY + 500).leaves.length === CAPACITY && layoutWisdomTree(CAPACITY).capacity === CAPACITY);
check('three close greens are all used', new Set(PLACES.map((p) => p.tone)).size === 3);

console.log(failed ? `\n${failed} FAILED` : '\nall passed');
if (failed) process.exit(1);
