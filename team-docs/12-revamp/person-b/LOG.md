# Person B: log

Append one entry per iteration: the date, who (tool and model), the iteration, what was done, what was tested and how, what is NOT done or
NOT tested, and the next step. Then two lists, kept up to date:

## 17 Nov 2026 — B1: the app shell, leaves, and the Tree of Wisdom
**Who:** Sarath, with Claude Code (Claude Fable 5.2). **Branch:** `b/shell-leaves-tree`, three commits (one per part), not pushed.
The branch was made from `revamp-iterations-v2` (the branch that holds this folder; it is not on `main` yet) with `origin/main` merged in.

### What was done
**Part 1, the shell**
- `components/AppTabBar.tsx`: four equal tabs, Home, Communities, Marketplace, Wisdom, 68 high, an icon and a word each. The lit tab has a
  filled icon, the accent colour and a bar above it. The bar shows only on the four tab pages; everywhere else only the agent button stays.
  Home and Communities always show; the server's profile can still hide Marketplace or Wisdom.
- Tab order in the registry: `home.index` is now a tab (`tab: 0`), `market.index` is `tab: 1.5` so it sorts after Communities (1) and before
  Wisdom (2), because the Communities and Wisdom page files are A's. The Home route file moved to `app/(tabs)/today.tsx` (the route is still `/today`).
- `components/headers.tsx` `AppHeader`: round Tree of Wisdom button on the left (opens `grow.progress`), the mark and name in the centre, the
  bell and the round profile button on the right (still opens `me.index`). Both round buttons are 48 by 48 with a spoken label in six languages.
  The bell was kept (the notifications page has no other way in).
