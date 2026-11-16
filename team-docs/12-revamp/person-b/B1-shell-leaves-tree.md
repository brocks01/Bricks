# B1: the app shell, leaves, and the Tree of Wisdom (round 1, in parallel with A1)

Branch: `b/shell-leaves-tree` (from the latest `main`). **Merge it as soon as it is done: A2 needs `BackButton` and `feed.showed_up`.**
Read first: `AGENTS.md`, `team-docs/12-revamp/README.md` (contract points 4, 6, 7, 9; screen rules), then this file.

Three parts. Do them in order, keep the app working after each part, and commit after each.

## Goal
1. **The shell**: a bottom bar with **four tabs, Home, Communities, Marketplace, Wisdom**, shown only on those four pages; a header on the tab
   pages with the **Tree of Wisdom button on the left** and the **profile button on the right**; one **floating Back button** on every other
   page, always in exactly the same top-left place.
2. **Leaves** (server): one leaf for every event the person **showed up to**, one function everybody calls, and the history behind the leaves.
3. **The Tree of Wisdom page**: a large, well-shaped tree that starts with **bare branches** and gains one leaf per event, with **History**
   below; and the person's own tree in miniature in the header button.

## What exists today
- `components/AppTabBar.tsx`: three items (Market left, Communities raised in the middle, Wisdom right), chosen by the server's profile; the
  agent button (`AgentOrb`) floats above it; hidden during setup, onboarding and on `bare` pages.
- `components/headers.tsx`: `AppHeader` (the Bricks mark on the left, the round profile button on the right opening `me.index`) and
  `BackHeader` (a title bar with a back arrow). `app/src/app/(tabs)/_layout.tsx` and the tab route files. Home is `home.index` (route `/today`).
- `backend/app/modules/nodes/`: `feed.py` (`going`, `attended`, `sync_events`, `care`, `walked`, `helped`, `aspired`, `moved_on`),
  `service.py`, `router.py` (`GET /v1/nodes/tree` and the node routes). Home and the progress page call `/v1/nodes/tree` today. A's community
  check-in route already calls `feed.attended`.
- `features/grow/pages/progress` (`grow.progress`, route `/progress`): the old tree (`TreeView.tsx`, `treeLayout.ts`, `treeLayout.check.ts`)
  with habits and goals under it (`GoalsHabits.tsx`). `react-native-svg` is installed. `colors.leaf` is in the theme.

---

## Part 1: the shell
1. **Bottom bar** (`AppTabBar.tsx`): four equal tabs in this order, each an icon and a word, at least 56 high, the lit one clearly different
   (colour **and** a filled icon or underline, never colour alone):
   **Home** (`home.index`), **Communities** (`connect.index`), **Marketplace** (`market.index`), **Wisdom** (`wisdom.index`).
   A tab stays lit for the pages behind it (community pages light Communities, and so on); profile pages light none. The server's profile may
   still hide Marketplace or Wisdom for a person who said no to them; Home and Communities always show.
   The bar shows **only on the four tab pages**. Every other page is a sub-screen with no bar. The agent button keeps floating on every page.
2. **Tab order and routes** in `(tabs)/_layout.tsx` follow the same order. Keep every page key and route as they are.
3. **Header** (`AppHeader`) on the four tab pages: left, a round **Tree of Wisdom** button that opens `grow.progress` (Part 3 puts the mini
   tree in it); centre, the Bricks mark and name; right, the round profile button, unchanged (it must keep opening `me.index`). Both round
   buttons the same size, touch area at least 48 by 48, a spoken label each ("Tree of Wisdom", "Your profile") in six languages.
4. **Floating Back button** (`components/BackButton.tsx`, new): a round button with an arrow **and** the word "Back", fixed at the top left
   below the safe area, the same place and size on every sub-screen, at least 56 high, high contrast on any background (a solid fill with a
   soft shadow). It goes back, or to the tab the page belongs to when there is no history (a page opened from a link). Use it on **B's**
   sub-screens; A switches A's pages in A2 (contract point 6). Leave `BackHeader` in place for pages not yet moved.
