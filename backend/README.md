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

**Demo controls (demo servers only, `DEMO_MODE=true`).** `POST /demo/reset` does the same re-seed from the app (Settings → tap the version 5 times → Reset demo), in a few seconds. `GET /demo/accounts` lists who the demo can act as; the app sends the choice as `X-Demo-User` (`u_raj`, `u_priya`, `u_ahmad`, `u_lim`, `u_judge`), honoured only without a real sign-in. On other servers these return 404.

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
migrations/      plain SQL, applied in order by the seed command
```

## Checks

```sh
uv run ruff check && uv run ruff format --check && uv run mypy src tests && uv run pytest -q
```

Tests run the real app against a throwaway `bricks_test` schema, with a fake file store and a clock we can move. CI (`.github/workflows/backend.yml`) uses a local Postgres 17 instead of Supabase. Locally against the Sydney database, the 31 tests take about 3½ minutes because of network round trips.

## Deploying

Use the Dockerfile on Render, Railway or Fly, with the same environment variables. **Host it in the database's region** (`ap-southeast-2`, Sydney). Each request makes several database round trips, so from far away a request takes 1–3 s; in the same region it takes milliseconds.

## Status against docs/03 §10

| Done | Not yet |
|---|---|
| Migration v1, seed (B0.1, B0.2) | PostGIS nearest helpers (SOS uses the Safe Circle in order) |
| Me, home, events, circles (B1.1) | Scheduler and notifier: 8 am check-in push, reminders, escalation ladder (B2.1/B2.2) |
| Check-ins, reminders, SOS, Safe Circle, walks + processing (B1.2) | `/assistant/turn`, `/assistant/transcribe`, `/tts`: answer 503 until the voice lane's speech keys exist; the app falls back |
| Singpass mock, Google via Supabase, family invite + yes, skills, thank-yous (attendance checked), profiles, voice intro (B1.3) | Stories, orgs/QR, cheers, circle walks, exercise sessions, Joy Report (Phase 3) |
