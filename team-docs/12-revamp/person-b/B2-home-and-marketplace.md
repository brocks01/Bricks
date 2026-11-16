# B2: Home and the Marketplace (round 2, in parallel with A2)

Branch: `b/home-marketplace` (from the latest `main`, after B1 and **A1** are merged: you need `geo` and `MapCard`).
The Wisdom items on Home need A2; if A2 is not merged when you get there, build the rest, say so in `LOG.md`, and A3 adds them.
Read first: `AGENTS.md`, `team-docs/12-revamp/README.md` (contract points 1 to 5; screen rules), `team-docs/02-product/marketplace.md`,
then this file.
Pictures in `reference/luma/`: `luma-022` and `luma-392` ("Your events": one row per event, a status pill), `luma-023` ("Picked for you ·
Nearby" grouped by date), `luma-287` to `289` (search), `luma-077` and `luma-078` (a big green Accept beside a plain Decline: the model for
"I went" / "I didn't go"), `luma-181` and `luma-183` (status chips), `luma-051` (a toast), `luma-006` (an empty state). Layout only; our
pictures go on the **right** of a card.

Three parts. Do them in order, keep the app working after each part, and commit after each.

## Goal
1. **Home, top half: "Your upcoming events"**: one list from **Communities**, the **Marketplace** and **Wisdom**, each card tagged in its
   **top-right corner** with where it comes from. Three show; "Show all" opens the rest.
2. **Home, bottom half: "Your calendar"**: one plain month, a **checkpoint** on days with an upcoming event, a **trophy** on past days the
   person showed up. Tapping a day shows its events.
3. **The Marketplace tab**: a **search bar**; **"Your market days"**, where after the day the person answers **I went** (tick) or
   **I didn't go** (cross), tracked for analytics; then **"Recommended for you"**, ranked by interests and distance.

## What exists today
- `features/home/screens/HomeIndex.tsx` (`home.index`): a greeting, a countdown, the day's rows, a daily check-in, one gathering card
  (`ActivityCard.tsx`), a tree card, a month (`MonthPlanner.tsx`) and links. `ReminderPopups.tsx`. `GET /v1/home/summary`.
  `api/calendar.ts` (`calendarApi.occurrences`). `features/calendar/` holds the older calendar pages.
- Community gatherings: A's `getUpcoming` and `setGoing` in `api/communities.ts` (call, never edit).
- `features/market/screens/MarketHome.tsx` / `MarketIndex.tsx` (`market.index`, route `/market`): "Happening near you" with intent chips (earn,
  contribute, volunteer, enjoy) and a host on each event; `market.day` (`/market/day/[id]`, `MarketDay.tsx`) with going and stalls; the
  "My host" row for host members. Paid services moved to Wisdom on 16 Nov; this tab is events only.
- Backend `modules/market/events.py`: `list_events` (intent, area, kind), `get_event`, `set_going` (`market_event_goers`), stalls, plans,
  milestones. `modules/hosts` (owners and editors).
- From B1: `feed.showed_up`, `GET /v1/nodes/wisdom`, `refreshWisdom()`, `BackButton`. From A1: `geo` and `MapCard`. From A2:
  `wisdom.service.upcoming_sessions(conn, user_id, until)`. Interests and area on the user (contract points 1 and 2).

---

## Part 1: Home, upcoming events

