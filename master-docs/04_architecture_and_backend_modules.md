# 04. Architecture and backend modules

## Stack (decided)
- **Backend:** Python 3, FastAPI, one service, modular monolith. One database. One email service (provider not chosen).
- **Database:** PostgreSQL 16 with **PostGIS 3.6** (location search and recommendation: nearby communities and events), local on the developer PC for now; hosting for later is open (PostGIS support required).
- **App:** Expo (React Native, TypeScript) with Expo Router; the same code runs on the web in a phone-sized middle column.
- **Docs website:** static files in `platform-docs` (to be served at docs.bricks.com), organised in folders with an `llms.txt` so language models can read it directly; no database.
- **Later:** push notifications (Expo), voice (Gemini Live and Twilio for phone), WhatsApp.
- **Capacity goal:** 2 to 3 thousand people at once on mostly free services. This is an estimate and must be load-tested; free database tiers have limits (storage, connections, pausing).

## Security rules
Members-only visibility; consent records; every route checks membership and permission; sensitive actions are written to an audit log; secrets only in `.env` files that the owner fills in (never shared or committed).

---

# Backend modules (draft 1, 11 Nov 2026)

One service, one database, one email service. A **modular monolith**: one FastAPI app, split into modules that can be separated later if needed. No message queues, no extra services for now.

## Modules (9 now, 2 later)
| # | Module | Owns | When |
|---|---|---|---|
| 1 | `core` | settings, database session, security helpers, errors, pagination, logging | P0 |
| 2 | `identity` | users, email one-time-code login, tokens, consents, push tokens | P0 |
| 3 | `communities` | communities, memberships, invites, nearby search (PostGIS), announcements | P0 |
| 4 | `governance` | role definitions, role terms, permissions; later nominations, endorsements, approvals | P0 basic, P1 full |
| 5 | `activities` | events, RSVPs, attendance check-in, recurrence | P0 |
| 6 | `contributions` | contributions, seasons, objectives, scores | P0 |
| 7 | `wellbeing` | goals, health entries, graphs | P0 |
| 8 | `notifications` | in-app inbox, push (Expo), email | P0 |
| 9 | `places` | the one navigation map exposed to the app and the voice helper | P0 |
| 10 | `money` | sponsors, sponsorships, fund ledger, share formula, payouts, services | P1 |
| 11 | `voice` | command parser, spoken replies, later phone and WhatsApp | P1 |

An `admin` set of endpoints for our coordinator console is added inside the modules above (permission-gated), not as a separate service.

## Folder layout
```
backend/
  app/
    main.py                  creates the FastAPI app, mounts every module
    core/                    config, db, security, errors, pagination
    modules/
      identity/              models.py  schemas.py  service.py  router.py
      communities/           (same four files)
      governance/ activities/ contributions/ wellbeing/ notifications/ places/
      money/  voice/         later
  migrations/                Alembic
  tests/                     one folder per module
  scripts/                   seed data, load test
  .env.example               names only; the real .env is never committed or shared
```

## Rules
- A module only imports another module's `service.py`, never its tables directly.
- Every route checks the person's membership and permission before returning data.
- Every list is paginated. Every sensitive action writes to `audit_log`.
- Settings come from environment variables; secrets only in `.env`.
- Email: one provider for login codes and fallbacks, chosen later (free tier).
- Hosting and database provider: not chosen yet. PostGIS support is required.
- The first test of every module is an automated test that calls it through the API.

## API style
Plain REST with JSON. Prefix `/v1`. Auth by bearer token. The app is the only client for features. The website is static documentation.
