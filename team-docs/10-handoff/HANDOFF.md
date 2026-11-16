# Wisdom: handoff for the next coding agent

Rewritten 16 Nov 2026. **Keep this file true.** The running log is `PROGRESS.md` in this folder. The documentation before the rewrite described an earlier product (Bricks, a neighbourhood club app) and has been removed (it is in git history).

## 1. What Wisdom is, and the one thing we solve
**Social isolation and loneliness in people who are retiring or retired.** Wisdom connects generations so that nobody spends their later years alone and unasked, and what a lifetime taught reaches those who need it. Belonging is a feeling, built on identity and shared life. The system reaches out (with consent), and serves four feelings: **noticed, needed, expected, remembered**. Read `team-docs/01-philosophy/philosophy.md` first; then `02-product/tabs-requirements.md`.

**Backbone and doors.** The backend is the backbone (relationships, one agent with one memory, notifications). Phone call, WhatsApp, SMS, Telegram and the **app are doors**, each a thin adapter. The app is one door, not the product. We build the backbone and the philosophy first, then add doors one by one.

## 2. Three tabs (the round centre button is Wisdom)
- **Communities (left): belonging.** Circles of identity and shared life (where I am from, what we keep, where I live, who I belong with), our days (festivals), our people (including who is away), taking part from afar, gatherings, a rhythm of repeating events. Hobby groups are a lighter layer.
- **Wisdom (centre): experience for anyone who needs it, free or paid** (the elder's choice), learners of any age 15+, and the next generation supporting the elderly in return.
- **Marketplace (right): market days only**, where people sell what they make or show a skill.
Rule: belonging to a circle is Communities; knowledge or care between people (free or paid) is Wisdom; things for sale and a stall is the Marketplace.

## 3. The owner and how to work with him
Ankit Kumar, final-year B.Tech student. Short, solution-first answers. **He wants discussion before building when a decision is open**; do not jump to code. He tests himself (credits are limited): build, type-check and run the self-checks; do not spend credit on long browser sessions. He allows servers you started to be restarted without asking. Real names and realistic data only in anything he sees. Hard rules are in `AGENTS.md`: never print or commit secrets; never place a call without his go-ahead in that moment; ngrok is his; branch and pull request, never `main`.

## 4. Where things are
`03-technical/architecture.md` (modules, data, how to run, environment names, Twilio setup). Product: `02-product/` (tabs, Communities, Wisdom, Marketplace, people and onboarding, the agent and channels, impact and business).

## 5. Current state (16 Nov 2026)
Built and tested (backend 297 tests; app type-check, self-test and lint clean):
- Onboarding and profile in the backend, answerable by app, call or chat; accounts from any channel; the loneliness check; consent.
- **Communities:** the rhythm layer (events, check-ins, repeating events, standing, nudges, suggestions) and, new, a circle's feeling, audience (open, men, women) and import from a host (backend).
- **Wisdom:** experience capsules in three domains (cultural, social, professional), offers free or paid with a price note and a domain, requests to learn, **support requests** (an elder asks for a hand), introductions, sessions, monthly numbers, agent skills.
- **Marketplace:** nearby opportunities hosted by others (hosts, kind, intents earn/contribute/volunteer/enjoy, import) including market days with stalls and repeats; and (app team) the services listing with bookings, which still sits in this tab and moves to Wisdom.
- The agent on every channel with 56 skills; an outbox with preferences and quiet hours; the in-app inbox; spam limits.
- App: the round Wisdom button with Communities and Marketplace by profile, onboarding, Wisdom tab and forms, notifications, Connect chats, market days, repeat chooser, standing card, suggestions; six languages (first drafts); the green leaf logo and the name Wisdom.
Backend 303 tests. Not live-tested: a real phone call, WhatsApp, SMS, and the newest app screens in a browser.

## 6. Next, in order (backend first)
1. **Communities, the rest of the belonging layer:** the app for choosing a circle's feeling and audience and for the gender prompt when joining; a festival and ritual calendar, presence ("away", "remembered"), taking part from afar (voice blessing to the circle, live join by call), the circle's stories.
2. **Wisdom:** proof and endorsements on an offer; discovery by life stage, language and city; the first conversation through the agent; limits on advice for sensitive topics; **move the services listing from the Marketplace into Wisdom**.
3. **Marketplace:** hosts list their own opportunities (today platform admins create and import them); a form to make one from the app; weekly milestones before a market day; remove the services listing once it has moved.
4. Then the doors one by one (phone first, then WhatsApp, SMS, Telegram, app).
5. Moderation and reporting; helper verification before any in-person meeting; WeChat adapter; native-speaker review of the Hindi, Bengali, Tamil, Chinese and Malay words; rename of the repository folder, the Expo slug and the `X-Bricks-On-Behalf` header (together).
6. Apply migrations to the owner's hosted database when he says so. Nothing here is committed or pushed until he asks.

## 7. Testing notes
Backend tests need the local database and `backend/.env`. One test, `test_health_home.py::test_walks_are_saved_listed_and_totalled_by_week`, depends on the time of day and sometimes fails; it is unrelated to new work. Tests close sign-up by default (`tests/conftest.py`); tests that need it open it themselves.
