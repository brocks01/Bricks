# Revamp v2: four tabs, two people, no merge conflicts

The app gets **four tabs** on the bottom bar: **Home, Communities, Marketplace, Wisdom**.
The work is split between two people who work at the same time, in **five iterations in total, run in three rounds**:

| Round | Person A | Person B |
|---|---|---|
| 1 | [A1: Communities and maps](person-a/A1-communities-and-maps.md) | [B1: shell, leaves, Tree of Wisdom](person-b/B1-shell-leaves-tree.md) |
| 2 | [A2: Wisdom, Teach and Learn](person-a/A2-wisdom.md) | [B2: Home and the Marketplace](person-b/B2-home-and-marketplace.md) |
| 3 | [A3: onboarding, profile, and close](person-a/A3-onboarding-profile-close.md) | (done) |

In each round the two iterations run at the same time and do not touch each other's files. **Merge both iterations of a round before
starting the next round**: round 2 uses round 1's work on both sides, and A3 closes the whole revamp.
Each iteration is large and split into parts; the agent commits after each part, so a long run never loses work.

This folder replaces `team-docs/11-revamp` (on the branch `sarath/revamp-iterations`). It keeps that plan's ownership idea and the parts
that still hold, is updated to what `main` has today, and follows the newest direction (see "Decisions" below).

## Pictures
- [reference/](reference/) `01`-`11`: onboarding and sign-in. `12`-`14`: a community page and its events. They come from another app:
  copy the **layout, sizes and flow**, not its name, colours or fonts.
- [reference/luma/](reference/luma/): screens of the Luma events app, named by their number (`luma-022.jpg` is screen 22). Use them for
  **layout and hierarchy only**: the search bar, event rows, date headings, the calendar page, location with a map, bottom sheets, toasts,
  empty states. Never Luma's name, colours or fonts. Our colours are in `app/src/theme/tokens.ts`.
  These are third-party screenshots for the team's reference; keep them out of anything public.

## How to run an iteration
1. Start from the latest `main`: `git switch main && git pull`, then make the branch named in the iteration file.
2. Open the coding agent in the repo root and say: `Do team-docs/12-revamp/person-a/A1-communities-and-maps.md` (your own file).
3. The agent reads `AGENTS.md`, this README and the iteration file, builds it, runs the checks, and appends to **your own** `LOG.md`.
4. Look at the result in the browser at phone size. Open a pull request into `main`, squash-merge, then start the next iteration from the new `main`.

One iteration is one branch and one pull request. Do them in the order of the file numbers. For this revamp the team works on branches with
pull requests; that replaces `AGENTS.md`'s "never create branches" line for these iterations only. Every other rule in `AGENTS.md` holds.

## What each iteration needs from the other side
Round 1 needs nothing from the other side. After that:

| Iteration | Needs merged first | Why |
|---|---|---|
| A2 Wisdom | B1 | the floating Back button; `feed.showed_up` for a completed session |
| B2 Home and Marketplace | A1 | `geo` for ranking by distance; `MapCard` on the event page |
| B2 Home (only the Wisdom items) | A2 | reads `wisdom.service.upcoming_sessions`; if A2 is not merged yet, A3 adds them |
| A3 close | everything | it checks and finishes the whole revamp |

Never edit the other person's files to get unblocked: build everything else, say in your `LOG.md` what is waiting.

## The rule that prevents merge conflicts: file ownership
Each file has exactly one owner. **Never edit a file the other person owns, and never edit a file in the "nobody" list.**
If you need a change in someone else's file, write it under "Requests for the other person" in your `LOG.md` and tell them.

