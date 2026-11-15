# A4: the profile page and settings

Branch: `a/profile-settings` (from the latest `main`, after A3 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md`, then this file.

## Goal
The round profile button at the top right of Home opens the profile page. It shows a **profile card** (who is signed in with Singpass, and
a Sign out button) and **Settings**, where the person can change everything they answered in onboarding.

## What exists today
- `features/me/pages/index` (key `me.index`, route `/me`): four tabs (Me, Health, Numbers, Settings) and a "More" list.
- `features/me/pages/edit` (key `me.edit`): the old one-page profile form.
- The header button that opens `me.index` is in `components/headers.tsx`, which **Person B owns**. Do not edit it; the key `me.index` must not change.
- The onboarding screens from A1 and A3 (`features/auth`), and the `auth/signOut` skill.

## Build
1. **Profile page** (`me.index`), one simple column, no tabs:
   - **Profile card**: a big round avatar with initials, the person's name, the line "Signed in with Singpass" with the Singpass logo, and a
     full-width **Sign out** button that asks "Sign out of Bricks on this phone?" with Yes and No before doing it. (The button in A2 is a
     demo sign-in, so there is no Singpass ID number to show: do not invent one.) For an account that came in another way (an older
     email account, a claimed family profile), the line says how they signed in instead.
   - **Settings** button (big, with a gear icon and the word) opening `me.settings`.
   - **More** list, unchanged in content: health, family, emergency numbers, reminder calls. These pages are out of scope; only keep their
     entries working.
2. **Settings page** (new page `me.settings`, route `/settings`): one big row per thing collected in onboarding, each showing the current
   value and opening its edit screen:
   Language, Text size, Name, Where you live, What you enjoy, Your voice (play, record again, remove), Reminders.
3. **Edit screens**: reuse the onboarding screen bodies from A1 and A3 rather than writing them twice. Pull each body into a component that
   takes a mode: in onboarding the button says "Next" and moves on; in settings it says "Save", saves, shows a short "Saved" and goes back.
   Declare the settings pages in the `me` module (`me.settingsName`, and so on) so the agent can open and fill them.
4. Retire the old one-page form: `me.edit` now opens the same Name screen (keep the key so old links and the agent's "edit profile" search still work).
   Age group and phone number are not asked in the new onboarding; keep them editable as two extra rows at the end of Settings so no data becomes unreachable.

## Files you may touch
`app/src/features/me/**`, `app/src/features/auth/**` (to extract the shared screen bodies), `app/src/features/language/**`,
`app/src/app/me.tsx`, `app/src/app/profile/*`, `app/src/app/settings/*`. In `selftest.ts` only the existing lines about `me` (the
`me.edit` element list and the "search edit profile" check), if they now fail.

## Not in this iteration
No backend change (A3 already saves every field). No changes to health, family or the header.

## Done when
- From Home, the profile button opens the card; Sign out asks first, then returns to the first onboarding screen.
- Each Settings row shows the saved value, edits it, and the new value is there after a reload. Text size and language apply at once.
- All six languages; largest text size fits; the agent can open `me.settings` and change the name.
- `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
