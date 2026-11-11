# BRICKS: ALL DOCUMENTS IN ONE FILE (snapshot 11 Nov 2026)



==================== FILE: README.md ====================

# Bricks master pack (snapshot, 11 Nov 2026)

One folder with the full context of the Bricks project, to give to ChatGPT (or any other agent). Everything is a draft from conversation; items marked open are not decided. **No secrets are in this folder.**

## How to use with ChatGPT
Upload `00_ALL_IN_ONE.md` (everything in one file), or upload the numbered files. Then say: "Read all of this. You are helping design the UI and the product for Bricks. First summarise what you understood and list your questions."

## Files, in reading order
| File | What it holds |
|---|---|
| `01_project_brief.md` | What Bricks is, the problem, the model, what it is not, honest limits |
| `02_hackathon_context.md` | The raiSE challenge, judging lens, mentor advice, team, teammates' inputs |
| `03_feature_list.md` | Full feature list with P0, P1, P2 priorities |
| `04_architecture_and_backend_modules.md` | Stack, security rules, backend modules and folder layout |
| `05_database_schema.md` | Tables for PostgreSQL with PostGIS |
| `06_app_plan_and_navigation.md` | Expo app plan, web middle frame, proposed navigation structure, screen list |
| `07_ui_brief_and_prompts.md` | Style block and 12 screen prompts for generating sample UI images |
| `08_code_status.md` | What is built, what is not, and the full source of the starter app |
| `09_decisions_and_open_questions.md` | Decided items, open questions, risks |
| `10_research_facts.md` | Research facts with sources (verify before quoting) |
| `00_ALL_IN_ONE.md` | All of the above joined into one file |


==================== FILE: 01_project_brief.md ====================

# 01. Project brief: Bricks (working name)

Snapshot: 11 Nov 2026. Everything here is a draft agreed in conversation between Ankit (founder, builder) and an AI assistant. Items marked **open** are not decided.

## One line
Bricks is a **club system for a neighbourhood**. A community (an apartment society, a block, a centre) runs itself the way a college society runs: members take roles for a set term, the community sets goals and runs events, sponsors support the events, the community earns together and shares fairly, and people notice when someone is missing.

## The problem
- People in an apartment society live behind one gate and do not know each other. There is no shared goal and no easy way in, so they do not meet, walk, celebrate or help each other.
- Seniors often feel like recipients, not contributors. Men take part far less (the brief says about 20% at some centres). Programmes are recreational with no purpose and depend on paid staff and funding.
- Culture and stories are fading, and the people who carry them (elders) are not used.

## The insight
A college society works because a new member gets a role, an event and friends on day one, leadership rotates, and the club outlives its members. Neighbourhoods have no such structure. Bricks gives any community that structure.

## Who it serves
Every resident of a community. Seniors get real roles and a leading part; younger members with skills (finance, events, training) join too. Singapore is the first focus (the judges are mostly Singapore-based); India is the second (culture, scale, existing models like Anganwadi).

## How it works (the model)
1. **Community.** Created or joined by invite code, link, QR or by location (nearby search). Open or invite-only. Can sit in rings: community, zone, city.
2. **Roles with terms.** Lead, events, finance, culture, sports, welfare and so on. A term is one year, at most two, so others get a chance. Leaders are **nominated and endorsed by members; Bricks verifies and gives the final approval** (we act like the faculty coordinator of a college club). Roles give access to the tools for that job.
3. **Seasons, goals and objectives.** A community sets a shared objective for a season (for example "fix 20 household things", "walk 100 km together"). Progress is visible to members.
4. **Activities and events.** The community decides what to do: jogging, a mela, cooking, storytelling, quizzes, tug of war, tuition, skills training. We suggest ideas and bring sponsors. Members RSVP and check in; attendance is real.
5. **Contributions and recognition.** Members log what they did (confirmed by someone else). The **community score is based on participation** (how many took part), not on a few stars. Ranks and recognition motivate people to compete for roles each year.
6. **Money.**
   - The **community earns as a whole**, mainly from event sponsors that Bricks brings (and later broadcast and tickets). Participants do not pay entry fees in most events.
   - Earnings are shared by a formula the community votes on: role weight plus contribution plus bonus, with a cap per person. All entries are visible to members.
   - **Bricks never holds money.** It only records. Prizes go mostly to the community fund, with a small share to the winner.
   - Sponsors are approved by the community; some categories are refused.