### Backend (`modules/home`)
1. `GET /v1/home/upcoming?limit=`: from a few hours ago (so something on now still shows) to 30 days ahead, soonest first:
   - gatherings of the communities the person is in (with whether they said "I'm going");
   - market events the person said they are going to;
   - Wisdom sessions from `upcoming_sessions` (if A2 is not merged yet, leave them out; see the top of this file).
   Each item: `source` (`community`, `market`, `wisdom`), `id`, `title`, `starts_at`, `ends_at`, `place`, `from_name` (the community's name,
   the host's name, or the other person's name), `image_url` (the event's or community's picture, or null), `going` (true or false),
   `open_key` and `open_params` (the page that shows it: `community.event`, `market.day`, or A2's session page). It calls the owning modules'
   functions; it never writes another module's tables.
2. Tests in `backend/tests/test_health_home.py`: the sources appear, in time order; another person's events never appear; a community the
   person left disappears; the window is respected.

### App (`features/home`)
1. Home becomes, with B1's header on top: a short greeting ("Good morning, {name}"), **"Your upcoming events"**, then **"Your calendar"**
   (Part 2). **Remove** from Home: the countdown and the day's rows, the daily check-in, the tree card (the tree is in the header), and the row
   of links. Keep the reminder pop-ups and the once-a-minute heartbeat working.
2. **Event card** (tapping it opens the event in its own section):
   - a **tag pill in the top-right corner** with an icon and a word: **Community**, **Market** or **Wisdom** (each its own icon and colour,
     never colour alone);
   - left: the title (wraps, never cut; it wraps under the tag rather than being covered); the time in plain words ("Tomorrow, 7 am"); the
     place; "From {from_name}"; and "You are going" with a tick when `going` is true;
   - right: the picture **only when it helps recognise the event** (a community's or venue's photo); otherwise nothing, and the text uses the
     width. The same picture size on every card that has one.
3. Show the next **three**. If there are more, a full-width **Show all ({n})** under them: the list then grows in place to show every upcoming
   event (the page scrolls), and the button becomes **Show fewer**.
4. Nothing upcoming: a friendly line ("Nothing coming up yet. Your communities and the Marketplace have things to join.") and two buttons,
   **Communities** and **Marketplace**.
5. A time-words helper in `features/home` (today, tomorrow, weekday, date; six languages) with a check file `features/home/when.check.ts`.
   Publish the page data so the agent can read the events by title.

---

## Part 2: Home, the calendar
1. A simple month in `features/home` (a pure helper `features/home/month.ts` builds the cells):
   - the month and year in words ("November 2026") with two big arrow buttons for the previous and next month, each with a spoken label;
   - weekday names, then the days, Monday first; day cells at least 44 by 44 with large numbers; **today** has a clear ring;
   - a day from today onward with an event: a **checkpoint** (a flag icon under the number, with a soft fill);
   - a past day on which the person earned a leaf (`/v1/nodes/wisdom`): a **trophy** icon under the number;
   - every other day is plain. No week numbers, no per-kind coloured dots, no list under the grid.
   - Under the grid, one line explains the two signs with the icons themselves: "Flag: something coming up · Trophy: you were there".
2. **Tap a day**: a centred pop-up over a dimmed page (not a new page): the date in words as the title, then each event that day with its
   title, time, place, its source tag (Community, Market, Wisdom), and its state ("You are going", "You were there" with a trophy). A day with
   nothing: "Nothing on this day". One big **Close**; tapping outside or the device back button also closes it. Readable by a screen reader as
   a dialog. Tapping an event in it opens the event.
3. Events come from `GET /v1/home/upcoming` (and the person's own calendar occurrences); past days from `/v1/nodes/wisdom`. The same event is
   never counted twice.
4. `features/home/month.check.ts`: months starting on each weekday, a leap February, the checkpoint and trophy rules, no double counting, the
   month and weekday names in six languages.
5. Declare the arrows and the day choice in `definePage`, and publish the month's events so the agent can answer "what is on Thursday?". The
   older calendar pages stay reachable from the profile's "More" list; they are not linked from Home.

---

## Part 3: the Marketplace

### Backend (`modules/market`, migrations `0062`-`0069`)
1. Migration `0062`: `market_events.interests text[] not null default '{}'` (only the eight `INTEREST_KEYS`); and
   `market_event_attendance (event_id, user_id, attended boolean not null, marked_at timestamptz not null, source text not null ('app' or
   'agent'), primary key (event_id, user_id))`. Hosts and admins set `interests` in the existing host form (`features/host`) as chips.
2. **Search**: `list_events` gains `q` (title, description, venue, area, host name).
3. **Recommended**: `GET /v1/market/events/recommended?q=&limit=20`: upcoming, scheduled, not the ones the person is going to. Score: +2 per
   shared interest; distance from `users.area_name` to the event's address (or venue and area) with `geo`: up to 2 km +3, up to 5 km +2, up to
   15 km +1, or the same area name +2 without coordinates; +1 when it is within 7 days; ties by start time. Each event carries `distance_km`
   (or null) and `reasons`. The intent filter still works with it.
4. **Attendance**:
   - `POST /v1/market/events/{id}/attendance {attended: true|false}`: only if the person said they were going; only after the event started;
     up to 30 days after; can be changed (upsert); `DELETE` undoes it. `true` calls
     `feed.showed_up(conn, me, 'market', event_id, title, starts_at, host_name)`; changing to `false` or deleting calls it with `on=False`.
   - `GET /v1/market/mine`: `{upcoming: [...], to_answer: [...], answered: [...]}`: upcoming events the person is going to; past ones they were
     going to with no answer (last 30 days); the last 30 days' answers.
5. **Analytics**, counts only, never names:
   - `GET /v1/market/events/{id}/attendance-summary` (platform admins, and that event's host's owners and editors): going, went, didn't go,
     no answer, turn-up rate.
   - `GET /v1/market/attendance/summary?from=&to=` (platform admins): per event and totals.
6. Tests in `backend/tests/test_market_attendance.py`: not going refused; before the start refused; after 30 days refused; change and undo;
   the leaf follows the answer; another host's summary refused; no names in summaries; search; ranking (interests raise, nearer raises, the
   area fallback, going ones left out).

### App (`features/market`)
1. **Search bar** at the very top (at least 56 high, a search icon, "Search events", a clear button). It searches the recommended list with
   `q` after a short pause. Nothing found: "No events match '{q}'" and a "Show all" button.
2. **"Your market days"** (rows like Luma 22): left, the title, the date and time in plain words, the venue, and a status pill: **Going**
   (upcoming), **Did you go?** (past, no answer), **You went** or **You didn't go** (answered); right, the event's picture when it has one.
   - A "Did you go?" row has two equal buttons side by side, at least 56 high, icon **and** word: a **tick "I went"** (green, filled) and a
     **cross "I didn't go"** (outlined). After a tap: the pill changes, a small **Change** link appears, a toast says "Thank you, noted.",
     and "I went" calls `refreshWisdom()` so the header's tree gains its leaf.
   - Upcoming rows open `market.day`. Empty: "You haven't joined a market day yet."
3. **"Recommended for you"** (like Luma 23): the intent chips stay at the top of this section; events grouped under date headings
   ("Tomorrow · Wednesday"); rows with the title, the host, the time, the venue, "1.2 km" and one reason chip ("Near you", "Cooking"); the
   picture on the right when it helps. Tapping opens `market.day`.
4. Keep the "My host" row for host members.
5. **Event page** (`market.day`): add A1's `MapCard` with the venue; when the event has started and the person was going, the same tick and cross.
6. Publish the page data so the agent can search, read "Your market days" and answer "I went" by title (`agent: 'confirm'`).

### Demo content (`showcase.py`, for Uncle Tan; idempotent)
Upcoming market events in real Singapore venues with addresses and interests (one this week, so Home and the calendar show it); two past ones
he was going to (one answered "I went", which gives a leaf and a trophy day; one waiting for his answer), so every state shows.

---

## Files you may touch
`app/src/features/home/**`, `app/src/features/calendar/**` (only to reuse or move helpers), `app/src/features/market/**`,
`app/src/features/host/**` (the interests chips), `app/src/api/home.ts`, `app/src/api/calendar.ts`, `app/src/api/market.ts`,
`app/src/api/hosts.ts`, `app/src/app/(tabs)/index.tsx`, `app/src/app/today.tsx`, `app/src/app/(tabs)/market.tsx`, `app/src/app/market/**`,
`backend/app/modules/home/**`, `backend/app/modules/market/**`, `backend/app/modules/hosts/**`, `backend/tests/test_health_home.py`,
`test_market*.py`, `test_hosts*.py`, migrations `0062`-`0069` and `0110`-`0119`, `backend/app/showcase.py`. In `selftest.ts` only existing
lines about `home`, `calendar` or `market`. Update the Status section of `team-docs/02-product/marketplace.md`.

## Done when
- **Home** (as Uncle Tan, phone size): cards from the sources with the right tags; three show, Show all shows every one, Show fewer folds them;
  a card opens its event; pictures only on cards that have them, always on the right. A new account sees the empty state and its two buttons work.
- **Calendar**: this month shows flags on upcoming days and trophies on days he showed up; the arrows change month; tapping a day shows its
  events; Close returns to Home in the same place. Seven columns fit at the largest text size with no cut numbers.
- **Marketplace**: search narrows the list; "Your market days" shows Going, Did you go? and an answered one; "I went" changes the pill, shows
  the toast and adds a leaf to the header tree (and a trophy on that day); Change works; the recommended list is grouped by date with distance
  and reason; the event page shows the map (with a key) or the address and button (without). The summary endpoints return the right counts.
- Largest text size: the tag never covers a title; the two answer buttons stay side by side with wrapped words. All six languages.
- `cd backend && python -m pytest tests -q`; `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts`;
  `npx tsx src/features/home/when.check.ts` and `month.check.ts` pass. `LOG.md` entry: what was tested and how, what was not (for example,
  the Wisdom items if A2 was not merged yet).
