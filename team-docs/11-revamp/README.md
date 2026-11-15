# Revamp: three sections, two people, no merge conflicts

The app becomes three sections on the bottom bar: **Community** (left), **Home** (middle), **Marketplace** (right).
The work is split between two people. Each person has a folder of iterations to run through Claude Code, in order:

- [person-a/](person-a/): onboarding, Singpass sign-in, profile and settings, recommended communities, the Community tab.
- [person-b/](person-b/): the Tree of Wisdom (button and page), Home (upcoming events and calendar), the Marketplace.

The reference pictures are in [reference/](reference/). They come from another app ("Lahyf", with a "Buddy" button): copy the **layout, sizes and
flow**, not the name, the colours or the fonts. Our app stays "Bricks", keeps its own colours (`app/src/theme/tokens.ts`) and its own agent button.

## How to run an iteration

1. Start from the latest `main`: `git switch main && git pull`, then make the branch named in the iteration file.
2. Open Claude Code in the repo root and say: `Do team-docs/11-revamp/person-a/01-onboarding-first-screens.md` (your own file).
3. Claude Code reads `AGENTS.md`, this README and the iteration file, builds it, runs the checks, and appends to **your own** `LOG.md`.
4. Look at the result in the browser at phone size. Open a pull request into `main`, squash-merge, then start the next iteration from the new `main`.

One iteration is one branch and one pull request. Do them in the order of the file numbers.

## The rule that prevents merge conflicts: file ownership

Each file below has exactly one owner. **Never edit a file the other person owns, and never edit a file in the "nobody" list.**
If you need a change in someone else's file, write it under "Requests for the other person" in your `LOG.md` and tell them; do not make it yourself.

| | Person A owns | Person B owns |
|---|---|---|
| App features (`app/src/features/`) | `auth`, `me`, `language`, `connect`, `community`, `explore`, `family`, `lead` | `home`, `grow`, `calendar`, `market`, `health` |
| App components (`app/src/components/`) | `AuthGate.tsx`, `GoogleButton*.tsx`, `OtpBoxes.tsx`, `Hero.tsx` | `headers.tsx`, `AppTabBar.tsx`, `AgentOrb.tsx` |
| App state | `session/`, `prefs/` | none |
| App API clients (`app/src/api/`) | `communities.ts`, `communityRules.ts`, `explore.ts`, `family.ts`, `lead.ts` | `nodes.ts`, `home.ts`, `market.ts`, `calendar.ts`, `grow.ts`, `health.ts` |
| Route files (`app/src/app/`) | `welcome`, `sign-in`, `verify`, `setup`, `me`, `profile/`, `settings/`, `community/`, `choose-places`, `explore*`, `join-community`, `create-community`, `review-communities`, `family/`, `claim`, `accounts`, `(tabs)/communities.tsx`, new `onboarding/` | `(tabs)/_layout.tsx`, `(tabs)/index.tsx`, `(tabs)/market.tsx`, `(tabs)/calendar.tsx`, `(tabs)/grow.tsx`, `(tabs)/health.tsx`, `progress`, `calendar/`, `market/`, `health*`, `activity`, `aspirations`, `contributions`, new `events.tsx` |
| Backend modules (`backend/app/modules/`) | `identity`, `communities`, `explore`, `family`, `media` | `nodes`, `home`, `market`, `calendar`, `grow`, `health` |
| Backend other | `core/config.py`, `backend/.env.example`, `seed_demo.py`, `seed_explore.py` | `showcase.py` |
| Backend tests (`backend/tests/`) | `test_identity`, `test_communities`, `test_community_*`, `test_lead`, `test_explore`, `test_family`, `test_claim`, `test_delegations`, `test_languages` | `test_nodes`, `test_habits`, `test_health_home`, `test_market`, `test_mall_events`, `test_calendar`, `test_calls`, `test_grow` |
| New migrations (`backend/migrations/`) | **odd** numbers: `0021`, `0023`, `0025`, ... | **even** numbers: `0022`, `0024`, `0026`, ... |
| Assets (`app/assets/`) | `brand/`, new `onboarding/` | new `tree/` |
| Packages (`app/package.json`, `package-lock.json`, `backend/requirements.txt`) | **only Person A** may add a package | must use what is installed; ask A if one is needed |
| Log | `team-docs/11-revamp/person-a/LOG.md` | `team-docs/11-revamp/person-b/LOG.md` |

