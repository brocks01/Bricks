

==================== FILE: team-docs\00-start-here\README.md ====================

# 00-start-here

Start here: what these docs are, a glossary and an index of decisions.


==================== FILE: team-docs\01-vision\README.md ====================

# 01-vision

Problem, insight, the club model, principles and what is unique.


==================== FILE: team-docs\01-vision\vision.md ====================

# Vision (draft, 11 Nov 2026)

## One line
Bricks is the **club system for a neighbourhood**. A community runs itself the way a college society runs: roles with terms, shared goals, events, sponsors, and people who notice when you are missing.

## The problem
- People in an apartment society or neighbourhood live behind one gate and do not know each other. There is no shared goal and no easy way in, so they do not meet, walk, celebrate or help each other.
- Seniors feel like recipients, not contributors. Men take part far less. Programmes are recreational with no purpose and depend on paid staff and funding.
- Culture and stories are being lost, and the people who carry them (elders) are not used.

## The insight
A college society works because **new people get a role, an event and friends on day one**, leadership rotates, and the club outlives its members. Neighbourhoods have none of this. Bricks gives any community that structure.

## What we are, and are not
- We are the **faculty coordinator**: we give tools, verify and approve leaders, bring sponsors, and keep the record fair.
- The community decides its own activities and services. If a service needs a licence (for example childcare), **the community is responsible for meeting it**; we only provide the tools.
- We are **not** a social network, a childcare operator, a bank or a health service. We never hold money and never give medical advice.

## Principles
1. Voice first: everything can be done by speaking; every screen can be read aloud.
2. Community first: the community earns, decides and is recognised, not one person.
3. Physical first: online exists to bring people together in person.
4. Fair by design: terms, nominations, endorsements, transparent shares, appeals.
5. Free to start: a low-cost stack; sponsors, not participants, pay for events.
6. Members only: a community's records are visible to its members, not to outsiders.

## Who it serves
Every resident of a community, with seniors given real roles and a leading part, and younger members with skills (finance, events, training) joining in.

## What we want to prove
That a community with roles, terms and events becomes self-running, that more people (especially senior men) take part, and that a community can earn through sponsors.


==================== FILE: team-docs\02-product\feature-list.md ====================

# Full feature list (draft, 11 Nov 2026)

Priority: **P0** = hackathon build, **P1** = soon after, **P2** = later. The app is where features live; the website is for reading and searching (platform-docs) only.

## 1. Identity and onboarding
- P0 Sign up and sign in with email one-time code (no password). Profile: name, language, age band, photo.
- P0 Join a community by invite code, link or QR.
- P0 Consent screens in plain language; each shared item has a visibility level (only me, my community).
- P1 Family member can help a senior set up; the senior confirms.
- P2 Singpass / Google sign-in.

## 2. Communities
- P0 Create a community (apartment, block, centre, club) with a name, area and a place on the map.
- P0 Discover nearby communities (distance search); open or invite-only.
- P0 Community home: current objective and progress, what is needed from me today, next event, recent activity.
- P0 Member list (members only), notice board (announcements).
- P1 Rings: community, zone, city.
- P0 Link out to the community's own WhatsApp group (no in-app chat).

## 3. Roles and governance (the faculty-coordinator model)
- P0 Role catalogue per community (lead, host, events, finance, culture, sports, welfare, ...), each with permissions and a weight.
- P0 Terms: one year, at most two, then others get a chance.
- P1 Nominations and endorsements by members; platform approval of leads; handover notes; yearly re-evaluation.
- P1 Conflict-of-interest checks and an appeal route.

## 4. Activities and events
- P0 Create an event or recurring activity (jog, class, mela, quiz, story circle...); RSVP; capacity.
- P0 Check in at the event (tap or QR) so attendance is real.
- P0 Reminders by push; email as a fallback.
- P1 After-event recap and photos; recurring rules.
- Any activity type is allowed; the community decides.

## 5. Contributions and recognition
- P0 Log a contribution ("fixed a fan", "led the walk"); another member confirms.
- P0 Community score by participation (how many took part), not by a few stars.
- P1 Seasons with a league table, badges, streaks, recognition wall, year-end review.

## 6. Goals and personal health (light)
- P0 Personal goals and community goals; progress.
- P0 Health graph from manual entries (walk, jog, mood, water). Private by default.
- P1 Phone step counts with permission; group graphs for a shared goal.
- Never: diagnosis, treatment advice or medical claims.

## 7. Voice
- P0 Read any screen aloud; simple spoken commands to move around the app ("open events", "log a walk").
- P1 Voice input for logging and RSVP in several languages.
- P2 Phone agent and WhatsApp agent on the same account.

