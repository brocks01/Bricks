# A3: onboarding, profile, and closing the revamp (round 3, last; after A2 and B2 are merged)

Branch: `a/onboarding-profile-close` (from the latest `main`).
Read first: `AGENTS.md`, `team-docs/12-revamp/README.md`, both `LOG.md` files, then this file.
Pictures: `reference/01-language.png` to `10-welcome.png`, and `11-singpass-logo.png`.

Three parts. Do them in order and commit after each. **Ownership ends in Part 3**: there you may edit any file to finish open requests.

## Goal
1. **Onboarding** matches the reference pictures screen for screen, and ends with the community choice, then Home.
2. The **profile page** shows every detail collected in onboarding, every one editable and saved, and a **Sign out** button.
3. **Close**: open requests done, the product pages' Status sections true, every check run, one full walk-through.

---

## Part 1: onboarding, exactly as the reference pictures

### What exists today (do not start over)
On 16 Nov `main` got an onboarding built from these same pictures (commit `d504203`):
- `features/onboarding/Flow.tsx`, `ref.tsx`, `refWords.ts`, `pages.ts` (`onboarding.start`, `onboarding.index` at `/onboarding`). The steps and
  questions come from the backend (`GET /v1/onboarding`, `modules/onboarding/rules.py`), so they can also be answered on a call or in a chat.
- `features/auth/pages/language`, `signIn`, `singpass`, `welcome`. The Singpass button is a pretend sign-in that always signs in Uncle Tan
  (commit `b353c61`); keep it that way.
- `components/AuthGate.tsx`: a person who has not finished onboarding goes to `onboarding.index`, afterwards to `firstTab(...)`.
- `users.interests` (migration `0100`) with the eight keys of the contract. A1 already points the last onboarding button at `connect.pick`.

### Build
1. **Compare, screen by screen.** Open each reference picture next to the running app at phone size (390 wide) and write a short table in your
   `LOG.md`: picture, our screen, every difference (missing element, order, spacing, size, wording, navigation).
2. **Fix every difference** in `features/onboarding` and `features/auth`: the same structure, placement, spacing, sizes, look, order and
   navigation. Copy the pictures' layout, not their app name, colours or fonts. Do not redesign. Keep the backend-driven steps: change how a
   step looks, not where its questions come from. If a picture needs a question the backend does not have, add it in
   `modules/onboarding/rules.py` with a test in `test_onboarding*.py` (migration `0101`+ only if a column is truly needed).
3. **Different from the pictures on purpose**: no red "Help" button (the owner does not want it); six languages on the first screen (the app
   has six); WhatsApp reminders show "Coming soon" (there is no WhatsApp connection for reminders).
4. **Remove what is left of the old onboarding**: pages, routes and words that nothing reaches any more (for example the old wizard pieces).
   Search for every use before deleting. Keep the backend onboarding endpoints and skills: the agent uses them on calls and chats.
5. **Interests and area reach the app**: `GET /v1/me` returns `interests` and `area_name`, and the "what you enjoy" and "where you live" steps
   save them. Fix it here if not (with a test in `test_identity*.py`).
6. **Landing**: in `AuthGate.tsx`, a signed-in person who has finished onboarding and is on an `auth` or `onboarding` page goes to
   `home.index`. The order at the end is: the last onboarding screen, then `connect.pick` (once, unless already in three), then `home.index`.
7. Every screen: Back works (except the first), the device back button works, the agent can see and press every element (`definePage`).
   Fix the selftest line "Singpass is person-only" (it fails on `main` today) so it checks what the screen really has.

---

## Part 2: the profile page and settings
### What exists today
`features/me/pages/index` (`me.index`, route `/me`), `features/me/pages/edit` (`me.edit`, the old one-page form `ProfileForm.tsx`). The header
button that opens `me.index` is B's (`components/headers.tsx`); the key must not change.

