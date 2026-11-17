# A1: Communities and maps (round 1, in parallel with B1)

Branch: `a/communities-maps` (from the latest `main`).
Read first: `AGENTS.md`, `team-docs/12-revamp/README.md` (ownership, contract points 1, 2, 3, 4; screen rules),
`team-docs/02-product/communities.md`, then this file.
Pictures: `reference/12-community-page.png`, `13-community-events.png`, `14-community-events-more.png` (content and order of a community
page and its events); in `reference/luma/`: `luma-287` to `289` (search and results), `luma-022` and `luma-392` (rows with a small status
pill), `luma-023` ("Picked for you · Nearby"), `luma-273` and `luma-280` (a calendar's page: the model for a community page), `luma-039`
(Location with a map, "121 going" with faces), `luma-025` to `027` (Upcoming / Past, date headings), `luma-047` (a leave sheet),
`luma-051` (a green toast), `luma-006` (an empty state). Layout only. Our images go on the **right** of a card.

This is a large iteration in four parts. Do them in order, keep the app working after each part, and commit after each.

## Goal
1. A small shared **maps and distance** module (`geo`), which B2 also uses.
2. **Community data and ranking**: after onboarding the person sees the **10 most relevant communities** (interests and distance) and
   chooses **up to 3**.
3. The **Communities tab**: a search bar, "Your communities", "Picked for you"; each community one clear card with **Join WhatsApp group**
   and **See events**.
4. The **community page**: what it is, who is in it, where it meets (with a map), what is coming up, WhatsApp, leave.

## What exists today
- A person is in **three communities at most** (`modules/communities/rules.py`: `MAX_COMMUNITIES = 3`, `limits`, `check_slot`, `join_open`).
  `rules.explore(conn, user_id, q)`: every active community by member count, with search by name, area and description.
- `features/connect/pages/pick` (`connect.pick`, route `/choose-places`): a first-run list where the person ticks up to three.
  `GenderAsk.tsx` asks for gender once when a men-only or women-only circle needs it.
- `features/connect/pages/index` (`connect.index`, route `/communities`), `CommunityCards.tsx`, `ExploreCard.tsx`, `SuggestionsCard.tsx`.
- `features/community/pages/home` (`community.home`, route `/community/[id]`), `features/community/screens/` (Events, Event, People and
  more), the belonging cards (`BelongingCards.tsx`).
- `api/communities.ts`: `getUpcoming`, `setGoing` (`POST /v1/communities/activities/{id}/going`). `api/lead.ts`: `checkIn`
  (`POST /v1/communities/activities/{id}/checkin`, "I'm here"), which calls `feed.attended`; B1 makes that earn the leaf. Never count leaves yourself.
- `communities.cover_url`, `area_name`, `audience`, `circle`, `host_id`, `hidden_at`. `market_events.address`, `venue_name`, `area_name`.
- The floating Back button arrives with B1 (round 1, in parallel): in this iteration keep the sub-screens' existing back header; A2
  switches them to `BackButton`.

---

## Part 1: maps and distance (`geo`)

### The key
`GOOGLE_MAPS_API_KEY`, read only on the server from `backend/.env` (the owner adds the value; it needs the **Geocoding API** and the
**Maps Static API**). Add the name with an empty value to `backend/.env.example`. Never send it to the app, never log it, never return it.
Without a key everything still works: no map picture, and distance falls back to area names.

### Backend (new module `backend/app/modules/geo`)
1. Migration `0042`: `geo_places (key text primary key, lat double precision, lng double precision, found boolean not null, geocoded_at
   timestamptz not null)`, where `key` is the address lower-cased with spaces collapsed; and the column `communities.address` (text, at
   most 200, null: the usual meeting place), which the picture route below reads and Part 2 fills.
2. `geo/service.py`: `locate(conn, address) -> (lat, lng) | None`: the cache first; otherwise Google Geocoding with a 5-second timeout;
   "not found" is cached for 7 days; never raises; `None` without a key or an address. `distance_km(a, b)`: haversine.
3. `geo/router.py`: `GET /v1/geo/map/community/{id}.png` and `GET /v1/geo/map/event/{id}.png`. The server reads the **stored** address
   (`coalesce(communities.address, communities.area_name)`; for an event `market_events.address`, or venue and area: a read-only use of
   B's table), fetches one Maps Static picture (600 by 300, scale 2, one marker), keeps the bytes under `backend/.cache/maps/` for 30 days
   (add the folder to `.gitignore`), and sends them with a long `Cache-Control`. 404 when there is no address, no key, or the community is
   hidden. **Never a free-text query**, so nobody can use our key through us. The routes need no sign-in (an image tag cannot send one), so
   they show only what is already public on a card: the place.
4. Register the router with **one line** in `backend/app/main.py` (the only edit to that file in the revamp).
5. Tests in `backend/tests/test_geo.py` with mocked HTTP: cache hit; not found cached; no key gives `None` and 404s; a hidden community 404s;
   distance right for two known points; the key never appears in any response or log line.

### App
1. `app/src/api/geo.ts`: `mapImageUrl(kind, id)` (the picture route on the API's base URL) and `openInMapsUrl(address)`
   (`https://www.google.com/maps/search/?api=1&query=<encoded address>`).
2. `app/src/components/MapCard.tsx` with props `{ kind: 'community' | 'event'; id: string; address: string }`: a heading "Where", the address
   in words (large, wraps), the map picture under it with rounded corners (hidden if it fails to load, so never a broken image), and a
   full-width **Open in Google Maps** button. Words in six languages in `features/connect`'s words file.

---

## Part 2: community data, ranking, and choosing up to 3 of 10

### Backend (`modules/communities`, migrations `0043`-`0049`)
1. Migration `0043`: `communities.whatsapp_url` (null; must match `^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$`),
   `communities.interests text[] not null default '{}'` (only the eight `INTEREST_KEYS` from `modules/onboarding/rules.py`; import, do not
   edit), `communities.events_url` (null, https; for example the community's own Luma calendar). Leaders (a role that can manage) and
   platform admins set these and `address` in the existing leader tools (`features/lead`) and on import; validate on the server.
2. **The WhatsApp link is shown only to active members** (it is an open invite). Everyone else gets `has_whatsapp: true|false`.
3. **One card shape** for explore, recommended and "my communities": `id`, `name`, `cover_url` (or `icon`), `audience`, `circle`,
   `member_count`, `faces` (up to 5 members' first names and avatar or null, **members only**; others get the leader's first name instead),
   `next_event` (`title`, `starts_at`, `place` of the next upcoming gathering, repeats included; or null), `distance_km` (or null),
   `reasons` (for example `{kind: "near", area: "Toa Payoh"}`, `{kind: "interest", key: "gardening"}`), `is_member`, `has_whatsapp`,
   `whatsapp_url` (members only).
4. `rules.recommend(conn, user_id, q="", limit=10)` at `GET /v1/communities/recommended?q=&limit=` (declared before any `/{community_id}`
   route). Leave out communities the person is in, hidden ones, and men-only or women-only ones that do not match the person's declared
   gender (keep them when gender is unknown; the join asks). Score: +2 per shared interest; distance from `users.area_name` to
   `coalesce(address, area_name)` with `geo`: up to 2 km +3, up to 5 km +2, up to 15 km +1; with no coordinates the same area name +2; ties
   by member count, then name. `q` searches name, area, description and host. A person with no interests still gets ten (nearest, then biggest).
5. Tests in `test_communit*.py`: interests raise; nearer raises; the area fallback without a key; audience left out; own communities left
   out; limit; `q`; the WhatsApp link never reaches a non-member; a bad WhatsApp link is refused.

### Demo content (A's seeds; idempotent)
At least **ten** communities with real Singapore places, a real address each, interests, licensed photos with credit, realistic members and
leads, a short plain description, a WhatsApp link for some, and upcoming gatherings each (one on now, so "I'm here" can be shown). Start from
the existing four in `seed_demo.py` (Bedok Heritage Kakis, Toa Payoh Silver Mentors, Tampines Kampung Spirit, Jurong Green Gardeners) and
add, for example: Bishan Walkers (walking), Ang Mo Kio Tai Chi Circle (taichi, walking), Woodlands Chess Corner (chess), Toa Payoh Music
Makers (music), Jurong West Digital Buddies (tech, teaching), Bishan Home Cooks (cooking). Every interest and every onboarding area has at
least one. Uncle Tan is a member of two, so "Your communities" is not empty.

### App: the choice (`connect.pick`, keep key and route)
1. Heading "Choose up to 3", a live "{n} of 3 chosen", the top 10 from `/recommended` as cards (text left: name, members, next event, the
   reason in words such as "Near you · 1.2 km" or "Because you enjoy gardening"; the picture on the right), each with a big tick when chosen.
   Room = 3 minus communities already joined. When full, the other cards dim and one calm line says: "You can be in 3 communities. Leave one
   later to join another."
2. Main button, full width at the bottom: **"Join and go to Home"** (or "Go to Home" with none chosen). Joining uses the existing join and
   `GenderAsk` when needed. Also "Skip for now". Afterwards: `home.index`.
3. When it shows: the last onboarding screen's button opens this page first, once (A person already in three never sees it). Change only
   that one button target in `features/onboarding`; A3 checks the whole flow.
4. Loading: card skeletons. If the ranking fails, show today's plain list instead of an error wall.

---

## Part 3: the Communities tab (`connect.index`)
1. **Search bar** at the very top (at least 56 high, a search icon, "Search communities", a clear button). Typing searches
   `/recommended?q=` after a short pause; the results replace the two lists below. Nothing found: "No communities match '{q}'" and a link to
   ask to start one (the existing create flow).
2. **"Your communities"** with "{n} of 3" beside the heading. With none: one friendly line and the button "See communities for you"
   (opens `connect.pick`).
3. **"Picked for you"**: the recommended list (without the person's own).
4. **The community card** (one component in `features/connect`, used by both lists, the search results and the choice in Part 2):
   - left: the name (wraps, never cut); the members ("24 members" with up to five small faces for a member, or "24 members · led by Meena"
     for others); the next event with a calendar icon ("Sat 22 Nov, 7:30 am · Morning walk, Bishan Park") or "No gathering planned yet";
     one reason or distance chip ("Near you · 1.2 km", "Gardening"); the audience badge when it is men-only or women-only;
   - right: the community's picture (a fixed square, rounded), or its icon when it has none;
   - under them, two equal buttons side by side, at least 56 high, icon and word:
     **Join WhatsApp group** (a member, when a link exists; opens it); a leader without a link sees **Add WhatsApp link** (opens the
     leader tools); a non-member sees **Join** instead (the existing join, `GenderAsk` when needed, the 3-limit message when full);
     **See events** (opens `community.events`);
   - tapping anywhere else on the card opens `community.home`.
5. Keep the start-a-community and join-with-a-code entries reachable from the bottom of the page (one plain row each), not in the main
   flow. Remove anything on the page that repeats the two lists.
6. Time words ("Today", "Tomorrow", weekday names) come from one helper in `features/community` with a check file
   (`features/community/when.check.ts`): today, tomorrow, this week, later dates, six languages.
7. Publish the page data (`usePageData`) so the agent can read the communities and press "See events" or "Join" by name.

---

## Part 4: the community page (`community.home`) and its events
1. **The page**, top to bottom:
   - the community's picture across the top (it identifies the place, so it earns its space); the name; who it is for (audience) and its
     feeling in words; "brought in from {host}" for imported ones;
   - the description (three lines, then "More");
   - **members**: up to five faces and "24 members" (members only; opens People), or "Led by {name}" for others; the leader's row with
     "Community Lead: {name}" (our existing role word);
   - **actions**, big buttons with words: for a member **Join WhatsApp group** (when a link exists; a leader without one sees
     **Add WhatsApp link**) and **More** (share the invite, leave, report); for a non-member one full-width **Join**;
   - **Where we meet**: `MapCard` with the community's address;
   - **Coming up**: an Upcoming / Past switch, date headings ("Tomorrow · Wednesday"), event cards (below); if `events_url` is set, a plain
     "Open our events page" link;
   - the belonging cards, unchanged, at the bottom; lead tools, invites, initiatives and updates under one "More about this group" button.
2. **Event card**, one self-contained card per gathering (in the reference pictures the button floats outside the card and the agent button
   covers text: fix both):
   - left: the title (wraps, never cut), a clock icon with the time in plain words ("Tomorrow, 7 am"), a pin icon with the place,
     "28 going"; right: the event's picture when it has one;
   - inside the card, full width: **"I'm going"**. After a yes: a green "You are going" with a tick, "Come along to earn 1 leaf", and a
     small "Change";
   - while the gathering is on (the existing check-in window): **"I'm here"**. After it: "You came" with a tick and "+1 leaf";
   - enough space at the end of the list that the last card clears the bottom of the screen and the agent button.
3. **Leave**: a bottom sheet with one plain sentence ("You will no longer see this group's events. You can join again later.") and a big red
   **Leave community** button (no slide gesture), then a green toast "You left {name}" and back to the Communities tab.
4. `community.events` (See events on the card) shows the same Upcoming / Past list with the same cards.
5. Publish the page data so the agent can read the events and press "I'm going" by name.

---

## Files you may touch
New `backend/app/modules/geo/**`, `backend/tests/test_geo.py`, one line in `backend/app/main.py`, `backend/.env.example`, `.gitignore`
(the cache folder), new `app/src/api/geo.ts`, new `app/src/components/MapCard.tsx`, `app/src/features/connect/**`,
`app/src/features/community/**`, `app/src/features/lead/**`, `app/src/features/onboarding/**` (only the last button's target),
`app/src/api/communityRules.ts`, `app/src/api/communities.ts` and `app/src/api/lead.ts` (add only; never change `setGoing`, `getUpcoming`
or `checkIn`), `app/src/app/choose-places.tsx`, `app/src/app/(tabs)/communities.tsx`, `app/src/app/community/**`,
`backend/app/modules/communities/**`, `backend/tests/test_communit*.py`, migrations `0042`-`0049`, A's seed files.
In `selftest.ts` only existing lines about `connect` or `community`. Update the Status section of `team-docs/02-product/communities.md`.

## Done when
- **Maps**: with a key in your own `backend/.env`, a community shows its map picture and the second request comes from the cache; without a
  key the address and the button show, with no broken picture and no error in the server log.
- **Choice**: after seeding there are at least ten communities; a new account that enjoys walking and lives in Bishan sees Bishan Walkers
  first; choosing three joins them and lands on Home; a fourth cannot be chosen.
- **Tab** (as Uncle Tan, phone size): search finds a community by name and by area; "Your communities" shows "n of 3"; a member's card opens
  WhatsApp; a non-member's card joins (and refuses a fourth with the calm message); "See events" opens the events; the card opens the page.
- **Page**: reads top to bottom as above; "I'm going" turns green and survives a reload; "Change" takes it back; "I'm here" on the gathering
  that is on now shows "+1 leaf"; WhatsApp opens; Leave asks, leaves and shows the toast.
- Largest text size: the two card buttons stay side by side with wrapped words; nothing cut or covered by the bottom bar or the agent button.
  All six languages.
- `cd backend && python -m pytest tests -q`; `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts`;
  `npx tsx src/features/community/when.check.ts` pass.
- `LOG.md` entry: what was tested and how, what was not (for example, whether a real Maps key was tried), and the final community list.
