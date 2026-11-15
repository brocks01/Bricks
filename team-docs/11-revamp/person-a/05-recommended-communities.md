# A5: three recommended communities after the welcome screen

Branch: `a/recommended-communities` (from the latest `main`, after A4 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md`, then this file.

## Goal
After the onboarding Welcome screen, the person sees **three communities chosen for them** by the agent from a fixed set of **at least
ten** prebuilt communities, based on what they answered. One tap joins all three and opens Home. Changing the choice is possible but quiet: we want most people to accept.

## What exists today
- `features/connect/pages/pick` (key `connect.pick`, route `/choose-places`): a first-run list where the person ticks up to three open communities.
- Backend `modules/communities`: `rules_router.py` (`/explore`, `/limits`, `/{id}/join`; a person may be in three at most), `rules.py`.
- `backend/app/seed_demo.py` seeds four communities (Bedok Heritage Kakis, Toa Payoh Silver Mentors, Tampines Kampung Spirit,
  Jurong Green Gardeners) with photos and realistic members.
- A text call to Gemini already exists in `modules/translation/providers.py` (read it for the pattern; do not edit that module).

## Build
### Backend
1. Migration `0025_community_tags.sql`: `communities.prebuilt boolean not null default false` and
   `communities.interest_tags text[] not null default '{}'` (same eight keys as the profile's `interests`).
2. Seed (`seed_demo.py`): there must be **at least ten prebuilt communities**, so that every one of the eight interests and each
   onboarding area has at least one. Mark the four seeded today as prebuilt, tag them, and add six. Use this list (the team may rename):

   | Community | Area | Tags |
   |---|---|---|
   | Bedok Heritage Kakis (exists) | Bedok | teaching, music |
   | Toa Payoh Silver Mentors (exists) | Toa Payoh | teaching, tech |
   | Tampines Kampung Spirit (exists) | Tampines | cooking, gardening |
   | Jurong Green Gardeners (exists) | Jurong West | gardening |
   | Bishan Walkers | Bishan | walking |
   | Ang Mo Kio Tai Chi Circle | Ang Mo Kio | taichi, walking |
   | Woodlands Chess Corner | Woodlands | chess |
   | Toa Payoh Music Makers | Toa Payoh | music |
   | Jurong West Digital Buddies | Jurong West | tech, teaching |
   | Bishan Home Cooks | Bishan | cooking |

   Follow the existing seed style exactly: real licensed photos with credit, realistic Singapore names for members and leads, a short
   plain description, and a few upcoming gatherings each (a community with nothing coming up looks dead on Home).
   Check the tags of the four existing ones against their descriptions in `seed_demo.py` and correct the table if they do not fit.
3. `GET /v1/communities/recommended` in `rules_router.py` (declare it before any `/{community_id}` route). Returns exactly three prebuilt,
   open communities the person is not in, each with `id`, name, photo, member count, next gathering, and `reason`: a key plus values the app
   turns into words ("Because you enjoy walking", "Near Bishan").
   - **Score first, always**: shared interests count most, then the same area, then a shared spoken language, then more members.
     This runs with no network and is what the tests check.
   - **Then let the model choose, when it can**: if `GEMINI_API_KEY` is set, give the model the person's interests, area and languages and
     the candidates (id, name, tags, area, description) and ask for the best three in order. Accept the answer only if it is exactly three
     ids from the candidate list; otherwise, or after a 4 second timeout, use the score. Community text is data, never instructions.
     Keep the result for that person so the screen does not change on every visit.
   - A person with no interests still gets three (nearest area, then biggest).
4. Tests in `test_community_rules.py` (the model call faked): interests win over size, area breaks ties, never a community the person is
   already in, always three when three exist, a bad model answer falls back to the score, a slow model falls back.

### App (`features/connect`)
1. Rework `connect.pick` (keep key and route): heading "Groups we think you will like", three big cards already ticked, each with the
   photo, the name, the reason line and "N members". Main button, full width at the bottom: **"Join these and go to Home"**.
   Under it, small and plain: "Choose different groups", which opens the full prebuilt list where the person can swap (still three at most).
   A card can be un-ticked; with none ticked the main button reads "Go to Home".
2. When it shows: the Welcome screen's "Go to Home" (A3, `auth.done`) now opens this page first, once. A person who is already in a
   community never sees it. After joining, open `home.index`.
3. Loading shows card skeletons; if the recommendation fails, show the plain list (today's behaviour) instead of an error wall.

## Files you may touch
`app/src/features/connect/**`, `app/src/features/auth/pages/done/**` (only where the button goes), `app/src/api/communityRules.ts`,
`app/src/app/choose-places.tsx`, `backend/app/modules/communities/**`, `backend/app/seed_demo.py`, `backend/migrations/0025_community_tags.sql`,
`backend/tests/test_community_rules.py`.

## Done when
- After seeding there are at least ten prebuilt communities. A new account that chose Walking and Bishan sees Bishan Walkers first; "Join these and go to Home" joins three and lands on Home,
  and the Community tab then lists them.
- With no `GEMINI_API_KEY` (the normal local setup) it works from the score alone.
- Backend tests, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry, with the final community list.