### Build
1. **Profile page** (`me.index`), one simple column, the floating Back button, no bottom bar:
   - **Profile card**: a big round avatar (the photo if there is one, else initials), the name, and one line saying how they signed in
     ("Signed in with Singpass" with the logo for the Singpass account; the real way for any other account). No invented ID numbers.
   - **Your details**: one big row per thing asked in onboarding, each showing the saved value in words: Language, Text size, Name, Where you
     live, What you enjoy, Your voice, Reminders, and every other step the Part 1 flow asks. Tapping a row opens its edit screen. Fields older
     accounts have but onboarding no longer asks (age group, phone) stay as rows at the end, so no data becomes unreachable.
   - **Sign out**: a full-width button that asks "Sign out of Bricks on this phone?" with Yes and No before doing it.
   - **More**: the existing list (health, family, emergency numbers, reminder calls), unchanged in content.
2. **Edit screens**: reuse the onboarding step bodies instead of writing them twice. Pull each body into a component with a mode: in
   onboarding the button says "Next" and moves on; in the profile it says "Save", saves, shows a short "Saved" and goes back. Declare each
   edit page in the `me` module so the agent can open and fill it.
3. `me.edit` now opens the profile page (keep the key so old links and the agent's "edit profile" still work).

---

## Part 3: close the revamp
1. Read `person-a/LOG.md` and `person-b/LOG.md` in full and check what they claim against the code on `main`.
2. Go through every "Requests for the other person" and "Later" in both logs. Do each one still open now (ownership has ended), or list it
   as not done in the right product page's Status. In particular: if B2 had to leave the **Wisdom items out of Home** because A2 was not
   merged yet, add them now (`wisdom.service.upcoming_sessions` into `GET /v1/home/upcoming`, with a test).
3. Update the **Status** sections of `team-docs/02-product/tabs-requirements.md` (four tabs), `communities.md`, `marketplace.md`, `wisdom.md`
   and `people-and-onboarding.md`, and `team-docs/03-technical/architecture.md` (the environment name `GOOGLE_MAPS_API_KEY`, the `geo`
   module, the new tables). Remove statements the revamp made untrue.
4. Run everything once: `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts`, every `*.check.ts` under
   `app/src/features`, and `cd backend && python -m pytest tests -q`. Report failures as they are.
5. Walk the whole app once in the browser at phone size, first with a new account and then as Uncle Tan: onboarding, choosing communities,
   Home (upcoming, Show all, the calendar), the tree, the Communities tab and a community page ("I'm going", "I'm here"), the Marketplace
   (search, "I went"), Wisdom (Teach and Learn), the profile (edit, sign out). Write down what you saw.

---

## Files you may touch
Parts 1 and 2: `app/src/features/onboarding/**`, `app/src/features/auth/**`, `app/src/features/language/**`, `app/src/features/me/**`,
`app/src/prefs/**`, `app/src/session/**`, `app/src/components/AuthGate.tsx`, A's route files for these pages (`me.tsx`, `profile/*`,
`settings/*`, onboarding routes), `backend/app/modules/onboarding/**`, `backend/app/modules/identity/**`, `backend/tests/test_onboarding*.py`,
`test_identity*.py`, migrations `0101`-`0109`. In `selftest.ts` only existing lines about `auth`, `onboarding`, `language` or `me`.
Part 3: any file, for the listed purposes only.

## Done when
- **Onboarding**: the comparison table is in `LOG.md` and every row is fixed or explained; a fresh browser profile at phone size walks the
  whole flow, chooses communities, and lands on Home; reopening in the middle resumes at the right step.
- **Profile**: every row shows the saved value; editing any row saves it and it is still there after a reload; text size and language apply
  at once; Sign out asks first, then returns to the first onboarding screen.
- **Close**: the Status sections are true, the checks' real results are in the pull request, and the walk-through notes are in `LOG.md`.
- All six languages; the largest text size fits with nothing cut off.
- `cd backend && python -m pytest tests -q`; `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts` pass.
