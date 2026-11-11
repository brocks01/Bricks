# Bricks: all documentation in one file

Built by `scripts/build_master_docs.py`. Read the sections marked (start here) first.

## Contents

- `README.md`
- `CONTRIBUTING.md`
- `AGENTS.md`
- `team-docs/00-start-here/README.md`
- `team-docs/01-vision/README.md`
- `team-docs/01-vision/vision.md` (start here)
- `team-docs/02-product/feature-list.md`
- `team-docs/02-product/product-architecture.md` (start here)
- `team-docs/02-product/README.md`
- `team-docs/02-product/social-purpose.md` (start here)
- `team-docs/03-business/README.md`
- `team-docs/04-research/README.md`
- `team-docs/05-design/image-prompts.md`
- `team-docs/05-design/README.md`
- `team-docs/05-design/ui-samples/README.md`
- `team-docs/06-technical/agent-canvas-spec.md`
- `team-docs/06-technical/app-navigation-agent-language.md`
- `team-docs/06-technical/app-plan.md`
- `team-docs/06-technical/backend-modules.md`
- `team-docs/06-technical/database-schema.md`
- `team-docs/06-technical/README.md`
- `team-docs/06-technical/ui-build-spec.md` (start here)
- `team-docs/06-technical/ui-spec-from-samples.md`
- `team-docs/07-meetings/README.md`
- `team-docs/08-decisions/README.md`
- `team-docs/09-archive/README.md`
- `team-docs/10-handoff/HANDOFF.md`
- `team-docs/10-handoff/PROGRESS.md`
- `team-docs/README.md`
- `platform-docs/about/index.md`
- `platform-docs/communities/index.md`
- `platform-docs/faq/index.md`
- `platform-docs/getting-started/index.md`
- `platform-docs/glossary.md`
- `platform-docs/guides/index.md`
- `platform-docs/health-and-wellbeing/index.md`
- `platform-docs/index.md`
- `platform-docs/llms.txt`
- `platform-docs/policies/index.md`
- `platform-docs/README.md`
- `platform-docs/sponsors/index.md`
- `platform-docs/trust-and-safety/index.md`
- `platform-docs/voice/index.md`

UI sample pictures (kept in `team-docs/05-design/ui-samples/`, attach them separately): `01-app-states-and-voice-agent.webp`, `02-multilingual.webp`, `03-onboarding-and-three-domains.webp`, `04-navigation-options.webp`, `05-onboarding-and-profile-from-avatar.webp`, `06-final-ui-direction.webp`, `07-agent-canvas.webp`, `08-complete-ecosystem-overview.webp`


---

# FILE: README.md

# Bricks

Working name. A club system for neighbourhoods: communities run themselves the way college societies do, with roles, terms, events, shared goals and sponsors.

## Folders (first step: documentation only)

| Folder | Who it is for | What goes in it |
|---|---|---|
| `platform-docs/` | The public: residents, families, community leads, sponsors, search engines and language models | What Bricks is and how to use it. Plain language. Organised in folders and sub-folders so it can be served as it is (later at docs.bricks.com). No database needed: files only. |
| `team-docs/` | Our team | Vision, decisions, design notes, research and meeting notes. Technical documentation will be added later. |

| `backend/`, `frontend/`, `app/`, `shared/` | The team | Code folders. Created empty with a note; nothing is built yet. The inside structure is decided after the overall features are settled. |

The older planning folder `project-name-tbd` is left untouched.


---

# FILE: CONTRIBUTING.md

# How we work

One monorepo: `app/` (Expo app and website), `backend/` (Python API), `team-docs/` and `platform-docs/`.

## Branches
- `main` is always working and is what gets deployed. Nobody pushes to it directly.
- Work happens on a branch named `<person>/<short-topic>`, for example `ankit/login-profile`. A long-running personal branch such as `Ankit` is fine early on.
- Keep a branch small and short-lived, and bring `main` into it before opening the pull request.

## Pull requests
1. Open a pull request into `main` using the template. A title in the form `type: what` (feat, fix, docs, chore, refactor, test).
2. CI must pass (types and self-test for the app, tests for the backend).
3. At least one teammate reviews it. The author answers every comment, then merges with **squash**, so `main` has one clean commit per change.
4. Delete the branch after merging.

## Commits
Short, present tense, say why: `feat: sign in with an emailed code`. Never commit `.env` files, keys, passwords or tokens. If one slips in, treat it as leaked and replace it.

## Settings to switch on in GitHub (repository admin)
Branch protection on `main`: require a pull request, require the CI checks, require one approval, block force pushes.

## Run it
- API: `python backend/run.py` (needs `backend/.env`, see `backend/.env.example`; migrations with `python backend/run.py migrate`).
- App: `cd app && npm install && npm run web` (opens on port 3000).
- Website deploy: Vercel, root directory `app` (the settings are in `app/vercel.json`).


---

# FILE: AGENTS.md

# Instructions for any coding agent (OpenCode, Claude Code, others)

Read these two files first, in this order, before you change anything:

1. `team-docs/10-handoff/HANDOFF.md` : what Bricks is, how it is built, how to run it, what is done, what is not, and the rules.
2. `team-docs/10-handoff/PROGRESS.md` : the running log. **Read the last entries to see where the previous agent stopped.**

## Your duty: keep the log current
At the end of every working session (and after every meaningful change), **append an entry to `team-docs/10-handoff/PROGRESS.md`**:
date, who you are (tool and model), what you did, what you tested and how, what is NOT done or NOT tested, and the next step.
If you change how something works, also update `HANDOFF.md` (the sections "Current state" and "Not done yet"). The owner switches between
agents, so the next one must be able to continue from the files alone. Never claim something works unless you ran it; say what was not tested.

## Hard rules (the owner's, non-negotiable)
- **Never print, paste, log or commit a secret** (API keys, tokens, passwords, database URLs). `.env` files are never committed and never opened
  to read values; scripts may read them in-process and print only names. Do not hunt through the owner's other repositories for credentials.
- **Never place a phone call without the owner's go-ahead in that moment.** Only numbers in `VOICE_ALLOWED_NUMBERS`, only people who agreed.
- **ngrok belongs to the owner**: never start, stop or reconfigure it. **Do not kill running services** (API, dev server, tunnel) unless the owner
  tells you to in that moment; start your own on another port if you need one.
- **Discuss before building** anything the owner did not ask for. No extra features, no extra docs, no invented content or sample data in the app.
- **Real names and realistic data only** in anything the owner sees (demo people, accounts, labels, greetings): never "test", "UI Check", "Neighbour 7" or similar. Use his real account for his own testing.
- **No hard-coded sample data** in the app: every tab that is not built shows "Coming soon".
- Work on a branch (see `CONTRIBUTING.md`), never on `main`. Open a pull request.
- Say plainly what was tested and what was not. Short, solution-first answers.