5. Words in your own feature's words file (for example `features/home/shellWords.ts`), six languages.

---

## Part 2: leaves (server only)

### The rule
- An **event** is a community gathering, a market day (or other market event), or a Wisdom session.
- Saying "I'm going" earns nothing. The person earns **one leaf when they show up**:
  - community gathering: checked in ("I'm here", or by their Community Lead); the existing route already calls `feed.attended`;
  - market event: they answer **"I went"** after the day (B2);
  - Wisdom session: the session is marked complete (A2); both people get one.
- One event, one leaf, however often it is reported. Showing up without saying "I'm going" first still earns it.
- A check-in leaf is never taken away. A leaf from a self-reported "I went" is withdrawn if the person changes it to "I didn't go".
- Goals, habits, reminders ticked and walks do **not** give Tree of Wisdom leaves. Their nodes and endpoints stay; they are not counted.

### Build (`modules/nodes`, migrations `0110`-`0119`)
1. **`feed.showed_up(conn, user_id, source, ref_id, title, at, source_name=None, on=True)`**: `source` is `community`, `market` or `wisdom`.
   Idempotent on (person, source, `ref_id`), with a stable key so a repeat never makes a second leaf. `on=False` withdraws a leaf only if it
   came from a self-report. Never raises into the caller's request (log and carry on, like `_safe`).
   `feed.attended` now goes through `showed_up(..., 'community', ...)` with the community's name. `going` and `sync_events` never turn a yes
   into a leaf.
2. Keep each leaf's source, title, time and source name where the history can read it (a migration only if a column or index is truly needed).
3. **`GET /v1/nodes/wisdom?limit=&before=`**:
   ```
   { "leaves": 12,
     "events": [ { "id": "...", "title": "Morning walk", "at": "2026-11-14T23:00:00+00:00",
                   "source": "community" | "market" | "wisdom", "source_name": "Bishan Walkers" } ],
     "next_before": "..." | null }
   ```
   `leaves` is the total from events. `events` is newest first, paged (`limit` at most 50), only events the person showed up to. For the
   Marketplace `source_name` is the host's name or `null`; for Wisdom, the other person's name.
4. Leave `GET /v1/nodes/tree` working exactly as before.
5. Tests in `backend/tests/test_nodes.py`: "going" alone gives no leaf; check-in gives one; twice still one; check-in without "going" gives one;
   "going" changed to no after a check-in keeps the leaf; `showed_up` for market and wisdom gives one each; `on=False` withdraws a
   self-reported one but not a check-in one; a reminder ticked gives none; paging returns everything once, in order; another person's events
   never appear. If a test in a file A owns fails because of the rule change, do not edit it: write the exact test name and what it should now
   expect under "Requests" in `LOG.md` and tell A.

---

## Part 3: the Tree of Wisdom page and the mini tree

### The drawing (new files; the old ones stay in place, unlinked)
1. `features/grow/wisdomTree.ts`, pure: numbers in, shapes out, no randomness at run time.
   - **A fixed, hand-designed skeleton**: a visible trunk that tapers upward, five to seven main limbs spreading into a broad, slightly
     asymmetric crown (a rain tree suits Singapore), each limb splitting into two or three branches and then twigs. Smooth curves, rounded
     ends, each generation thinner. This is what "no leaves yet" looks like, so it must be handsome on its own.
   - **Fixed leaf places along the twigs**: about 150, each with a position and an angle that follows its twig, made once with a seeded
     generator and a minimum distance, so leaves never pile up and never float away from a branch.
   - **The order makes growth look natural**: places 1, 2, 3... fill in that order, going round the limbs in turn, inner places before outer,
     left and right alternating, so the crown fills evenly and stays balanced. Leaf n is always in place n: the tree never rearranges, it only
     gains. Past the last place the tree is full; the count keeps rising.
   - `layoutWisdomTree(leaves: number)` returns the skeleton paths and the first `leaves` places.
