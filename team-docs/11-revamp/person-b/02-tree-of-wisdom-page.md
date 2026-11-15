# B2: the Tree of Wisdom page

Branch: `b/tree-of-wisdom-page` (from the latest `main`, after B1 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (screen rules), then this file.

## Goal
A page with one beautiful tree. It starts with bare branches and gains one leaf for every event the person showed up to. Under it, the
events behind the leaves. The tree must look good with 0 leaves, with 5, with 40, and as a full tree.

## What exists today
- `features/grow/pages/progress` (key `grow.progress`, route `/progress`): the old tree (`TreeView.tsx`, `treeLayout.ts`: branches per
  life area, roots for health, outline and green leaves) with habits and goals under it (`GoalsHabits.tsx`).
- `react-native-svg` is installed. `colors.leaf` is in the theme. `GET /v1/nodes/wisdom` from B1.

## Build
### The drawing (pure layout plus a view; new files, the old ones stay untouched for now)
1. `features/grow/wisdomTree.ts`, pure: numbers in, shapes out, no randomness at run time.
   - **The skeleton is fixed and hand-designed**: one trunk that tapers upward, five to seven main limbs spreading into a broad, slightly
     asymmetric crown (a rain tree or banyan silhouette suits Singapore), each limb splitting into two or three smaller branches and then
     twigs. Smooth curves, rounded ends, each generation thinner than the one before. This is what "empty branches" looks like, so it must
     be handsome on its own.
   - **Leaf places are fixed too**: a list of about 150 places along the twigs, each with a position and a resting angle that follows its
     twig. Make the list once with a seeded generator and a minimum distance between places, so leaves never pile up.
   - **Order is what makes growth look good**: place number 1, 2, 3... is filled in that order. Order them so the crown fills evenly:
     go round the limbs in turn, inner places before outer ones, left and right alternating. Leaf number n is always in place n, so the
     tree a person saw yesterday never rearranges; it only gains.
   - Past the last place the tree is full: the picture stays full and the count keeps rising.
   - `layoutWisdomTree(leaves: number)` returns the skeleton paths and the first `leaves` places.
2. `features/grow/WisdomTree.tsx`: draws it in a square that fills the width. One leaf shape (a simple pointed oval with a centre line),
   three close greens picked by place number, a small angle variation by place number, a soft ground line under the trunk, a calm plain
   background from the theme. No roots, no outline leaves, no labels on the picture. The newest leaf may grow in with a short, gentle
   animation; skip the animation when the device asks for reduced motion.
3. `features/grow/wisdomTree.check.ts` (run with `npx tsx`): the same input gives the same output; 0 leaves gives none; leaf n keeps its
   place as the count rises; no two places closer than the minimum; every place inside the picture; after 20 leaves no main limb has more
   than about twice the leaves of another (the "fills evenly" promise); beyond capacity the shape count stops at capacity.

### The page (`grow.progress`, keep key and route)
1. Title "Tree of Wisdom" with Back. The tree. Under it, large: "12 leaves" and one line: "Every event you come to grows one leaf."
   With no leaves: "Come to your first event and your first leaf will grow."
2. Heading "Events you came to". One row per event: the title, the date in plain words, a tag ("From Bishan Walkers" or
   "From Marketplace") and "+1 leaf" with a small leaf icon at the right.
3. Show only as many rows as fit in the space left under the tree without scrolling (measure it; always at least two when there are two).
   If there are more, a full-width button **"View more"**: after it is pressed the list becomes scrollable and loads further pages as the
   person reaches the end.
4. Remove habits and goals from this page (the components and endpoints stay in the code, unlinked). Publish the page data so the agent
   can say how many leaves there are and read the events.

## Files you may touch
`app/src/features/grow/**`, `app/src/api/nodes.ts`, `app/src/app/progress.tsx`, `app/assets/tree/` (only if a texture is really needed).
In `selftest.ts` only existing lines about `grow`, if one now fails.

## Done when
- In the browser at phone size the tree looks right at 0, 1, 5, 20, 60 and 150 leaves (drive the count from a development-only query
  value or a temporary prop while checking; remove it before the pull request) and screenshots of those six states are in the pull request.
- With a real account: the count matches `/v1/nodes/wisdom`, the rows match, "View more" makes the list scroll.
- Largest text size fits; all six languages.
- `npx tsx src/features/grow/wisdomTree.check.ts`, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
