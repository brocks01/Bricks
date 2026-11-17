# Architecture

## The repository
```
app/          Expo app and website (React Native, Expo Router, TypeScript)
backend/      Python FastAPI service and PostgreSQL (migrations in backend/migrations)
team-docs/    these documents
```

## Backend (`backend/app/modules`)
One service, one database, split into modules. Plain functions over one database connection; every rule lives in a service, not in a router.

| Module | Job |
|---|---|
| `identity` | email one-time-code sign-in, Google, the mock Singpass (always Uncle Tan) and demo accounts, sessions (each keeps how it was started: `refresh_tokens.method`, shown as `signed_in_with` on `GET /v1/me`), the basic profile; `open_from_contact` makes an account for someone who arrives by call or chat |
| `onboarding` | the steps, questions and rules (data in `rules.py`), the profile (roles, surfaces, focus, Wisdom parts), the loneliness check |
| `wisdom` | experience capsules, offers, requests, introductions, sessions, stats; `teach.py`: the teaching profile, planned sessions (`wisdom_meetings`), reviews (`wisdom_reviews`), `upcoming_sessions` for Home |
| `communities` | communities, activities, check-ins, the leader's tools, standing |
| `recurrence.py` | repeating events (series) for community events and market days |
| `market` | services, bookings, endorsements, market days, stalls, interests on events, I went / I didn't go (`market_event_attendance`) |
| `hosts` | hosts (centres, malls, organisers), their members, their own opportunities and imported communities |
| `geo` | addresses to coordinates (Google Geocoding, cached in `geo_places`), distances, and map pictures of a stored address |
| `calendar` | reminders, appointments, scheduled calls from Wisdom |
| `health`, `home`, `grow`, `explore`, `nodes` | the check-in and walks; Home (`GET /v1/home/upcoming`: what is coming up from Communities, the Marketplace and Wisdom); goals and habits; the library; the Tree of Wisdom (leaves for showing up, `wisdom_leaves`) |
| `family` | family circles, invitations, assisted profiles, delegations |
| `insights` | the centre's interest report, the pilot numbers, group suggestions |
| `skills` | the registry of everything the agent can do (56 skills) and its router |
| `channels` | the agent brain (persona, memory, text agent), Telegram, WhatsApp and SMS adapters, the outbox, nudges, spam guard |
| `voice` | Twilio Media Streams and the Gemini Live relay for phone calls |
| `agent`, `translation`, `media` | the in-app agent, translation, image uploads |