## Quick facts
- Monorepo: `app/` (Expo SDK 58 app and website), `backend/` (Python FastAPI + Postgres), `team-docs/`, `platform-docs/`.
- Typecheck and self-test the app: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts`
- Backend tests: `cd backend && python -m pytest tests -q` (needs the local database and `backend/.env`).
- The app's own `AGENTS.md` in `app/` says Expo APIs change between releases: check the docs for SDK 58 before touching Expo APIs.


---

# FILE: team-docs/00-start-here/README.md

﻿# 00-start-here

Start here: what these docs are, a glossary and an index of decisions.



---

# FILE: team-docs/01-vision/README.md

﻿# 01-vision

Problem, insight, the club model, principles and what is unique.



---

# FILE: team-docs/01-vision/vision.md

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


---

# FILE: team-docs/02-product/feature-list.md

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


---

# FILE: team-docs/02-product/product-architecture.md

# Product architecture (final, 11 Nov 2026)

Finalised with the owner after two rounds of discussion. **This replaces the earlier proposals** (three domains Connect / Grow / Thrive; four tabs Community / Activities / My Life / Profile). If anything else in the docs disagrees with this page, this page wins.

## The idea in one line
**Connect. Grow. Participate.** Bricks is a club system for neighbourhoods, run the way college societies run. A community can organise almost anything, the way a college society organises events, competitions, workshops, training, cultural programmes and fundraising.

One identity · one community ecosystem · one personal journey · one intelligent agent. We do **not** build four apps (a community app, a health app, a job portal, an AI assistant).

## What is inside Connect (updated 12 Nov 2026)
Community and governance · events and activities · **elderly participation and mentorship** · **employment, skills and earning** · **childcare and community services** · **culture, traditions and storytelling** · sponsorships and shared earnings · **sustainability initiatives**. These are things a community does on the one activity system (plus roles, contributions and opportunities), **not separate areas**; there is no "Elderly Welfare" section. Success is measured as **Community Vitality** (see `social-purpose.md`). *Ignore the word "clubs" if you see it in older proposals: the owner rejected clubs and groups (they already run on WhatsApp).*

## Two domains (Thrive is removed)
**CONNECT** : your community and everything happening within it. *What people do together.*
- Communities and members; clubs, groups and committees
- Events and celebrations; competitions and leagues; sports and recreational activities
- Cultural programmes and storytelling; education, workshops and training; community services
- Roles, leadership and governance; contributions and recognition
- Sponsors, earnings and community funds
- Jobs, referrals and local opportunities (they live **inside Connect**, shared by members; Bricks does not become a job portal)

**GROW** : your personal development and wellbeing. *What one person develops.*
- Personal goals and milestones; health and wellbeing; walking, jogging and fitness
- Learning and skill development; habits and routines; progress and achievements
- Reminders and personal assistance; private health and activity records; family-assisted support

Where things belong: job opportunities, local work and referrals, community earnings, sponsorships, community competitions, yoga/fitness events and community-organised training are **Connect**. Personal fitness tracking, personal learning goals and personal skill progress are **Grow**. The same activity can appear in both: a community walking challenge is Connect; one person's walking progress is Grow.

There is **no third domain yet**. Instead the community system is made extremely flexible, so one community can run a sports club, another a senior citizens' club, another workshops, another festivals, another a skill-sharing programme, all on the same infrastructure.

## The flexible activity system (the core design principle)
Do not hard-code every kind of activity. One **activity** supports: title and description; category and organiser; date, time and location; participants and capacity; registration and attendance; goals and outcomes; contributions and recognition; optional sponsorship. A community defines its own kinds (a league, a class, a drive) on top of it. This is what lets Bricks support activities we have not imagined.

## Entry: how a person starts
A person can use Bricks **without** joining a community; joining unlocks its strongest value. Four starting paths: **Join a community** (invite code, QR, link, or discover nearby), **Create a community** (apartment, block, neighbourhood, club), **Start personally** (Grow only), **Explore first** (see what Bricks offers).

## Onboarding journey (collect only essentials, ask more later when a feature needs it)
1. Welcome (what Bricks does, one screen) 2. Language (English, Hindi, Bengali, Tamil, Chinese, Malay, more) 3. Sign up (email code; Google; later Singpass and DigiLocker) 4. Profile (name, age band, photo, preferred language) 5. Privacy and consent (what is private, what can be shared) 6. Interests (optional, can change later) 7. Choose your path (the four above) 8. Home.
Not 20 profile fields at sign-up.

## Navigation
**The bottom navigation has exactly two tabs: Connect and Grow** (decided by the owner, 11 Nov 2026; no separate Home tab). Connect is the landing view and carries the Home content: community status and selector, upcoming activities, what needs attention today, announcements; Grow carries goals and progress. **Profile and settings** open from the avatar (language, privacy and consent, translate this screen, help). The **Bricks Agent bar** is global, always at the very bottom. Search, notifications, translation and voice work on every screen.
Someone who belongs to several communities switches between them without a second account. Someone with no community sees a personal home with a clear invitation to join or create one.
The app has these two tabs now (placeholders that say "Coming soon").

## Final screens
The approved visual target is `../05-design/ui-samples/06-final-ui-direction.webp`; the screen-by-screen build notes are in `../06-technical/ui-build-spec.md`. Interests offered at onboarding: Community Activities, Health and Wellbeing, Sports and Fitness, Learning and Skills, Culture and Events, Volunteering and Service. The Connect hub is a 3 by 3 grid: Communities, Events, Clubs and Groups, Competitions, Training and Workshops, Services, Opportunities (Jobs and Work), Contributions and Earnings, Governance and Roles. Grow holds a goal card and My Health, My Goals, My Learning, My Progress. Key principles: flexible and community-driven; multilingual and inclusive; voice and agent-first; people centric; private and trusted.

## Screens to design (about 20, many reusable)
Welcome · Language · Sign up and code · Profile · Privacy and consent · Interests · Choose your path · Join a community · Discover communities · Create a community · Home · Connect (community home) · Members and announcements · Roles and governance · Events and activities · Activity detail (register, check in) · Contributions and recognition · Grow (personal dashboard) · Health and wellbeing · Profile and settings. Opportunities appear inside Connect, not as a separate area.

## Build order
1. **Foundation (cross-cutting, built in from the start):** one identity, multilingual interface, on-demand translation, voice and keyboard agent, shared navigation and action registry, privacy and permissions.
2. **Connect first:** onboarding and sign-in, create/join/discover, community home, members and announcements, roles and governance, activities and attendance, contributions and recognition.
3. **Grow:** personal dashboard, goals, wellbeing tracking, progress and reminders.
4. **Later:** sponsorships and earnings records, community services, jobs and referrals, broadcasting.

## Where this shows up
Visual targets: `../05-design/ui-samples/` (samples 03 to 05 were drawn **before** Thrive was removed: use their onboarding and agent ideas, not their Thrive tab). Technical state: `../10-handoff/HANDOFF.md`.


---

# FILE: team-docs/02-product/README.md

﻿# 02-product

One file per feature (communities, roles and terms, goals, events, competitions, sponsors and earnings, health, voice, central navigation) plus priorities.

**Start with `product-architecture.md`: the final architecture (Connect and Grow).**


---

# FILE: team-docs/02-product/social-purpose.md

# Social purpose: why Bricks exists (do not lose this)

Recorded 12 Nov 2026 at the owner's request: *elderly people, earning, employability, sustainability, child care, culture, values, morals, storytelling. Very important, probably the only way to address the problem with huge social value. Don't miss it.*

This page is the reason behind every screen. If a feature does not serve one of these, question it. Background: `../01-vision/vision.md`; the problem we are answering is the raiSE brief (seniors in Singapore and India: active, contributing, affordable, accessible, motivating, a different perspective, no dependence on funding).

## The central philosophy
**A community should not just live together. It should grow, earn, care, learn and sustain itself together.** Bricks rebuilds the social and economic fabric of a community by bringing people, generations, skills and resources together. The six pillars below are central to the product and must not be hidden under "miscellaneous activities".

### The six pillars
1. **Elderly participation and dignity.** Seniors are contributors, mentors, teachers, storytellers and decision-makers, not beneficiaries of welfare programmes.
2. **Employability and earning.** Skill development, local jobs, micro-enterprises, referrals, paid services, mentoring, opportunities to earn.
3. **Childcare and community care.** Community-supported childcare, supervised activities, family assistance and intergenerational engagement, with safeguarding and legal compliance (the community's own legal duty).
4. **Culture, values and storytelling.** Local traditions, languages, folklore, moral lessons, life experience, oral histories and cultural knowledge.
5. **Community sustainability.** Financial independence, shared resources, local services, environmental initiatives and leadership succession.
6. **Social connection and belonging.** Shared responsibilities, friendships, participation, mutual support and meaningful relationships across generations.

### The one design decision that protects this
**There is NO separate section called "Elderly Welfare".** Putting everything senior in its own corner would contradict the philosophy. Instead a senior can teach a traditional art and receive recognition or income; mentor a young person starting a business; organise a storytelling session for children; hold a community leadership role; take part in community decisions; join health and fitness activities. Younger members contribute technology skills, organise programmes, help with digital literacy and learn from older generations. This is **intergenerational value creation**, and it happens inside the normal community screens (roles, activities, contributions, opportunities, services), not in a senior-only area.

### The measure of success: Community Vitality
Not registrations, events held or app engagement. **Community Vitality** asks: are people participating, contributing, earning, learning, caring for one another and preserving knowledge? Build the first measures from data we already record: members holding roles (and how many are seniors), contributions by age band, intergenerational activities held, earnings recorded for the community, services running (for example child care or tutoring), stories and traditions recorded, men taking part, roles handed over on time.

## The central idea
Seniors are treated as **recipients** and programmes depend on paid staff and funding. Bricks turns this round: **a community runs itself the way a college society runs, and elders are among its leaders and contributors** (roles with terms, activities, contributions that are recorded and recognised). Burden becomes blessing because the elder has a real role, not a programme to attend. This is the only part of the product that no existing app does, so it must stay visible.

## The themes and where each lives in the product
All of these are **things a community does inside Connect** on the one flexible activity system, plus the member's own record in Grow. None needs a new module or a separate area.

| Theme | What it means for a community | Where it lives |
|---|---|---|
| **Elderly people as contributors** | Elders hold roles (lead, mentor, secretary), run activities, are recognised for contributions; men are drawn in by real roles rather than recreation | Roles with terms; contributions and recognition; activities organised by elders |
| **Earning** | The community earns as a whole (sponsors, events, services) and shares under rules the members vote on; an elder can earn from a service or skill they offer. The platform never holds money; it only records | Contributions and funds records; community services; sponsorship records |
| **Employability** | Local work, referrals, skills and training shared inside the community, including part-time work suited to seniors | Opportunities inside a community (jobs, services, referrals); training as a kind of activity |
| **Sustainability** | Community drives (environment, recycling, sharing, local self-reliance) and a community that keeps running without outside funding | Activity kinds (drives); community-held earnings; roles that hand over every year |
| **Child care** | A community can run child care as a service it is **legally responsible for** (it needs its own licence; Bricks only gives tools: rosters, consent, records) | Community services; roles and responsibilities; consent and records |
| **Culture, values, morals, storytelling** | Elders pass on stories, values and traditions to children and neighbours; cultural evenings; intergenerational sessions; stories kept in the person's own language | Activity kinds (storytelling, cultural events, intergenerational programmes); announcements; later a stories library with translate-on-read |

## What this means for design and build
1. **Say it in the product, not only in the docs.** Onboarding copy, the Connect screen and the Explore-first screen must show the purpose in plain words (elders lead, neighbours help each other, children learn, the community earns).
2. **Seed data and examples must reflect it.** The demo community (Lakeview Residency) should include an elder-led storytelling session, an intergenerational activity, a child-care or homework-help service, a skill-sharing or part-time opportunity, and contributions credited to senior members. (Today the demo has yoga, walks, a health camp and a cultural evening: extend it.)
3. **Roles and contributions are the heart**, not a side feature: terms of one year, at most two, handover notes, recognition that older members can earn and see.
4. **Voice and the person's language come first**, because many elders do not read well in English or use smartphones fluently; the phone-call channel of the agent serves those who are not in the app.
5. **Safety and law:** child care and any licensed service remain the community's responsibility; we never give medical advice; we never hold money.
6. **Measure what matters** (for the hackathon pitch and later): number of seniors holding roles, contributions by seniors, intergenerational activities held, earnings recorded for the community, and how many men take part.

## Open questions to discuss (do not build before deciding)
- A **stories** feature (elders record or tell a story in their language; children listen; translate on read): a kind of activity, or its own small section inside a community?
- How an elder's **earning** is recorded and shown without Bricks holding money (a ledger of contributions and agreed shares, paid outside Bricks).
- Whether the **demo community** should be Singapore-style, India-style, or both.


---

# FILE: team-docs/03-business/README.md

﻿# 03-business

Revenue model, sponsors, pilots and the validation plan.



---

# FILE: team-docs/04-research/README.md

﻿# 04-research

raiSE brief, existing-solutions scan, evidence, Anganwadi and intergenerational findings, cost figures.



---

# FILE: team-docs/05-design/image-prompts.md

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


---

# FILE: team-docs/05-design/README.md

﻿# 05-design

Design principles, screens (later) and naming.



---

# FILE: team-docs/05-design/ui-samples/README.md

# UI samples

Sample screens generated with ChatGPT from our prompts, used as the visual target. They are **samples, not final designs**.

| File | What it shows |
|---|---|
| `01-app-states-and-voice-agent.webp` | Five states of the same app: (1) normal app, (2) keyboard mode, (3) voice agent listening as a small bar above the bottom navigation, (4) the agent controlling the screen (filling the Create Event form while the person watches), (5) the result shown full screen ("Event created!"). |
| `02-multilingual.webp` | The same home screen in English, Hindi, Bengali, Tamil and Chinese, a "Choose Language" screen (English, Hindi, Bengali, Tamil, Chinese, Bahasa Melayu), and a spoken conversation in Hindi where the agent creates an event. |

| `03-onboarding-and-three-domains.webp` | The seven-step onboarding (Welcome, Language, Sign up with OTP, Profile, Interests, Choose path, Home), then Connect, Grow and Thrive screens, **Translate on any screen** (a post in Chinese with an English translation and "View original"), and **the agent controlling a form** (Create Event). **Thrive is superseded** (see below). |
| `04-navigation-options.webp` | Home with the community goal and events, and a comparison of four tabs versus three tabs (Connect, Grow, Thrive). **Superseded**: Thrive is removed, see below. Still useful for the Home layout and the Bricks Agent bar. |
| `05-onboarding-and-profile-from-avatar.webp` | Six-step onboarding with Google and Apple sign-in, the four-path "How do you want to start?" screen, and **Profile and settings opened from the avatar** (Edit profile, App language, Translate this screen, Privacy and consent, Settings, Help). |

| `06-final-ui-direction.webp` | **THE FINAL VISUAL TARGET.** Six onboarding steps (Welcome, Language, Sign up with OTP, Profile, Interests, Start with Bricks), the Connect landing (greeting, community card, Today for you), the Connect hub (3 by 3 grid), the Grow screen (goal card, My Health, My Goals, My Learning, My Progress), the two-tab navigation (Connect, Grow), the agent bar, the ecosystem panel and the five key principles. Screen-by-screen build notes: `../../06-technical/ui-build-spec.md`. |

| `07-agent-canvas.webp` | **Agent Canvas:** the agent-generated interface in the content area (label "Generated by Bricks Agent (AI)" with info, regenerate and close; title; a question with icon tiles; hint card; step dots; Next) with the Connect and Grow tabs and the agent bar still visible. Spec: `../../06-technical/agent-canvas-spec.md`. |

| `08-complete-ecosystem-overview.webp` | **The latest overview.** New-user journey (Welcome, Language, Sign up with phone or email, Profile, **Choose path with only two options: Join a community / Create a community**, Home with two big tiles Connect and Grow); Connect screens (Discover communities with search and Join, community preview, community home with Home / Events / Members tabs and a post feed, members list, Create event, Event details with registrations); four Agent Canvas examples (Plan an event, Visual explanation of an election, Interactive personal goal, Dynamic health-camp form); release plan P0 about 35 screens, P1 about 40, P2 about 25; design principles. **Caution:** its P1 box mentions "Clubs"; the owner rejected clubs and groups (they run on WhatsApp), so ignore that word. |

**Where samples disagree, 08 and 06 win over 03 to 05.** **What is final and what is superseded (11 Nov 2026):** the architecture is two domains, **Connect and Grow**; there is no Thrive tab. Jobs, referrals, sponsors, earnings, training and services live inside Connect. Samples 03 to 05 were drawn before this decision: follow them for onboarding, the four-path start screen, the profile-from-avatar screen, translation and the agent bar, but not for the Thrive tab. Full decision: `../../02-product/product-architecture.md`.

Developer notes taken from these samples: `../../06-technical/ui-spec-from-samples.md`.


---

# FILE: team-docs/06-technical/agent-canvas-spec.md

# Bricks Agent Canvas: smart UI generation (spec, 11 Nov 2026)

Status: **phase 1 built, the rest proposed.** Visual target: `../05-design/ui-samples/07-agent-canvas.webp`. Phase 1 plus the selection tiles, step dots and Next exist today (tools `show` and `hide`); this page describes where it goes. Written from the owner's proposal, **adapted to our real stack** (see "Differences from the original proposal").

## 1. What it is
Bricks Agent has three capabilities: **conversation** (voice and text), **UI control** (open pages, fill fields, press buttons in the existing app), and **Canvas** (the agent builds a temporary interface for one task: a question, a form, a visual explanation, a chart, a multi-step workflow). Canvas is not a chatbot and not a separate product: it is a renderer controlled by the agent, shared by **Connect and Grow**. Principle: *the agent can create the interface the person needs, instead of forcing every task into a fixed screen.*

## 2. Layout (from sample 07)
Canvas takes over the **main content area** (top). The **tab bar (Connect, Grow)** and the **Bricks Agent bar** stay visible below and are never covered. A small label at the top of the canvas says **"Generated by Bricks Agent (AI)"** with an info icon, a **regenerate** button and a **close** button. Under it: a title and subtitle, the question or content, an optional hint card, **step dots** and a **Next** button. Closing returns to the previous screen with its state intact. Closing never submits anything.
Sample 07 shows the target: "Let's create a community event / I'll help you set it up step by step", the question "What type of event do you want to organise?" with selectable tiles (Health Camp, Workshop/Training, Competition, Cultural Event, Sports/Fitness, Environment Drive, Community Service, Other), a hint card, four step dots and Next.

## 3. What exists today
- Tools `show` and `hide` (`app/src/agent/tools.ts`), store `app/src/agent/surface.ts`, view `app/src/components/AgentSurface.tsx`, sandboxed `HtmlFrame.web.tsx`.
- **Phase 1 is built.** The canvas sits *inside* the content area (the tab bar and the agent bar stay below it and are never covered; no dim backdrop). Header, tinted: the **"Generated by Bricks Agent (AI)"** badge, an **info** button that opens one plain sentence about what this screen is and that nothing is saved until the person confirms, a **regenerate** button and a **close** button, then the title and subtitle with the agent mark. Footer: **step dots** and **Next**. Closing returns to the previous screen with its state intact and never submits anything.
- **Built content:** title, message, numbered steps, a question, up to 6 text choices, a typed answer, **selection tiles** (up to 12, each an id, a label and an icon; the person taps any of them and Next returns the labels they chose), a **hint card**, **step dots and Next**, and optional sandboxed HTML.
- **Validated with Zod** (`showSchema` in `surface.ts`): unknown fields are stripped, strings trimmed and capped, lists capped, tile ids and icon names pattern-checked, a wrong type falls back to the empty value instead of blanking the screen. `parseShow` is exported so the self-test can check the schema itself; a self-test check also keeps every tool description inside the 1000-character cap `declarations.py` applies before Gemini sees it.
- **Not built yet:** forms with several fields, live updates from the agent while the person edits, the agent seeing the person's selections before they press Next, charts, and the `canvas_*` tool set. On phones the HTML block does not render (no web view in Expo Go); every other part of the canvas does.

## 4. Component library (build as native Expo components, not HTML)
- **Layout:** container, section, card, grid, row, column, divider, tabs, accordion, stepper.
- **Input:** text, textarea, number, radio group, checkbox, select, multi-select, date, time, slider, rating, file/image upload (later), **selection tiles** (icon and label).
- **Display:** heading, paragraph, badge, icon, image, progress bar, statistic card, table, list, timeline, **chart** (bar, line, pie), checklist/hint card.
- **Interactive:** button, expandable card, poll, quiz, confirmation.
- **Later:** maps, calendar, schedulers, simulations, custom visualisations.
Components use the Bricks tokens (`app/src/theme/tokens.ts`), existing spacing, accessibility and the six languages.

## 5. Interaction modes
A display-only (explanations, diagrams) · B interactive (questions, polls, quizzes) · C forms the agent and the person fill together (voice, typing, "fill it for me", review, correct) · D live agent-controlled (the person says "change the date to Sunday" and the field updates on screen) · E a full temporary task workflow (for example event creation: details, schedule, limits, registration, venue, review, confirm).
**Voice and touch share one state.** What the person taps is visible to the agent; what the agent sets appears at once; switching between speaking and typing loses nothing.

## 6. Tools the agent gets (proposed names; implement in `app/src/agent/tools.ts`, run in the app like `show`)
`canvas.create` (a validated spec) · `canvas.update` · `canvas.add_component` · `canvas.remove_component` · `canvas.set_state` (set a field value) · `canvas.get_state` (read what the person entered) · `canvas.ask_question` · `canvas.show_chart` · `canvas.validate` · `canvas.submit` (only after confirmation, through a real backend call) · `canvas.minimize` · `canvas.restore` · `canvas.close`. `show` and `hide` stay as the simple form, or become thin wrappers over `canvas.create` and `canvas.close`.
The tool names use a dot in the proposal; Gemini function names must match `[A-Za-z_][A-Za-z0-9_]*`, so use underscores (`canvas_create`) in the declarations.

## 7. Rendering architecture (secure by construction)
**The model never supplies code.** It supplies a **declarative component tree** (JSON), which is validated and then rendered by our own components.
1. Agent decides to use a tool. 2. It produces a spec. 3. **Schema validation** (Zod in the app): only known component types and props, unique ids, correct types, size limits, supported actions, required fields. A bad spec is refused with a clear error the agent can fix. 4. **Renderer** maps the tree to native components. 5. **State manager** holds values, selections, step, validation errors (a store like `surface.ts`). 6. **Action dispatcher** turns a button's declared action into a real, **authorised** tool or API call (existing `run`, `open`, `fill`, `press`, or a backend endpoint). 7. **Live sync**: user changes go to the agent as tool results or messages; agent changes update the store.
Spec shape (versioned): `{ schema_version, canvas_id, title, description, language, layout, components:[{ id, type, props, validation, action }], state, permissions{ requires_confirmation } }`.
The existing sandboxed HTML stays only as an **optional advanced block** (rich diagrams); the foundation is the component renderer. Do not build an unrestricted AI-to-HTML generator.

## 8. Security and permissions (non-negotiable)
No arbitrary code execution. A canvas action maps only to an authorised capability; the model cannot grant itself permission. **Confirmation is required** for publishing announcements, creating or cancelling events, sending invitations, governance changes, financial records, health records, deleting data and submitting important applications. Canvas reads only data the current person is allowed to see. Closing never submits. **A canvas is not authoritative data:** events, goals and records are created only by authorised backend calls, and the UI must never claim success when it only showed a preview. Charts use real authorised data; the agent must not invent numbers. Log: canvas generated, interaction, agent state update, tool call, confirmation, API result, closure (no sensitive content copied into logs).

## 9. Multilingual
Everything the canvas shows (questions, labels, buttons, validation messages, explanations, chart descriptions) is written by the agent in the person's language (the system prompt already requires it). Unicode and font fallback; local date and number formats; switching language keeps the canvas state; the original text of translated community content stays one tap away. Use the shared translation approach (translate on read, cached); do not call a separate service per component.

## 10. Lifecycle
idle → request received → generating → validating → rendering → active ⇄ updating (user or agent) → awaiting confirmation → submitting → completed, or failed, or closed/restored. Handle generation errors and a dropped connection gracefully (keep the state, tell the person, let the agent retry).

## 11. Stored data
A canvas lives in the app's memory by default (temporary). Optionally persist a short-lived record for resuming: a table `agent_canvases` (id, user_id, community_id nullable, type, title, language, schema_version, status, spec jsonb, state jsonb, created_at, updated_at, expires_at). Community id is empty for personal Grow flows. Never use it as the source of truth for events or goals.

## 12. Roadmap and acceptance (build in this order)
1. **Foundation — DONE (11 Nov 2026):** canvas container placed inside the content area, the "Generated by Bricks Agent (AI)" label with info, regenerate and close, JSON schema and Zod validation, basic renderer, open and close, tokens.
2. **Interactive components — partly done:** selection tiles, cards (hint), progress (step dots) and multi-step with Next are built. Not built: text, select, radio, checkbox, date, time fields.
3. **Agent integration:** `canvas_create`, `canvas_update`, `canvas_set_state`, `canvas_get_state`; voice-to-form; the agent sees the person's input.
4. **Visual intelligence:** charts, diagrams, timelines, quizzes, educational flows.
5. **Application integration:** Connect and Grow workflows through authorised APIs, confirmation, error handling, audit log.
6. **Advanced:** reusable templates, complex task interfaces, context-aware generation.
**MVP milestone (one flow):** the person says "Help me organise an event" → agent calls `canvas_create` → a generated event questionnaire (sample 07) → the person answers by voice or touch → the agent updates the form live → the person reviews and confirms → **Bricks creates the real event through the backend.** *Dependency:* the last step needs the activity system and community backend (`ui-build-spec.md` section D); until then the MVP ends at a confirmed preview that clearly says nothing was saved.
Acceptance for release 1: a structured interface from a natural-language request; shown in the content area with navigation and the agent bar visible; interactive controls; the agent can read and update state; voice and touch interchangeable; a multi-step form works; closing returns to the previous screen; actions are validated and authorised; works in the person's language; permanent data is saved only through authorised backend operations.

## 13. Differences from the original proposal
The original proposal listed a stack of Next.js, Node/Express, MongoDB and Tailwind. **That does not apply.** Our decided stack: **Expo (React Native + web) with TypeScript, FastAPI (Python) and PostgreSQL**; styling with our own tokens; live sync already runs over the agent WebSocket (`/v1/agent/live`); tools run in the app; authentication is our token system. **Zod is used** for validation in the app (`zod` in `app/package.json`, `showSchema` in `app/src/agent/surface.ts`); no other schema library is added. The endpoints sketched in the proposal (`/api/agent/canvas…`) are optional and only needed if canvases are persisted; follow our `/v1/...` conventions if added.

## 14. Next step
Phase 1, the selection tiles and the step dots are built **on top of `show`**, so the screen in sample 07 can be produced by the agent today. Before building more, discuss with the owner: the `canvas_*` tool set and multi-field forms depend on the activity backend (`ui-build-spec.md` section D), and the MVP flow ends at a confirmed preview until then.


---

# FILE: team-docs/06-technical/app-navigation-agent-language.md

> **Read first (11 Nov 2026):** the code is the truth for how navigation, the agent and languages work. This page still lists the removed sample modules (events, goals, mock data) and the old five tabs. The final product architecture (two domains, Connect and Grow) is in `../02-product/product-architecture.md` (FINAL ARCHITECTURE), and the current technical state is in `../10-handoff/HANDOFF.md`.

# App tree: modules, pages, elements; agent tools; language (built 12 Nov 2026)

Code: `bricks/app/src`. Inspired by the idea of one registry that decides where every screen lives and what every module can do; no code was copied.

## 1. The tree
**module > page > element**, with full dotted keys:
- module `events`
- page `events.new` (key is always `<module>.<name>`)
- element `events.new.title` (ids are letters and digits, no dots)
- module skills are written `events/create`

One key has three uses: its **words** (looked up in the person's language), its **address** (navigation), its **control** (the agent fills or presses it).

## 2. One page = one folder, one declaration file
```
src/features/events/
  module.ts            id, summary, skills; its pages are listed here
  store.ts             data
  components/          pieces used by more than one page of the module (EventCard)
  pages/new/
    page.ts            THE declaration (plain data, no React): key, route, summary, tab, params, elements, strings
    Screen.tsx         the screen; no hard-coded text and no key strings
    strings.ts         this page's words in en, hi, bn, ta, zh, ms
