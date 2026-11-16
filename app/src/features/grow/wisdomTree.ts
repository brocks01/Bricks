// The Tree of Wisdom, as numbers: a fixed, hand-shaped skeleton (a broad rain tree) and fixed places for leaves along its twigs.
// Pure: numbers in, shapes out. Nothing here is random at run time: the leaf places are made once, when this file loads, from a seeded
// generator, so every phone draws the very same tree. Leaf n always sits in place n: the tree never rearranges, it only gains.
//
// The picture is a square of VIEW by VIEW units; y grows downward. Angles are in degrees, measured from straight up, positive to the right.

export const VIEW = 400;
export const GROUND_Y = 372;
/** No two leaves sit closer than this (measured between the middles of the leaves). */
export const MIN_GAP = 12.5;
/** How long a leaf is, from its stem to its tip. */
export const LEAF_LENGTH = 20;
const MAX_PLACES = 150;

export interface Wood {
  d: string; // an SVG path
  w: number; // stroke width
  gen: 1 | 2 | 3; // 1 a main limb, 2 a branch, 3 a twig
  limb: number; // which main limb it belongs to (0 is the far left)
}

export interface LeafPlace {
  n: number; // 1 for the first leaf a person earns, 2 for the second...
  x: number; // where the stem meets the twig
  y: number;
  angle: number; // SVG rotation in degrees for a leaf drawn pointing along +x
  cx: number; // the middle of the leaf
  cy: number;
  limb: number;
  tone: 0 | 1 | 2; // which of the three close greens
}

type P = { x: number; y: number };
interface Curve { a: P; c: P; b: P; len: number }

const rad = (deg: number) => (deg * Math.PI) / 180;
const dir = (deg: number): P => ({ x: Math.sin(rad(deg)), y: -Math.cos(rad(deg)) });
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A gently bent line from `a`, heading `deg`, `len` long; `bend` pushes its middle sideways (positive = to its right). */
function curve(a: P, deg: number, len: number, bend: number): Curve {
  const d = dir(deg);
  const b = { x: a.x + d.x * len, y: a.y + d.y * len };
  const right = { x: -d.y, y: d.x };
  const c = { x: (a.x + b.x) / 2 + right.x * bend, y: (a.y + b.y) / 2 + right.y * bend };
  return { a, c, b, len };
}
const at = (q: Curve, t: number): P => ({
  x: (1 - t) * (1 - t) * q.a.x + 2 * (1 - t) * t * q.c.x + t * t * q.b.x,
  y: (1 - t) * (1 - t) * q.a.y + 2 * (1 - t) * t * q.c.y + t * t * q.b.y,
});
/** The heading of the curve at t, in the same degrees as `dir`. */
function heading(q: Curve, t: number): number {
  const dx = 2 * (1 - t) * (q.c.x - q.a.x) + 2 * t * (q.b.x - q.c.x);
  const dy = 2 * (1 - t) * (q.c.y - q.a.y) + 2 * t * (q.b.y - q.c.y);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}
const pathOf = (q: Curve) => `M${r1(q.a.x)} ${r1(q.a.y)} Q${r1(q.c.x)} ${r1(q.c.y)} ${r1(q.b.x)} ${r1(q.b.y)}`;

