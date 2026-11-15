# B4: Home, top half: "Your upcoming events" with Yes and No

Branch: `b/home-upcoming-events` (from the latest `main`, after B3 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (contract points 3 and 4, screen rules), then this file.

## Goal
Home (the middle tab) has two halves. This iteration builds the **top half: "Your upcoming events"**: one card per upcoming event from the
person's communities and from the Marketplace. Each card is tagged with where it comes from and has a green **Yes** and a red **No** on the
right. When the event is on and the person shows up ("I'm here"), they earn one leaf, and the card shows it.

## What exists today
- `features/home/screens/HomeIndex.tsx` (key `home.index`, route `/`): a greeting, the next thing with a countdown, the day's rows, the
  daily check-in, one gathering card (`ActivityCard.tsx`, which already has "I'm here"), a tree card, a month (`MonthPlanner.tsx`) and links.
- Person A's files, to **call and not edit**: `getUpcoming` and `setGoing` in `api/communities.ts`, `checkIn` in `api/lead.ts`
  (`POST /v1/communities/activities/{id}/checkin`).
- Marketplace (yours): bookings (`getBookings`, `decideBooking`, `cancelBooking`, `completeBooking`), market events
  (`/v1/market/events`, `.../going`, and the check-in from B1).
- `backend/app/modules/home/router.py` has `GET /v1/home/summary`. The leaf rule and `refreshWisdom()` come from B1 and B3:
  **a leaf is earned only by showing up, never by answering Yes.**

## Build
### Backend (`modules/home`)
1. Migration `0022_event_answers.sql` (or the next free even number): a table of the person's answers,
   `event_answers (user_id, source, event_id, answer, answered_at)`, unique on person, source and event; `source` is `community`,
   `market_event` or `booking`; `answer` is `yes` or `no`. It exists so a **No** is remembered too (today only a yes is stored).
2. `GET /v1/home/upcoming`: everything from a few hours ago (so an event that is on now still shows) to 14 days ahead, soonest first, at most 20:
   - gatherings of the communities the person is in;
   - market events the person or one of their communities is going to;
   - bookings the person is part of, as the provider ("your session") or as the taker ("you are attending"), requested or agreed.
   Each item: `source`, `id`, `title`, `starts_at`, `place`, `from_name` (the community's name; `null` for the Marketplace), `role`
   (`provider`, `taker` or `null`), `answer` (`yes`, `no` or `null`), `can_check_in` (true while the person may say "I'm here" or, for a
   booking, mark it complete), `attended` (true once they showed up and have the leaf).
3. `POST /v1/home/upcoming/answer` with `source`, `id`, `answer`: records the answer and does the real thing through the owning module's
   existing service function (never by writing another module's tables directly):
   - community gathering: going on or off;
   - market event: going on or off;
   - booking: for a provider answering a **request**, Yes accepts and No declines; for an agreed booking, Yes confirms and No **cancels**
     it (the app asks first, see below).
   It answers with the new `answer`. It never gives a leaf.
4. `POST /v1/home/upcoming/here` with `source`, `id`: the person showed up. It calls the owning module's check-in (community gathering,
   market event) or completion (booking), and answers with `attended`, `leaf_earned` and the new total `leaves`.
5. Tests in `backend/tests/test_health_home.py`: the three sources appear, in time order; another person's events never appear; yes gives
   no leaf; "here" inside the window gives one and a second "here" gives none; "here" outside the window is refused; a No is remembered
   after a reload; a provider's yes accepts the request; only the people in a booking can answer it.

### App (`features/home`)
1. Home becomes: the greeting line ("Good morning, {name}"), then **"Your upcoming events"**, then the calendar section (B5 builds it;
   for now leave the existing month where it is). Remove from Home: the countdown and day rows, the daily check-in, the tree card (the
   tree is in the header now) and the row of links. Keep the reminder pop-ups and the once-a-minute heartbeat working.
2. **Event card**, one per event:
   - top: a tag pill, "From Bishan Walkers" (the community's name) or "From Marketplace"; for a booking add "Your session" or "You are attending";
   - the title (wraps, never cut), the time in plain words ("Tomorrow, 7 am"), the place;
   - right side: two large round buttons, each at least 56 across with its word beneath: a **green** one with a tick, "Yes", and a
     **red** one with a cross, "No". Colour is never the only signal: the icon and the word are always there.
   - after **Yes**: the buttons give way to a green line "You are going" with a tick, the line "Come along to earn 1 leaf" with a leaf
     icon, and a small "Change".
   - after **No**: a quiet line "Not going" and a small "Change".
   - when `can_check_in` is true: one full-width green button on the card, **"I'm here"** (for a booking: "We met"). Pressing it shows
     **"+1 leaf"** with a leaf icon on the card, and calls `refreshWisdom()` so the header's tree gains its leaf.
   - when `attended` is true: "You came" with a tick and the "+1 leaf" badge; no buttons.
   - No on an agreed booking first asks: "This cancels the booking. Are you sure?" with Yes and No.
3. Show the next three events. If there are more, a full-width button "See all events (7)" opens a new page `home.events`
   (route `/events`) with the full list, the same cards and Back.
4. Nothing upcoming: one friendly line and a button to the Community tab.
5. A time-words helper inside `features/home` (today, tomorrow, weekday, date; six languages) with a check file. Declare the buttons in
   `definePage` and publish the page data so the agent can read the events and answer by title; answering and "I'm here" stay `agent: 'confirm'`.

## Files you may touch
`app/src/features/home/**`, `app/src/api/home.ts`, `app/src/api/market.ts`, `app/src/app/(tabs)/index.tsx`, new `app/src/app/events.tsx`,
`backend/app/modules/home/**`, `backend/app/modules/market/**` (only if a service function is missing), the migration above,
`backend/tests/test_health_home.py`, `backend/app/showcase.py` (demo events with realistic names, including one that is on now, so
"I'm here" can be shown). In `selftest.ts` only existing lines about `home`.

## Done when
- At phone size with a seeded account: community and marketplace cards appear with the right tags; Yes turns the card green and promises
  the leaf without giving it; No is remembered after a reload; "Change" works; on an event that is on now, "I'm here" shows "+1 leaf" and
  the header tree gains a leaf; "See all events" opens the list.
- Largest text size: the Yes and No buttons never squeeze the title into one-word lines (let the buttons drop under the text if needed).
- Backend tests, the new check file, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