**Nobody edits these during the revamp** (they are shared, so two edits collide):
`app/src/features/index.ts`, `app/src/i18n/` (all of it, including `common.ts`), `app/src/components/ui.tsx`, `blocks.tsx`, `Skeleton.tsx`,
`app/src/theme/tokens.ts`, `app/src/kit/`, `app/src/agent/`, `app/src/navigation/` (except the one case below), `app/src/api/client.ts`,
`backend/app/main.py`, `backend/app/core/` (except A's `config.py`), `backend/app/modules/agent`, `voice` and `translation`,
`backend/tests/conftest.py`, `AGENTS.md`, `CONTRIBUTING.md`,
`team-docs/10-handoff/HANDOFF.md`, `team-docs/10-handoff/PROGRESS.md`.

What follows from that:

- **No new modules.** A new module must be registered in `features/index.ts` and (on the server) in `main.py`, which nobody may edit. Add pages
  to a module you own, and add endpoints to a router you own.
- **Words** go in your own feature's words file (six languages: en, hi, bn, ta, zh, ms), never in `i18n/common.ts`. You may *use* the existing common words.
- **Shared look**: if you need a bigger button, card or chip than `components/ui.tsx` has, build it in a file inside a feature you own.
  A little duplication between A and B is accepted for now.
- **`app/src/navigation/selftest.ts`** is the one shared file both may touch, under a strict rule: change only the existing check lines that
  mention your own modules, one line at a time, never reorder, never add lines. New checks go in a new `*.check.ts` file inside your own
  feature (like `features/grow/treeLayout.check.ts`), run with `npx tsx <file>`.
- **The log**: `AGENTS.md` says to append to `PROGRESS.md`. During the revamp, append to your own `LOG.md` instead (same content: date, who,
  what was done, what was tested and how, what is not done). When both folders are finished, Person A does the last iteration
  (`person-a/07-close-the-revamp.md`), which writes one `PROGRESS.md` entry and updates `HANDOFF.md` from both logs.

## The contract between the two halves

These are the only points where A's work and B's work meet. Both sides build against this text, so neither waits for the other.

1. **Interests.** A stores what the person enjoys on their profile as `interests`: a list of these keys only:
   `walking`, `taichi`, `cooking`, `chess`, `music`, `gardening`, `teaching`, `tech`. It arrives on the signed-in user
   (`GET /v1/me`, and `sessionStore`'s `user`). B reads it for the Marketplace filter and must treat a missing field as an empty list
   (read it as `(user as { interests?: string[] } | null)?.interests ?? []`, without editing `session/store.ts`).
2. **Where the person lives** is the existing profile field `area_name`. A writes it; B may read it.
3. **Leaves.** A leaf is earned only by showing up. B owns the leaf rule and everything in `modules/nodes`. A's Community screens keep
   calling the existing `POST /v1/communities/activities/{id}/going` and `.../checkin`, and never count leaves themselves.
4. **"I'm going" and "I'm here" for a community gathering** stay the existing endpoints above (A's routers). B's Home calls them through
   the existing `setGoing` in `api/communities.ts` and `checkIn` in `api/lead.ts` (read-only use of A's files; A must not rename them).
5. **The header.** B owns `components/headers.tsx` (`AppHeader`): the tree button on the left, the profile button on the right, which keeps
   opening the page key `me.index`. A owns what is on `me.index`. A's onboarding screens do not use `AppHeader`.
6. **Where a person lands.** A owns `AuthGate.tsx`. After sign-in and onboarding the person lands on `home.index` (the middle tab).
7. **Page keys both may navigate to** (do not rename them): `home.index`, `connect.index`, `market.index`, `me.index`, `grow.progress`
   (the Tree of Wisdom page, route `/progress`), `community.home`, `market.offer`, `market.mine`.

## Rules for every screen (the people using this are older)

- Body text at least 18, headings at least 26, and everything must still fit when the text-size setting is at its largest.
- Every button at least 56 high with a word on it (an icon alone is not enough). One main action per screen, at the bottom, full width.
- Strong contrast, no thin grey text for anything that matters. No swipe-only or long-press-only actions.
- Every word in six languages. Every button and field declared in the page's `definePage` so the agent can see and press it.
- No hard-coded sample data in the app and no placeholder names. Demo content comes from the seed scripts, with realistic names.
- Anything not built shows "Coming soon" (the existing `ComingSoon` wording). No dead buttons.

## Decisions already taken (the owner's, 15 Nov 2026)

1. **Singpass is just a button** (A2). Bricks is not registered with Singpass, so there is no real Singpass and no simulator (no MockPass).
   The button with the Singpass logo signs the person in to an account kept for that phone. There is no identity check behind it.
2. **A leaf only for showing up** (B1, B4). Answering Yes earns nothing. The person earns one leaf per event when they show up: "I'm here"
   at a gathering or a market event, or a booking marked complete. Goals, habits and ticked reminders give no Tree of Wisdom leaves, and
   the tree page no longer shows habits and goals.
3. **Selling a product is part of the Marketplace** (B7), beside offering a service.
4. **At least ten prebuilt communities** (A5); the agent recommends three of them from the onboarding answers.
5. **No Help button** anywhere in onboarding. "Read it out" is built.
6. **"Your calendar" is the bottom half of Home** (B5), never a separate page.

## Smaller choices made in these files (change the iteration file if the team decides otherwise)

- **Languages** (A1): the first screen shows the six languages the app already has, not only the four in the picture.
- **WhatsApp**: reminders by WhatsApp (A3) show as "Coming soon" and the community page has no WhatsApp group button (A6), because Bricks
  has no WhatsApp connection.
- **Other pages** (health, family, explore, goals and habits) are not deleted. They stay reachable from the profile's "More" list and are
  out of scope here.
- **Home** loses the countdown, the daily check-in and the row of links.
