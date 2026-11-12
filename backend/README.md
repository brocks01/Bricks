# Bricks backend

One API for the app (and, next, WhatsApp and phone calls): **FastAPI + Supabase Postgres + Supabase Auth + Supabase Storage** (docs/03_ARCHITECTURE.md).

It serves every endpoint the app calls (`app/src/api/client.ts`), with the same JSON shapes as the app's mock data. Point the app at it and every screen works unchanged.

## Run it

Needs [uv](https://docs.astral.sh/uv/). Python is installed by uv.

```sh
cd backend
cp .env.example .env              # then fill in the Supabase values (see the comments)
uv sync
uv run python -m bricks_api.seed  # creates the tables, then wipes and re-seeds the demo world
uv run python -m bricks_api       # API on http://0.0.0.0:8000  (docs at /docs)
```

**Connect the app.** Put this in `app/.env.local`, using your computer's Wi-Fi address (`ipconfig` / `ifconfig`), then restart Expo:

```sh
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000
```

The phone must be on the same Wi-Fi. For phones elsewhere, use `ngrok http 8000` and put the https URL there instead.

**Demo controls (demo servers only, `DEMO_MODE=true`).** `POST /demo/reset` does the same re-seed from the app (Settings → tap the version 5 times → Reset demo), in a few seconds. `GET /demo/accounts` lists who the demo can act as; the app sends the choice as `X-Demo-User` (`u_raj`, `u_priya`, `u_ahmad`, `u_lim`, `u_judge`), honoured only without a real sign-in. `POST /demo/judges/{n}/reset` (n = 1…10) puts one judge account back to fresh for its QR link (`u_judge<n>`, also usable as `X-Demo-User`). On other servers these return 404.

**Re-seed before every demo.** The demo data is dated from when it's seeded ("tomorrow, 7 am"), so run `uv run python -m bricks_api.seed` again before you film or present. It **wipes every table** in the schema, including any accounts made by signing in.

## Settings (`.env`)

| Variable | What |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SECRET_KEY` | `sb_secret_…`: storage uploads. **Server only, never in the app.** |
| `DATABASE_URL` | Session pooler URI (port 5432) |
| `SUPABASE_JWT_SECRET` | Only for legacy HS256 tokens. ES256 tokens are checked with the project's public keys. |
| `DEMO_MODE` | `true`: requests without a sign-in act as Raj (the Singpass demo), SOS helpers "set off" after 3 s and 6 s, and the family "they said yes" control works. Use `false` for anything real people use. |
| `DB_SCHEMA` | Default `bricks` |
| `CORS_ORIGINS` | Only for the Expo web build |

## How it fits together

- **Sign-in.** The app sends the Supabase access token. We verify it ourselves (`auth.py`). On the first request we create the member's account, using the Google name.
- **No token.** In demo mode, a request without a token acts as the demo member. Otherwise it gets a 401.
- **Database.** Our tables are in their own `bricks` schema, which Supabase's Data API doesn't expose. The app's publishable key therefore can't read them directly; everything goes through this API (docs/03 §4).
- **Requests.** Every request is one database transaction. Every response is validated against `schemas.py`, which mirrors `app/src/api/types.ts`. Request bodies ignore fields they don't know.
- **Voice clips.** These go to a public Storage bucket `voice` under unguessable names. They're played on profiles that other members open.
- **Times.** "Today", "this week" and reminder times are Singapore time (`timeutil.py`).
- **Walks.** Walk processing (`walks.py`) follows the app's mock exactly: distance, moving time, splits and the 200 m home privacy zone. If home is unknown, it hides 200 m at each end of the walk. It also writes the encouragement line.

```
src/bricks_api/
  main.py        app, health, routers       seed.py     demo world (python -m bricks_api.seed)
  config.py      settings                   walks.py    walk processing
  auth.py        token checks               geo.py      haversine, polylines
  deps.py        request context            storage.py  voice clips
  db.py          pool, migrations           schemas.py  wire types (= app/src/api/types.ts)
  routers/       me, events, circles, thrive, walks, sos, passiton, family, voice
  whatsapp/      the WhatsApp channel (below)
migrations/      plain SQL, applied in order by the seed command
```

## WhatsApp (docs/06, iterations/whatsapp)

Seniors can do the important things on WhatsApp with buttons and voice notes: join, accept a family invite, the daily check-in, joining walks, reminders, SOS, Menu. Everything writes to the same tables as the app.

**Two routes, one code path.** Meta Cloud API (main) and the Twilio sandbox (walk-up judges). Replies go back on the route a number last wrote from. Twilio's sandbox has no buttons, so choices arrive as a numbered list and a reply of "1" works like a tap.

**The sending rule.** If they wrote to us in the last 24 hours, we send interactive buttons and lists. Those need no approval. Otherwise Meta needs an approved template (`whatsapp/templates.py`). Each template carries its own free-form twin, so one call does the right thing either way.

**Set up**

1. Fill the `META_*`, `TWILIO_*`, `PUBLIC_BASE_URL` and `GEMINI_API_KEY` values (`.env.example` says where each comes from).
2. Apply the new tables without wiping data: `uv run python -m bricks_api.seed` applies migrations, then **re-seeds**. Use it only when a wipe is fine.
3. Run the API and ngrok (`ngrok http 8000`). Keep `PUBLIC_BASE_URL` equal to the ngrok URL.
4. Meta → your app → WhatsApp → Configuration: callback `PUBLIC_BASE_URL/wa/webhook`, verify token `META_WA_VERIFY_TOKEN`, subscribe to **messages**.
5. Twilio → WhatsApp sandbox → "When a message comes in": `PUBLIC_BASE_URL/wa/twilio` (POST).
6. Templates: `uv run python -m bricks_api.whatsapp.submit_templates` submits any missing ones; `--status` shows Meta's review state.

**Settings**

| Variable | What |
|---|---|
| `WA_SCHEDULER` | `true` sends the 8 am check-in, reminders, "starts in an hour" and the missed check-in ladder (+2 h nudge, +3 h call step, +4 h family). One server only. |
| `DEMO_FAST_ESCALATION` | Ladder steps in minutes (1 / 2 / 3), snooze 1 minute. |
| `DEMO_MODE` | Also: after joining, the check-in comes straight away (judge path); SOS alerts go only to helpers who have messaged us (never a stranger); helpers we can't reach "set off" after 3 s and 6 s, like the app. |

**Demo controls** (demo mode only): `POST /wa/admin/checkin {user_id}`, `/wa/admin/event-invite {user_id, event_id}`, `/wa/admin/reminder {reminder_id}`, `/wa/admin/family-invite/{id}`, `/wa/admin/tick` (add `?morning=true` to send everyone's check-in now).

**Privacy.** `messages_log` records what kind of message went where, never its text. Voice notes are held in memory for transcription only.

```
whatsapp/
  webhook.py   GET/POST /wa/webhook (Meta), POST /wa/twilio, demo controls
  router.py    SOS words -> STOP/START -> button taps -> location -> onboarding -> Gemini
  service.py   sending rule, contacts, 24 h window, sessions, idempotency, logs
  providers.py Meta and Twilio: signatures, parsing, sending, media
  templates.py the 11 templates x 4 languages (+ submit_templates.py)
  i18n.py      every free-form message in en / ms / zh / ta
  keywords.py  SOS, STOP/START, Menu, Hi, Singapore areas
  speech.py    Gemini: voice note -> text, text -> intent
  scheduler.py check-in, ladder, reminders, event reminders
  flows/       onboarding, family, checkin, events, reminders, sos, menu, walks
```

## Checks

```sh
uv run ruff check && uv run ruff format --check && uv run mypy src tests && uv run pytest -q
```

Tests run the real app against a throwaway `bricks_test` schema, with a fake file store and a clock we can move. CI (`.github/workflows/backend.yml`) uses a local Postgres 17 instead of Supabase. Locally against the Sydney database, the tests take about 3 minutes because of network round trips. WhatsApp tests (`test_whatsapp*.py`) post real webhooks into the app; Meta, Twilio and Gemini are fakes that record what would have been sent.

## Deploying

Use the Dockerfile on Render, Railway or Fly, with the same environment variables. **Host it in the database's region** (`ap-southeast-2`, Sydney). Each request makes several database round trips, so from far away a request takes 1–3 s; in the same region it takes milliseconds.

## Status against docs/03 §10

| Done | Not yet |
|---|---|
| Migration v1, seed (B0.1, B0.2) | PostGIS nearest helpers (SOS uses the Safe Circle in order) |
| Me, home, events, circles (B1.1) | App push notifications (WhatsApp's scheduler sends the check-in, reminders and the ladder on WhatsApp) |
| Check-ins, reminders, SOS, Safe Circle, walks + processing (B1.2) | `/assistant/turn`, `/assistant/transcribe`, `/tts`: answer 503 until the voice lane's speech keys exist; the app falls back |
| Singpass mock, Google via Supabase, family invite + yes, skills, thank-yous (attendance checked), profiles, voice intro (B1.3) | Exercise sessions, Joy Report (Phase 3) |
| Walk history (week / 4 weeks, bests), circle walks + cheers, Simple Mode (self or family), orgs + QR join, health card, life stories + family questions, family overview (3.2) | |
