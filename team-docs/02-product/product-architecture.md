# Product architecture (final, 11 Nov 2026)

Finalised with the owner after two rounds of discussion. **This replaces the earlier proposals** (three domains Connect / Grow / Thrive; four tabs Community / Activities / My Life / Profile). If anything else in the docs disagrees with this page, this page wins.

## The idea in one line
**Connect. Grow. Participate.** Bricks is a club system for neighbourhoods, run the way college societies run. A community can organise almost anything, the way a college society organises events, competitions, workshops, training, cultural programmes and fundraising.

One identity · one community ecosystem · one personal journey · one intelligent agent. We do **not** build four apps (a community app, a health app, a job portal, an AI assistant).

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