src/app/event/new.tsx  router file: one line re-exporting the Screen
```
`page.ts` declares each element (`kind`: text, field, choice, action, list; `type`, `required`, `options`, `agent` policy, `secret`, `summary`). `definePage()` checks it at start-up (bad key, module mismatch, missing English words, choice without options).

## 3. What the one declaration drives
Navigation address, the bottom bar (pages that declare `tab`), the words every language must supply (a test fails if one is missing), what the agent can see and do, and the generated descriptions. No second list to keep in step.

## 4. Agent tools (`agent/`): walk the tree one level at a time
`tree` (modules, then a module's pages and skills, then a page's elements), `search`, `docs` (one node), `open`, `read` (what is on the open page, with values), `fill` (by element key; opens the page first if needed), `press`, `run` (`module/skill`). Plain JSON-schema specs, ready for Gemini function calling. The agent targets **keys, not words**, so it works the same in any language, and it never sees code or addresses.

Policy per element or skill: **free**, **confirm** (the person approves in a banner), **human** (the agent refuses and guides). `secret: true` elements never return their value.

## 5. The glow
When the **agent** fills or presses something, the element glows with a pulsing ring and a caption bar says what it is doing ("Assistant is filling: Event title"), in the person's language. A person's own taps never glow. It lives in one place (`fillElement` / `pressElement`), so tools and skills glow the same way. Reduced-motion users get a steady ring.

## 6. Language (`i18n/`)
Six languages: English, Hindi, Bengali, Tamil, Chinese, Malay. Fixed words live beside each page; shared words in `i18n/common.ts`. A missing word shows English. The choice is saved on the device (falls back to the phone's language, then English); the agent can change it. **All five non-English tables are first drafts by an AI assistant and need native-speaker review.** Member-written content is not translated yet (plan: show as written, with a Translate button that translates on read and saves the result).

## 7. Tests
`npx tsx src/navigation/selftest.ts` (42 checks, all pass): the tree at every level, search, path parsing, definePage refusals, fill that opens the page, glow state, policies (person-only, approval, secret), the language switch by skill and by element key, and that every word of every page exists in all six languages. The app type-checks.

## 8. UI shell and the assistant dock (13 Nov)
Rebuilt to match `05-design/ui-samples`: header (logo, bell, avatar that opens the profile), greeting, community goal card, event cards with Join pills, five icon tabs, Create Event form with icons, language list, and Me as the profile page. The bottom bar is drawn once in the root layout so it stays on inner pages too; its icons come from each page's declaration (`icon`).
**Assistant dock** (`agent/dock.tsx`): mic and keyboard buttons float above the bar; typing mode (message field, send), listening bar (waveform, end button) and an acting state that shows what the agent is doing. Speech input uses the browser's recognition on the web (`agent/voice.ts`); on a phone it needs a development build.
**The brain is NOT connected** (`agent/brain.ts`): typed or spoken text gets an honest "not connected yet" reply. Plan: the app sends the text and `toolSpecs` to a backend endpoint that holds the Gemini key and does the function calling; the app runs each returned tool call, sends the result back, and repeats until there is a reply. The key never lives in the app.

## 9. Not done yet
The brain (backend endpoint and Gemini); sign-in (the guard is a stub); real data from the backend; the remaining screens from the UI samples; real event photos and profile photos (icon tiles and an initial for now); the "Added" state on a created event; the Translate button for member text; removing the sample community.


---

# FILE: team-docs/06-technical/app-plan.md

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


---

# FILE: team-docs/06-technical/backend-modules.md

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


---

# FILE: team-docs/06-technical/database-schema.md

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


---

# FILE: team-docs/06-technical/README.md

﻿# 06-technical

Architecture, data, API and voice. Added later, when the overall features are settled.



---

# FILE: team-docs/06-technical/ui-build-spec.md

# UI build spec: the final screens (11 Nov 2026)

For the coding agent that builds the UI. **Visual target: `../05-design/ui-samples/06-final-ui-direction.webp`** (it wins over samples 03 to 05 where they differ). Architecture: `../02-product/product-architecture.md`. How the app is built: `../10-handoff/HANDOFF.md` (section 6: module > page > element). Follow the existing conventions exactly; **copy an existing page** (for example `app/src/features/me/pages/edit/`) and do not invent a second way.

## Rules for every screen
- One folder per page: `app/src/features/<module>/pages/<page>/{page.ts, strings.ts, Screen.tsx}`; register the module in `app/src/features/index.ts`; add a thin route file in `app/src/app/`.
- Every visible word goes in `strings.ts` for all six languages (en, hi, bn, ta, zh, ms); shared words in `i18n/common.ts`. The self-test fails if one is missing.
- Declare every field and button as an element in `page.ts` so the agent can use it by key, and wrap it in `El` with `useField` / `useAction`. Policy `human` for anything the agent must never do (OTP, Singpass, DigiLocker), `confirm` for risky actions.
- **No hard-coded sample data.** Names, communities, goals and numbers in the sample image are illustration only. Everything shown comes from the account or the database; where there is no data yet, show an empty state or "Coming soon".
- Colours, spacing and radius come from `app/src/theme/tokens.ts` (green `#1B7F3B`). Large readable text, big touch targets. No visible scroll bars. Header: logo, bell, avatar (avatar opens `/me`).
- Bottom: exactly two tabs, **Connect** and **Grow**, then the **Bricks Agent bar** (already built; its hint text changes per screen, see below).
- Run the checks before you finish: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts`, and log your work in `team-docs/10-handoff/PROGRESS.md`.

## A. Onboarding (all `bare`: no tab bar). Order: Welcome, Language, Sign up, Profile, Interests, Start
| # | Page key / route | What the sample shows | Elements (id: kind) | State today |
|---|---|---|---|---|
| 1 | `auth.welcome` `/welcome` | Logo, "Connect. Grow. Participate.", "Your community, your activities, and your personal journey, all in one place.", illustration, **Get Started** | heading, subtitle, start: action, languageLink: action | Built (change the heading to the tagline) |
| 2 | `auth.language` `/language` (new) | "Choose Your Language", "Use Bricks in the language you are most comfortable with." Radio list: English, हिन्दी, বাংলা, தமிழ், 中文, Bahasa Melayu, **More Languages**, Continue | language: choice (en, hi, bn, ta, zh, ms), more: action, continue: action | Language page exists (`language.pick`); add the onboarding version and put it before sign-up. Needs a Malay name `Bahasa Melayu` in `i18n/languages.ts` if missing |
| 3 | `auth.signIn` + `auth.verify` | "Sign Up": tabs **Email / Phone**, email field, **Send OTP**, "Enter 6-digit code" boxes, "Verified", Continue. Google below. | email, sendCode, code (human + secret), verify, resend, google, singpass, digilocker | Email + Google built. **Phone OTP is not built** (needs an SMS provider; leave the tab disabled until then) |
| 4 | `auth.setup` `/setup` | "Your Profile": photo with camera badge, Name, Age Group (dropdown), Preferred Language (dropdown), Continue | displayName, ageBand, phone, area, save (built); add photo: action, preferredLanguage: choice | Built without photo. Photo upload needs storage (later) |
| 5 | `auth.interests` `/interests` (new) | "Your Interests", "Select what you love to do. You can change this later." Multi-select tiles: **Community Activities, Health & Wellbeing, Sports & Fitness, Learning & Skills, Culture & Events, Volunteering & Service**, Continue | interests: choice (multi), continue: action | New. Store in a `user_interests` table (see below) |
| 6 | `auth.start` `/start` (new) | "How do you want to start?" Four cards: **Join a Community** (I have an invite code or link), **Create a Community** (Start my own community, for example apartment, society, club), **Start Personally** (Set my personal goals and wellbeing), **Explore First** (See what Bricks can do) | join: action, create: action, personal: action, explore: action | New. Join and Create open their own flows (section D); Personal goes to Grow; Explore goes to Connect in read-only mode |

Guard rules (`AuthGate`): signed out on a private page goes to Welcome; signed in without a name goes to Setup; after Setup go to Interests, then Start, then the app. Remember how far a person got (a `onboarding_step` on the user or a simple flag per step) so a returning person is not asked again.

## B. Tabs
**Connect tab (landing, "Home" content)** `connect.index` `/`
- Greeting from the account: "Good morning, <first name>" (time-of-day word in the person's language; the waving emoji is decoration).
- Community selector: "<community name> · <n> members" with a dropdown to switch communities (shown only if the person belongs to one; otherwise an invitation card: join or create).
- A community card "<community name> / Our Community" that opens the **CONNECT DASHBOARD: SCOPE LOCKED by the owner (12 Nov 2026). Add nothing else until the owner reopens it.** It is an **entry point to the person's communities, not a management dashboard.** Members, events, resources, governance, roles, contributions, sponsorships, settings and clubs/programmes appear ONLY after opening a community (no cards for them on Connect).
Structure, top to bottom: 1. Bricks header (logo, bell, avatar). 2. Heading **Connect** with the line "Your communities, all in one place." 3. **Find your community** (search among the person's communities). 4. **My communities**: "N communities", a card each (name, members). 5. **Join or create a community**: ONE clear entry point. 6. **Coming up** (optional, compact): the next two or three events across all joined communities: event name, community name, date and time, small image, with a "View all" link; creating, registering and managing events stay inside the community. 7. Connect / Grow tabs. 8. The Bricks Agent bar.
Behaviour: no communities gives a welcoming empty state with Discover and Create; one community gives one prominent card; several give searchable, scrollable cards; many add sorting, favourites and filters without crowding.
Built today (`connect.index`): everything above except community images, favourites and sorting, the "View all" link, Discover, and the working Join and Create (the button is disabled "Coming soon"). Backend: `GET /v1/communities/mine` and `GET /v1/communities/upcoming`. **Inside a community** (`connect.community`, next): announcements, events and activities, members, roles and leadership, contributions and recognition, opportunities; sponsors and funds later. **Next design step: Grow, separately; then each community page, one by one.**

**Grow tab** `grow.index` `/grow` (title "Grow", subtitle "Your Goals, Health & Learning")
- A goal card: "My Goal: <title> / <period> / <done> of <target> <unit> (<percent>%)" with a progress bar (from the person's active goal; empty state "Set your first goal" when none).
- Rows, each opening a page: **My Health** (Track and manage your wellbeing), **My Goals** (Set and track personal goals), **My Learning** (Build skills at your pace), **My Progress** (Your activity, milestones and streaks).
- Agent bar hint: "How can I help you grow today?".

**Profile and settings** (from the avatar) `me.index` `/me` "My profile": already built (Edit profile, Language, Sign out). Add later: Translate this screen, Privacy and consent, Settings, Help and support (sample 05).

## C. The Ecosystem panel in the sample (copy for the marketing site and the Explore-first screen)
- **Connect, everything you do together:** create or join communities; run any kind of event; clubs, societies and programmes; competitions and leagues; health, fitness and group activities; learning, workshops and training; community services and volunteering; jobs, referrals and local opportunities; contributions, sponsorships and funds; roles, leadership and governance.
- **Grow, your personal development:** personal goals and milestones; health and wellbeing; walking, jogging and fitness; learning and skill building; habits and daily routines; personal progress and achievements; reminders and intelligent assistance; private health and activity records; family support (optional).
- **Key principles:** Flexible and community-driven · Multilingual and inclusive · Voice and agent-first · People centric · Private and trusted.

## D. What the backend needs (build in this order; keep to `database-schema.md`)
1. `onboarding` (a column or table: steps done) and `user_interests` (user_id, interest key). Interest keys: `community_activities, health_wellbeing, sports_fitness, learning_skills, culture_events, volunteering_service`.
2. `communities`, `memberships`, `role_definitions`, `role_terms` (already designed): create, join by invite code or link, discover nearby (PostGIS), switch community.
3. **One activity system** (`activities`, `activity_participants`, attendance, optional sponsorship; the `kind` and a free `category` carry event, competition, class, drive, club). Tiles in the Connect hub are filters over it. Do not add a table per tile.
4. `goals` and `goal_progress` for Grow; contributions and recognition after that.
Each module follows `backend/app/modules/identity` (router, service, schemas, tests with a real database). Use grants with term dates for roles (HANDOFF section 8).

## E. Suggested build order for the UI agent
1. Welcome heading, onboarding Language, Interests, Start screens (with `onboarding_step`), then the guard order.
2. Connect landing with the community selector and empty states, then **create / join / discover community** (with the backend of D2).
3. Connect hub (all tiles "Coming soon"), then Events as the first real tile on the activity system.
4. Grow landing with the goal card and the four rows ("Coming soon"), then My Goals.
5. Translate-this-screen and the agent surface hooks (the agent already has `show`/`hide`; give each new page a good `summary` and element `summary` so the agent can use it).
After each step: type-check, self-test, a browser check, and a PROGRESS entry.


---

# FILE: team-docs/06-technical/ui-spec-from-samples.md

# UI behaviour taken from the samples (draft, for the developer team)

Source: the two images in `../05-design/ui-samples/`. Only what is visible in them; nothing here is approved. Items under "To confirm" differ from our earlier documents.

## Layout seen
- **Header:** the Bricks logo and name, a bell (notifications) and the person's photo.
- **Greeting:** "Good morning, Ankit" and, under it, the community name with its member count ("Lakeview Residency, 128 members").
- **Community goal card:** title, a progress bar and the numbers ("72 km / 100 km (72%)").
- **"What's happening":** a list of event cards, each with a photo, title, date and time, place and a green "Join" button; a "See all" link.
- **Bottom navigation, five tabs:** Home, Community, Events, Goals, Me.
- **Create Event form:** title, date, time, location (each as a field with an icon) and a green "Create Event" button.
- **Confirmation:** a green banner "Event created!" with the event details; the new event appears in the list marked "Added".

## The voice agent (the important part)
Five states of one app:
1. **Normal app:** no agent open.
2. **Keyboard mode:** a message field with a send button and the keyboard; the person can type.
3. **Voice agent listening:** the keyboard area becomes a small "Bricks Agent" bar (waveform, status "Listening...", a red end button and an expand arrow) **above the bottom navigation**. The app stays fully usable.
4. **Agent controlling the UI:** the agent fills the form and presses the button while the person watches live (status "Creating the event...").
5. **Result:** the full app shows the outcome. No typing and no agent panel are needed.

So voice is not a separate chat screen. It is a **persistent bar that drives the real screens**, which needs: a command layer that can fill fields and press buttons by name, the one map of places, and a visible status line.

## Languages
- Choose Language screen lists: English (default), Hindi, Bengali, Tamil, Chinese, Bahasa Melayu.
- The whole interface, including menu labels, events and goals, appears in the chosen language; the agent understands and speaks several languages (the sample shows a Hindi request creating a Friday 6 pm yoga session).
- Needs: language files for all interface text; machine translation for community-written content (events, goals) or a clear rule that user text stays as written; a language switch in Settings at any time.

## To confirm (differences from our earlier documents)
1. **Tabs:** the sample has five tabs (Home, Community, Events, Goals, Me); our earlier plan had four (Community, Events, Me, Help). With the agent bar, "Help" is not a tab.
2. **Home vs Community:** the sample separates a personal **Home** from a **Community** tab; our earlier plan had one community home.
3. **Languages:** Bengali is in the sample; our earlier list was English, Malay, Mandarin, Tamil, Hindi.
4. **Emoji and photos:** the sample uses a waving-hand emoji and photographs; our earlier design rule was no emoji and no stock photos.
5. **"All content translates instantly"** implies machine translation of user content, which costs money and can be wrong.
6. **Speech** needs a development build; it does not work fully in Expo Go (to verify).


---

# FILE: team-docs/07-meetings/README.md

﻿# 07-meetings

Team calls and mentor notes.



---

# FILE: team-docs/08-decisions/README.md

﻿# Decisions

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

## 2026-11-11 (night): Connect is communities only; media; demo data
- **Connect shows communities, nothing else on its first screen**: new person sees Join and Create; a member sees their communities; everything else (announcements, events and activities, members, roles, contributions, opportunities) is **inside** a community. **No clubs and groups, no nine-tile grid** (the earlier 100-screen proposal listed a clubs module; the owner rejected it: groups already run on WhatsApp).
- Media: one basic module (`backend/app/modules/media`), signed Cloudinary uploads over REST, images only, 5 MB, file type checked from the bytes. The Jambagrad media module is NOT copied. Cloudinary credentials are not in the Jambagrad env files (they live in its database): the owner adds `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (or `CLOUDINARY_URL`) to `backend/.env`.
- Demo data: `python backend/run.py seed-demo [emails]` creates one full community (Lakeview Residency, join code LAKE-DEMO) marked `is_demo`; `--reset` removes it.

