# Person B: log

Append one entry per iteration: the date, who (tool and model), the iteration, what was done, what was tested and how, what is NOT done or
NOT tested, and the next step. Then two lists, kept up to date:

## 17 Nov 2026 — B1: the app shell, leaves, and the Tree of Wisdom
**Who:** Sarath, with Claude Code (Claude Fable 5.2). **Branch:** `revamp-iterations-v2` (Sarath chose to work on this branch directly, no branch per iteration), three commits (one per part), not pushed.
`origin/main` (17 Nov) was merged into the branch before the work.

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

## 17 Nov 2026 — B2: Home and the Marketplace
**Who:** Sarath, with Claude Code (Claude Opus 5.5). **Branch:** `revamp-iterations-v2` (no branch per iteration), three commits (one per part), not pushed.
Before starting: `git pull` (nothing new), then A1 (`origin/a/communities-maps`, 9 commits) was merged into `revamp-iterations-v2` with no
conflicts, because B2 needs `geo` and `MapCard`. A2 is not done, so Home has no Wisdom sessions yet (see "Not done").

### What was done
**Part 1, Home: your upcoming events**
- `GET /v1/home/upcoming?days=&limit=` (`modules/home/service.py`): community gatherings of the person's active communities, market events they
  are going to, and Wisdom sessions from `wisdom.service.upcoming_sessions` **when that function exists** (it does not yet: A2). From 3 hours
  ago to `days` ahead (30 by default, capped at 92), soonest first. Each item: `source, id, title, starts_at, ends_at, place, from_name,
  image_url, going, open_key, open_params`, plus `total`. It reads gatherings and market events with its own read-only SQL, using the same rules
  as those modules (active membership, community active and not hidden; a scheduled event the person is going to). It writes nothing.
- Home (`features/home/screens/HomeIndex.tsx`) is now: a greeting, **Your upcoming events** (three, then "Show all (n)" / "Show fewer" in place),
  **Your calendar** (Part 2). The countdown, the day's rows, the check-in, the tree card, the Today gathering card and the links are gone
  (`ActivityCard.tsx`, `MonthPlanner.tsx`, `day.ts` stay, unlinked). The once-a-minute heartbeat and the reminder pop-ups still run.
  **Kept on purpose:** the "{n} in your family asked for help" banner, because it is a safety alert and has no other place on the first screen.
- `EventCard.tsx`: the time words and the source tag (Community, Market, Wisdom: each its own icon, word and colour) share the top line, so the
  title has its own full line below and is never covered; the picture (84 by 84) on the right only when the event has one.
- `when.ts` (Today, Tomorrow, Yesterday, a weekday within the week, a short date; six languages) and `when.check.ts` (19 checks).
- Empty state with the two buttons; skeletons while loading; "Could not load, try again" with a retry.

**Part 2, Home: your calendar**
- `month.ts` (pure: Monday-first cells, flags, trophies, one list per day with each event once) and `month.check.ts` (25 checks).
- `HomeCalendar.tsx`: month and year with two 56-wide arrow buttons, weekday names, day cells 60 high with a ring on today, a flag (soft fill)
  on days from today with something coming up, a trophy on days up to today the person showed up, and the legend under the grid. Tapping a
  day opens a centred pop-up (React Native `Modal`; the device back button and a tap outside close it) with each event's title, time, place,
  source tag and "You are going" or "You were there", and one big Close. Tapping an event opens it.
- Data: `/v1/home/upcoming?days=92`, the leaves from `/v1/nodes/wisdom` (paged back as far as the shown month needs), and the person's own
  calendar occurrences of kind **appointment** and **event** only (daily medicine reminders would put a flag on every day; occurrences of
  community gatherings are left out because the upcoming list has them). The same event from two places is one item.
- To tell a leaf and an upcoming event apart, `/v1/nodes/wisdom` now also returns each leaf's `ref_id` (B's own endpoint; additive).
- A day that has a trophy and something still coming up later shows the trophy (the pop-up shows both).

**Part 3, the Marketplace**
- Migration `0062`: `market_events.interests` (only the eight keys, checked) and `market_event_attendance`.
- `modules/market/attendance.py`: `recommended`, `mark` / `unmark`, `mine`, `event_summary`, `summary`, `clean_interests`; routes in
  `events_router.py` exactly as the iteration file names them; `q` on `list_events`; `interests` on every event card and on create
  (admins and hosts) and edit (hosts); `attended` on `GET /v1/market/events/{id}`. Counts only in both summaries.
- `test_market_attendance.py`: 7 tests (not going, before the start and after 30 days refused; change and undo; the leaf follows the answer;
  my market days; summaries for admins and the event's own host only, no names; search; ranking by interests, distance, the area fallback and
  soon, going ones left out; the intent filter; only the eight interests). Distances in the test come from places written into `geo_places`.
- The tab (`MarketHome.tsx`, rewritten): the search bar (56 high, clear button, 0.4 s pause); **Your market days** with the status pill
  (Going, Did you go?, You went, You didn't go) and, on "Did you go?", the two equal buttons side by side (filled green tick "I went", outlined
  cross "I didn't go") — after a tap the pill changes, a Change link appears, the toast says "Thank you, noted." and `refreshWisdom()` runs;
  **Recommended for you** with the intent chips, grouped under date headings, each row with the host, time, venue, distance and one reason chip.
  The "My host" row stays for host members. Rows waiting for "Did you go?" come first, then the coming ones, then the answered ones.