2. `features/grow/WisdomTree.tsx`: draws it in a square that fills the width; one simple leaf shape, three close greens by place number, a
   soft ground line, a calm background. No labels on the picture. The newest leaf may grow in with a short, gentle animation; none when the
   device asks for reduced motion.
3. `features/grow/wisdomTree.check.ts` (run with `npx tsx`): same input, same output; 0 leaves gives none; leaf n keeps its place as the count
   rises; no two places closer than the minimum; every place on the picture and on a twig; after 20 leaves no main limb has more than about
   twice another's; beyond capacity the count of shapes stops at capacity.

### The page (`grow.progress`, keep key and route)
1. The floating Back button, no bottom bar. Title "Tree of Wisdom". The tree. Under it, large: "12 leaves" and one line: "Every event you come
   to grows one leaf." With none: "Come to your first event and your first leaf will grow."
2. **History**: one row per leaf, newest first: the title, the date in plain words, where it came from ("From Bishan Walkers",
   "From Marketplace", "Wisdom session with Sarath"), and a small leaf with "+1". Show the **first five**; if there are more, a full-width
   **Show more** that shows the next page each time it is pressed (no endless scrolling). With none: the friendly line above.
3. Remove habits and goals from this page (their components and endpoints stay, unlinked). Publish the page data so the agent can say how many
   leaves there are and read the history.

### The mini tree in the header
1. `features/grow/wisdomStore.ts`: the leaf count; loads after sign-in, clears on sign-out; `refreshWisdom()` for anything that changes it
   (A's "I'm here", A2's completed session, B2's "I went", Home).
2. `features/grow/MiniTree.tsx`: the same tree from the same layout, drawn for the round header button: trunk and main limbs, the leaves as
   small dots in their real places, so the little picture is recognisably the big one. Put it in Part 1's tree button; its spoken label
   becomes "Tree of Wisdom, 12 leaves". One gentle pulse when the count rises while the person looks (none with reduced motion).

---

## Files you may touch
`app/src/components/AppTabBar.tsx`, `app/src/components/headers.tsx`, `app/src/components/AgentOrb.tsx` (only if it must move to clear the
bar), new `app/src/components/BackButton.tsx`, `app/src/app/(tabs)/_layout.tsx`, B's route files (including `progress.tsx`),
`app/src/features/home/**`, `app/src/features/grow/**`, `app/src/features/market/**` (to switch sub-screens to `BackButton`),
`app/src/api/nodes.ts`, `app/assets/tree/` (only if really needed), `backend/app/modules/nodes/**`, `backend/tests/test_nodes.py`,
`test_habits*.py` (only if the rule change makes an expectation wrong; say which in `LOG.md`), migrations `0110`-`0119`.
In `selftest.ts` only existing lines about `home`, `grow` or `market`.

## Done when
- **Shell** (signed in, phone size): the four tabs in the right order on the four tab pages, the right one lit on each tab's own sub-pages, no
  bar on sub-screens; the header's two buttons open the tree page and the profile; the Back button is in the identical place on every B
  sub-screen (screenshots of three side by side in the pull request). Signed out and during onboarding: no bar, no header, no error; the agent
  button still shows. The four labels fit at the largest text size (wrap to two lines rather than cut).
- **Leaves**: the whole backend suite passes; `LOG.md` has the final shape of `showed_up` and `/v1/nodes/wisdom`.
- **Tree**: at phone size it looks right at 0, 1, 5, 20, 60 and 150 leaves (drive the count from a development-only value while checking and
  remove it before the pull request); screenshots of those six states and of the mini tree at 0, 5 and 60 are in the pull request. With a real
  account the count matches `/v1/nodes/wisdom`; History shows five, then Show more adds the rest.
- All six languages; the largest text size fits.
- `cd backend && python -m pytest tests -q`; `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts`;
  `npx tsx src/features/grow/wisdomTree.check.ts` pass. `LOG.md` entry: what was tested and how, and what was not.
