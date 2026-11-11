# Decisions

Short, dated records. Newest last.

## 2026-11-11
- Working name: **Bricks**. Availability of domain, app-store and business name not checked yet.
- Product: a club system for neighbourhoods, run the way college societies run. Communities decide their own activities and services; they carry the legal responsibility for any regulated service (such as childcare). The platform gives tools only.
- Roles have terms of one year, at most two, with yearly re-evaluation. Leads are nominated and endorsed by members and approved by the platform.
- Money: the community earns as a whole (sponsors, events); members share by role and contribution under rules the community votes on. Participants do not pay entry fees in most events. The platform does not hold money.
- Events and competitions are open to any activity (cooking, storytelling, quizzes, sports). Broadcasting comes later.
- Folder structure agreed: platform-docs (public), team-docs (internal), plus backend, frontend, app and shared (not started).
- Stack: Python FastAPI modular monolith; one database, **PostgreSQL 16 with PostGIS 3.6 on this PC** (set up with pgkit); one email service; features live only in the **Expo app**; the website is documentation only. The Expo app also runs on the web inside a phone-sized middle frame.
- Capacity goal: 2 to 3 thousand people at once on mostly free tiers (an estimate to be load-tested).
- Database is ready (11 Nov): database `bricks` with an app role `bricks_app` (random password in `backend/.env`, never shared) on the local PostgreSQL 16, with PostGIS 3.6, pgcrypto and pg_trgm. pgkit is not needed; we use the installed Postgres directly.
- Do not use the MongoDB or other Jambagrad databases. Never open files holding credentials; the user puts secrets in `.env` himself.

