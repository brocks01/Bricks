# A3: onboarding after sign-in: name, where you live, what you enjoy, your voice, reminders, welcome

Branch: `a/onboarding-about-you` (from the latest `main`, after A2 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (the contract: `interests` keys), then this file.
Pictures: `reference/05-name.png`, `06-where-you-live.png`, `07-what-you-enjoy.png`, `08-your-voice.png`, `09-reminders.png`, `10-welcome.png`.

## Goal
Right after the first sign-in the person answers a few questions, one per screen, and what they answer is saved on their profile.
This data later drives the recommended communities (A5) and the Marketplace filter (Person B).

## What exists today
- `auth.setup` (route `/setup`) shows `features/me/ProfileForm.tsx`: name, age group, phone, area, spoken languages, all on one page.
- `AuthGate.tsx`: signed in without a name goes to `auth.setup`; signed in on any `auth` page is sent away to `connect.index`.
- Backend `identity/schemas.py` (`ProfilePatch`, `UserOut`) and `PATCH /v1/me`. `modules/media` uploads pictures to Cloudinary
  (answers 503 until the three Cloudinary settings exist).
- The Bricks Agent can fill any declared field once the person is signed in (`agent/live.ts`, `askAgent`): read these, do not edit them.

## Build
### Backend
1. Migration `0023_onboarding.sql` on `users`: `interests text[] not null default '{}'`, `reminder_channel text` (`app` or `call`),
   `voice_intro_url text`, `onboarded_at timestamptz`. In the same migration set `onboarded_at = now()` for every user who already has a
   name, so existing people are not sent through onboarding again.
2. `ProfilePatch` and `UserOut` carry `interests`, `reminder_channel`, `voice_intro_url`, `onboarded` (true when `onboarded_at` is set).
   `interests` accepts only: `walking`, `taichi`, `cooking`, `chess`, `music`, `gardening`, `teaching`, `tech` (anything else is refused
   with 422). A small route `POST /v1/me/onboarded` sets `onboarded_at`.
3. Voice: let the media module accept a short audio clip (at most 10 seconds and a sensible size limit, the common phone formats) and
   return its address. Without Cloudinary settings it keeps answering 503.
4. Tests in `test_identity.py`: the new fields save and come back; a bad interest is refused; `onboarded` flips once; existing users start onboarded.

### App (all inside the A1 frame, with "Step n of 3" over the first three)
Pages in the `auth` module, each `bare: true` and `requiresAuth: true`, each field and button declared for the agent:
1. **Name** (`auth.setup`, keep the key and route): "What should we call you?", one big field.
   Next saves `display_name`.
2. **Where do you live?** (`auth.live`): big two-per-row choices (Bishan, Toa Payoh, Ang Mo Kio, Tampines, Jurong West, Woodlands) and
   "Somewhere else", which opens a typed field. One choice. Saves `area_name`. The list lives in one constant in the `auth` feature.
3. **What do you enjoy?** (`auth.enjoy`): the eight interests as big two-per-row tiles with an icon and a word, many may be chosen
   ("Choose as many as you like"). Long words must wrap on a word boundary, never mid-word (the picture shows "Phones and comp/uters": avoid that).
   Buttons: "Next" and "Skip for now". Saves `interests`.
4. **Your voice** (`auth.voice`): a card "Tell people a little about you" with the example line, a big Record button that becomes Stop,
   a countdown from 10 seconds, then Play and Record again. Buttons: "Next" and "Skip for now". Check the Expo SDK 58 documentation for
   the recording package and its permission text before using it. If the upload answers 503, say plainly that it could not be saved now
   and let the person continue. Never block onboarding on the microphone.
5. **How should we remind you?** (`auth.remind`): three cards. "App notification" saves `app`. "WhatsApp message" is disabled with
   "Coming soon". "Phone call" saves `call` and shows one line: "We will ask for your permission before the first call." "Later" skips.
6. **Welcome** (`auth.done`): the green tick, "Welcome, {name}.", one warm line, and the main button "Go to Home". Pressing it calls
   `/v1/me/onboarded` and opens `home.index`. (A5 will put the recommended communities between this screen and Home.)

"**Say it instead**" on screens 1 to 3 starts a talk with the Bricks Agent with a short hint about the question on screen, so the person can
answer aloud and the agent fills the declared field. Use the agent's existing public functions; do not change `app/src/agent/`.
If that cannot be done without editing the agent, leave the button out and write it under "Requests" in `LOG.md`.

### The gate (`components/AuthGate.tsx`)
Signed in and **not onboarded**: keep the person inside these pages (resume at the first unanswered step). Signed in and onboarded on an
`auth` page: go to `home.index` (not `connect.index` any more). If the device store says `who: 'family'`, the last screen's button opens
`family.home` instead of Home.

## Files you may touch
`app/src/features/auth/**`, `app/src/features/me/ProfileForm.tsx`, `app/src/session/**`, `app/src/components/AuthGate.tsx`,
`app/src/app/setup.tsx`, `app/src/app/onboarding/*`, `app/package.json` (a recording package, if needed), `backend/app/modules/identity/**`,
`backend/app/modules/media/**`, `backend/migrations/0023_onboarding.sql`, `backend/tests/test_identity.py`.

## Done when
- A new account walks all six screens in the browser at phone size, and after "Go to Home" lands on Home; the answers are in `GET /v1/me`.
- Closing the app in the middle and opening it again resumes at the right step. An existing account is not asked anything.
- Skip works on every optional screen. Back works. All six languages. Largest text size fits.
- Backend tests, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry (say what was not tested: recording on a real phone, upload without Cloudinary).
