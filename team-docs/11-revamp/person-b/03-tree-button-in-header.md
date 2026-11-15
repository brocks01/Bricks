# B3: the mini-tree button at the top left

Branch: `b/tree-button` (from the latest `main`, after B2 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (contract point 5), then this file.

## Goal
On every main page, the top bar has a round button on the **left** showing a small version of the person's own tree. Tapping it opens the
Tree of Wisdom page. It is the same size and style as the round profile button on the right.

## What exists today
- `components/headers.tsx`, `AppHeader`: the Bricks mark and name on the left, the round profile button (navy, gold ring, initials) on the
  right, which opens `me.index`. The header is only shown to a signed-in person.
- `layoutWisdomTree` and `WisdomTree.tsx` from B2; `GET /v1/nodes/wisdom`.
- `components/AppTabBar.tsx`: Communities, Home (raised, in the middle), Marketplace.

## Build
1. `features/grow/wisdomStore.ts`: a small store holding the leaf count. It loads once after sign-in, clears on sign-out, and has a
   `refreshWisdom()` that Home (B4) and the tree page call after anything that can change the count.
2. `features/grow/MiniTree.tsx`: the same tree from the same layout, drawn for a 44 to 48 circle: the trunk and main limbs only, and the
   leaves as small dots in their real places, so the little picture is recognisably the big one and fills up the same way. With no leaves
   it shows the bare tree.
3. `AppHeader`: left, the round tree button (same diameter, ring and press feedback as the profile button; light background so the green
   reads); centre, the Bricks mark and name; right, the profile button unchanged (it must keep opening `me.index`).
   The tree button opens `grow.progress`. Its accessibility label says "Tree of Wisdom, 12 leaves" in the person's language.
   Touch area at least 48 by 48 for both buttons.
4. When the count rises while the person is looking (after "I'm here" on Home), the button gives one short, gentle pulse; nothing when the
   device asks for reduced motion.
5. Check the bottom bar while you are here: the three labels read Community, Home, Marketplace, and the right one is lit on each tab's own
   pages (the log from 16 Nov says the lit state for Home was never confirmed). Fix inside `AppTabBar.tsx` if it is wrong.
6. Words for the label go in the `grow` feature's words file, in six languages.

## Files you may touch
`app/src/components/headers.tsx`, `app/src/components/AppTabBar.tsx`, `app/src/features/grow/**`, `app/src/api/nodes.ts`.

## Done when
- Signed in, every tab shows the tree button on the left and the profile button on the right; the button opens the tree page; Back returns.
- The mini tree with 0, 5 and 60 leaves is recognisably the big tree (screenshots in the pull request).
- Signed out and during onboarding there is no header and no error.
- `tsc`, `expo lint`, `selftest.ts`, `wisdomTree.check.ts` pass. `LOG.md` entry.