// ---------- the skeleton, designed by hand ----------
// Six main limbs leave the trunk at staggered heights and spread into a broad, slightly lopsided crown (wider on the right, as a rain tree
// leans toward the light). Each limb carries a side branch part-way along and forks in two at its end; each branch does the same with twigs.
// [where it leaves the trunk, heading, length, bend, side of its part-way branch (-1 left, 1 right)]
const LIMBS: { from: P; deg: number; len: number; bend: number; side: 1 | -1 }[] = [
  { from: { x: 194, y: 296 }, deg: -64, len: 92, bend: 16, side: 1 },
  { from: { x: 195, y: 280 }, deg: -40, len: 112, bend: 13, side: -1 },
  { from: { x: 198, y: 268 }, deg: -15, len: 118, bend: 7, side: -1 },
  { from: { x: 202, y: 266 }, deg: 11, len: 124, bend: -7, side: 1 },
  { from: { x: 205, y: 276 }, deg: 37, len: 118, bend: -13, side: 1 },
  { from: { x: 207, y: 292 }, deg: 61, len: 102, bend: -17, side: -1 },
];
// A child leaves its parent at `t` along it, turned `turn` degrees from the parent's heading there, and is `scale` times as long.
const BRANCHES = [
  { t: 0.56, turn: 44, scale: 0.44 }, // the part-way branch (its turn is multiplied by the limb's side)
  { t: 1, turn: -27, scale: 0.46 },
  { t: 1, turn: 25, scale: 0.42 },
];
const TWIGS = [
  { t: 0.5, turn: 48, scale: 0.62 },
  { t: 1, turn: -30, scale: 0.7 },
  { t: 1, turn: 27, scale: 0.64 },
];
const WIDTH = { 1: 9, 2: 5.2, 3: 2.6 } as const;

interface Piece { q: Curve; gen: 1 | 2 | 3; limb: number }

function build(): Piece[] {
  const out: Piece[] = [];
  LIMBS.forEach((l, i) => {
    const limb = curve(l.from, l.deg, l.len, l.bend);
    out.push({ q: limb, gen: 1, limb: i });
    BRANCHES.forEach((b, bi) => {
      const turn = bi === 0 ? b.turn * l.side : b.turn;
      // A little unevenness, by hand and fixed: branches on the lower limbs are shorter, every second one a touch longer.
      const scale = b.scale * (bi === 0 ? 1 : 1 + ((i + bi) % 2 ? 0.08 : -0.05));
      const branch = curve(at(limb, b.t), heading(limb, b.t) + turn, l.len * scale, turn > 0 ? -5 : 5);
      out.push({ q: branch, gen: 2, limb: i });
      TWIGS.forEach((w, wi) => {
        const side = bi === 0 ? l.side : bi === 1 ? -1 : 1; // part-way twigs grow toward the open side
        const wturn = wi === 0 ? w.turn * side : w.turn;
        const twig = curve(at(branch, w.t), heading(branch, w.t) + wturn, branch.len * w.scale * (1 + ((i + bi + wi) % 3 - 1) * 0.07), wturn > 0 ? -3 : 3);
        out.push({ q: twig, gen: 3, limb: i });
      });
    });
  });
  return out;
}

const PIECES = build();

/** The trunk: a filled shape, wide and flared at the ground, tapering up to where the limbs leave it. */
export const TRUNK =
  `M${200 - 27} ${GROUND_Y} C${200 - 15} ${GROUND_Y - 12} ${200 - 12} ${GROUND_Y - 44} ${200 - 10} 300 L${200 - 7} 262 ` +
  `Q200 254 ${200 + 7} 262 L${200 + 10} 300 C${200 + 12} ${GROUND_Y - 44} ${200 + 16} ${GROUND_Y - 12} ${200 + 29} ${GROUND_Y} Z`;

export const WOOD: Wood[] = PIECES.map((p) => ({ d: pathOf(p.q), w: WIDTH[p.gen], gen: p.gen, limb: p.limb }));