- Event page (`MarketDay.tsx`): `MapCard` with the address (or venue and area) and, once the day has started and the person was going, the
  same pill and buttons. Host form (`HostHome.tsx`): eight interest chips.
- Words: `features/home/homeWords.ts`, `features/home/when.ts`, `features/market/revampWords.ts` (also used by the host form), six languages.
- Demo (`showcase.py`): `python backend/run.py showcase uncle.tan@demo.wisdom.test --market` makes or moves seven market events in real
  Singapore venues (Our Tampines Hub as their host): one this week he is going to, four to recommend, one past day answered "I went" (a leaf and a
  trophy), one past day waiting for his answer. The dates move with today, so it is safe to run every day. Run twice locally: the same seven events.

### What was tested and how
- Backend: `test_health_home.py` (3 new tests), `test_nodes.py`, `test_market_attendance.py` pass. Whole suite: **431 passed, 16 failed**; the 16
  are the same tests that fail on `main` (A's A1 log lists the same set: checkins, wisdom conversation, hosts milestones, tunnels, recurrence,
  safety agent, belonging nudge).
- App: `tsc` clean; `when.check.ts`, `month.check.ts`, `wisdomTree.check.ts`, `day.check.ts` pass; `selftest.ts` only `Singpass is person-only`
  fails (A's, as before); `expo lint` shows 6 problems, all in A's files (`connect/pages/index/Screen.tsx`, `wisdom/screens/*`). The old lint
  errors in `MarketHome.tsx` are gone with the rewrite.
- In the browser (Edge through Playwright, 390 by 844, signed in as Uncle Tan): Home with five events (tags, the picture on one card only,
  "Show all (5)" and "Show fewer"), the calendar (trophy days, flag days, a day pop-up and Close), the Marketplace (Did you go?, Going, You went,
  Change, "I went" with the toast, search for "tai chi", a search with no match) and the event page with the map card and the answer.
  **The running API on port 8800 does not have the new routes yet** (it needs a restart, which the house rules leave to the owner), so the test
  browser answered them: for the Marketplace with **Uncle Tan's real responses computed by the new backend code from the local database**, for
  Home with a stand-in list of five events.

### NOT done or NOT tested
- **Wisdom sessions on Home**: waiting for A2's `wisdom.service.upcoming_sessions`; Home picks them up by itself once it exists (it uses the
  session's own `open_key` and `open_params` when A2 returns them, otherwise `wisdom.index`).
- Not tested: the real API in a browser (restart needed), a real Google Maps key (without one the map picture hides and the address and the
  button show), a real phone, the five other languages on screen, the largest text size, a screen reader, reduced motion.
- The interests of a **repeating** market day are kept only on the days made at creation (`modules/recurrence.py` is shared and was not changed).
- On the event page "Not going" still shows after the day has started.
- No pull request, nothing pushed.

### Next step
Restart the API, run `python backend/run.py showcase uncle.tan@demo.wisdom.test --market`, look at Home and the Marketplace as Uncle Tan, then push.
A3 (Person A) adds the Wisdom items on Home if A2 does not provide `upcoming_sessions` in the contract's shape.

## Requests for the other person
- **A (A2):** switch A's sub-screens from `<Screen … back>` to `BackScreen` from `components/BackButton.tsx` (same `title` and `subtitle`
  props), or put `<BackButton />` beside your own layout and leave `BACK_SPACE` free at the top.
- **A (A2):** after a Wisdom session is completed, call `feed.showed_up(conn, user_id, 'wisdom', session_id, title, at, other_person_name)`
  for both people, and in the app call `refreshWisdom()` from `features/grow/wisdomStore` after "I'm here" and after a completed session.
- **A (any time):** set `tab: 3` on `wisdom.index` (it is 2). `market.index` is `1.5` only to sort between Communities and Wisdom without
  touching your file; once Wisdom is 3, B sets the Marketplace to 2.
- **A:** `selftest.ts` check `Singpass is person-only` fails on `main` (the `singpass` element of `auth.signIn` is not `agent: 'human'`).
- **A (A3):** `AuthGate` should land on `home.index` (contract point 8); today `firstTab` still prefers Wisdom.
- **A (A2):** `wisdom.service.upcoming_sessions(conn, user_id, until)` as in contract point 5. If each row also carries `open_key` and
  `open_params` (the session page), Home opens it there; otherwise Home opens `wisdom.index`.
- **A (A2):** after "I'm here" on a gathering, call `refreshWisdom()` so the header tree and Home's calendar trophy update at once.

## Later
- Agent skill: "how many leaves do I have" and "what did I show up to" from `/v1/nodes/wisdom` (skills are frozen for the revamp).
- The header title is centred on the bar; with a much longer app name it would need to shrink.
- The 16 failing backend tests and the lint problems in A's files are older than the revamp and belong to other areas.
- Agent skills for the Marketplace answer ("did I go?", "I went to …") and for "what is on Thursday" (skills are frozen; the app pages already
  publish them, so the in-app agent can do both today).
- `modules/recurrence.py`: carry `interests` onto repeating market days made later.
- Hide "Not going" on a market day page once the day has started.