| | Person A owns | Person B owns |
|---|---|---|
| App features (`app/src/features/`) | `auth`, `onboarding`, `me`, `language`, `connect`, `community`, `explore`, `family`, `lead`, `wisdom` | `home`, `grow`, `calendar`, `market`, `host`, `health` |
| App components (`app/src/components/`) | `AuthGate.tsx`, `GoogleButton*.tsx`, `OtpBoxes.tsx`, `Hero.tsx`, new `MapCard.tsx` | `headers.tsx`, `AppTabBar.tsx`, `AgentOrb.tsx`, new `BackButton.tsx` |
| App state | `session/`, `prefs/` | none |
| App API clients (`app/src/api/`) | `communities.ts`, `communityRules.ts`, `belonging.ts`, `explore.ts`, `family.ts`, `lead.ts`, `wisdom.ts`, new `geo.ts` | `nodes.ts`, `home.ts`, `market.ts`, `marketSteps.ts`, `hosts.ts`, `calendar.ts`, `grow.ts`, `health.ts` |
| Route files (`app/src/app/`) | `welcome`, `sign-in`, `singpass`, `choose-language`, `onboarding`, `me`, `profile/`, `settings/`, `community/`, `choose-places`, `explore*`, `join-community`, `create-community`, `review-communities`, `communities-more`, `family/`, `claim`, `accounts`, `wisdom/`, `(tabs)/communities.tsx`, `(tabs)/wisdom.tsx` | `(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/market.tsx`, `(tabs)/calendar.tsx`, `(tabs)/grow.tsx`, `(tabs)/health.tsx`, `today`, `progress`, `calendar/`, `market/`, `host/`, `health*`, `activity`, `aspirations`, `contributions`, new `events.tsx` |
| Backend modules (`backend/app/modules/`) | `identity`, `onboarding`, `communities`, `belonging`, `explore`, `family`, `media`, `wisdom`, new `geo` | `nodes`, `home`, `market`, `hosts`, `calendar`, `grow`, `health` |
| Backend other | `core/config.py`, `seed_demo.py`, `seed_explore.py`, `seed_wisdom*.py`, `seed_uncle_tan.py`, `backend/seed_data/`, `backend/.env.example`, one line in `main.py` (A1 only, to register `geo`) | `showcase.py` |
| Backend tests (`backend/tests/`) | `test_identity*`, `test_onboarding*`, `test_communit*`, `test_belonging*`, `test_lead*`, `test_explore*`, `test_family*`, `test_claim*`, `test_delegations*`, `test_languages*`, `test_wisdom*`, `test_geo*` | `test_nodes*`, `test_habits*`, `test_health_home*`, `test_market*`, `test_mall_events*`, `test_hosts*`, `test_calendar*`, `test_calls*`, `test_grow*` |
| New migrations (`backend/migrations/`) | `0042`-`0049` (geo and communities), `0071`-`0079` (wisdom), `0101`-`0109` (identity and onboarding) | `0062`-`0069` (market), `0110`-`0119` (nodes, home) |
| Assets (`app/assets/`) | `brand/`, `onboarding/` | new `tree/` |
| Packages (`app/package.json`, `package-lock.json`, `backend/requirements.txt`) | **only Person A** may add a package | must use what is installed; ask A if one is needed |
| Log | `team-docs/12-revamp/person-a/LOG.md` | `team-docs/12-revamp/person-b/LOG.md` |

**Nobody edits these during the revamp** (they are shared, so two edits collide):
`app/src/features/index.ts`, `app/src/i18n/` (all of it, including `common.ts`), `app/src/components/ui.tsx`, `blocks.tsx`, `Skeleton.tsx`,
`ComingSoon.tsx`, `app/src/theme/tokens.ts`, `app/src/kit/`, `app/src/agent/`, `app/src/navigation/` (except the `selftest.ts` rule below),
`app/src/api/client.ts`, `backend/app/main.py` (except A1's one line), `backend/app/core/` (except A's `config.py`),
`backend/app/modules/agent`, `channels`, `voice`, `translation`, `safety`, `skills`, `backend/tests/conftest.py`, `AGENTS.md`, `CONTRIBUTING.md`.

What follows from that:
- **No new app modules** (they need `features/index.ts`). Add pages to a module you own. On the server the only new module is A's `geo`.
- **Words** go in your own feature's words file (six languages: en, hi, bn, ta, zh, ms), never in `i18n/common.ts`. You may *use* the common words.
- **Shared look**: if `components/ui.tsx` lacks a bigger button, card or chip, build it in a file inside a feature you own. A little
  duplication between A and B is accepted for now.
- **`app/src/navigation/selftest.ts`** is the one shared file both may touch: change only existing check lines that mention your own
  modules, one line at a time, never reorder, never add lines. New checks go in a `*.check.ts` file inside your own feature, run with `npx tsx <file>`.
- **Agent skills** (`modules/skills`) are frozen for the revamp. If a new behaviour should reach the agent, write it under "Later" in your `LOG.md`.

## The contract between the two halves
These are the only points where A's work and B's work meet. Both build against this text, so neither waits longer than the table above says.
The iteration that builds each point is in brackets.

