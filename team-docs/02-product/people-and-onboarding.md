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

## Status (17 Nov 2026, revamp v2 A3)

**Onboarding in the app, screen for screen like the ten reference pictures** (`team-docs/12-revamp/reference/01` to `10`; the comparison table is in `12-revamp/person-a/LOG.md`): choose your language (six) → text size (Small, Normal, Large; applies at once) → who is setting up (Myself, My family, My community or centre "Coming soon") → sign in (Continue with Singpass: a mock that always signs in Uncle Tan; Continue with Email: a code by email; Try it as someone new: a demo account) → name (step 1 of 3) → where you live (2 of 3) → what you enjoy (3 of 3) → would you like to teach or share (Yes picks skills and turns the Wisdom tab on) → your voice (ten seconds, optional) → how to remind you (app or a call; WhatsApp "Coming soon") → welcome → choose communities (once, while there is room) → **Home**. Reopening in the middle resumes at the right step (what the server already has decides). A signed-in person who has finished lands on Home, also when they open a sign-in or onboarding page later. On purpose different from the pictures: no red Help button; no "Read it out", "Say it instead" or "Buddy" buttons (the one floating agent mic reads, answers and presses on every screen). The questions still come from the backend sections (`basics`, `interests`, `channels`, `consent`, `purpose`), so a call or a chat can answer them too. The six-screen flow of 16 Nov (Welcome, Singpass, an assistant chat, Check your profile, All set) is removed.

**The profile** (`me.index`, from the avatar; one column, the floating Back button, no bottom bar): the profile card (initials, the name, and how they signed in: "Signed in with Singpass" with the logo, or email, Google, a demo account; from `signed_in_with` on `GET /v1/me`, kept per session in `refresh_tokens.method`, migration `0101`); **Your details**, one big row per onboarding answer with its value in words (language, text size, name, where you live, what you enjoy, your voice, reminders, what you can share) and then the older details (age group, phone, languages you speak); each row opens its own edit screen (`me.field`, `/profile/[field]`), drawn with the same body as its onboarding step (`features/onboarding/bodies.tsx`), with Save, "Saved" and back; **Sign out** asks "Sign out of Interchange on this phone?" with Yes and No, then returns to the first onboarding screen; **More**: your communities, health, emergency numbers, messages, quiet hours and the daily check-in, read aloud, reminder calls, My host (host members only), and the other pages. `me.edit` (Edit profile) now opens the profile.

**Still true from 16 Nov:** the optional belonging questions and `rank_circles`; the gender question with its honest reason; per-person quiet hours and the preferred channel; the interests step's fixed keys on the account (`GET /v1/me`, `GET /v1/profile`); the voice intro upload (`voice_intro_url`); `DEMO_SIGNIN_OTP` shows the email code on screen for a demo deployment.

**Tested (17 Nov):** in the browser at 390 wide, a new person through every screen to Home; a reload mid-flow resumes; the browser's back button on the first screens; Singpass lands Uncle Tan on Home; on the profile, editing where you live is still there after a reload, text size applies at once, Sign out asks and No keeps the person in. Backend: `test_identity_signed_in_with.py` (3) passes. App: `tsc`, `expo lint` and `selftest.ts` clean.
**Not tested:** recording a voice (needs a microphone), a real email code, the five other languages on screen, the largest text size, a real phone.

Needs from Doors: read the person's own quiet hours (`service.quiet_hours`) in `channels/outbox.py` `next_ok_time`, falling back to `WISDOM_QUIET`; a `my_checkin` skill or a field on `/v1/me` would let the check-in switch show the truth for a person who turned it on from a call.

Still open from Wisdom: `Question` in `app/src/api/wisdom.ts` has no `why` field; the app reads it through a cast.

Migrations: `0100_profile_interests_voice.sql`, `0101_sign_in_method.sql`.