## Backbone and doors
The **backend is the backbone** (relationships, the agent's memory, the notification system); every channel is a **door**: a phone call, WhatsApp, SMS, Telegram, the app. The app is one door, not the product. We build the backbone first and add doors one by one. A person who never installs the app must still get the full benefit.

## The one idea that holds it together
**Skills are the only doers.** A call, a chat and the app all change data through the same services, so every rule (consent, who may do what, the other side decides) holds everywhere. Adapters carry words in and out and decide nothing.

## Data
PostgreSQL. 45 migrations so far (`backend/migrations/0001` to `0110`; each area has its own number range), applied by `python backend/run.py migrate` or at API start. Key tables by area: `users`, `profiles`, `refresh_tokens`, `channel_links`, `channel_messages`, `person_notes`, `notifications`, `wisdom_*` (with `wisdom_teaching_profiles`, `wisdom_meetings`, `wisdom_reviews`, `wisdom_leaves`), `recurrences`, `activities`, `activity_participants`, `geo_places`, `market_events`, `market_event_stalls`, `market_event_attendance`, `hosts`, `host_members`, `calendar_items`, `wellbeing_checks`.

## App (`app/src`)
Expo Router (`src/app` has only route files). Features are modules of pages (`src/features/<module>/pages.ts`) registered in one registry (`src/navigation`); every page declares its words in six languages (English, Hindi, Bengali, Tamil, Chinese, Malay). The bottom bar (`src/components/AppTabBar.tsx`) has four tabs: Home, Communities, Marketplace and Wisdom (the last two as the server's profile allows). The profile opens from the avatar in the header; health, family, notifications and chats open from the profile's More list. A signed-in person who has finished onboarding lands on Home.

## Running it
- API: `python backend/run.py` (port 8000 by default; needs `backend/.env`; migrations with `python backend/run.py migrate`). Local sign-in shows a "test mode code".
- App: `cd app && EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web --port 3000`. (Without that variable the web app looks for the API on port 8800.)
- Backend tests: `cd backend && python -m pytest tests -q`. App checks: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts && npx expo lint`.
- Command-line tools: `python backend/run.py skill <email> [name] [json]`, `call <email>`, `link-phone <email> +65...`.

## Environment names (values live in `backend/.env`, never in git)
`DATABASE_URL`, token and mail settings (see `backend/.env.example`); `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`; `PARALLEL_API_KEY` (web search); `TELEGRAM_BOT_TOKEN`, `TELEGRAM_MODE`, `TELEGRAM_WEBHOOK_SECRET`; `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `TWILIO_WHATSAPP_FROM`; `VOICE_PROVIDER`, `VOICE_PUBLIC_URL`, `VOICE_ADMIN_KEY`, `VOICE_ALLOWED_NUMBERS`; `CLOUDINARY_*` (image and sound uploads); `GOOGLE_MAPS_API_KEY` (addresses, distances and map pictures; without it maps hide and the address shows); safety and timing: `WISDOM_OPEN_SIGNUP`, `WISDOM_SIGNUPS_PER_HOUR`, `WISDOM_BLOCKED`, `WISDOM_MSG_BURST`, `WISDOM_MSG_PER_HOUR`, `WISDOM_REPLIES_PER_DAY`, `WISDOM_CALLS_PER_NUMBER`, `WISDOM_QUIET`, `OUTBOX_LOOP`, `REMINDER_LOOP`. The app reads `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_GOOGLE_CLIENT_ID`.

## Twilio setup (owner)
Voice number webhook: `VOICE_PUBLIC_URL/twilio/incoming`. WhatsApp sandbox "when a message comes in": `VOICE_PUBLIC_URL/v1/channels/twilio/whatsapp`. SMS: `/v1/channels/twilio/sms`. Trial accounts: verify caller IDs, enable Singapore geo permissions, and add each number to `VOICE_ALLOWED_NUMBERS`. The public URL is the owner's ngrok tunnel (never started or stopped by an agent).

## Live link and saved copy (17 Nov 2026)
**Two problems, one design.** (1) A screen forgot its data when the person switched tabs or apps, and showed nothing until the network answered. (2) Something changed from outside the screen (a phone call, a WhatsApp chat, the same account on another device) and the open screen did not know.

**Saved copy (app, `src/core/cache.ts`, `useCached.ts`).** Every screen that adopts `useCached(key, fetcher)` shows the last copy of its data the moment it opens, asks the server again in the background, and shows a skeleton only the very first time. The copy is kept per account (a family helper acting for someone has their own), is also written to the device (AsyncStorage; browser storage on the web) so it survives closing the app, and is erased on sign-out. Sign-in paths are never kept. The key starts with the API path (`/v1/home/summary`), which is how the live link knows what to refresh. Home is converted; the other tabs adopt it with one line each (not done yet).

**Live link (backend `modules/live`, app `src/live`).** One WebSocket `/v1/live` per open tab or app (first message `auth` with the access token, then `ping` about every 25 s and `page` when the screen changes). The server keeps who is live and on which page (`GET /v1/live/presence`; skills `is_app_open`, `show_on_screen`). It sends only two kinds of message: `changed` (topics: the first word of an API path, or `*`; the screen refetches those through its normal signed-in requests, so permissions are never bypassed) and `open` (a page key the app knows; opened through the guarded navigation, marked as the agent's move). Changes are announced after any successful write by the person (middleware, covers every device including the one that wrote) and after any skill that changed data (a call, a chat). Bursts are merged into one message. On reconnect the app refetches everything. It does not replace the older `POST /v1/calendar/heartbeat` (the reminder loop still reads it).

**Conflicts: the rules.** The server is the truth. Two devices that write at once: the last write wins, and both screens converge within about a second because the live link makes each refetch. Optimistic changes (`useCached().set`) are replaced by the server's answer on the next refresh. A form someone is typing in is not overwritten (it reads its starting values once). **Not built yet:** a stale-write guard for records two devices could edit at the same time (profile, a calendar item): the plan is a version number on the record, sent with the edit, and a `409 changed_elsewhere` with the current record, so the screen can say "this changed on another device" instead of silently overwriting.

**Limits.** The hub lives in one server process (right for the pilot); several servers need a shared channel (Postgres LISTEN/NOTIFY or Redis) behind the same two functions. The screens' own conversion to `useCached` and the stale-write guard are the open tasks.

## Direction (16 Nov 2026)
Next in the backend: the belonging layer of Communities (circle identity, festival calendar, presence, taking part from afar), paid or free Wisdom with support requests and trust, and moving the services listing from the Marketplace into Wisdom so the Marketplace is market days only.

## Known limits
The `X-Bricks-On-Behalf` request header name is kept (the app sends it) until backend and app rename it together. The repository folder is still called `bricks`. WeChat, helper verification, moderation, and an in-app way for accepted people to talk are not built.