7. **Competitions and leagues.** Inside one community first, then between communities, then zone and city events ("the Great Delhi Tug of War"), in the spirit of city teams in the IPL. Any activity can be a competition. Live broadcast and tickets come much later.
8. **Services a community may offer** (childcare, tuition, training, classes). **The community is responsible for meeting any legal requirement; Bricks only provides tools.** Bricks does not run childcare.
9. **Culture.** Elders as storytellers and keepers of culture, teaching children alongside (not replacing) school.
10. **Health (light).** A personal profile and graph, and shared group goals (for example jogging together). No medical advice, no diagnosis, private by default.
11. **Voice first.** Every screen can be read aloud and the app can be moved around by voice; a phone and WhatsApp voice agent come later.
12. **Members only.** A community's records are visible to its members, not to outsiders.
13. **One navigation map.** One registry of places that the app, voice commands, deep links and the later phone agent all use.

## What Bricks is not
Not a social network (no in-app feed or chat; groups link out to WhatsApp), not a childcare operator, not a bank, not a health service.

## Where people use it
Features live only in the **mobile app (Expo)**. The website is documentation only (searchable, shareable); the Expo app also runs in a browser inside a phone-sized column for sharing.

## Why it may be different (and honest limits)
- Not unique piece by piece: community centres, residents' committees, intergenerational programmes, co-located childcare and eldercare, Anganwadis, cooperatives and apartment-management apps all exist. The possible difference is the **combination**: community-owned club structure with fair term-limited roles, shared earnings from sponsors, physical-first events and leagues, voice-first access. No full scan of existing solutions has been done yet.
- Unproven: that sponsors will pay for community events; that live audiences exist; that this raises participation among senior men. These need small tests (one event, five local businesses, interviews).
- Evidence for intergenerational programmes is mixed; claims must say "associated with", never "prevents".

## Open
How Bricks itself earns (a cut of sponsorship, tickets or a subscription); legal form of a community that earns; reserved seats for seniors; first pilot site; final name and its availability.


==================== FILE: 02_hackathon_context.md ====================

# 02. Hackathon context and inputs

## The event
Singapore-India Hackathon 2026, Social Innovation and Inclusive Development track, set by **raiSE** (a Singapore body that champions social enterprises). The team call is Sunday 8 Nov; the event runs from about 5 pm on 14 Nov at SMU, for 36 hours, with finals on 15 to 17 Nov.

## The challenge (raiSE's words)
"How might we support seniors in Singapore and India to age holistically, staying active and contributing to their communities, in ways that are affordable, accessible and motivating?"
- Singapore became super-aged in 2026 (about 21% of citizens are 65 and over).
- Active Ageing Centres exist, but participation is uneven (men can be as low as about 20% at some centres), programmes are mostly recreational, and they depend on paid staff and volunteers, so they are costly to scale.
- In scope: novel solutions that differ from existing ones (a scan of existing solutions is required) and a different perspective. Out of scope: dependency on funding.
- A strong 36-hour result: a clear understanding of the pain point, potential impact, and ways to validate market and customer interest.
- Frameworks to use: raiSE Social Impact Framework (intentionality, additionality, proportionality) and the Social Enterprise Model Canvas (desirability, feasibility, viability).