- `components/BackButton.tsx` (new): `BackButton` (arrow and the word "Back", 56 high, navy with a shadow, fixed at top 8 / left 16 below the
  safe area; goes back, or to the page's tab when there is no history), `BackTitle`, and `BackScreen`, a drop-in for `<Screen back>`:
  `<BackScreen title subtitle>…</BackScreen>`. All 22 `<Screen … back>` uses in B's features (grow, calendar, market, host, health) now use it.
  `BackHeader` is untouched, so A's pages look as before until A2.
- Words: `features/home/shellWords.ts` (`shell.tree`, `shell.tree_n`, `shell.tree_one`, `shell.profile`, `shell.notices`, `shell.back`).
  The Marketplace tab's English label changed from "Market" to "Marketplace".
- `selftest.ts`: the one tab line now expects `home.index,connect.index,market.index,wisdom.index`.

**Part 2, leaves (server)**
- Migration `0110_wisdom_leaves.sql`: table `wisdom_leaves` (user, source, ref_id, title, at, source_name, self_reported), unique on
  (user, source, ref_id). A table was needed: market and Wisdom leaves have no node to hang on, and the unique key is what makes a repeat a no-op.
- **Final shape:** `nodes.feed.showed_up(conn, user_id, source, ref_id, title, at, source_name=None, on=True) -> None`.
  `source` is `community`, `market` or `wisdom` (anything else is logged and ignored). Idempotent. `on=False` deletes the leaf only when it is
  self-reported, and only `market` leaves are self-reported. It never raises into the caller.
- `feed.attended` keeps its old behaviour for `/v1/nodes/tree` and now also calls `showed_up(..., 'community', activity_id, title, starts_at, community name)`.
  `going` and `sync_events` never make a leaf.
- **Final shape:** `GET /v1/nodes/wisdom?limit=&before=` returns
  `{ "leaves": int, "events": [{ "id", "title", "at", "source", "source_name" }], "next_before": str | null }`, newest first, `limit` 1 to 50
  (default 20, larger values are capped). `before` is the previous page's `next_before`; one that cannot be read starts from the newest.
- `GET /v1/nodes/tree` is unchanged. Five new tests in `test_nodes.py` cover every case the iteration file lists.

**Part 3, the Tree of Wisdom**
- `features/grow/wisdomTree.ts` (pure): a fixed rain-tree skeleton (trunk, 6 limbs, 18 branches, 54 twigs) and 150 fixed leaf places made once
  from a seeded generator, minimum gap 12.5. Places fill limb by limb in turn (middle limbs first, left and right alternating), inner before outer.
- `features/grow/WisdomTreeView.tsx` (the big tree; the newest leaf fades in, not with reduced motion), `MiniTree.tsx` (header button, leaves as
  dots in their real places, one pulse when the count rises), `wisdomStore.ts` (`wisdomStore`, `refreshWisdom()`; loads on sign-in, clears on
  sign-out), `wisdomWords.ts`, `wisdomTree.check.ts` (17 checks).
- **The component file is `WisdomTreeView.tsx`, not `WisdomTree.tsx` as the iteration file says:** `wisdomTree.ts` and `WisdomTree.tsx` differ
  only by letter case, which breaks imports on Windows and macOS.
- `grow.progress` (key and route kept): floating Back button, title "Tree of Wisdom", the tree, "12 leaves" and one line, then History (title,
  date, where it came from, a leaf and "+1"), five rows and a full-width "Show more" for the next five. Habits and goals are no longer on the
  page (their files and endpoints stay). The page publishes its count and history for the agent.
- `api/nodes.ts`: `getWisdom(limit, before)`, `Wisdom`, `WisdomEvent`.

### What was tested and how
- `cd app && npx tsc --noEmit`: clean. `npx tsx src/features/grow/wisdomTree.check.ts`: all 17 pass. `treeLayout.check.ts`: still passes.
- `npx tsx src/navigation/selftest.ts`: one failure, `Singpass is person-only`, which fails the same way on the branch before any change
  (it is about `auth`, A's). `english default` failed before and passes now.
- `npx expo lint`: 11 problems, all in files this iteration did not touch (`connect/pages/index/Home.tsx` and `Screen.tsx`,
  `market/screens/MarketHome.tsx`, `wisdom/screens/WisdomHome.tsx` and `WisdomIndex.tsx`); the same 11 as before. None in new or changed files.
- Backend: `python -m pytest tests/test_nodes.py`: 24 pass. Whole suite: 408 pass, 16 fail; **the same 16 fail without this branch's changes**
  (in `test_checkins`, `test_wisdom`, `test_belonging`, `test_identity`, `test_onboarding_steps`, `test_safety`, `test_recurrence`, and
  `test_hosts::test_weekly_steps_toward_a_stall…`, a database error on this machine). None is in `nodes`.
- In a browser (Edge through Playwright, 390 by 844, the running web app on port 3000, signed in as Uncle Tan through `/singpass`):
  the four tabs in order with the right one lit on Home, Communities, Marketplace and Wisdom; the header's tree button opens the tree page and
  Back returns; no bar on the tree page, `/calendar/new`, `/health/history`, `/host` or the profile; the Back button is in the same place on
  those B pages; signed out (`/welcome`, `/choose-language`) shows no bar and no header and the agent button still shows.
- The tree page and the mini tree were looked at with 0, 5, 12, 60 and 150 leaves; the drawing alone at 0, 1, 5, 20, 60 and 150.
  **For these the browser test tool answered `/v1/nodes/wisdom` with the documented shape**, because the API running on port 8800 had not been
  restarted and does not have the new route yet. No development-only count was added to the app code.

### NOT done or NOT tested
- **The tree page against the real API in a browser.** The API must be restarted to serve `/v1/nodes/wisdom` (migration `0110` is already
  applied to the local database). Until then the tree page shows "Could not load, try again" and the header tree stays bare.
- No pull request and no push; the screenshots are on Sarath's machine, not in a pull request.
- Not tested: a real phone, the five languages other than English on screen, the largest text size, a screen reader, reduced motion.
- `showcase.py` was not changed: it already calls `feed.attended`, so the next run seeds leaves through the new rule. Not run.
- Home still shows its old "My tree" card (the old drawing from `/v1/nodes/tree`); B2 replaces Home.

### Next step
Restart the API, look at the tree page with Uncle Tan's real data, open the pull request, merge. Then B2 (needs A1 merged).

## Requests for the other person
- **A (A2):** switch A's sub-screens from `<Screen … back>` to `BackScreen` from `components/BackButton.tsx` (same `title` and `subtitle`
  props), or put `<BackButton />` beside your own layout and leave `BACK_SPACE` free at the top.
- **A (A2):** after a Wisdom session is completed, call `feed.showed_up(conn, user_id, 'wisdom', session_id, title, at, other_person_name)`
  for both people, and in the app call `refreshWisdom()` from `features/grow/wisdomStore` after "I'm here" and after a completed session.
- **A (any time):** set `tab: 3` on `wisdom.index` (it is 2). `market.index` is `1.5` only to sort between Communities and Wisdom without
  touching your file; once Wisdom is 3, B sets the Marketplace to 2.
- **A:** `selftest.ts` check `Singpass is person-only` fails on `main` (the `singpass` element of `auth.signIn` is not `agent: 'human'`).
- **A (A3):** `AuthGate` should land on `home.index` (contract point 8); today `firstTab` still prefers Wisdom.

## Later
- Agent skill: "how many leaves do I have" and "what did I show up to" from `/v1/nodes/wisdom` (skills are frozen for the revamp).
- The header title is centred on the bar; with a much longer app name it would need to shrink.
- The 16 failing backend tests and the 11 lint problems above are older than the revamp and belong to other areas.
