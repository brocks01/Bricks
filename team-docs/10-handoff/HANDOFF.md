# Bricks: handoff for the next coding agent

Written 11 Nov 2026 by Claude Code (Sonnet 5.5) when its credit was ending. The owner (Ankit Kumar, final-year B.Tech, Kolkata) continues with OpenCode
and will return to Claude Code later. **Keep this file true.** The running log is `PROGRESS.md` in this folder.

## 1. What Bricks is
A club system for neighbourhoods, run the way college societies run: roles with terms, community objectives, events, sponsors, community-held
earnings, leagues. Voice-first (an agent you can talk to). Communities carry legal duties (for example childcare). The platform never holds money.
Built for the **Singapore-India Hackathon 2026** (raiSE Social Innovation track; starts 14 Nov 2026 about 17:00 at SMU, 36 hours, finals 15-17 Nov).
"Bricks" is a working name (domain, app-store and business-name availability are unchecked).

## 2. The owner and how to work with him
- Prefers **short, solution-first answers**. Gets angry when you build or write things he did not ask for, invent content, or ignore his design samples
  (`team-docs/05-design/ui-samples/`). **Discuss before building. Do not add features, docs or sample data on your own.**
- Windows 11, PowerShell. He runs ngrok himself. He fills his own `.env`; **never print or open secrets** (see `AGENTS.md` for the full rules).
- Decisions already made (do not reopen without asking): the Expo app is the only place features live (the website is docs only; the app also runs as a
  website for testing); one backend (Python FastAPI modular monolith), one Postgres+PostGIS database, one email service; target 2-3k concurrent users on
  mostly free services; every UI thing is "keyed" (words, navigation, agent control); six UI languages (en, hi, bn, ta, zh, ms; the five non-English
  are AI drafts that need native-speaker review); member-written content is shown as written (a Translate button comes later, translate on read, cached);
  risk-based authorization; the platform never holds money.

## 2b. Product architecture (FINAL, 11 Nov 2026)
Two domains: **Connect** (what people do together: communities, activities, governance, sponsors, earnings, jobs and referrals) and **Grow** (personal goals, health, learning).
**Thrive was removed**; tagline "Connect. Grow. Participate."; a flexible activity system instead of one module per activity type; profile and settings open from the avatar;
the Bricks Agent bar is global. Full page: `team-docs/02-product/product-architecture.md`; samples `team-docs/05-design/ui-samples/` (03 to 05 pre-date the Thrive removal).
**The app still has the older five placeholder tabs (Home, Community, Events, Goals, Me): changing them to Connect and Grow, and building the new onboarding
(language, interests, four-path start), are the next UI tasks. Open question for the owner: is Home its own tab or the landing view of Connect?**

## 3. Repository map
```
AGENTS.md              rules for any agent (read first)
CONTRIBUTING.md        branches, pull requests, commits
.github/               CI workflow (app types+self-test, backend tests) and pull request template
app/                   Expo SDK 58 (React 19.3, RN 0.88), Expo Router, TypeScript. Phone app AND website (react-native-web)
  src/app/             route files (thin: each re-exports a screen from src/features)
  src/features/<module>/pages/<page>/{page.ts,strings.ts,Screen.tsx}   one folder per page
  src/navigation/      registry, tree, resolve, provider, selftest.ts
  src/kit/             definePage(), glow, useField/useAction/El (agent-controllable elements)
  src/agent/           tools.ts (the agent's tools), live.ts (in-app talk client), audio(.web).ts, dock.tsx (the bottom bar), react.tsx
  src/session/         sign-in state, token handling, error words
  src/api/client.ts    API client; the API address is HARD-CODED for non-local websites (PUBLIC_API_URL)
  src/i18n/            languages, tables, common words (six languages)
  src/components/      ui kit, headers, tab bar, GoogleButton(.web), AuthGate, ComingSoon, PhoneFrame
  vercel.json          Vercel build settings (root directory = app)
backend/               Python 3.11+ FastAPI. Start: python backend/run.py (port 8800, or PORT=...); migrate: python backend/run.py migrate
  app/core/            config, db, security (tokens), auth_state (fast revocation), mail (Brevo/SMTP)
  app/modules/identity sign-in, sessions, profile
  app/modules/agent    the in-app agent socket (WS /v1/agent/live)
  app/modules/voice    the phone agent (Twilio + Gemini Live): webhooks, audio socket, call rules
  migrations/          SQL files applied in order (0001 identity, 0002 token state)
  tests/               pytest (50 tests, real local database, fakes for phone/model/mail)
team-docs/             our docs (vision, product, design samples, technical, decisions). 10-handoff = this folder
platform-docs/         public docs (about, FAQ ...). master-docs/ is an OLD generated all-in-one copy: stale, ignore
```

