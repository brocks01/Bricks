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
Communities is built on identity and shared life (see `communities.md`), so onboarding will also ask, **only if the person wishes and never inferred**: where they are from (state, city, village, language), what they keep (festivals, faith, traditions), where they live now, and which groups of people they belong with (family, old colleagues, a neighbourhood). These answers pick the circles offered and are never shown outside a circle. Not built yet.
