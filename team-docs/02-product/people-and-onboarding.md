# People, profiles and onboarding

## Who we build for
- **Uncle Tan, 62.** Retrenched after forty years as an engineer. His first Monday at home. He is still sharp, has friends and interests to build on, and nobody asks him anything any more. He needs a reason to leave the house and someone who asks for his experience.
- **Priya, 21.** A student choosing a career. She has the internet but no one who has lived the work. She wants to ask and to be answered in her own language.
- **Arjun, 24, in Chennai.** Wants to start in civil engineering. Wisdom crosses the border from day one: a mentor in Singapore, a learner in India, or the other way round.
- **An expecting parent, 30.** Wants to hear from someone who has been through pregnancy and the first years. Wisdom's learners are **anyone 15 or older**, not only the young.
- **A retired mechanic, 64.** Thirty years at a car company. Nobody asks him anything now; a graduate wants to enter the industry. He can guide, free or paid.
- **Someone far from home.** From Bihar, in Singapore, missing the community that is celebrating Chhath without them. Belonging is a feeling, and it needs identity and shared life, not only interests.
- **A family member** who looks after a parent and wants to know they are all right, with the parent's consent.

## One front door, anywhere
A person can reach Wisdom first from a **phone call, WhatsApp, text message, Telegram or the app**. Whoever arrives first gets an account (one backend function, with no email needed), the agent welcomes them and asks what to call them, and **onboarding** continues on whichever channel they like. They can add an email later and sign in to the app.

## What decides what a person sees
Two things: who they are (age group, language, country) and **what they came to do** (roles; more than one allowed).

| Role | Meaning | Parts of Wisdom shown |
|---|---|---|
| `connect` | stay connected and active | Communities, Marketplace, health, calendar |
| `share` | share what I know | Wisdom (my experience), Marketplace (freelance) |
| `learn` | learn from experienced people | Wisdom (experience and mentors) |
| `help` | help older people | Wisdom (who needs help) |
| `care` | look after someone I love | family circle |

Everyone also has `home` (Today), `agent` and `profile`. The surfaces are the **union** of the roles. Until someone chooses, their age gives a start (60+: connect and share; 40 to 59: care and learn; under 40: learn and help). The app never hard-codes this: it asks `GET /v1/profile`, which also returns `focus` (serve, learn, both, connect) and `wisdom.parts` / `wisdom.default`.

## Onboarding (the steps live in the backend)
Sections can be answered in any order and in parts, from the app, a call or a chat. Only **about you**, **what you want here** and **your say over your information** are required.

| Section | Required | When | Asks |
|---|---|---|---|
| basics | yes | always | name, language, age group, country, area, languages spoken, (optional) gender, (optional) which employer or centre invited you |
| purpose | yes | always | the roles |
| consent | yes | always | privacy and terms (must be yes); remember what I tell it; family may see my day; **insights** (use my interests, without my name, to help centres plan) |
| channels | no | always | phone, preferred channel, voice or text, bigger text |
| share | no | role share | field, years, skills, how to share, free or paid, availability |
| help | no | role help | what they can help with, areas, times |
| learn | no | role learn | "I am 15 or older", topics, goal |
| care | no | role care | who they look after, emergency contact |
| rhythm | no | always | wake and sleep time, living situation, interests, three-month vision |
| wellbeing | no | always | three questions on feeling connected (UCLA 3-item loneliness scale), asked at the start and again at 3 and 6 months |
| access | no | role connect | hearing, eyesight, walking (simple only, no diagnoses) |

Answers already given in the app's first setup (name, age group, area, languages) are never asked twice. Endpoints: `GET /v1/onboarding`, `PUT /v1/onboarding/{section}`, `POST /v1/onboarding/{section}/skip`, `GET /v1/profile`. Skills: `onboarding_next`, `save_answer`, `give_consent` (needs a clear yes), `skip_section`, `my_profile`, `wellbeing_check`.

## Decisions
Health: only simple access questions, nothing diagnostic. Helper verification (young people who help in person) is a later, careful build; the first build is phone-only. Rules and data are in `backend/app/modules/onboarding` (`rules.py` is the data; `service.py` the logic; `wellbeing.py` the check).

## Belonging questions (planned, opt-in)
Communities is built on identity and shared life (see `communities.md`), so onboarding will also ask, **only if the person wishes and never inferred**: where they are from (state, city, village, language), what they keep (festivals, faith, traditions), where they live now, and which groups of people they belong with (family, old colleagues, a neighbourhood). These answers pick the circles offered and are never shown outside a circle. The first part of this is now built (see Status below).

## Status (updated 16 Nov 2026)

Built in the Onboarding and profile area:
- Belonging questions: optional `belonging` section (where I am from, what I keep, where I live now), opt-in, never inferred, never shown outside a circle; `rules.rank_circles` and `service.rank_circles` for other areas to rank circles by fit; tests pass.
- Gender question: clear, kind, with the honest reason (men-only and women-only circles), skippable; `why` field on questions, shown in the app and the agent skill.
- Profile settings: per-person quiet hours (`quiet_from`, `quiet_to` in the channels section) plus `service.quiet_hours(conn, me)`; preferred channel already worked; app settings row for preferred channel, quiet hours and clearing them; the daily check-in switch calls `set_daily_checkin`/`stop_daily_checkin` via `/v1/skills` and shows state from `GET /v1/onboarding/checkin`.
- Agent's onboarding polished: one question at a time, only the three needed parts, every optional part skippable, warmer `hint()` within the memory's 380 characters.
- Interests step: optional `interests` section with the fixed keys (walking, taichi, cooking, chess, music, gardening, teaching, tech), saved on the account and readable from `GET /v1/me` and `GET /v1/profile`; the app shows it as big tiles, two per row.
- Languages in full words: app-language cards and the 23 spoken languages as big cards, two per row; every option and button declared in `definePage`.
- "Who is setting up?" screen near the start (Myself / My family / My community or centre, the last disabled with "Coming soon"); choice on the device; `who: family` goes to `family.create` at the end. No Help button added.
- Ten-second voice intro: optional step with record / stop / play / record again, next and skip; upload through `/v1/media/upload` (sound now accepted, kind `voice_intro`, 503 is not blocking); address stored on the account (`voice_intro_url`).
- OTP shown on screen for a demo deployment: `DEMO_SIGNIN_OTP` (name added to `.env.example`, default off); the code is returned and shown at the top of the verify screen, ready to fill, with the real email still sent and all rate limits unchanged.
- Text size: Small / Normal / Large in Settings (the row was already there).
- Welcome at the end of onboarding opens `connect.pick` when it has open communities to join, otherwise the person's first tab.

Needs from Doors: read the person's own quiet hours (`service.quiet_hours`) in `channels/outbox.py` `next_ok_time`, falling back to `WISDOM_QUIET`; a `my_checkin` skill or a field on `/v1/me` would let the Settings switch show the truth for a person who turned the check-in on from a call (the switch currently reads the row directly).

Needs from Wisdom: `Question` in `app/src/api/wisdom.ts` has a `why?: string` added locally via a cast; a real field there would be tidier.

Migrations: `0100_profile_interests_voice.sql` (users.interests, users.voice_intro_url, media_assets kind). Tests: `test_onboarding*.py` pass; app tsc, selftest and expo lint to be confirmed.