## 4. How to run it (local)
Needs: Postgres 16 with PostGIS (database `bricks`), Node 22, Python 3.11+ (the owner's machine uses an embedded Python at
`C:\Users\ankitkumar\Desktop\work\1\runtime\python\python.exe` that has all packages; elsewhere `pip install -r backend/requirements.txt`).
```
# backend (from the repo root)
python backend/run.py migrate            # once, and after new migrations
python backend/run.py                    # http://localhost:8800   (PORT=8093 python backend/run.py for the tunnel)
cd backend && python -m pytest tests -q  # 50 tests, no network

# app / website (port 3000 is the default and the only one Google accepts for sign-in)
cd app && npm install && npm run web     # http://localhost:3000
npx tsc --noEmit && npx tsx src/navigation/selftest.ts
```
The web build can be served by the backend itself: `cd app && npx expo export --platform web --output-dir dist`; the API then serves `app/dist`
at `/` (one address carries site and API, which is how the ngrok address works). Rebuild `dist` after changing the app.
Windows tips: in PowerShell, `$home` is read-only; embedded Python ignores the working directory (use a launcher script that sets `sys.path`);
very long bash heredocs sometimes fail to parse: write files with the editor tool instead; after `expo install` re-save `package.json` without a BOM.

### Environment variables (names only; values live in untracked `.env` files)
`backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `APP_ENV` (dev|prod; dev shows the sign-in code on screen to direct callers only), `ACCESS_MINUTES` (default 15),
`REFRESH_DAYS`, `CODE_MINUTES`, `GOOGLE_CLIENT_ID` (public id), `SINGPASS_CLIENT_ID` / `DIGILOCKER_CLIENT_ID` (empty = buttons stay off),
**`BREVO_API_KEY` (NOT SET YET: needed for real email codes)**, `EMAIL_FROM` (optional), `EMAIL_DAILY_LIMIT` (default 300), `SMTP_*` (fallback),
`CORS_ORIGINS` (extra allowed website origins; any `*.vercel.app` is already allowed), voice: `VOICE_PROVIDER`, `VOICE_PUBLIC_URL`, `VOICE_ALLOWED_NUMBERS`,
`VOICE_ADMIN_KEY`, `VOICE_*_SECONDS`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `GEMINI_API_KEY`, `GEMINI_LIVE_MODEL`,
`PARALLEL_API_KEY` (web search), `PARALLEL_SEARCH_MODE`. `app/.env`: `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, optional `EXPO_PUBLIC_API_URL`.
The voice and Google values were copied (blind, never displayed) from the owner's older Jambagrad project.

## 5. Current state (what works)
Everything below was tested unless marked.
- **Sign-in:** email code (6 digits, 5 per hour per email, 30 s apart, 5 wrong tries, HMAC-hashed), Google ID-token sign-in (works on `localhost:3000`),
  Singpass and DigiLocker buttons present but **off** ("Not available yet"; they need registered credentials and are not implemented server-side).
- **Tokens (stateless):** HS256, 15 minutes, claims `sub, t (a|g), s (session id), iss/aud=bricks, iat, exp`. Verification = signature + claims, no database call.
  `auth_state.py`: in-memory list of signed-out sessions (instant logout) and per-person `users.auth_changed_at` cached 5 s (a token issued before it answers
  `401 token_expired`, the app refreshes once and retries). Refresh tokens rotate and keep the same session id. The app refreshes only when the token has under
  a minute left. Design came from the Jambagrad auth module (RS256 + hot list + change log); see section 8 for what to adopt next.
- **Profile:** first-time setup page (name required; age group under40/40to59/60plus, phone, area optional), view page, edit page, language saved to the profile.
- **App shell:** welcome, sign-in, verify, setup, five tabs (Home, Community, Events, Goals, Me); only Me has content. Others show "Coming soon".
  No scroll bars (app-like scrolling). Language page works (six languages).