1. **Interests.** The person's interests are `users.interests` (migration `0100`, already on `main`), using only these keys:
   `walking`, `taichi`, `cooking`, `chess`, `music`, `gardening`, `teaching`, `tech`. They arrive on the signed-in user (`GET /v1/me`,
   `sessionStore`'s `user`). B reads them as `(user as { interests?: string[] } | null)?.interests ?? []` without editing `session/store.ts`.
   On the server both import the tuple `INTEREST_KEYS` from `backend/app/modules/onboarding/rules.py` (A's; read-only for B).
2. **Where the person lives** is `users.area_name`. A writes it; B may read it.
3. **Maps and distance (A1).** A owns `geo`. Backend: `from app.modules.geo import service as geo`, then
   `geo.locate(conn, address) -> (lat, lng) | None` (cached, never raises, `None` without a key) and `geo.distance_km(a, b)`. Picture routes
   `GET /v1/geo/map/community/{id}.png` and `GET /v1/geo/map/event/{id}.png` (the event route reads `market_events` read-only). App:
   `api/geo.ts` (`mapImageUrl(kind, id)`, `openInMapsUrl(address)`) and `components/MapCard.tsx` with props
   `{ kind: 'community' | 'event'; id: string; address: string }`. B uses them read-only.
4. **Leaves (B1).** A leaf is earned only by **showing up**. B owns the rule and `modules/nodes`. The one function everybody calls:
   `nodes.feed.showed_up(conn, user_id, source, ref_id, title, at, source_name=None, on=True)`, with `source` one of `community`,
   `market`, `wisdom`. It is idempotent: one leaf per person, source and `ref_id`; `on=False` withdraws a leaf that came from a
   self-reported answer (B2's "I went" changed to "I didn't go"). The community check-in route (A's) already calls `feed.attended`;
   B1 makes that call earn the leaf, so A changes nothing there. A's Wisdom session completion (A2) calls `showed_up` for both people.
5. **Wisdom sessions for Home (A2).** A provides `wisdom.service.upcoming_sessions(conn, user_id, until) -> list[dict]` with `id`, `title`,
   `starts_at`, `place` (or `null`), `with_name`, `role` (`teacher` or `learner`). B's Home calls it read-only.
6. **The header and the Back button (B1).** B owns `components/headers.tsx` (`AppHeader`: the tree button on the left opens
   `grow.progress`; the profile button on the right keeps opening `me.index`) and `components/BackButton.tsx` (one floating Back button,
   always at the same top-left place). A switches A's sub-screens to `BackButton` in A2 and never draws its own.
7. **The bottom bar (B1)** shows only on the four tab pages: `home.index`, `connect.index`, `market.index`, `wisdom.index`.
   Every other page is a sub-screen: no bottom bar, the floating Back button.
8. **Where a person lands.** A owns `AuthGate.tsx`. After sign-in and onboarding the person lands on `home.index`.
9. **Page keys both may navigate to** (never rename them): `home.index`, `connect.index`, `connect.pick`, `community.home`,
   `community.events`, `market.index`, `market.day`, `wisdom.index`, `me.index`, `grow.progress`.
10. **Demo content.** The demo account is **Uncle Tan** (the Singpass button signs him in; his data lives in `backend/seed_data/uncle_tan.json`,
    kept in step on every server start by `identity.ensure_uncle_tan`). A seeds communities and Wisdom content (A's seed files);
    B seeds market days, attendance and leaf history with `showcase.py`. Seeds are idempotent and use realistic names.

## Rules for every screen (the people using this are older)
- Body text at least 18, headings at least 26, and everything still fits at the largest text size.
- Every button at least 56 high with a word on it (an icon alone is not enough). One main action per screen. Generous spacing.
- Strong contrast, no thin grey text for anything that matters. No swipe-only, slide-to-confirm or long-press-only actions.
- **Images only where they help a person recognise something, and then always on the right of the card**, with the text on the left and
  the same image size everywhere. No decorative images.
- **The floating Back button** at exactly the same top-left place on every sub-screen. Sub-screens have no bottom bar.
- Friendly empty states. Loading shows skeletons; a failed load says "Could not load, try again" with a retry.
- Every word in six languages. Every button and field declared in the page's `definePage` so the agent can see and press it.
- **No hard-coded sample data in the app** and no placeholder names. Demo content comes from the seeds, with realistic names.
- Anything not built shows "Coming soon" (the existing `ComingSoon` wording). No dead buttons.

## Decisions (direction of 17 Nov 2026)
1. Four tabs, in this order: **Home, Communities, Marketplace, Wisdom**.
2. **Onboarding** follows `reference/01`-`10`. `main` already has a version built from these pictures (16 Nov) with a pretend Singpass login
   that always signs in Uncle Tan: it is checked and corrected (A3), not rebuilt.
3. **Communities**: a person is in at most **3** (already enforced). After onboarding they see the **10** most relevant (interests and
   distance) and choose up to 3. A card shows the picture, name, members, the next event, and two buttons: **Join WhatsApp group** (a link
   the leader saved; members only) and **See events**. The community page shows its basics and its location on a map.
4. **Marketplace** is **events nearby**: a search bar; the market days the person joined, where after the day they answer **I went** or
   **I didn't go** (tracked for analytics); then all other events, recommended by interests and distance.
   Service listings already live in Wisdom (moved 16 Nov). Selling products (old plan B7) is **not** in this round.
5. **A leaf only for showing up**: "I'm here" at a community gathering, "I went" on a market day, a Wisdom session completed.
6. **Home**: upcoming events from Communities, the Marketplace and Wisdom (three shown, then Show all), and a simple calendar with
   checkpoints for upcoming days and trophies for days the person showed up. The Yes / No answers of the old plan are not on Home.
7. **Wisdom** has a LEARN | TEACH switch: Teach (profile, invitations, mentorships, session details with chat, history with reviews) and
   Learn (search, chips, mentors). The review shows **"Score: n/5"** as asked; this replaces the older "no star ratings" line in `wisdom.md`
   (A2 updates its Status). **Video calls do not exist**: "Start Video Call" shows "Coming soon".
8. **Maps**: a map picture from the server plus an "Open in Google Maps" button. The key is `GOOGLE_MAPS_API_KEY` in `backend/.env`, server
   side only (it needs the Geocoding API and the Maps Static API). Without a key the address and the button still show.
9. Other pages (health, family, explore, goals and habits) stay reachable from the profile's "More" list and are out of scope.