## 8. One navigation map
- P0 One registry of "places" (screens). The app, voice commands, deep links and later the phone agent all use it.

## 9. Money and sponsors (records only; the platform never holds money)
- P1 Community fund ledger (sponsor income, prizes, expenses, payouts), append-only and visible to members.
- P1 Sponsor profiles; sponsorship offers for events; the community approves each sponsor; blocked categories.
- P1 Share formula (role weight + contribution + bonus, with a cap per person) voted by the community; payout record; transparent view.
- P2 Appeals workflow.

## 10. Services a community may offer
- P1 A list of services (childcare, tuition, training, classes) with a note on the legal responsibility and licence reference supplied by the community.
- P2 Booking and payments through the community.

## 11. Competitions and leagues
- P1 Challenges inside one community.
- P2 Between communities, zone and city events; live broadcast and tickets much later.

## 12. Notifications
- P0 Push (Expo) and in-app inbox. P0 One email service for one-time codes and fallbacks.

## 13. Coordinator (our) console
- P1 Approve leads, review reports, match sponsors, see community health. Starts as simple admin screens.

## 14. Public website
- P0 platform-docs only: read, search, share links. Opening a link to a community shows only the basics and sends people to the app.

## 15. Safety and privacy
- P0 Members-only visibility, consent records, report and block, audit log of sensitive actions.

## 16. Languages
- P0 English with all text in language files. P1 Malay, Mandarin, Tamil, Hindi.

## Build order for the hackathon
Identity, communities, roles and terms (basic), events with check-in, contributions and community score, goals and light health, voice read-aloud and commands, notifications, one navigation map. Everything else follows.


==================== FILE: team-docs\02-product\README.md ====================

# 02-product

One file per feature (communities, roles and terms, goals, events, competitions, sponsors and earnings, health, voice, central navigation) plus priorities.


==================== FILE: team-docs\03-business\README.md ====================

# 03-business

Revenue model, sponsors, pilots and the validation plan.


==================== FILE: team-docs\04-research\README.md ====================

# 04-research

raiSE brief, existing-solutions scan, evidence, Anganwadi and intergenerational findings, cost figures.


==================== FILE: team-docs\05-design\image-prompts.md ====================

# Image prompts for sample screens (for ChatGPT or any image tool)

Use the **style block** at the start of every prompt so the screens look like one app. Generate one screen per image.

## Style block (paste first)
```
Mobile app UI design, flat, minimal, clean. Portrait phone screen, 1170 x 2532, shown as a flat screenshot with no phone frame and no device mockup. Warm off-white background (#FBFAF7), white cards with thin light-grey borders and rounded corners, deep green accent colour (#0F6E56) with a soft green tint (#E1F5EE). Very large, readable sans-serif text (body 18 to 20 px at phone size), high contrast, generous spacing, big tap targets. A bottom bar with four labelled tabs: Community, Events, Me, Help (text labels, no icons, no emoji). No gradients, no 3D, no glossy effects, no stock-photo look, no illustrations of robots. Looks like a calm, trustworthy neighbourhood app for all ages. Sample names only: Mr Tan, Mdm Lim, Mr Raj, Mdm Aisha.
```

## Screens
1. **Community home**: "Maple Court Residents (sample)", "Sample Estate, 42 members". A card "What we are building together" with a green progress bar "8 of 20 things fixed". A card "Today for you" with two short lines. A card "People and their responsibilities" listing Lead Mr Tan, Events Mdm Lim, Finance Mr Raj, Culture Mdm Aisha with "Term ends Jun 2027".
2. **Events**: title "Events". Three event cards (Fix-it morning Sat 9:00, Evening walk Daily 18:00, Story circle Sun 16:00), each with place, "3 of 15 going" and a large green button "I'm going".
3. **Roles and terms**: title "Roles this year". A list of roles with the holder, the term end date and a small "1 of 2 terms" label. A card "Nominate someone" with a large button. A note "Leaders are chosen by members and approved by Bricks."
4. **Me (goals and week)**: title "Me", subtitle "Only you can see this". A card "My goals" with two goals and progress bars. A card "My week" with a simple seven-bar chart (M to S) in green. A small note "Sample numbers. Not medical advice."
5. **Help (voice)**: title "Help". A very large round green microphone button in the middle with the label "Tap and say where to go". Under it, three example phrases in rounded chips: "Open events", "My goals", "Read this to me".
6. **Join a community**: title "Join your community". A large field "Invite code" and a button "Join". Below, a card "Communities near you" with two nearby communities, distance in metres, and a "View" button.
7. **Season league table (later)**: title "This season". A ranked list of five communities with points and a participation bar for each (percentage of members who took part). The user's own community highlighted in green.
8. **Sponsor offer (later)**: title "Sponsor offer". A card with a local business name, "Offers to support Fix-it morning", an amount, and two large buttons "Accept" and "Decline", with a line "Your community decides. Bricks never holds your money."