- **Bricks Agent (in-app):** bottom bar under the tab bar on every signed-in page (waveform, status, red end button, chevron for transcript and a typing box).
  Tap to talk; the microphone starts at once and audio is held until the connection is ready. Browser voice tested once (works); typing tested; **iPhone
  Safari and Expo Go are untested**. Tools (open, fill, press, run, tree, search, docs, read) run **in the app** (so the person sees the glow and gives
  approvals); `web_search` and `read_page` run on the **server** (key stays there; 20 lookups per talk). Newest talk replaces an older one for the same person.
- **Agent surface (smart UI):** the agent can show a panel over the top of the app (the tab bar and agent bar stay below it) with a title, message, numbered steps, an optional
  generated HTML page, and either choices or a typed answer. Tools `show` (a question WAITS for the person's tap or typing and returns it; anything else returns at once) and `hide`.
  Files: `app/src/agent/surface.ts` (store, limits: title 120, message 1500, 8 steps, 6 options, html 20000 characters), `app/src/components/AgentSurface.tsx`, `HtmlFrame.web.tsx`.
  The HTML runs in an iframe with `sandbox=""` (no scripts, no forms, no navigation, no access to the app) and a Content-Security-Policy that blocks every network request;
  on phones (no web view in Expo Go) only the title, message, steps and options show. The agent writes everything in the person's language (system prompt in
  `backend/app/modules/agent/declarations.py`). Tested in the browser: a visual page with a card, steps and two choices; tapping a choice returned the answer to the agent.
- **Phone agent:** `backend/app/modules/voice` places a real Twilio call to an allow-listed number; Gemini Live speaks; tools web search, read page, end call,
  extend call; transcript kept in memory. One real call tested (35 s, Hindi/English). Twilio is a **trial** account (callee must be verified and press a key).
- **Web hosting:** the backend serves `app/dist`; the owner's ngrok tunnel (his static domain `shale-overgrown-buggy.ngrok-free.dev`) points at port 8093
  where a Bricks API instance runs. Vercel deployment is **not done yet**.
- **Repo:** GitHub `brocks01/Bricks`: `main` (baseline) and `Ankit` (all code). The pull request `Ankit` to `main` is for the owner to open.

