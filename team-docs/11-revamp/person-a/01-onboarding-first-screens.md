# A1: onboarding, the three screens before sign-in

Branch: `a/onboarding-first-screens` (from the latest `main`).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (ownership table and screen rules), then this file.
Pictures: `team-docs/11-revamp/reference/01-language.png`, `02-text-size.png`, `03-who-is-setting-up.png`.

## Goal
A person who opens Bricks for the first time passes three simple screens, then reaches sign-in:
**1. Choose your language, 2. Text size, 3. Who is setting up?**

## What exists today
- `features/auth/pages/welcome` (key `auth.welcome`, route `/welcome`): a logo, a photo, a Start button and two language links.
- `features/language/pages/pick` and `spoken`: the language lists. `i18n/store.ts` holds the chosen app language.
- `prefs/store.ts`: text size on the device (`normal | large | larger`) and the read-aloud switch. `expo-speech` is installed.
- `AuthGate.tsx` sends a signed-out person to `auth.welcome`.

## Build
1. **A shared frame** for all onboarding screens, `features/auth/OnboardingFrame.tsx`:
   a top row with a "Read it out" button (left); under it an optional Back button with the screen title beside it; the content; and one
   full-width main button fixed at the bottom. Safe-area padding top and bottom. It does not use `AppHeader`.
   "Read it out" speaks the screen's heading and its options with `expo-speech`, in the chosen app language; tapping again stops it.
   Do **not** build the red "Help" button from the pictures: the owner does not want it.
2. **Screen 1, language** (replace what `auth.welcome` shows; keep the key and the route so `AuthGate` still works):
   the Bricks logo, the line "Choose your language" written in every offered language (as in the picture), and one big button per language,
   two per row, the chosen one filled with a tick. Show the six languages the app has (`LANGUAGES`). Choosing one changes the app at once.
   Main button: "Next". The decorative tiles at the top of the picture are optional; if used, they must be our own icons in our own colours.
3. **Screen 2, text size** (new page `auth.textSize`, route `/onboarding/text-size`): three big cards, one choice, as in the picture:
   Small ("Fits the most on one screen"), Normal ("Easy to read. Most people like this"), Large ("The biggest words").
   They map to the stored values `normal`, `large`, `larger`. A new device starts on the middle one. The whole screen re-sizes the moment a
   card is tapped, so the person sees the result. One line under the title: "You can change it later in Settings."
4. **Screen 3, who is setting up** (new page `auth.who`, route `/onboarding/who`): three big cards with an icon, a title and one line:
   "Myself", "My family" (set up for a parent or grandparent), "My community or centre" (disabled, with the existing "Coming soon" word).
   The choice is kept on the device in a small store, `features/auth/onboardingStore.ts` (same storage pattern as `prefs/store.ts`):
   `{ who: 'self' | 'family' }`. Either choice then opens `auth.signIn`.
5. Every screen has Back (except the first), and the device back button works. The agent can see and press everything
   (declare each button in `definePage`; keep the pages `bare: true` and without `requiresAuth`).

## Files you may touch
`app/src/features/auth/**`, `app/src/features/language/**`, `app/src/prefs/**`, new route files `app/src/app/onboarding/*.tsx`,
`app/src/app/welcome.tsx`. In `navigation/selftest.ts` only existing lines about `auth` or `language`, if one of them now fails.

## Not in this iteration
Sign-in (A2), the questions after sign-in (A3). No backend change.

## Done when
- From a fresh browser profile at phone size: language, then text size, then who, then the sign-in page; Back works at every step.
- Each of the six languages shows every word on the three screens; the largest text size still fits without cut-off text.
- "Read it out" speaks on the web.
- `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts` all pass.
- An entry is appended to `team-docs/11-revamp/person-a/LOG.md`, saying plainly what was not tested (for example: a real phone).

## Known limit to write in the log
Text size is applied as a page zoom on the web only; on a phone only the phone's own text setting applies. Fixing that needs
`theme/tokens.ts` and `components/ui.tsx`, which nobody may edit during the revamp.
