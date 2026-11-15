# A2: the sign-in screen, one Singpass button

Branch: `a/singpass-sign-in` (from the latest `main`, after A1 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md`, then this file.
Pictures: `reference/04-login-layout.png` (layout only: a picture area on top, the name and one line, the button at the bottom),
`reference/11-singpass-logo.png` (the logo that goes on the button).

## Goal
The sign-in screen offers one way in: a **Singpass button**. The button shows the Singpass logo picture, not the word.

## Decision (the owner's, 15 Nov 2026)
Bricks is not registered with Singpass, so real Singpass cannot work. The owner wants **just the button**: pressing it signs the person
in. Do **not** build the real Singpass flow, MockPass, or any simulated Singpass pages. There is no identity check behind the button; this
is known and accepted for the demo. In the code, name it honestly (`demo sign-in`), so nobody later mistakes it for real Singpass.

## What exists today
- `features/auth/pages/signIn`: email code, Google, and disabled Singpass and DigiLocker buttons.
- Backend `modules/identity`: email code and Google sign-in; sessions and tokens in `identity/service.py` and `core/security.py`.
  `providers` reports which ways in are available.

## Build
### Backend (`modules/identity`, `core/config.py`, `backend/.env.example`)
1. One route, `POST /v1/auth/demo`, taking a **device key**: a long random secret the app makes once and keeps on the device.
   The server finds the user with that key or creates a new one, and answers with the usual session (`SessionOut`). So the same phone gets
   the same account back after signing out, and a new phone gets a new account.
2. Migration `0021_demo_sign_in.sql`: `users.device_key_hash` (text, unique, nullable). Store only a hash of the key, never the key.
   Such a user has no email: check every place that assumes `email` is present (assisted family profiles already have none).
3. A setting `DEMO_SIGN_IN` (`on` or `off`, name only in `.env.example`). When it is off the route answers 404 and `providers` reports
   `singpass: false`; when on, `singpass: true`. Limit how often one address may call the route (follow the existing sign-in limits).
4. Email-code and Google routes stay on the server (tests and the family "claim" flow use them). They are only removed from the screen.
5. Tests in `backend/tests/test_identity.py`: a new key makes a new user; the same key returns the same user; a short or empty key is
   refused; the route is 404 when the setting is off; the key and its hash never appear in any response.

### App (`features/auth/pages/signIn`, `session/`)
1. Copy `reference/11-singpass-logo.png` to `app/assets/brand/singpass.png`.
2. The screen, inside the A1 frame: the existing Singapore photo in the top part, the Bricks logo, one line of welcome, then **one** big
   white button with the Singpass logo centred (accessibility label "Log in with Singpass" in six languages). Nothing else: remove the
   email field, Google and DigiLocker from this screen. No Help button.
3. Pressing the button: make the device key if there is none (a strong random value, kept with the same secure storage the session
   tokens use), call `/v1/auth/demo`, store the session with the existing `session/store.ts` functions, and let `AuthGate` move the
   person on. Show a clear "Signing in..." state; on failure, one plain sentence and the button again.
4. The button stays `agent: 'human'` (the agent may never press it).
5. Signing out keeps the device key, so the same person comes back to their own account on that phone.
6. The old `auth.verify` page (email code) is no longer reachable from the screen. Leave its files in place.

## Files you may touch
`app/src/features/auth/**`, `app/src/session/**`, `app/src/app/sign-in.tsx`, `app/assets/brand/`,
`backend/app/modules/identity/**`, `backend/app/core/config.py`, `backend/.env.example`,
`backend/migrations/0021_demo_sign_in.sql`, `backend/tests/test_identity.py`. In `selftest.ts` only the existing line about
"Google, Singpass, DigiLocker are person-only" (it must now check the Singpass button alone).

## Done when
- With `DEMO_SIGN_IN=on` in the developer's own `backend/.env`: tap the Singpass button and land in the app signed in; sign out; tap
  again and get the same account. In a second browser profile, the button makes a different account.
- With the setting off: the button is disabled with the "Not available yet" word.
- `cd backend && python -m pytest tests -q` passes; app `tsc`, `expo lint` and `selftest.ts` pass.
- `LOG.md` entry. It must say plainly that this is a demo sign-in with no identity check, and that `DEMO_SIGN_IN` must be set on any
  server where the button should work (the name only, never a value from a real `.env`).