## After generating
Put the images in `team-docs/05-design/screens/` with names like `01-community-home.png`, then tell the build agent which image matches which screen.


==================== FILE: team-docs\05-design\README.md ====================

# 05-design

Design principles, screens (later) and naming.


==================== FILE: team-docs\06-technical\app-plan.md ====================

# App plan (draft 1, 11 Nov 2026)

The app is where features live. The website is documentation only (platform-docs).

## Stack
- **Expo (SDK 58) with React Native and TypeScript**, file-based routing with **Expo Router** (routes in `app/src/app`).
- **Expo Go** on a phone for testing: run `npx expo start` in `bricks/app`, then scan the QR code with Expo Go (same Wi-Fi). The Expo Go app must support the project's SDK; update Expo Go from the store if it complains.
- **Expo web**: the same code runs in a browser (`npx expo start --web`, `http://localhost:8081`). Share a link only through a hosted build later.

## The middle frame on the web
On a wide screen the whole app sits in a phone-sized column (420 px) in the middle of the page; on a narrow screen it fills the page. On a real phone it is normal full screen. This is done once, in `src/components/PhoneFrame.tsx`, wrapped around everything in `src/app/_layout.tsx`.

## Things that can break on the web
Camera, step counting, push notifications, background tasks and some speech features work only on a phone. Each such feature must check `Platform.OS` and show a plain message on the web. The web build is for looking and sharing, not for full use.

## Folder layout (`bricks/app`)
```
src/
  app/            routes (Expo Router): _layout.tsx, (tabs)/index, events, me, help
  components/     PhoneFrame, ui (Screen, Card, Button, ProgressBar)
  navigation/     places.ts: the ONE map of places (tab bar, voice commands, deep links)
  theme/          tokens.ts: colours, spacing, text sizes (large and readable)
  data/           mock.ts: sample data until the API is connected
  (later) api/    client for the backend; i18n/ language files
```

## Rules
- Text is large (body 18 px) and high contrast. Every tappable item is at least 52 px tall.
- All text will move into language files (English first).
- Every screen can be read aloud; spoken commands go through `places.ts`.
- No new place is added without adding it to `places.ts`.

## Next steps
1. Sign in with an email code and a join-a-community screen.
2. Connect to the backend API instead of mock data.
3. Real speech input (needs a development build; not available in Expo Go).


==================== FILE: team-docs\06-technical\backend-modules.md ====================

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


==================== FILE: team-docs\06-technical\database-schema.md ====================

# Database schema (draft 1, 11 Nov 2026)

One database: **PostgreSQL with PostGIS**. One schema. IDs are UUIDs. Every table has `created_at`; most have `updated_at`. Authorization is done in the backend, not in the database. Money tables only **record**; the platform never holds money.

Status: **P0** tables are built first; **P1** later.

## Identity (P0)
| Table | Key columns |
|---|---|
| `users` | id, email (unique), phone, display_name, language, age_band, avatar_url, home_area (coarse point, optional), status |
| `login_codes` | id, email, code_hash, expires_at, used_at, attempts |
| `refresh_tokens` | id, user_id, token_hash, expires_at, revoked_at |
| `consents` | id, user_id, scope, audience (me / community), given_how, created_at |
| `push_tokens` | id, user_id, token, platform |

## Communities and roles (P0 unless marked)
| Table | Key columns |
|---|---|
| `communities` | id, name, slug (unique), kind (apartment / block / centre / club), description, area_name, **location geography(Point,4326)**, privacy (open / invite), invite_code, ring (community / zone / city), parent_id, whatsapp_link, status |
| `memberships` | id, community_id, user_id, status (active / left / removed), joined_at, left_at — unique (community, user) |
| `role_definitions` | id, community_id (null = platform default), key, name, description, permissions text[], weight, seats, term_months (12), max_terms (2) |
| `role_terms` | id, community_id, role_definition_id, user_id, term_number, starts_on, ends_on, status (nominated / endorsed / approved / active / ended / rejected), handover_notes, approved_by |
| `nominations` (P1) | id, community_id, role_definition_id, nominee_id, nominated_by, reason |
| `endorsements` (P1) | nomination_id, user_id — unique |
| `announcements` | id, community_id, author_id, title, body, pinned |

