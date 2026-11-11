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

## 2026-11-11 (later): product architecture locked
- **Two domains: Connect (what people do together) and Grow (what one person develops).** Thrive is removed. Tagline: **Connect. Grow. Participate.** Full page: `../02-product/product-architecture.md`.
- Jobs, referrals, local work, sponsors, earnings, training and community services belong to Connect. Personal fitness, learning goals and skill progress belong to Grow. The same activity can show in both.
- No third domain for now. A **flexible activity system** (title, category, organiser, time, place, participants, registration, attendance, goals, contributions, optional sponsorship) lets each community build its own clubs, leagues, classes and programmes without a new module each time.
- A person can use Bricks without joining a community; four starting paths: Join, Create, Start personally, Explore. Profile and settings open from the avatar. The Bricks Agent bar is global.
- This replaces the earlier proposals (Connect / Grow / Thrive, and four tabs Community / Activities / My Life / Profile).
- **Decided (owner): exactly two tabs, Connect and Grow.** No separate Home tab; Connect is the landing view. Profile and settings open from the avatar.
- The agent can show **smart UI** (questions, visual explanations, generated pages in the person's language) in a surface over the app. Decision to build the tool is recorded in `../10-handoff/PROGRESS.md`.


## 2026-11-11 (evening): Agent Canvas
- The agent's smart-UI capability is named **Bricks Agent Canvas** (spec: `../06-technical/agent-canvas-spec.md`, sample `07-agent-canvas.webp`). It is a **declarative component renderer** controlled by the agent, shared by Connect and Grow, **not** an AI-to-HTML generator. The sandboxed HTML in the current `show` tool stays only as an optional advanced block.
- Stack for it is ours (Expo, FastAPI, PostgreSQL), not the Next.js/Node/Mongo stack in the original proposal.
- A canvas is temporary and never authoritative data; real records are created only through authorised backend calls, with confirmation for sensitive actions.
- First slice to build (when the owner agrees): canvas label and close, selection tiles, step dots and Next, on top of `show`. The full event-creation MVP waits for the activity and community backend.
