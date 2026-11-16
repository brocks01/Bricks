# Browser tests (Quality area)

End-to-end tests for the app, run in a real browser (Playwright, chromium) against the **real** website and the **real** API. They were written for task 1 of the Quality area in `team-docs/04-build/areas.md`. They only test; they never change app code.

## How to run

```bash
cd app
npx playwright install chromium     # first time only
npm run e2e
```

The tests do **not** start any server (rule 5 in `areas.md`). Both must already be running:

- the API on `http://localhost:8000` (with `backend/.env` and migrations applied, in development mode so the test-mode code appears),
- the web app on `http://localhost:3000`, started with `EXPO_PUBLIC_API_URL=http://localhost:8000`.

If either is missing, the run stops at the start with a message saying which one. The first page load compiles the web bundle and can take a while; later runs are fast. On failure a screenshot and a trace are kept in `app/test-results/` — view one with `npx playwright show-trace test-results/<folder>/trace.zip`.

## What the tests cover (task 1)

| Test | What it proves |
|---|---|
| `onboarding.spec.ts` — learner | Sign in with the **test-mode code** (read from the verify page), first setup (name, age group), the getting-to-know-you with **role `learn` only**: after it, only the round **Wisdom** button shows — Communities and Marketplace are gone — and the stories part with "Keep a story or lesson" is there. |
| `onboarding.spec.ts` — connect + share | The same flow with **connect + share**: all **three tabs** show (Communities, Wisdom, Marketplace). |
| `story.spec.ts` | **Keep a story and share it**: a person who came to share writes a story from "Share your experience", it lands in *My stories* as **Private**, one press on the row makes it **Shared**. |
| `notices.spec.ts` | **The notifications screen**: opened from the bell in the header, the heading shows and a fresh account gets the calm empty state ("Nothing new…"). |

Real accounts are used (`e2e-<random>@example.com`). They are **deleted afterwards**: after each test by the test itself, and any leftover from an earlier run at the start. The backend has no delete-account endpoint, so the cleanup connects to the local database directly, reading `DATABASE_URL` from `backend/.env` **in-process only** — it is never printed, logged or committed (house rule on secrets). Verified after a full run: zero `e2e-%` rows remain.

## Notes on what I found (safety.md style, app problems only)

1. **16 Nov 2026 — icons leak into accessible names.** Buttons that carry an icon render its fallback character into the accessible name (the verify button reads to a screen reader as "Sign in ?", the bell area shows "?" where an icon is). It does not stop a person, but a screen reader says the odd character aloud. Minimal fix belongs in `components/ui.tsx` / `blocks.tsx` (hide the icon from the accessibility tree, e.g. `accessibilityElementsHidden` / `importantForAccessibility="no"` on the icon). Tests match by name prefix instead of exact because of this. Carried forward to the accessibility pass (task 2).
2. **16 Nov 2026 — old screens stay mounted behind the current one (web).** The welcome, sign-in and verify screens remain in the DOM (hidden, 0×0) after navigation; the welcome logo's heading is still in the document with empty text. Harmless for a person — hidden screens are out of the accessibility tree — but anything that reads the DOM by order (a script, an agent tool) can pick up the wrong element. The tests filter every locator to what is visible for this reason.
3. **16 Nov 2026 — `npx expo lint` fails on `src/components/SplashIntro.tsx`** (untracked, another session's work in progress): 3 × `react-hooks/refs` — `useRef(new Animated.Value(1)).current` read during render. Not the Quality area's file; reported here for its owner. `tests-browser` itself lints clean and `npx tsc --noEmit` passes with these tests included.
4. **16 Nov 2026 — a route without its screen broke the web build for a while**: `src/app/wisdom/service-offer.tsx` imported `../../features/wisdom/screens/ServiceOfferScreen` before that file existed, so Metro showed a build-error overlay and every page was unclickable. It resolved on its own when the Wisdom session finished the file. Nothing to fix in the app; noted because it is what a failed run looks like: an `error-overlay` div covering the page. The suite retries once to ride out edits by other sessions.

## What these tests do NOT cover

- The native app (Expo Go / builds) — only the website at 390×844.
- Other languages: the app runs in English here. The words themselves are checked by the translation review (task 2).
- Google / Singpass / DigiLocker sign-in, real email delivery (the test-mode code only exists in development mode on this computer).
- Notification **content** with real notices (a fresh account has none; the test accepts the empty state or a rendered row).
- The phone call, Telegram, WhatsApp and SMS doors, and the agent's own screens (see `agent-area.md` for the agent's manual browser script).