## Seasons, goals and activities (P0)
| Table | Key columns |
|---|---|
| `seasons` | id, community_id, name, starts_on, ends_on, status |
| `objectives` | id, community_id, season_id, title, kind (make / teach / move / care / other), unit, target, status |
| `events` | id, community_id, season_id, objective_id, host_id, title, kind, description, starts_at, ends_at, place_name, **location geography**, capacity, recurrence_rule, status, sponsorship_id (null) |
| `event_rsvps` | event_id, user_id, status (going / cancelled), checked_in_at — unique (event, user) |
| `contributions` | id, community_id, user_id, event_id, objective_id, what, units, points, confirmed_by, visibility |
| `goals` | id, user_id, community_id (null = personal), text, kind, target, unit, progress, due_on, visibility |
| `health_entries` | id, user_id, kind (walk / jog / steps / mood / water / sleep / other), value, unit, recorded_at, source (manual / device), visibility (default private) |
| `season_scores` | season_id, community_id, points, participants, updated_at (rebuilt from contributions and check-ins) |

## Money (P1, records only)
| Table | Key columns |
|---|---|
| `sponsors` | id, name, contact_email, category, status, approved_by |
| `sponsorships` | id, sponsor_id, community_id, event_id, amount, currency, terms, status (offered / accepted / declined / paid), community_approved_at |
| `fund_ledger` | id, community_id, entry_type (sponsor_income / prize / expense / payout / adjustment), amount, currency, ref_type, ref_id, note, created_by — **append-only** |
| `share_formulas` | id, community_id, season_id, role_weight_pct, contribution_weight_pct, bonus_pct, cap_pct_per_person, status |
| `share_votes` | formula_id, user_id, vote — unique |
| `payouts` | id, community_id, season_id, user_id, amount, basis (json), status |
| `services` | id, community_id, title, kind (childcare / tuition / training / class / other), description, schedule_text, legal_note, licence_ref, status |

## System (P0)
| Table | Key columns |
|---|---|
| `notifications` | id, user_id, kind, title, body, payload (json), channel, read_at, sent_at |
| `audit_log` | id, actor_id, action, entity, entity_id, details (json), at |
| `reports` (P1) | id, reporter_id, entity, entity_id, reason, status |

## Indexes and PostGIS
- GiST index on `communities.location` and `events.location` for "near me" searches (`ST_DWithin`).
- B-tree on `(community_id, starts_at)` for events, `(user_id, recorded_at)` for health entries, `(community_id, created_at)` for contributions.
- Unique constraints as listed above. Partial index on active `role_terms`.
- Privacy: queries always filter by membership; `visibility` is checked before returning a row to someone else.

## Capacity note (2 to 3 thousand people at once)
- A light FastAPI service with connection pooling and indexed, paginated queries should handle this on a small server. This is an estimate, not a measurement; we will load-test it.
- Read-heavy pages (community home) are cached for a few seconds.
- Free database tiers have limits (storage, connections, pausing). Check the provider's current limits before choosing.

## Migrations
One tool (Alembic). Every change is a migration file; no manual edits to the database.


==================== FILE: team-docs\06-technical\README.md ====================

# 06-technical

Architecture, data, API and voice. Added later, when the overall features are settled.


==================== FILE: team-docs\07-meetings\README.md ====================

# 07-meetings

Team calls and mentor notes.


==================== FILE: team-docs\08-decisions\README.md ====================

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


==================== FILE: team-docs\09-archive\README.md ====================

# 09-archive

Older material moved from project-name-tbd. Nothing is moved yet.


==================== FILE: team-docs\README.md ====================

# Team docs (internal)

Our own documents: vision, decisions, design notes, research, meeting notes.

Technical documentation goes here later, in its own sub-folder, when the overall features are settled.
Public, user-facing documentation lives in `../platform-docs/`, not here.


==================== FILE: platform-docs\about\index.md ====================

---
title: About Bricks
description: What Bricks is, why it exists and how it works.
audience: public
status: draft
updated: 2026-11-11
---

# About Bricks

What Bricks is, why it exists and how it works.

Pages planned here (not written yet):

- what-is-bricks
- why-it-exists
- how-it-works
- values


==================== FILE: platform-docs\communities\index.md ====================

---
title: Communities
description: How a neighbourhood runs itself like a club: joining, roles, goals, events and shared earnings.
audience: public
status: draft
updated: 2026-11-11
---

# Communities

How a neighbourhood runs itself like a club: joining, roles, goals, events and shared earnings.

Pages planned here (not written yet):

- what-is-a-community
- joining
- roles-and-terms
- goals-and-seasons
- activities-and-services
- events
- competitions-and-leagues
- sponsors-and-earnings
- sharing-earnings-fairly