## 2026-11-12: social purpose recorded
- The reason behind the product is written in `../02-product/social-purpose.md`: elders as contributors and leaders, earning, employability, sustainability, child care (the community's own legal duty), culture, values and storytelling. Every feature is judged against it. Open questions (stories feature, how earning is recorded, demo community setting) are listed there.
- New-user path in the latest sample (08): only **Join a community** and **Create a community** are offered; Home shows Connect and Grow.

## 2026-11-12 (later): six pillars and Community Vitality
- Six pillars are central: elderly participation and dignity; employability and earning; childcare and community care; culture, values and storytelling; community sustainability; social connection and belonging. Written in `../02-product/social-purpose.md`.
- **No separate Elderly Welfare section.** Seniors teach, mentor, tell stories, lead and decide inside the normal community screens (intergenerational value creation).
- Success is **Community Vitality**, not registrations or engagement.
- Master documentation folder rebuilt flat for sharing (`../../master-docs/`, rebuilt with `scripts/build_master_docs.py`).

## 2026-11-12 (later): Connect dashboard scope locked
- Connect = entry point only: find, My communities, one Join-or-create entry, a compact Coming up (next 2 to 3 events across joined communities). Nothing from inside a community appears on it. Add nothing until the owner reopens the scope. Next: design Grow separately, then the community pages one by one. Details in `../06-technical/ui-build-spec.md`.


---

# FILE: team-docs/09-archive/README.md

﻿# 09-archive

Older material moved from project-name-tbd. Nothing is moved yet.



---

# FILE: team-docs/10-handoff/HANDOFF.md

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

## 2a. Why this exists (read `team-docs/02-product/social-purpose.md`)
Elders as contributors and leaders, earning, employability, sustainability, child care, culture, values and storytelling: this is the point of Bricks, not a side note. Examples and demo data should show it.

## 2b. Product architecture (FINAL, 11 Nov 2026)
Two domains: **Connect** (what people do together: communities, activities, governance, sponsors, earnings, jobs and referrals) and **Grow** (personal goals, health, learning).
**Thrive was removed**; tagline "Connect. Grow. Participate."; a flexible activity system instead of one module per activity type; profile and settings open from the avatar;
the Bricks Agent bar is global. Full page: `team-docs/02-product/product-architecture.md`; samples `team-docs/05-design/ui-samples/` (03 to 05 pre-date the Thrive removal).
**The app now has exactly two tabs, Connect and Grow (decided by the owner), both "Coming soon"; profile and settings open from the avatar (`/me`, "My profile").** **The approved visual target is sample 06 and the screen-by-screen build instructions are in `team-docs/06-technical/ui-build-spec.md`: read it before building any screen.** Next UI tasks (in that order): onboarding Language, Interests and Start screens, then Connect landing with create/join/discover community, the Connect hub, Grow.

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
  app/modules/communities  communities, membership, roles with terms, announcements, activities, contributions, opportunities (migration 0003)
  app/modules/media    basic picture upload to Cloudinary
  app/seed_demo.py     `python backend/run.py seed-demo [emails] [--reset]`: one full demo community
  migrations/          SQL files applied in order (0001 identity, 0002 token state, 0003 communities)
  tests/               pytest (61 tests, real local database, fakes for phone/model/mail)
team-docs/             our docs (vision, product, design samples, technical, decisions). 10-handoff = this folder
platform-docs/         public docs (about, FAQ ...). master-docs/ is GENERATED: ONE file, 00_ALL_IN_ONE.md, holding every document, for sharing (rebuild with python scripts/build_master_docs.py after editing docs; never edit it by hand)
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
`PARALLEL_API_KEY` (web search), `PARALLEL_SEARCH_MODE`, **`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` (NOT SET YET: media uploads answer 503 until the owner adds them)**. `app/.env`: `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, optional `EXPO_PUBLIC_API_URL`.
The voice and Google values were copied (blind, never displayed) from the owner's older Jambagrad project.

## 5. Current state (what works)
- **Communities backend and demo data (new):** `GET /v1/communities/mine`, `GET /v1/communities/{id}` (members only), `POST /v1/communities` (creator becomes Community Lead), `POST /v1/communities/join` (invite code), `POST /v1/communities/activities/{id}/going`; `POST /v1/media/upload` (Cloudinary, needs the three env names). Seeded demo: Lakeview Residency, 12 demo people, 4 activities, 3 announcements, 6 contributions, 3 opportunities; the test account ui-check@example.com is Secretary there. The Connect tab lists a person's communities (Join and Create are disabled "Coming soon"); the community page itself is NOT built yet.
Everything below was tested unless marked.
- **Sign-in:** email code (6 digits, 5 per hour per email, 30 s apart, 5 wrong tries, HMAC-hashed), Google ID-token sign-in (works on `localhost:3000`),
  Singpass and DigiLocker buttons present but **off** ("Not available yet"; they need registered credentials and are not implemented server-side).
- **Tokens (stateless):** HS256, 15 minutes, claims `sub, t (a|g), s (session id), iss/aud=bricks, iat, exp`. Verification = signature + claims, no database call.
  `auth_state.py`: in-memory list of signed-out sessions (instant logout) and per-person `users.auth_changed_at` cached 5 s (a token issued before it answers
  `401 token_expired`, the app refreshes once and retries). Refresh tokens rotate and keep the same session id. The app refreshes only when the token has under
  a minute left. Design came from the Jambagrad auth module (RS256 + hot list + change log); see section 8 for what to adopt next.
- **Profile:** first-time setup page (name required; age group under40/40to59/60plus, phone, area optional), view page, edit page, language saved to the profile.
- **App shell:** welcome, sign-in, verify, setup, two tabs (Connect, Grow), both "Coming soon"; the profile page opens from the avatar.
  No scroll bars (app-like scrolling). Language page works (six languages).
- **Bricks Agent (in-app):** bottom bar under the tab bar on every signed-in page (waveform, status, red end button, chevron for transcript and a typing box).
  Tap to talk; the microphone starts at once and audio is held until the connection is ready. Browser voice tested once (works); typing tested; **iPhone
  Safari and Expo Go are untested**. Tools (open, fill, press, run, tree, search, docs, read) run **in the app** (so the person sees the glow and gives
  approvals); `web_search` and `read_page` run on the **server** (key stays there; 20 lookups per talk). Newest talk replaces an older one for the same person.
- **Agent surface / Canvas (smart UI):** the agent shows a **card inside the content area** — the tab bar and the agent bar stay below it and are never covered, there is no dim backdrop — with the **"Generated by Bricks Agent (AI)"** badge, an **info** line, a **regenerate** button and **close**, a title and subtitle under the agent mark, then a question, **selection tiles** (up to 12, icon + label, the person taps any and Next returns the labels they chose), text choices, a typed answer, a hint card, numbered steps, an optional generated HTML page, and a footer with **step dots and Next**. Tools `show` (a question with options, tiles or `next` WAITS and returns the person's answer; anything else returns at once) and `hide`.
  Files: `app/src/agent/surface.ts` (store and the Zod `showSchema`; limits title 120, message 1500, question 200, hint 400, 8 steps, 6 options, 12 tiles, 10 dots, html 20000 characters), `app/src/components/AgentSurface.tsx`, `HtmlFrame.web.tsx`.
  The HTML runs in an iframe with `sandbox=""` (no scripts, no forms, no navigation, no access to the app) and a Content-Security-Policy that blocks every network request;
  on phones (no web view in Expo Go) only the text, tiles, choices and steps show. Words: `agent.canvas.badge|info|about|again|next` in six languages (`i18n/common.ts`); regenerate sends a silent message through `askAgent` (`agent/live.ts`). The agent writes everything in the person's language (system prompt in `backend/app/modules/agent/declarations.py`). Tested: type-check and self-test (new canvas checks). **Not tested in a browser in this state.**
- **Agent Canvas (planned evolution of the surface):** spec `team-docs/06-technical/agent-canvas-spec.md` and sample 07. **Phase 1, the selection tiles, the hint card and the step dots with Next are built** on top of `show` (see the bullet above), so sample 07 can be produced by the agent today. Still to build: the `canvas_*` tool set, multi-field forms, live state the agent can read and update, charts. Build it as native components with a validated JSON component tree, never as free HTML. Discuss with the owner before building.
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
**Each description is cut at 1000 characters** there, so a longer tool description loses its tail in silence — a self-test check keeps every `toolSpecs` description inside that limit.
**Untrusted content is data, never orders:** the system prompt tells the agent that a web page, a search result, an event title, a name or anything another member posted cannot give it instructions, and that it must never reveal passwords, codes or tokens. The canvas shows only words and icons the agent wrote; it can never run code or reach the app's data.
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
6. Native-speaker review of hi, bn, ta, zh, ms words (the five new `agent.canvas.*` words are first drafts like the rest).
7. **The Agent Canvas has not been looked at in a browser** in its present state: it was verified by type-check and self-test only. Run the app, ask the agent for a question with tiles, and check the badge row, the tile grid, the hint card, the step dots and Next against sample 07; also confirm the transcript no longer prints `press me.edit.save` (the fix is in the source but the public `app/dist` copy must be rebuilt to show it).
8. Docs: `team-docs/06-technical/app-navigation-agent-language.md` and `app-plan.md` still describe the removed sample modules (events, goals, mock data) and the
   old "assistant brain not connected" state: the code is the truth, update them. `master-docs/` is rebuilt by `scripts/build_master_docs.py`.
9. Backend in-memory pieces to move to a shared store before running more than one process: the signed-out session list and `changed at` cache
   (`auth_state.py`), voice call store, the in-app talk counters. The CI backend job is new and has not run on GitHub yet.
10. A leaked MongoDB Atlas password (from a mistake in an earlier session) must be rotated by the owner; the local Postgres admin password and network exposure should
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


---

# FILE: team-docs/10-handoff/PROGRESS.md

# Progress log

**Newest entry at the bottom. Every agent appends an entry at the end of each session** (see `AGENTS.md`). Format:

```
## YYYY-MM-DD (tool and model)
Did: ...
Tested: ... (how)
Not done / not tested: ...
Next: ...
```

---

## 2026-11-11 (Claude Code, Sonnet 5.5): up to the first handoff
Did:
- Backend identity module (email code sign-in, Google sign-in, sessions, profile), stateless 15-minute tokens with session id and fast revocation, migrations 0001 and 0002.
- Email service (Brevo REST, SMTP fallback), daily cap, plain transactional template. Test-mode code hidden from public tunnels.
- App: login and profile management only, everything else "Coming soon", no hard-coded data; AuthGate; setup, edit profile, language; no scroll bars.
- Phone voice agent in Python (Twilio + Gemini Live) copied in design from the Jambagrad voice module; one real call placed with the owner's go-ahead.
- In-app Bricks Agent: bottom bar, mic and text, live transcript lines, tools run in the app, server-side web search and page reading.
- Web hosting through the owner's ngrok tunnel (backend serves the built website); GitHub repo `brocks01/Bricks` with `main` and `Ankit`; CI workflow, pull request template, CONTRIBUTING; Vercel config.
- Handoff docs (this folder, `AGENTS.md`). `backend/run.py` now accepts `PORT`.
Tested: 50 backend tests pass; app type-check and self-test pass; browser walkthrough of sign-in, setup, Me, agent typing and web search; one live phone call (35 s); real Google sign-in on localhost:3000 by the owner.
Not done / not tested: real email codes (no Brevo key yet), Vercel deploy, iPhone Safari voice, Expo Go, CI on GitHub, roles and grants, agent `g` token, Singpass, DigiLocker, docs for the technical folder (stale, see HANDOFF section 7).
Next: owner adds `BREVO_API_KEY`, test a real code; deploy `app/` to Vercel and add its URL to Google's authorised origins; open the pull request `Ankit` to `main`; then roles and grants for communities (HANDOFF section 8).

## 2026-11-11 (Claude Code, Sonnet 5.5): product architecture locked, agent surface
Did:
- Locked the product architecture with the owner: two domains Connect and Grow, Thrive removed, flexible activity system, four starting paths, onboarding flow, profile from the avatar
  (`team-docs/02-product/product-architecture.md`, decisions entry, three new UI samples stored in `team-docs/05-design/ui-samples/` with a note on what is superseded, HANDOFF section 2b).
- Built the agent surface: tools `show` and `hide`, `surface.ts`, `AgentSurface.tsx`, sandboxed `HtmlFrame.web.tsx`, system prompt guidance, words for the Close button in six languages.
Tested: app type-check and self-test pass (new checks for show/hide, waiting question, dismissal, size caps); backend 51 tests pass; in the browser the agent showed a card page with
3 steps and two choices, the sandbox and policy were present (no script), and tapping "Join a community" returned the answer and closed the panel.
Not done / not tested: the app's tabs and onboarding still follow the OLD samples (five placeholder tabs); iPhone Safari and Expo Go (HTML is hidden on phones by design until a development build);
a long html page's height (fixed 260 px frame, content scrolls inside it); the public Vercel/ngrok copy was rebuilt only if noted below.
Next: owner decides Home as a tab or not; then rebuild the tabs as Connect and Grow and the new onboarding (language, interests, four-path start); then the activity system and roles/grants.

## 2026-11-11 (Claude Code, Sonnet 5.5): two tabs
Did: replaced the five placeholder tabs with exactly two, **Connect** and **Grow** (owner's decision); removed the old home, community, events and goals modules; the profile page (`me.index`, "My profile") is no longer a tab and opens from the avatar with a back arrow; words for the two tabs in six languages; docs updated (open question resolved).
Tested: type-check and self-test pass (new checks: two tabs in order, profile not a tab); in the browser the two tabs show and the avatar opens /me.
Not done / not tested: the public ngrok copy of the website was not rebuilt (run `npx expo export --platform web --output-dir dist` in `app`); not committed until the owner says so.
Next: the new onboarding (language, interests, four-path start), then real content in Connect (community create/join/discover).

## 2026-11-11 (Claude Code, Sonnet 5.5): final UI direction and build spec
Did: stored the final UI image as sample 06 (the visual target; wins over 03 to 05); wrote `06-technical/ui-build-spec.md` (every onboarding, Connect, Connect hub and Grow screen with page keys, routes, elements, data sources, empty states, backend needs and a build order) so another agent can build directly; updated the product architecture, the samples README and HANDOFF.
Tested: docs only (no code change in this entry).
Not done: none of the new screens is built yet (Language onboarding, Interests, Start, Connect landing content, hub, Grow content); Phone OTP, photo upload, Apple sign-in are not built.
Next: follow the build order in `ui-build-spec.md` section E.

## 2026-11-11 (OpenCode, mimo-v2.6-flash): the agent no longer shows internal keys to the person
Did:
- Two places leaked internals to the person: the transcript line printed the tool name plus a page/element key (`docs grow.index`) and the approval banner printed `me.edit.save: Save`. Both now show plain words in the person's language. Three new shared words `agent.tool.lookup`, `agent.tool.screen`, `agent.tool.show` (all six languages), picked by tool; the tool's own name, path, key and query are never shown or read out.
- The server-side lookup line (`web_search`, `read_page`) now also sends `name` so the app writes the localised phrase; `text` is kept so an older built copy still displays something.
- Left in the tree from this session's first small piece: the Welcome heading/subtitle now carry the tagline from `ui-build-spec.md` A1 (six languages).
Tested: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts` — all 46 checks pass, including "every word exists in all six languages" with the three new word ids added to the self-test list. `backend/app/modules/agent/router.py` compiles (`py_compile`).
Not done / not tested: **no browser or live-talk check** — no real talk has been watched to confirm the transcript now reads "Looking something up…" instead of `docs grow.index`; the public `app/dist` copy was not rebuilt (rebuild it before the owner's tunnel shows this); the Welcome tagline edit is committed to no branch yet and was not reviewed by the owner.
Next: the panel (the thing the owner calls the canvas) — a prompt rule so the agent never duplicates what the open page already shows, and auto-close of the panel when the person moves page or when the agent starts acting.

## 2026-11-11 (Claude Code, Sonnet 5.5): Agent Canvas spec stored
Did: stored sample 07 (Agent Canvas) and wrote `06-technical/agent-canvas-spec.md` from the owner's proposal, adapted to our stack (the proposal's Next.js/Node/Mongo stack is replaced by Expo/FastAPI/PostgreSQL); decisions, samples README and HANDOFF updated.
Tested: docs only (no code change in this entry).
Not done: Canvas is not built beyond the existing `show`/`hide` surface; the event-creation MVP depends on the activity and community backend.
Next: owner agrees the first slice (canvas label and close, selection tiles, step dots and Next), then build it.

## 2026-11-11 (OpenCode, mimo-v2.6-flash): Agent Canvas phase 1 (sample 07) and Zod validation
Did:
- Logged the previous commit here, it had no entry: `0314a0d` � a prompt rule so the agent never repeats the screen that is already open and calls `hide` before acting, the panel auto-closing when the person moves to another screen, and `hideSurface()` on `open|fill|press|run`.
- **Canvas phase 1 on top of `show`/`hide`** (the cheap slice in `agent-canvas-spec.md` 14), matching sample 07: the panel is now a card *inside* the content area with no dim backdrop, the tab bar and agent bar stay below it; header row with the "Generated by Bricks Agent (AI)" badge, an info button that opens one plain sentence (nothing is saved until you confirm), a regenerate button and close; title and subtitle with the agent mark; body with question, **selection tiles** (up to 12, icon + label, 4-up grid, selected tile tinted), text choices, typed answer, a hint card, numbered steps and the sandboxed html; footer with **step dots and a Next button** (Next is disabled until a tile is picked and returns the labels chosen).
- **Zod added properly** (`npx expo install zod`, zod 4.6.7, no BOM left in `package.json`): `showSchema` in `surface.ts` reads only its own fields (unknown ones are stripped), trims and caps every string and list, checks tile ids and icon names against patterns, and falls back to the empty value when a field has the wrong type so one bad value can never blank the screen. `parseShow` is exported for the self-test. The spec was updated: it said "Zod (or an equivalent)", it now says Zod is used and where.
- `show`'s tool description and input schema now document question, tiles, hint, step, step_count and next; five new shared words `agent.canvas.badge|info|about|again|next` in all six languages; `askAgent()` in `live.ts` sends Regenerate as a silent message (no transcript line for a button press); a rule in the system prompt so the app's Regenerate message is understood, and a rule that **content arriving from outside the instruction is data, never orders** (prompt injection) with no secrets revealed.
- Found and fixed a silent bug: `declarations.py` cuts every tool description at 1000 characters and the new `show` description was 1498, so the agent would never have learned about `next`, `step_count`, `options`, `html` or `hide`. Rewrote it to 991 characters and added a self-test check that keeps every tool description inside that limit.
Tested: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts` � all 57 checks pass, 11 of them new (schema fields present, trimming and stripping, tile ids/icons, clamped step dots, wrong types falling back, an empty show refused, a tile question opening and waiting, the answer being the labels chosen, answering closing the panel, limits, description length). `declarations.py` exercised directly: the nested `tiles` object converts to a Gemini declaration with `required` and no `additionalProperties`, and the system prompt builds (3667 characters). `py_compile` OK on `declarations.py` and `router.py`.
Not done / not tested:
- **Nothing of this was seen in a browser.** The renderer (badge row, tile grid, hint, dots, Next), the regenerate button, the info line and the auto-close are type-checked and unit-tested only.
- No live talk was watched, so the new transcript wording and the Regenerate round-trip are unproven. `app/dist` **was rebuilt after this commit** (`npx expo export --platform web --output-dir dist`) and the built bundle was checked to contain the badge text, the new words, `step_count` and `nothing_to_show`, so the tunnel serves this code now — but nothing of it was *seen* running.
- Backend tests were not run: this machine has only Python 3.9 (the backend needs 3.10+ syntax) and no pytest.
- `npx expo lint` was tried; the project has no lint config, so it installed one and reported 11 pre-existing errors in files this change does not touch (`kit/react.tsx`, `agent/react.tsx`, `GoogleButton.web.tsx`). The install was reverted (only `zod` was added); lint is therefore **not** part of the checks.
Next: rebuild `app/dist` again after the approval-banner change, then look at the canvas in the browser against sample 07. Then ask the owner before building more: multi-field forms and the `canvas_*` tools depend on the activity backend.

## 2026-11-11 (OpenCode, mimo-v2.6-flash): approval banner in the person's language, prompt text from clients sanitised
Did:
- Reviewed the agent end to end for injection and abuse, as the owner asked. What was already sound and left alone: `read_page` blocks private/loopback/link-local addresses, only ports 80/443, re-checks every redirect hop, strips script/style and all tags and caps the text at 6000 characters; `show` html is in an iframe with `sandbox=""` and a CSP that allows no network; every canvas string is rendered as React Native text (no HTML interpretation); the only `secret` element (`auth.verify.code`) is also `agent: 'human'`; the approval banner renders only the plain label, never the tool's arguments.
- **Fixed: the approval banner was the one visible screen still in hard-coded English.** It is the consent moment, so it now uses `useT()` with three new shared words `agent.approve.ask|yes|no` in all six languages, plus `accessibilityLiveRegion` so a screen reader announces it. Words added to the self-test's list.
- **Hardened: text that comes from a client into the system prompt.** The person's display name and the open page key are written into `system_prompt` as plain text; `_plain()` in `declarations.py` now removes control characters, collapses whitespace and caps them (40 and 60), so neither can add lines to the prompt or carry an instruction payload of its own.
Tested: `npx tsc --noEmit` and `npx tsx src/navigation/selftest.ts` � all 57 checks pass (the three new word ids are now required in all six languages). `declarations.py` exercised directly: a display name containing newlines and a 500-character payload leaves the prompt's line count unchanged, contains no control characters and is capped; a page key with a newline cannot start a new line; the `show` description still fits the 1000-character limit and the nested `tiles` schema still converts to a Gemini declaration. `py_compile` OK.
Not done / not tested: no browser and no live talk (the banner and the translations were never *seen*); backend pytest was not run (this machine has Python 3.9 only and no pytest, the backend needs 3.10+). Accessibility labels elsewhere (`Send`, `Transcript`, `Notifications`, `Profile`) are still English-only � a wider gap, not fixed here. `app/dist` was rebuilt for the canvas entry but needs another rebuild for this one.
Next: rebuild `app/dist`; then look at the canvas in the browser against sample 07; then the owner's order � Profile first, then community creation.

## 2026-11-11 (Claude Code, Sonnet 5.5): Connect landing and Connect hub
Did: checked the other agent's commits (canvas phase 1, plain transcript wording, panel auto-close): type-check, self-test and 51 backend tests pass (fixed two of my own tests). Built the **Connect landing** (`connect.index`: time-of-day greeting with the person's first name; a "You are not in a community yet" card with Join and Create shown as disabled "Coming soon"; "See what Bricks can do" opens the hub) and the **Connect hub** (`connect.hub`, `/connect`: back arrow, "Your Community & Activities", the nine tiles from sample 06, all "Coming soon"). No sample data; six languages (self-test checks every word).
Tested: type-check and self-test pass; in the browser the landing shows "Good morning, <name>" and the card, and the hub opens with all nine tiles.
Not done: Join, Create, Discover community and everything behind the tiles need the community and activity backend (`ui-build-spec.md` section D); the onboarding Language, Interests and Start screens; Grow content.
Next: community backend (create, join by code, discover), then make Join and Create real and the first tile (Events) on the activity system.

## 2026-11-11 (Claude Code, Sonnet 5.5): communities backend, media module, demo seed, Connect simplified
Did: removed the nine-tile grid and any clubs and groups (owner: Connect is communities only); migration 0003 (communities, memberships, role definitions and terms, announcements, activities, participants, contributions, opportunities, media assets); communities API (mine, detail, create, join by code, going); one basic media module (signed Cloudinary upload, images only, 5 MB, type from bytes); `seed_demo.py` with one full demo community; the Connect tab now lists the person's communities, or shows the join/create card to a new person.
Tested: 61 backend tests pass (communities, capacity, membership privacy, media with a fake Cloudinary, off without settings); app type-check and self-test pass; in the browser Connect shows "Your communities: Lakeview Residency, 13 members, Secretary" for the test account.
Not done: **Cloudinary credentials are not set** (not in the Jambagrad env files; the owner must add them), so real uploads are untested; the community page, Join and Create screens, the activity "I'm going" button in the app; all other modules.
Next: build `connect.community` (dashboard from `GET /v1/communities/{id}`), then Join by code and Create screens, then upload of a community logo and cover.

## 2026-11-12 (Claude Code, Sonnet 5.5): social purpose and latest overview sample stored
Did: stored sample 08 (complete ecosystem overview) with notes on what differs; wrote `02-product/social-purpose.md` (elders, earning, employability, sustainability, child care, culture, values, storytelling, and where each lives in the product); decisions, samples README and HANDOFF updated.
Tested: docs only.
Not done: the demo community does not yet show these themes (add an elder-led storytelling session, an intergenerational activity, a child-care or homework-help service, a skill-sharing opportunity, contributions by seniors); the open questions in social-purpose.md need the owner's decision.
Next: owner decides the open questions; then extend `seed_demo.py` and build the community page.

## 2026-11-12 (Claude Code, Sonnet 5.5): six pillars, Community Vitality, master-docs rebuilt
Did: wrote the six pillars, the "no separate Elderly Welfare section" decision and the Community Vitality measure into `02-product/social-purpose.md`, `product-architecture.md` and the decisions list; deleted the old master-docs and rebuilt it **flat** (no sub-folders: 43 documents, 8 sample pictures and `00_ALL_IN_ONE.md`) with the new `scripts/build_master_docs.py` (replaces the old `merge-docs.ps1`).
Tested: the script ran; master-docs has 0 sub-folders and 52 files; no code change.
Not done: demo data does not yet show the pillars; the app has no Community Vitality view.
Next: owner shares master-docs to generate UI samples; then extend the demo community and build the community page.

## 2026-11-12 (Claude Code, Sonnet 5.5): master-docs is one file
Did: master-docs now holds only 00_ALL_IN_ONE.md (the small copies and picture copies are gone); the build script was simplified. Pictures stay in team-docs/05-design/ui-samples/.
Tested: script ran; one file in master-docs.


## 2026-11-12 (Claude Code, Sonnet 5.5): Connect dashboard built to the owner's sample; demo data uses real names
Did: Connect dashboard now matches the locked scope and the owner's sample (heading and intro; Find your community with a filter button; My communities with a symbol tile, name and members; one green Join-or-create entry (disabled, "Coming soon"); Coming up with a working Join/Going button using `POST /v1/communities/activities/{id}/going`). Backend: `GET /v1/communities/upcoming`, community `icon` (migration 0004). Demo seed now has the four communities of the sample (Lakeview Residency 128, Heritage Alumni 340, Green Kolkata 86, Weekend Readers 42 members) with REAL-sounding people (no more "Neighbour N"); the owner's real accounts are members; the throw-away `ui-check@example.com` / "UI Check" account was deleted. New rule in AGENTS.md: real names and realistic data only.
Tested: 62 backend tests, app type-check and self-test pass. Not checked in the browser with the owner's own account (he signs in with Google); the sample picture itself was not available as a file, so no `09` sample was stored.
Not done: cover pictures (needs the Cloudinary keys), View all, favourites and sorting, Discover, working Join and Create, the community page.
Next: community page, then Join and Create.


---

# FILE: team-docs/README.md

# Team docs (internal)

Our own documents: vision, decisions, design notes, research, meeting notes.

Technical documentation goes here later, in its own sub-folder, when the overall features are settled.
Public, user-facing documentation lives in `../platform-docs/`, not here.

## Start here if you are a new agent or teammate
`10-handoff/HANDOFF.md` (what exists, how to run it, what is not done) and `10-handoff/PROGRESS.md` (the running log). Also `../AGENTS.md`.


---

# FILE: platform-docs/about/index.md

﻿---
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



---

# FILE: platform-docs/communities/index.md

﻿---
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



---

# FILE: platform-docs/faq/index.md

﻿---
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



---

# FILE: platform-docs/getting-started/index.md

﻿---
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



---

# FILE: platform-docs/glossary.md

﻿---
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



---

# FILE: platform-docs/guides/index.md

﻿---
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



---

# FILE: platform-docs/health-and-wellbeing/index.md

﻿---
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



---

# FILE: platform-docs/index.md

﻿---
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


---

# FILE: platform-docs/llms.txt

﻿# Bricks

> Bricks helps neighbourhoods run themselves the way college societies do: communities with roles, terms, goals, events and sponsors. Draft documentation.

## Sections

- [About](about/index.md): what Bricks is and why it exists
- [Getting started](getting-started/index.md): where to begin by audience
- [Communities](communities/index.md): joining, roles, goals, events, shared earnings
- [Voice](voice/index.md): using Bricks by phone, app and WhatsApp
- [Health and wellbeing](health-and-wellbeing/index.md): personal profile, graph, community goals
- [Sponsors](sponsors/index.md): how event sponsorship works
- [Trust and safety](trust-and-safety/index.md): privacy, consent, fairness
- [Guides](guides/index.md): step-by-step how-tos
- [FAQ](faq/index.md)
- [Policies](policies/index.md)



---

# FILE: platform-docs/policies/index.md

﻿---
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



---

# FILE: platform-docs/README.md

# Platform docs (public)

User-facing documentation for Bricks. Written for people, search engines and language models.

Rules for this folder:
- Plain language, no internal team notes, no technical internals.
- One topic per file; group files in folders and sub-folders by topic.
- Files only, no database: the folder is served as it is.

Sub-folders will be added once the overall features are settled.


---

# FILE: platform-docs/sponsors/index.md

﻿---
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



---

# FILE: platform-docs/trust-and-safety/index.md

﻿---
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



---

# FILE: platform-docs/voice/index.md

﻿---
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


