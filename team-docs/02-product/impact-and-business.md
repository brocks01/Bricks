# Impact, safety and sustainability

## Why this fits the raiSE framework
- **Intentionality:** the whole product is built to move older people from isolation to contribution and to give young people someone to ask.
- **Additionality:** Active Ageing Centres offer recreation; befriending services keep company; a mentoring platform serves careers. None does all four: stay active near home, give back to the next generation, work towards something, and tell centres what people actually want.
- **Proportionality:** a phone call, a chat and a small app, with no hardware and no staff in the loop for the first conversations.

**The one headline number is loneliness: a person's three-question score at the start and at 3 and 6 months.** Showing up, conversations and market-day stalls are the leading signs. Money is never the measure.

## What we measure (all private to the person; groups only in aggregate)
| Measure | How |
|---|---|
| Weekly active retirees | check-ins and conversations |
| Showing up | check-ins per month, streaks, standing levels |
| Mentor matches | introductions asked, accepted, sessions logged, "calls and people helped" per month |
| Market days | stalls taken, people going, repeats held |
| Loneliness | UCLA 3-item score at the start and at 3 and 6 months (3 to 9, lower is less lonely) |
| Men's share | optional gender answer, shown only in groups of five or more |
| Pilot reach | people who joined through an employer or centre (the "referral" answer) |
Reports: `GET /v1/insights/pilot` and `GET /v1/insights/interests?area=` (platform admins). **No group under five people is ever shown**, and the interest report counts only people who agreed to "insights".

## Safety and privacy
- **Consent at the start:** privacy and terms are required; memory, family sharing and insights are separate yeses with dates. PDPA (Singapore) and DPDP (India) compliance is the standard we design to.
- **Stories private by default**; first names only to people not yet connected.
- **The other side decides** every introduction; learners confirm they are 15 or older; contact is through Wisdom first; meeting in person is later and only with extra checks.
- **No medical claims.** The agent never diagnoses or advises on medicine.
- **No money held.** Payment is always direct between people.
- **Trust and limits on advice.** A person's offer shows their own proof (field, years, where), endorsements and counted conversations. Experience is not professional advice: the system never gives medical, legal or financial advice, and on sensitive topics (pregnancy, health, money, law) tells the learner to see a qualified person.
- **Spam limits** on every channel (see `agent-and-channels.md`). **Moderation, reporting of stories and helper verification are not built yet** and must exist before any large pilot.

## Pilot plan (from the pitch deck)
Three months in Ang Mo Kio. Month 1: 50 retirees onboarded through one employer and one Active Ageing Centre. Month 2: 20 mentor matches with students from one university. Month 3: the first market day, run inside the centre's own event. Then more estates, and Wisdom between Singapore and India.

## How it stays running without grants
Retirees and employers pay nothing. Revenue comes from (1) **Active Ageing Centres paying for insights** about what people near them chose against what they ran (free until turnout goes up), (2) possibly, later, a small fee on paid guidance, only if it can be taken without the platform holding people's money (at first there is **no fee** and payment is direct between the two people), and (3) a small fee on market-day stalls. Insights are anonymous counts, never names.

## Risks we know about
Cold start (mentors first, through employers and centres; learners through universities); older people not using an app (onboarding by voice, centres help with setup, then reminders do the work); strangers meeting (the safety rules above); data protection (consent, aggregation, no sale of data); and quality of translations (the six languages are first drafts and need native-speaker review).