## What raiSE said in the pitch (Ken's notes, 8 Nov)
- Seniors as a burden should become seniors as a **blessing** (contribution and opportunity); old age as a **launchpad**, not retirement.
- Wants very different ideas that survive as a business; a business model that is sustainable and impactful in the long run; fine to focus on one part.
- Warned against: repeating what has been tried (for example a nostalgic cafe), one-off events, designing for seniors without designing with them, forcing a solution.
- Main criticism of today's solutions: designed **for** seniors, not **with** them. Talk to senior men and ask why they do not join.
- Judging: **output KPIs** (what the activity produces) and **outcome KPIs** (what changes in seniors' lives, for example quality of life up by about 5% (unconfirmed), lower dementia risk), with a clear link between them.
- Seven questions every idea must pass: does it exist; which area; what do seniors want and what is available; stickiness; how it continues for a long time; designed with seniors; which outcome KPI moves and can we show the link.
- Unconfirmed in the notes: a line "Don't bother AT, can't do the same, they already tried" (what "AT" means is unknown).

## Mentor advice (audio, 9 Nov, machine-transcribed)
- Holistic ageing in groups: daily wellbeing; physical connection to society (outdoors, safety); mental and social connection (community); self-sustainability (seniors earning, not only spending what children send). He said "five" groups but only four were heard.
- Social connection has two parts, physical and virtual; add the physical part.
- Earning ideas: childcare and storytelling (grandparents are trusted; a community is safer than one person).
- The money flow must be sustainable, or it becomes charity and collapses when help stops. Research existing models.

## Team (from call #1, 8 Nov)
Santusht (Singapore; business; ran the call), Ankit (Delhi; full-stack; built a Gemini Live voice agent), Sayan (Pune; full-stack; built a posture-monitoring app), Sarath (India; full-stack; inclusivity, survey, timeline), Ken (Singapore; business), Kavya (Singapore; UI and UX; suggested P0, P1, P2 priorities). India-based teammates land about 6 am on 14 Nov.

## Teammates' earlier documents (inputs, not decisions)
A teammate pack named "Kampung Connect" (v2.1, 10 Nov) proposed: three tabs, a voice-friendly app for people aged 50 and over, React Native with Expo, a Supabase backend, WhatsApp and phone agents, walks tracked like Strava, a daily check-in. Bricks is built from scratch with a different centre of gravity (the community club system); the pack is **one input**, not a base. Its name differs from Bricks, which is Ankit's working choice.

## Constraints that matter
About 7 days to the event; free or low-cost services; seniors must find it simple; no medical claims; privacy (Singapore PDPA, India DPDP) and consent; the platform never holds money.


==================== FILE: 03_feature_list.md ====================

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


==================== FILE: 04_architecture_and_backend_modules.md ====================

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


==================== FILE: 05_database_schema.md ====================

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


==================== FILE: 06_app_plan_and_navigation.md ====================

# 06. App plan and navigation

Status: the stack and the middle-frame idea are decided; the **navigation and folder structure below is a proposal awaiting Ankit's approval**.

## Stack
- Expo (SDK 58) with React Native and TypeScript; Expo Router (file-based routes in `app/src/app`).
- Test on a phone with **Expo Go** (`npx expo start`, scan the QR code, same Wi-Fi). The same code runs on the web (`npx expo start --web`, http://localhost:8081).
- **Middle frame on the web:** on a wide screen the whole app sits in a 420 px phone-sized column in the middle; on a narrow screen it fills the page; on a phone it is normal full screen. Done once in `PhoneFrame.tsx`.
- Camera, steps, push notifications and some speech features work only on a phone; each must check the platform and show a plain message on the web.
- Rules: large text (body 18 px), buttons at least 52 px tall, all text in language files later (English first), every screen readable aloud, spoken commands go through the one map of places.

## Proposed navigation and folder structure (`app/src`)
```
app/                       routes only, thin files
  (auth)/                  welcome, sign-in, enter-code, profile-setup, join-community
  (tabs)/                  home (Community), events, me, help (voice)
  community/[id]/          index, people-and-roles, objectives, notices
  event/[id]/              index, check-in;  event/new
  contribution/new, goal/new, activity/log
  notifications, settings/privacy, community/new
navigation/                THE central map
  places.ts                every screen: id, title, path, who may open it, spoken words
  routes.ts                typed paths and parameters
  guards.ts                signed-in and member checks
  voice-commands.ts        spoken phrases mapped to places
  deep-links.ts            links from invites and notifications
features/                  one folder per feature: auth, community, roles, events, contributions, wellbeing, voice
                           (each with components, hooks, api calls)
components/                shared building blocks
theme/  i18n/  api/  store/
```

## Screen list for the first version (P0)
Welcome; sign in (email); enter code; profile setup; join a community; community home; people and roles; events list; event detail with RSVP and check-in; create event; log a contribution; me (goals and week); add goal and log activity; help (voice); notifications; settings and privacy; create community.

## Next steps
1. Approve the navigation structure and screen list; generate UI images from `07_ui_brief_and_prompts.md`.
2. Build the screens to match the images, still on sample data.
3. Connect to the backend API.
4. Real speech input (needs a development build; not available in Expo Go).


==================== FILE: 07_ui_brief_and_prompts.md ====================

# 07. UI brief and image prompts

Purpose: Ankit will generate sample screens with ChatGPT's image tool and give them to the builder as the visual target. One image per screen; keep all of them consistent.

## Ask ChatGPT
"Using the style block, generate one mobile app screen image per prompt below, one at a time, keeping the look identical across all screens. Show text exactly as written."

## Style block (paste first, every time)
```
Mobile app UI screen, flat, minimal, clean. Portrait, 1170 x 2532, a flat screenshot with no phone frame or device mockup. Warm off-white background (#FBFAF7), white cards with thin light-grey borders and 16 px rounded corners, deep green accent (#0F6E56) with soft green tint (#E1F5EE). Very large readable sans-serif text (body about 18 to 20 px at phone size), high contrast, generous spacing, buttons at least 52 px tall. No emoji, no gradients, no 3D, no stock photos, no robot illustrations. Calm, trustworthy neighbourhood app for all ages. Sample names only: Mr Tan, Mdm Lim, Mr Raj, Mdm Aisha. Bottom bar on main screens: Community, Events, Me, Help (text labels only).
```

## Screens
1. **Welcome:** the word "Bricks" large and centred, one line "Your neighbourhood, run by you", two big buttons: "Get started" (green) and "I have an invite code" (outline). No bottom bar.
2. **Sign in:** title "Your email", one large email field, a green button "Send me a code", a small line "We will email a 6-digit code. No password."
3. **Enter code:** title "Check your email", six large digit boxes, a green "Continue" button, a text link "Send a new code".
4. **Profile setup:** title "About you", a name field, a language choice (English, Bahasa Melayu, Chinese, Tamil, Hindi) as large selectable rows, an age group choice (under 40, 40 to 59, 60 and over) as large chips, a green "Next" button.
5. **Join a community:** title "Join your community", a large field "Invite code" with a green "Join" button, then a card "Communities near you" with two communities, each with name, distance in metres, member count and a "View" button.
6. **Community home:** community name and "42 members". Card "What we are building together" with a progress bar "8 of 20 things fixed". Card "Today for you" with two short lines. Card "Next event" with title, time, place and "I'm going". Card "People and their responsibilities" with four people, their role and "Term ends Jun 2027".
7. **People and roles:** title "Roles this year". Each role is a card with the role name, the holder, term dates, a "1 of 2 terms" label. A note "Leaders are chosen by members and approved by Bricks." A button "Nominate someone".
8. **Events list:** title "Events". A segmented control "Coming up | Past". Three event cards with title, day, time, place, "3 of 15 going" and a green "I'm going" button.
9. **Event detail:** event title, host with their role, time, place with a small map card, a description, "3 of 15 going" with small avatar circles, a large green "I'm going" button, and below it a button "Check in" with a QR-style graphic.
10. **Log a contribution:** title "What did you do?", a large text field, a "How many" stepper, an optional "Part of which goal" picker, a "Who can confirm" picker, a green "Save" button.
11. **Me:** title "Me", note "Only you can see this". Card "My goals" with two goals and progress bars, card "My week" with a seven-bar chart (M to S), a button "Log a walk". Small note "Sample numbers. Not medical advice."
12. **Help (voice):** title "Help". A very large round green microphone button in the middle labelled "Tap and say where to go". Below it three chips: "Open events", "My goals", "Read this to me".

## Later screens (not yet prompted)
Create community, notices, goals editor, notifications inbox, settings and privacy ("who sees what"), season league table, sponsor offer, community fund (records only), role nomination and endorsement, services list.

## After generating
Save the images as `01-welcome.png`, `02-sign-in.png` and so on, and tell the builder which image matches which screen.


==================== FILE: 08_code_status.md ====================

# 08. Code status (what is actually built, 11 Nov 2026)

## Honest summary
- **Built:** a starter Expo app (`bricks/app`) with a web middle frame, four tabs and sample data. These screens were built ahead of any approved design, so treat them as a **throw-away starter**, not the product. A PostgreSQL database is ready (no tables yet).
- **Not built:** the backend (no code), any table, login, API, voice input, notifications, the website, sponsors, money records.
- **Not approved yet:** the navigation structure, the screen designs and the backend structure in the other documents.

## Repo layout
```
bricks/
  README.md  .gitignore
  platform-docs/   public docs (index pages and llms.txt only; no content written)
  team-docs/       internal docs (vision, feature list, schema, modules, app plan, decisions)
  master-docs/     this snapshot pack
  backend/         README, .env.example, db/migrations (empty). .env holds secrets: never share it.
  frontend/        empty (README only)
  app/             Expo app (see below)
  shared/          empty (README only)
```

## Database (ready, empty)
- Local **PostgreSQL 16.15** on port 5432, database `bricks`, owned by role `bricks_app`; extensions PostGIS 3.6, pgcrypto, pg_trgm; PostGIS distance query tested.
- Connection details are in `backend/.env` (`DATABASE_URL`, `JWT_SECRET`); the file is gitignored and not included in this pack.
- The schema to build is in `05_database_schema.md`; migrations will use Alembic (not set up yet).

## App (`bricks/app`)
- Expo SDK 58, React 19.3, React Native 0.88, Expo Router, expo-speech, react-native-web.
- Runs on the web at http://localhost:8081 (`npx expo start --web --port 8081`); type check passes; clicked through Community and Events in a browser; Help (speech) not tested; not tested in Expo Go.
- `src/navigation/places.ts` is the single map of places (tab bar and spoken commands read it).
- `src/components/PhoneFrame.tsx` centres the app in a 420 px column on wide web screens.
- Screens use `src/data/mock.ts` sample data (invented names). Help accepts a typed command, finds a place by words and speaks a reply.

## Full source of the app files
The appendix below is generated from the files at snapshot time.

### `app/app.json`
```json
{
  "expo": {
    "name": "Bricks",
    "slug": "bricks",
    "scheme": "bricks",
    "version": "0.1.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": { "supportsTablet": false },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/android-icon-foreground.png",
        "backgroundImage": "./assets/android-icon-background.png",
        "monochromeImage": "./assets/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false
    },
    "web": { "bundler": "metro", "output": "single", "favicon": "./assets/favicon.png" },
    "plugins": ["expo-router"]
  }
}
```

### `app/package.json`
```json
{
    "name":  "app",
    "version":  "1.0.0",
    "main":  "expo-router/entry",
    "dependencies":  {
                         "@expo/metro-runtime":  "~58.0.17",
                         "expo":  "~58.0.23",
                         "expo-constants":  "~58.0.15",
                         "expo-linking":  "~58.0.16",
                         "expo-router":  "~58.0.30",
                         "expo-speech":  "~58.0.3",
                         "expo-status-bar":  "~58.0.4",
                         "react":  "19.3.0",
                         "react-dom":  "19.3.0",
                         "react-native":  "0.88.1",
                         "react-native-safe-area-context":  "~5.11.1",
                         "react-native-screens":  "~4.30.1",
                         "react-native-web":  "^0.21.4"
                     },
    "devDependencies":  {
                            "@types/react":  "~19.3.0",
                            "typescript":  "~6.0.3"
                        },
    "scripts":  {
                    "start":  "expo start",
                    "android":  "expo start --android",
                    "ios":  "expo start --ios",
                    "web":  "expo start --web"
                },
    "private":  true
}
```

### `app/src/app/(tabs)/_layout.tsx`
```tsx
import { Tabs } from 'expo-router';
import { PLACES } from '../../navigation/places';
import { colors } from '../../theme/tokens';

// The bottom bar is built from the one map of places.
export default function TabsLayout() {
  const tabs = PLACES.filter((p) => p.tab);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 15, fontWeight: '700' },
        tabBarStyle: { height: 64, paddingTop: 8, paddingBottom: 8, backgroundColor: colors.card, borderTopColor: colors.line },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      {tabs.map((p) => (
        <Tabs.Screen key={p.id} name={p.path === '/' ? 'index' : p.path.slice(1)} options={{ title: p.title }} />
      ))}
    </Tabs>
  );
}
```

### `app/src/app/(tabs)/events.tsx`
```tsx
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Body, Button, Card, Screen } from '../../components/ui';
import { events } from '../../data/mock';
import { colors, type } from '../../theme/tokens';

export default function Events() {
  const [going, setGoing] = useState<Record<string, boolean>>({});
  return (
    <Screen title="Events" subtitle="Anything your community decides to do together">
      {events.map((e) => {
        const on = !!going[e.id];
        return (
          <Card key={e.id} title={e.title}>
            <Body>{e.when} · {e.place}</Body>
            <View style={{ marginVertical: 8 }}>
              <Text style={[type.small, { color: colors.muted }]}>{e.going + (on ? 1 : 0)} of {e.capacity} going</Text>
            </View>
            <Button label={on ? 'You are going (tap to undo)' : "I'm going"} kind={on ? 'plain' : 'primary'} onPress={() => setGoing({ ...going, [e.id]: !on })} />
          </Card>
        );
      })}
    </Screen>
  );
}
```

### `app/src/app/(tabs)/help.tsx`
```tsx
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Body, Button, Card, Screen } from '../../components/ui';
import { PLACES, resolveSpoken } from '../../navigation/places';
import { colors, radius, space } from '../../theme/tokens';

// Voice, step 1: type or (later) say a command; the one map of places decides where to go.
export default function Help() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [reply, setReply] = useState('Try: "open events" or "my goals".');

  const go = () => {
    const place = resolveSpoken(text);
    const msg = place ? `Opening ${place.title}.` : "Sorry, I didn't catch that. Try: events, my goals, community.";
    setReply(msg);
    Speech.speak(msg);
    if (place) router.push(place.path as never);
  };

  return (
    <Screen title="Help" subtitle="Everything here can be done by voice. Speech input arrives in the next step.">
      <Card title="Say or type where to go">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="for example: open events"
          placeholderTextColor={colors.muted}
          onSubmitEditing={go}
          style={{ fontSize: 18, borderWidth: 2, borderColor: colors.line, borderRadius: radius.button, padding: space.md, color: colors.ink, backgroundColor: colors.card, marginBottom: space.md }}
        />
        <Button label="Go" onPress={go} />
        <View style={{ height: space.md }} />
        <Body muted>{reply}</Body>
      </Card>

      <Card title="Read this to me">
        <Body muted>Places you can say: {PLACES.map((p) => p.title).join(', ')}.</Body>
        <View style={{ height: space.md }} />
        <Button kind="plain" label="Read the places aloud" onPress={() => Speech.speak(`You can say: ${PLACES.map((p) => p.title).join(', ')}.`)} />
      </Card>
    </Screen>
  );
}
```

### `app/src/app/(tabs)/index.tsx`
```tsx
import { Text, View } from 'react-native';
import { Body, Card, ProgressBar, Screen } from '../../components/ui';
import { community } from '../../data/mock';
import { colors, space, type } from '../../theme/tokens';

export default function CommunityHome() {
  const o = community.objective;
  return (
    <Screen title={community.name} subtitle={`${community.area} · ${community.members} members`}>
      <Card title="What we are building together">
        <Body>{o.title}</Body>
        <ProgressBar value={o.done} max={o.target} />
        <Text style={[type.small, { color: colors.muted }]}>{o.done} of {o.target} {o.unit}</Text>
      </Card>

      <Card title="Today for you">
        {community.today.map((t) => (
          <View key={t} style={{ marginBottom: space.sm }}><Body>{t}</Body></View>
        ))}
      </Card>

      <Card title="People and their responsibilities">
        {community.roles.map((r) => (
          <View key={r.role} style={{ marginBottom: space.sm }}>
            <Body>{r.person} · <Text style={{ fontWeight: '700' }}>{r.role}</Text></Body>
            <Text style={[type.small, { color: colors.muted }]}>Term ends {r.ends}</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
```

### `app/src/app/(tabs)/me.tsx`
```tsx
import { Text, View } from 'react-native';
import { Body, Card, ProgressBar, Screen } from '../../components/ui';
import { goals, stepsThisWeek } from '../../data/mock';
import { colors, type } from '../../theme/tokens';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Me() {
  const max = Math.max(...stepsThisWeek);
  return (
    <Screen title="Me" subtitle="Your goals and your week. Only you can see this.">
      <Card title="My goals">
        {goals.map((g) => (
          <View key={g.id} style={{ marginBottom: 12 }}>
            <Body>{g.text}</Body>
            <ProgressBar value={g.done} max={g.target} />
            <Text style={[type.small, { color: colors.muted }]}>{g.done} of {g.target}</Text>
          </View>
        ))}
      </Card>

      <Card title="My week (steps)">
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 8 }}>
          {stepsThisWeek.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <View style={{ width: '100%', height: Math.max(6, (100 * v) / max), backgroundColor: colors.accent, borderRadius: 6 }} />
              <Text style={[type.small, { color: colors.muted, marginTop: 4 }]}>{DAYS[i]}</Text>
            </View>
          ))}
        </View>
        <Text style={[type.small, { color: colors.muted, marginTop: 8 }]}>Sample numbers. This is not medical advice.</Text>
      </Card>
    </Screen>
  );
}
```

### `app/src/app/_layout.tsx`
```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PhoneFrame } from '../components/PhoneFrame';

export default function RootLayout() {
  return (
    <PhoneFrame>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </PhoneFrame>
  );
}
```

### `app/src/components/PhoneFrame.tsx`
```tsx
import { ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';

// On the web the whole app sits in a phone-sized column in the middle of the page.
// On a real phone (Expo Go or a build) it renders as normal, full screen.
export function PhoneFrame({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;
  const wide = width > 520;
  return (
    <View style={{ flex: 1, backgroundColor: wide ? '#E9E6DF' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={[
          { width: wide ? 420 : '100%', height: wide ? Math.min(height - 32, 880) : '100%', backgroundColor: '#FBFAF7', overflow: 'hidden' },
          wide && { borderRadius: 28, borderWidth: 1, borderColor: '#D9D5CC', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
```

### `app/src/components/ui.tsx`
```tsx
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../theme/tokens';

export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: space.lg, paddingBottom: 40 }}>
      <Text style={[type.h1, { color: colors.ink }]} accessibilityRole="header">{title}</Text>
      {subtitle ? <Text style={[type.small, { color: colors.muted, marginBottom: space.md }]}>{subtitle}</Text> : <View style={{ height: space.md }} />}
      {children}
    </ScrollView>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      {title ? <Text style={[type.h2, { color: colors.ink, marginBottom: space.sm }]}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Body({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[type.body, { color: muted ? colors.muted : colors.ink }]}>{children}</Text>;
}

export function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(100, max ? (100 * value) / max : 0));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max, now: value }} style={styles.track}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: colors.accent }} />
    </View>
  );
}

export function Button({ label, onPress, kind = 'primary' }: { label: string; onPress: () => void; kind?: 'primary' | 'plain' }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, primary ? { backgroundColor: colors.accent } : { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent }, pressed && { opacity: 0.85 }]}
    >
      <Text style={{ fontSize: 18, fontWeight: '700', color: primary ? '#FFFFFF' : colors.accent }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: space.lg, marginBottom: space.md },
  track: { height: 18, borderRadius: 9, backgroundColor: colors.line, overflow: 'hidden', marginVertical: space.sm },
  btn: { minHeight: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
});
```

### `app/src/data/mock.ts`
```ts
// Sample data only (invented people). Replaced by the real API later.
export const community = {
  name: 'Maple Court Residents (sample)',
  area: 'Sample Estate',
  members: 42,
  objective: { title: 'Fix 20 household things for neighbours', done: 8, target: 20, unit: 'things fixed' },
  today: ['Fix-it morning at 9:00. Three people signed up.', 'Your role: Host, ends 30 Jun'],
  roles: [
    { role: 'Lead', person: 'Mr Tan', ends: 'Jun 2027' },
    { role: 'Events', person: 'Mdm Lim', ends: 'Jun 2027' },
    { role: 'Finance', person: 'Mr Raj', ends: 'Jun 2027' },
    { role: 'Culture', person: 'Mdm Aisha', ends: 'Jun 2027' },
  ],
};

export const events = [
  { id: 'e1', title: 'Fix-it morning', when: 'Sat 9:00', place: 'Block 14 void deck', going: 3, capacity: 15 },
  { id: 'e2', title: 'Evening walk', when: 'Daily 18:00', place: 'Estate garden', going: 11, capacity: 30 },
  { id: 'e3', title: 'Story circle', when: 'Sun 16:00', place: 'Community room', going: 7, capacity: 20 },
];

export const goals = [
  { id: 'g1', text: 'Walk three mornings a week', done: 2, target: 3 },
  { id: 'g2', text: 'Teach one recipe this month', done: 0, target: 1 },
];

export const stepsThisWeek = [3200, 4100, 2800, 5200, 4600, 3900, 5100]; // Mon..Sun, private by default
```

### `app/src/navigation/places.ts`
```ts
// The ONE map of places. The tab bar, voice commands, deep links and (later) the phone agent all read this list.
// To add a screen: add a route file, then add it here once.
export type Place = {
  id: string;
  title: string;
  path: string; // expo-router path
  tab: boolean; // shown in the bottom bar
  say: string[]; // words a person may say to go there
};

export const PLACES: Place[] = [
  { id: 'community', title: 'Community', path: '/', tab: true, say: ['home', 'community', 'my community', 'neighbourhood'] },
  { id: 'events', title: 'Events', path: '/events', tab: true, say: ['events', 'event', 'what is on', 'activities'] },
  { id: 'me', title: 'Me', path: '/me', tab: true, say: ['me', 'my goals', 'goals', 'health', 'my health', 'profile'] },
  { id: 'help', title: 'Help', path: '/help', tab: true, say: ['help', 'talk', 'speak', 'voice'] },
];

export function resolveSpoken(text: string): Place | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  // longest phrase first so "my goals" beats "me"
  const pairs = PLACES.flatMap((p) => p.say.map((s) => ({ p, s }))).sort((a, b) => b.s.length - a.s.length);
  const hit = pairs.find(({ s }) => t.includes(s));
  return hit ? hit.p : null;
}
```

### `app/src/theme/tokens.ts`
```ts
// Design tokens. Large, readable text; plain colours. Change here, not in screens.
export const colors = {
  bg: '#FBFAF7',
  card: '#FFFFFF',
  ink: '#1B2430',
  muted: '#566170',
  line: '#D9DEE5',
  accent: '#0F6E56',
  accentSoft: '#E1F5EE',
  warn: '#8A5A00',
  warnSoft: '#FDF1D6',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const type = {
  h1: { fontSize: 26, fontWeight: '700' as const },
  h2: { fontSize: 20, fontWeight: '700' as const },
  body: { fontSize: 18, lineHeight: 26 },
  small: { fontSize: 15, lineHeight: 21 },
};

export const radius = { card: 16, pill: 999, button: 14 };
```


==================== FILE: 09_decisions_and_open_questions.md ====================

# 09. Decisions and open questions (11 Nov 2026)

## Decided (by Ankit)
- Working name **Bricks** (English; domain, app-store and business-name availability **not checked**).
- The product is the **club system for a neighbourhood**; Bricks is the "faculty coordinator" (tools, verification and final approval of leads, sponsors).
- Communities decide their own activities and services; **legal duties for regulated services (for example childcare) belong to the community**.
- Roles have terms of one year, at most two, re-evaluated yearly; leaders are nominated and endorsed by members and approved by Bricks.
- The **community** earns (sponsors); shares by role plus contribution plus bonus under a formula the community votes on; participants do not pay entry fees in most events; **Bricks never holds money**.
- Competitions can be any activity; scoring by community participation; broadcast and tickets later.
- The missing-member check is done by people themselves; Bricks provides motivation (recognition, ranks), not monitoring.
- Features live only in the **Expo app**; the website is documentation only. The Expo app also runs in a browser inside a phone-sized middle column.
- Stack: Python FastAPI (modular monolith), **PostgreSQL 16 with PostGIS 3.6 (local)**, one database, one email service; goal of 2 to 3 thousand people at once on mostly free services (an estimate, not measured).
- Repo folders: `platform-docs` (public), `team-docs` (internal), `backend`, `frontend`, `app`, `shared`, plus this `master-docs` snapshot.
- Do not reuse Jambagrad code or databases; secrets live only in `.env` files that the owner fills in.

## Open
1. **How Bricks earns:** a fee for bringing sponsors, a share of tickets, or a subscription?
2. **Legal form** of a community that earns money (society, cooperative, company) and tax treatment.
3. **Reserved seats for seniors** in leadership roles?
4. **Sponsors:** who we approach first (local shops, companies, grants) and what they get; blocked categories.
5. **First pilot:** an apartment community in India (Delhi) or a Singapore group; first event type.
6. **Share formula** limits and the appeal process.
7. **Product name** availability and the domain for docs (docs.bricks.com is the intended address).
8. **Email provider** (one, free tier) and **hosting** (free tiers; PostGIS required).
9. Disclosure that voice agents are AI (recommended yes).
10. Which existing solutions to scan for the raiSE requirement.

## Known risks
Sponsor revenue and live audiences are unproven; evidence on intergenerational programmes is mixed; childcare and public events carry licensing and safety duties; money sharing carries bias and legal risk; voice-only control is weak for finance tasks; capacity numbers are estimates.


==================== FILE: 10_research_facts.md ====================

# 10. Research facts (from web searches, 10 to 11 Nov 2026; verify before quoting)

## Anganwadi (India's community-based centre model)
- About 14 lakh Anganwadi Centres are sanctioned; 13,99,890 were operational on the Poshan Tracker in December 2024. A main centre has one worker and one helper; services are a six-service package. Source: a Rajya Sabha reply, https://rsdebate.nic.in/bitstream/123456789/757598/1/PQ_267_19032025_U2222_p450_p454.pdf
- The central honorarium for a main-centre worker has been about Rs 4,500 a month; mini-centre workers and helpers receive less; states add top-ups that vary widely. Workers are called "honorary" and are not government employees (no pension or gratuity, per a news report). Figures are from 2022 to 2025 answers and change often.
- Lesson: a trusted local person running a daily community service works at huge scale, but depending on one low-paid person and on government funding is fragile.

## Co-locating childcare and eldercare
- Kampung Admiralty (Singapore, opened 12 May 2018) places a childcare centre beside an active-ageing hub and a medical centre; HDB describes it as the first of 10 such precincts planned. No independent outcome data was found, only government and award sources. https://en.wikipedia.org/wiki/Kampung_Admiralty
- A US survey of shared sites found funding was the biggest challenge because funders usually fund either children or elders. https://ssir.org/articles/entry/the_power_of_proximity_co_locating_childcare_and_eldercare_programs
- Providence Mount St. Vincent (Seattle) has a preschool on a campus with more than 400 older adults (news report; funding not covered).

## Evidence on intergenerational programmes
- Broad reviews report benefits for older adults, but benefits are not systematic. Trial-only (Campbell) reviews found it unclear whether intergenerational interventions change older people's quality of life or loneliness, and evidence on children's wellbeing is limited and inconclusive. https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10546258/
- Use wording like "associated with"; measure our own outcomes.

## Group singing (for reference)
- A randomised trial of 390 older adults (Community of Voices) found community choirs improved loneliness and interest in life at six months, but not cognitive or physical outcomes. https://nursing.ucsf.edu/node/52456

## Call costs (for the later voice agent)
- Twilio list prices per minute to a mobile: India $0.0496, Singapore $0.0578. Plivo: India about Rs 0.38 per minute (30-second units), Singapore mobile $0.0489. Gemini Live (audio): about $0.005 per minute in and $0.018 per minute out; a measured test call cost about $0.005 to $0.007 per minute on the AI side.
- India: TRAI's September 2026 amendment reportedly treats automated and AI voice calls as business-to-person calls and service calls should use 1600-series numbers; **not confirmed from TRAI's own text**.

## Earlier research (project memory, mostly secondary sources)
- Singapore: 65 and over are 21.4% of citizens (June 2026), projected 26.1% by 2035; about 87,200 aged 65 and over lived alone (2024); retirement and re-employment ages are 64 and 69 from 1 July 2026.
- India: about 149 million aged 60 and over (10.5%, 2022), 347 million (20.8%) by 2050.
- Men's share of Active Ageing Centre participants: figures conflict (10% to 40%); the brief says as low as about 20% at some centres.
- Existing Singapore examples include Active Ageing Centres, Silver Generation Ambassadors, Neighbourhood Kakis and Kampung Kakis. These need a proper scan.