==================== FILE: platform-docs\faq\index.md ====================

---
title: Frequently asked questions
description: Short answers to common questions.
audience: public
status: draft
updated: 2026-11-11
---

# Frequently asked questions

Short answers to common questions.

Pages planned here (not written yet):

- general
- communities
- money-and-sponsors
- privacy-and-safety


==================== FILE: platform-docs\getting-started\index.md ====================

---
title: Getting started
description: Where to begin, depending on who you are.
audience: public
status: draft
updated: 2026-11-11
---

# Getting started

Where to begin, depending on who you are.

Pages planned here (not written yet):

- for-residents
- for-families
- for-community-leads
- for-sponsors


==================== FILE: platform-docs\glossary.md ====================

---
title: Glossary
description: Plain-language meanings of the words Bricks uses.
audience: public
status: draft
updated: 2026-11-11
---

# Glossary

- **Community**: a neighbourhood group (a block, an apartment society, a centre) that runs itself like a club.
- **Role**: a named job a member agrees to do for a set term.
- **Term**: the period a role is held, usually one year, at most two.
- **Season**: a period with a shared goal and a league table.
- **League**: a series of events where communities compete.


==================== FILE: platform-docs\guides\index.md ====================

---
title: Guides
description: Step-by-step how-tos.
audience: public
status: draft
updated: 2026-11-11
---

# Guides

Step-by-step how-tos.

Pages planned here (not written yet):

- start-a-community
- run-an-event
- run-a-league


==================== FILE: platform-docs\health-and-wellbeing\index.md ====================

---
title: Health and wellbeing
description: Your personal profile and graph, and shared community goals. Not medical advice.
audience: public
status: draft
updated: 2026-11-11
---

# Health and wellbeing

Your personal profile and graph, and shared community goals. Not medical advice.

Pages planned here (not written yet):

- personal-profile
- health-graph
- community-goals
- what-we-do-not-do


==================== FILE: platform-docs\index.md ====================

---
title: Bricks documentation
description: What Bricks is and how to use it.
audience: public
status: draft
updated: 2026-11-11
---

# Bricks documentation

Bricks helps neighbourhoods run themselves the way college societies do: with roles, terms, goals, events and sponsors.

- [About](about/index.md)
- [Getting started](getting-started/index.md)
- [Communities](communities/index.md)
- [Using Bricks by voice](voice/index.md)
- [Health and wellbeing](health-and-wellbeing/index.md)
- [Sponsors](sponsors/index.md)
- [Trust and safety](trust-and-safety/index.md)
- [Guides](guides/index.md)
- [FAQ](faq/index.md)
- [Policies](policies/index.md)


==================== FILE: platform-docs\policies\index.md ====================

---
title: Policies
description: Terms and privacy policy (placeholders until written).
audience: public
status: draft
updated: 2026-11-11
---

# Policies

Terms and privacy policy (placeholders until written).

Pages planned here (not written yet):

- terms
- privacy-policy


==================== FILE: platform-docs\README.md ====================

# Platform docs (public)

User-facing documentation for Bricks. Written for people, search engines and language models.

Rules for this folder:
- Plain language, no internal team notes, no technical internals.
- One topic per file; group files in folders and sub-folders by topic.
- Files only, no database: the folder is served as it is.

Sub-folders will be added once the overall features are settled.


==================== FILE: platform-docs\sponsors\index.md ====================

---
title: Sponsors
description: How sponsorship of community events works and the rules for sponsors.
audience: public
status: draft
updated: 2026-11-11
---

# Sponsors

How sponsorship of community events works and the rules for sponsors.

Pages planned here (not written yet):

- how-sponsorship-works
- event-sponsorship
- sponsor-rules


==================== FILE: platform-docs\trust-and-safety\index.md ====================

---
title: Trust and safety
description: Privacy, consent, who sees what, fairness and the legal responsibility of communities.
audience: public
status: draft
updated: 2026-11-11
---

# Trust and safety

Privacy, consent, who sees what, fairness and the legal responsibility of communities.

Pages planned here (not written yet):

- privacy
- consent
- who-sees-what
- fairness-and-appeals
- verification
- legal-responsibility-of-communities


==================== FILE: platform-docs\voice\index.md ====================

---
title: Using Bricks by voice
description: Everything you can do by speaking: phone, app and WhatsApp.
audience: public
status: draft
updated: 2026-11-11
---

# Using Bricks by voice

Everything you can do by speaking: phone, app and WhatsApp.

Pages planned here (not written yet):

- using-bricks-by-phone
- voice-commands
- languages
- whatsapp