// ---------- the places for leaves ----------
/** A small seeded generator (mulberry32): the same numbers on every device, every time. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CROWN: P = { x: 200, y: 270 }; // where the limbs leave: "inner" means near here
// The order the limbs take turns in: the two in the middle first, then outward, left and right alternating.
const TURN_ORDER = [2, 3, 1, 4, 0, 5];

function makePlaces(): LeafPlace[] {
  const rnd = seeded(20261117);
  type Cand = Omit<LeafPlace, 'n' | 'tone'> & { reach: number };
  const cands: Cand[] = [];
  for (const p of PIECES) {
    if (p.gen === 1) continue; // leaves grow on branches and twigs, never on the thick limbs
    const from = p.gen === 2 ? 0.55 : 0.2;
    const count = Math.max(2, Math.round((p.q.len * (1 - from)) / 5));
    for (let k = 0; k < count; k += 1) {
      const tip = p.gen === 3 && k === count - 1;
      const t = tip ? 1 : from + ((1 - from) * k) / (count - 1) * 0.94;
      const base = at(p.q, t);
      const side = k % 2 ? 1 : -1;
      const deg = heading(p.q, t) + (tip ? (rnd() - 0.5) * 16 : side * (46 + rnd() * 22));
      const d = dir(deg);
      const cx = base.x + (d.x * LEAF_LENGTH) / 2;
      const cy = base.y + (d.y * LEAF_LENGTH) / 2;
      cands.push({ x: r1(base.x), y: r1(base.y), angle: r1(deg - 90), cx: r1(cx), cy: r1(cy), limb: p.limb, reach: Math.hypot(cx - CROWN.x, cy - CROWN.y) });
    }
  }
  // Keep a place only if it is far enough from every place already kept and wholly on the picture; inner places are settled first.
  cands.sort((a, b) => a.reach - b.reach);
  const kept: Cand[] = [];
  for (const c of cands) {
    if (c.cx < 12 || c.cx > VIEW - 12 || c.cy < 12 || c.cy > GROUND_Y - 30) continue;
    if (kept.every((k) => Math.hypot(k.cx - c.cx, k.cy - c.cy) >= MIN_GAP)) kept.push(c);
  }
  // Each limb's places, inner first; the limbs then take turns, so the crown fills evenly and stays balanced.
  const perLimb = TURN_ORDER.map((i) => kept.filter((c) => c.limb === i));
  const ordered: Cand[] = [];
  for (let round = 0; ordered.length < kept.length; round += 1) {
    for (const list of perLimb) if (list[round]) ordered.push(list[round]);
  }
  return ordered.slice(0, MAX_PLACES).map(({ reach: _reach, ...c }, i) => ({ ...c, n: i + 1, tone: (Math.floor(c.x * 3.7 + c.y * 5.3) % 3) as 0 | 1 | 2 }));
}

/** Every place a leaf can grow, in the order they fill. */
export const PLACES: LeafPlace[] = makePlaces();
/** How many leaves the picture can show. Past this the tree is full; the count keeps rising. */
export const CAPACITY = PLACES.length;

/** One leaf, drawn pointing along +x from its stem at (0, 0): place it with translate(x, y) rotate(angle). */
export const LEAF_PATH = `M0 0 C4 -7.2 ${LEAF_LENGTH - 5.5} -7 ${LEAF_LENGTH} 0 C${LEAF_LENGTH - 5.5} 7 4 7.2 0 0 Z`;

export interface WisdomTreeLayout {
  trunk: string;
  wood: Wood[];
  leaves: LeafPlace[]; // the first `leaves` places, in order
  capacity: number;
}

/** The whole picture for a number of leaves: the skeleton (always the same) and the first `leaves` places. */
export function layoutWisdomTree(leaves: number): WisdomTreeLayout {
  const n = Math.max(0, Math.min(CAPACITY, Math.floor(Number.isFinite(leaves) ? leaves : 0)));
  return { trunk: TRUNK, wood: WOOD, leaves: PLACES.slice(0, n), capacity: CAPACITY };
}

/** How far a point is from the nearest branch or twig (for the checks: a leaf's stem must sit on the wood). */
export function distanceToWood(x: number, y: number): number {
  let best = Infinity;
  for (const p of PIECES) {
    if (p.gen === 1) continue;
    for (let i = 0; i <= 60; i += 1) {
      const q = at(p.q, i / 60);
      best = Math.min(best, Math.hypot(q.x - x, q.y - y));
    }
  }
  return best;
}