## 6. Key designs you must understand
**Tree model: module > page > element.** Dotted keys: module `me`, page `me.edit`, element `me.edit.displayName`, skill `auth/signOut`. Each page has ONE
declaration file `page.ts` (plain data validated by `definePage()`: key, route, summary, elements with kind text|field|choice|action|list, agent policy
`free|confirm|human`, `secret`, `bare` (no tab bar), `requiresAuth`, `tab`, `icon`) and a `strings.ts` with words in six languages registered as
`${page.key}.${id}`; shared words are in `i18n/common.ts`. Modules register in `src/features/index.ts` and may declare skills. **Add a page by copying an
existing one.** Words missing in a language fall back to English; the self-test fails if any word lacks a language.
**Agent policy per element:** `human` = the agent may never do it (OTP, Singpass, DigiLocker); `confirm` = the person must approve (sign out); `secret` values
are never returned to the agent. When the agent acts, the element glows and the bar shows what it is doing (`fillElement`/`pressElement` in `agent/pageControls.ts`).
**In-app agent protocol** (`backend/app/modules/agent/router.py`): first message `{type:"auth", token, page, tools}`; then `audio` (b64 PCM16 16 kHz), `text`,
`toolResult`, `end`; server sends `ready`, `audio` (24 kHz), `text` (role agent|person), `toolCall`, `tool` (server-side lookup notice), `interrupted`, `turn`, `error`, `done`.
Gemini function declarations are made from the app's tool specs (`declarations.py`: upper-case types, no additionalProperties, empty objects become JSON text).
**Routing/guard:** `AuthGate` (root layout) boots the session; signed out on a private page goes to Welcome; signed in without a name goes to Setup; signed in on an
auth page goes Home. The navigation guard is read at the moment of every move.
**Hard-coded API address:** `PUBLIC_API_URL` in `app/src/api/client.ts` is the ngrok address (owner's decision, for now). On localhost/LAN the API is
`http://<host>:8800`; `EXPO_PUBLIC_API_URL` overrides.
**Dev-only conveniences that must not reach production:** the sign-in code shown on screen (only when `APP_ENV` is not `prod` AND the request has no
`X-Forwarded-For`, i.e. never through a tunnel or proxy); `VOICE_PROVIDER=mock`.

## 7. Not done yet (as of this handoff)
1. **Real email codes:** put `BREVO_API_KEY` in `backend/.env` (an `xkeysib-` key; a verified sender must exist in Brevo), restart the API, then test with the owner's own
   address. The code (`core/mail.py`) is written and tested with a fake Brevo only. (Jambagrad keeps its Brevo SMTP credentials inside its own database, so the key
   could not be copied.)
2. **Vercel deployment** of `app/` (steps in `CONTRIBUTING.md`; env var `EXPO_PUBLIC_GOOGLE_CLIENT_ID`), then add the Vercel URL to the Google OAuth client's authorised
   JavaScript origins (owner does this in Google Cloud). Backend stays on the owner's computer behind the ngrok address.
3. The pull request `Ankit` to `main`, and branch protection on GitHub (owner).
4. Roles and grants for communities (section 8), the agent's own `g` token, Singpass and DigiLocker (need registration), onboarding to join or create a community,
   every tab other than Me, the Translate button, push notifications, photos.
5. Voice on phones (needs an Expo development build, not Expo Go; the app falls back to typing). Voice on iPhone Safari is untested.
6. Native-speaker review of hi, bn, ta, zh, ms words.
7. Docs: `team-docs/06-technical/app-navigation-agent-language.md` and `app-plan.md` still describe the removed sample modules (events, goals, mock data) and the
   old "assistant brain not connected" state: the code is the truth, update them. `master-docs/` is stale.
8. Backend in-memory pieces to move to a shared store before running more than one process: the signed-out session list and `changed at` cache
   (`auth_state.py`), voice call store, the in-app talk counters. The CI backend job is new and has not run on GitHub yet.
9. A leaked MongoDB Atlas password (from a mistake in an earlier session) must be rotated by the owner; the local Postgres admin password and network exposure should
   be tightened before any public deployment. A test user `ui-check@example.com` exists in the local database.

## 8. Recommended next design: roles, grants and the agent token (from Jambagrad)
Adopt in this order: (a) done: 15-minute tokens with type/session/issuer/audience claims; (b) done: per-person "changed at"; (c) **grants**: a grant is
person + scope (a community) + role + **term start/end**; every create/update/delete/money/admin action is checked live (deny beats allow; your own scope is always
yours; sensitive actions need a fresh check); the token may carry a small "hot list" of low-risk reads later; call `mark_changed` (service.py) whenever a grant changes so
older tokens refresh. (d) the in-app agent gets its own 5-minute `g` token that is never wider than its owner. (e) RS256 + a published public key only when a second
service must verify tokens. Reference code: the owner's Jambagrad repo, `backend/modules/auth` and `backend/modules/access`, and `docs/ACCESS_TOKEN.md`. It is inspiration:
**do not copy code wholesale** (the owner wants this scalable and simple).

## 9. Testing notes
- Backend: 50 tests (identity 21, mail 8, voice 14, agent 7). They use the real local database and clean up their own `@example.com` users. Voice/agent tests use fake phone,
  model and mail, so nothing is sent and nothing costs money.
- App: `selftest.ts` checks the tree, policies, words in six languages, definePage rules and the agent tools with fake controls.
- Browser checks so far were done by hand: welcome, sign-in, code, setup, Home "Coming soon", Me, agent bar (typed request opened a page; web search answered).
- Not tested: real email, Vercel, iPhone, Expo Go, Singapore phone number, calls longer than 35 s, tool use on a phone call.

## 10. Branch and pull request flow
`main` = reviewed and deployable. `Ankit` = the owner's working branch (the whole project was pushed there). Work in small branches named `ankit/<topic>` from `Ankit`
or `main`, open a pull request, CI must pass, squash-merge. After a merge to `main`, bring `main` back into `Ankit` (`git switch Ankit && git merge main`).
Details in `CONTRIBUTING.md`.
