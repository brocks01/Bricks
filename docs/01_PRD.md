# PRD — Bricks

Version 2.1 · 10 Nov 2026 · Owner: Product (whole team) · Status: Draft for hackathon build

---

## 1. Summary

Bricks helps people aged 50+ in Singapore (and later India) age well by **contributing, staying active and staying connected**. It works through three channels that share one backend:

1. **Mobile app** — for the 50–70 group who are comfortable with smartphones.
2. **WhatsApp** — for anyone who already chats on WhatsApp but won't download a new app.
3. **Phone call** — for the least tech-comfortable; no internet needed.

The app has three pillars: **Pass It On** (skills and contributions), **Kampung** (community), **Thrive** (health and safety). A **voice helper** and a **Read It Out** button work on every screen, in **English, Malay, Mandarin and Tamil**.

## 2. Problem

From the raiSE brief and our research:

- Singapore became super-aged in 2026 (21.4% of citizens 65+; more than 1 in 4 by 2035). India's 60+ population is ~149M, heading to ~347M by 2050.
- **Seniors are connected but disengaged.** ~89% own smartphones, yet loneliness is common; heavy screen time is now a concern in itself.
- **Men stay away.** Women are ~two-thirds of Active Ageing Centre participants; men can be ~20% at some centres. Men's identity is tied to work, so retirement removes role, routine and friends at once.
- **Programmes are recreational, not purpose-driven**, and depend on paid staff and volunteers, so they're costly to scale.
- **Solutions are designed for seniors, not with them.** Seniors are treated as recipients of care.
- **Safety worries** (falls, living alone, scams) keep families anxious and seniors at home.

## 3. Our insight

> The same people who give a senior **purpose** — their community — are the people who can keep them **safe**. And the best time to build that community is **before retirement**, not after.

## 4. Goals and non-goals

### Goals (hackathon)
- G1. A working P0 app a senior can use **without help** after one demonstration.
- G2. One backend serving app, WhatsApp and phone call.
- G3. A live demo: judge scans QR → gets the WhatsApp check-in → joins a walk; call the number on stage → set a reminder by voice; SOS alerts family.
- G4. Evidence of desirability: filmed senior testimonials and usability tests.
- G5. A credible, self-sustaining business model and impact KPIs (output + outcome).

### Non-goals
- No in-app chat (we hand off to WhatsApp groups).
- No medical diagnosis, monitoring claims or medical devices.
- No ads, no payments inside the app for the hackathon.
- No one-to-one babysitting or home services involving children.
- No open-ended "AI companion" chatting.

## 5. Users and personas

| Persona | Age | Channel | Needs | Quote to design for |
|---|---|---|---|---|
| **Raj** — pre-retiree engineer | 59 | App | Wants purpose after work, keep fit, share what he knows | "I'm not old. I just don't want to sit at home when I stop working." |
| **Mdm Tan** — retired hawker, lives alone | 78 | WhatsApp + calls | Company, gentle routine, someone to notice if she's unwell | "I don't want to download anything. Just call me." |
| **Priya** — Raj's daughter, works long hours | 32 | App (family) | Peace of mind; easy way to set up her father/grandmother | "I want to know Dad's okay without nagging him." |
| **Mr Ahmad** — Residents' Committee / centre admin | 62 | App (admin) | Bring 50 residents in at once; see who needs a check-in | "I don't have staff. I need something that runs itself." |

**Primary hackathon persona: Raj (app) + Mdm Tan (WhatsApp/calls).**

## 6. Channels

| Channel | Who | P0 capabilities |
|---|---|---|
| App | 50–70, tech-comfortable | Everything in §7 |
| WhatsApp | Anyone on WhatsApp | Onboarding, daily check-in (Yes/No buttons), event invites + group link, reminders, weekly progress card, "HELP" SOS |
| Phone call | Least tech-comfortable, 75+ | Call-in: hear today's plan, join events, set reminders, check-in, SOS. Call-out: check-in calls, reminders, missed-check-in follow-up |

All channels read and write the **same user profile and memory**. Escalation order for anything that needs attention: **App notification → WhatsApp → Phone call → Family alert**.

## 7. Features

Priority: **P0** = must work in demo · **P1** = built if time allows, at least mocked · **P2** = roadmap / pitch only.

### 7.1 Onboarding — "Who is setting up?"

| ID | Feature | Pri | Description |
|---|---|---|---|
| ON-1 | Language first | P0 | First screen: 4 big buttons in their own script: English · Bahasa Melayu · 中文 · தமிழ் |
| ON-2 | **Path A: Myself** | P0 | Sign in (Singpass mock / Google) → helper asks name, area, interests (voice or tap) → Safe Circle (skippable) → Home |
| ON-3 | **Path B: My family** | P0 | Family member signs in → "Add my parent" → enters name, phone, language, interests → senior gets invite (WhatsApp/SMS) → **senior taps Yes** to activate |
| ON-4 | **Path C: My community/centre** | P1 | Admin registers organisation → adds members via list upload, QR at a session, or WhatsApp join link → each senior confirms → auto-joined to org Circle |
| ON-5 | Consent always | P0 | No account active until senior says Yes (voice or button) |
| ON-6 | Duplicate merge | P1 | Same phone/Singpass = one profile, whoever invited |
| ON-7 | Finish later | P0 | Every step skippable; reminder later |

### 7.2 Home

| ID | Feature | Pri | Description |
|---|---|---|---|
| HM-1 | Greeting + Today card + three pillars | P0 | "Good morning, Raj" + check-in / next event / next reminder, then Pass It On, Kampung and Thrive as three large cards with one plain line each |
| HM-2 | Persistent controls | P0 | (speaker icon) Read It Out (top), (alert icon) Help (top-right, red), (mic icon) Tell me (bottom-centre), 4 tabs (Home · Pass It On · Kampung · Thrive); Back on its own row under the top bar |
| HM-3 | Simple Mode | P1 | One toggle (family can set): app shrinks to 3 buttons — **Today · Talk · Help** |

### 7.3 Kampung (community) — centre tab, build first

| ID | Feature | Pri | Description |
|---|---|---|---|
| KP-1 | **Happenings** | P0 | Events feed (walks, classes, meetups); big cards; tap → details → **I'm going** |
| KP-2 | **My Circles** | P0 | Neighbourhood / interest / centre groups; each has **Join WhatsApp group** button |
| KP-3 | **Start Something** | P0 | Create event in 3 steps (what, when, where) by voice or tap |
| KP-4 | **Kampung Captains** | P1 | Leaders host events, see who's coming, badge on profile |
| KP-5 | **Thinking of You** | P1 | Member absent 2 weeks → gentle nudge to captain/friends |
| KP-6 | **Family Bridge** | P0 | Family link; family can view (with consent) and join events |
| KP-7 | **Weekly Joy Report** | P1 | Positive weekly summary to family; senior controls what's shared |
| KP-8 | Ask Grandpa | P2 | Family sends a question; senior answers by voice → becomes a Life Story |
| KP-9 | Circle recommendations | P2 | Suggest circles from interests |

### 7.4 Thrive (health & safety)

| ID | Feature | Pri | Description |
|---|---|---|---|
| TH-1 | **Good Morning Check-in** | P0 | Daily yes/no ("Moved today?"). Works in app, WhatsApp, call. Streak + gentle nudges (2→3→4 days/week) |
| TH-2 | **Walk With Me** | P0 | A "No" turns into an invite to a nearby group walk; one tap joins event + WhatsApp group |
| TH-3 | Streak & weekly bar | P0 | Simple 7-day bar; celebrate, never scold |
| TH-4 | **Gentle Reminders** | P0 | Medicines, appointments, events; read aloud; family can set |
| TH-5 | **Safe Circle SOS** | P0 | Help button / say "Help" / volume ×3 → offer **call 995** (SG) / 112 (IN) → alert family + nearest helpers with live location → helpers tap "I'm on my way" |
| TH-6 | **Are You OK?** | P0 (missed check-in) / P1 (fall) | Missed check-in or fall → "Are you OK?" countdown → reminder → call → family alert |
| TH-7 | **Move Along** | P1 | **Android only.** Camera warm-ups (seated knee extension, sit-to-stand with a chair) using Sayan's RightPosture engine: rep counting, one tip at a time in the user's language, safety stop. Runs on the phone; only the summary is saved. iPhone: camera-free guided warm-up. Light exercise only, never "therapy" |
| WK-1 | **My Walks — record a walk** | P0 | One big **Start walk** button → live screen with 3 large numbers (time, distance, steps) + map line → **Finish**. GPS + phone step counter. Auto-pause when stopped. Works for solo walks and for Kampung group walks |
| WK-2 | **Walk summary (Strava-style)** | P0 | After finishing: route map, distance, time, steps, average pace (min/km), splits per km (simple bars), "who walked with you", "Well done" message; read aloud |
| WK-3 | **Walk history & trends** | P1 | List of past walks; this week / this month totals (distance, walks, active minutes); simple bar charts; comparison with last week in friendly words ("1.2 km more than last week") |
| WK-4 | **Personal bests & milestones** | P1 | Longest walk, most steps in a day, 10 walks done, first 5 km week — shown as clean badges, never pressure |
| WK-5 | **Group walk feed & cheers** | P1 | In each Circle: recent group walks with route + who joined; members tap **Cheer** (like Strava kudos) or leave a voice cheer |
| WK-6 | **Home privacy zone** | P0 | Start/end of every route hidden within ~200 m of home, so shared maps never reveal where a senior lives |
| WK-7 | **Safe walk sharing** | P1 | Optional: share live location with Safe Circle during a walk until "I'm home" |
| WK-8 | Favourite routes | P2 | Save and reuse routes; see popular neighbourhood routes |
| TH-9 | My Health Card | P1 | Blood group, conditions, medicines, contacts; private; family-managed |
| TH-10 | Scam Shield | P2 | "Ask my family before I pay" prompt on suspicious messages |

### 7.5 Pass It On (skills & contributions)

| ID | Feature | Pri | Description |
|---|---|---|---|
| PO-1 | **My Story** | P0 | 10-second voice intro, "Ask me about" tags, verified tick |
| PO-2 | **What I Can Share** (services) | P0 | Skills offered, availability, place; optional free/paid toggle (off by default) |
| PO-3 | **What I've Given** (contributions) | P0 | Auto-counted: sessions taught, people helped, events hosted; badges |
| PO-4 | **Teach & Learn** | P0 | Offer a session → it becomes a Kampung event |
| PO-5 | **Thank-You Wall** | P0 | Endorse with one tap (thumbs-up icon) or a short voice thank-you; **only attendees can endorse**; no public negative ratings |
| PO-6 | **Little Ones** | P1 | Storytime, homework help, grandparent circles — **group, public place, parent present/sign-in** |
| PO-7 | **Life Stories** | P1 | Voice storytelling with transcript |
| PO-8 | Earnings | P2 | Paid sessions (decided by survey) |

### 7.6 Profile

| Section | Visible to | Contents |
|---|---|---|
| Header | Everyone | Photo, name, area, languages, voice intro, verified tick, "Ask me about" tags |
| **What I've Given** | Everyone | Contribution counters, timeline, badges, thank-yous |
| **What I Can Share** | Everyone | Service cards with skill-specific endorsements ("Endorsed for Tai Chi by 12 people") |
| Private | Senior + family | Health Card, Safe Circle, family links, language, Simple Mode, privacy |

### 7.7 Everywhere

| ID | Feature | Pri | Description |
|---|---|---|---|
| EV-1 | **Read It Out** | P0 | Speaker button on every screen; reads where you are → content → what you can do; pause/repeat/slower; highlights text being read |
| EV-2 | **Voice helper ("Buddy")** | P0 | Tap mic → navigate, today's plan, join events, check-in, reminders, progress, SOS. Shows each action on screen; confirms changes |
| EV-3 | **4 languages** | P0 | All UI, voice, WhatsApp, calls, notifications. User-created content shows original + Translate |
| EV-4 | Large type + big targets | P0 | See `02_DESIGN_PRINCIPLES.md` §5 |
| EV-5 | Undo | P0 | Big Undo after every action |
| EV-6 | Clean, emoji-free visual design | P0 | One icon set, one accent colour, real local photos, SGDS-level accessibility; each screen follows its reference app in `02b_SCREEN_DESIGNS.md` |

## 8. Key user stories (acceptance tests for the demo)

1. **As Raj**, I can open the app, choose Tamil, sign in, and say my skills out loud — in under 3 minutes, without help.
2. **As Raj**, when I answer "No" to the morning check-in, I see a walk near me and can join it and its WhatsApp group in **2 taps**.
3. **As Mdm Tan**, I get a WhatsApp message each morning and answer with one button. If I don't answer, I get a call.
4. **As Mdm Tan**, I can call a number and say "remind me to take my medicine at 8" and it works.
5. **As Priya**, I can set up my father's account from my phone and add myself to his Safe Circle.
6. **As anyone**, when I press Help, I'm offered 995, and my family and the nearest helper get my location within 10 seconds.
7. **As Mr Ahmad**, I can show a QR code at a session and 20 residents can join our Circle.
8. **As an attendee**, after Raj's chess session I can leave a voice thank-you that appears on his profile.
9. **As any user**, on every screen I can tap Read It Out and hear it in my language.
10. **As Raj**, I can tap **Start walk**, walk around the park, tap **Finish**, and see my route, distance, time and steps — and hear them read out — without any setup.
11. **As a Circle member**, after a group walk I see it in the Circle feed with everyone who joined and can tap **Cheer**.

## 9. Success metrics

### Output KPIs (what we produce)
- Weekly active users by channel (app / WhatsApp / call)
- Check-in response rate; check-in streak length
- Events created and attended; % attended that were created by seniors
- Sessions taught; endorsements given
- % of male users; % of users joining via family/admin
- SOS response time (alert → first helper "on my way")

### Outcome KPIs (what changes in their lives) — measured at onboarding, 4 weeks, 12 weeks
- **Loneliness:** UCLA 3-item scale
- **Purpose:** Ryff purpose-in-life items
- **Wellbeing / quality of life:** WHO-5
- **Physical activity:** days active per week (from check-in + steps); weekly walking distance and active minutes from My Walks; % of walks done with others

Link to evidence for pitch: social isolation, physical inactivity and depression are Lancet 2024 modifiable dementia risk factors; higher purpose in life associated with ~28% lower risk of cognitive impairment (association, not causation).

### Hackathon success
- 5 seniors complete the P0 flows on video; ≥4 can do the check-in → join walk flow unaided.
- Live demo runs end-to-end 3 times in a row without failure.

## 10. Business model (to validate)

| Who pays | What | Why they'd pay |
|---|---|---|
| Seniors | **Free** core (community, skills, check-in, basic SOS) | Accessibility & affordability (brief A5–A6) |
| Families | **Peace of Mind tier**: fall alerts, call check-ins, Weekly Joy Report, remote reminders, multiple Safe Circle helpers | Families already pay for eldercare services |
| Employers | Pre-retiree **retirement-transition wellness** programme | Fits 50–60 target; HR wellness budgets |
| Centres / RCs / societies | Admin dashboard, reports, group onboarding | Saves manpower; reporting for funders |

Rejected: ads (scam risk), donations (not sustainable).

## 11. Constraints (from brief)

- Low funding; must run without paid staff (peer-run captains, self-service onboarding).
- Literacy & language → voice + 4 languages + Read It Out.
- Connectivity → phone-call channel needs no internet.
- Regulation → PDPA (SG), DPDP Act (IN); no medical claims; child safeguarding; Singpass needs a registered org (mock for demo).
- Existing systems → WhatsApp groups, 995/112, AACs as partners not competitors.

## 12. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Too many features ("building a Play Store") | Strict P0/P1/P2; demo one connected story |
| Seniors find it too complex | Usability tests with seniors before 12 Nov; Simple Mode; voice everywhere |
| WhatsApp API access delayed | Twilio WhatsApp sandbox for demo; pre-registered judge numbers |
| Phone call costs | Calls only for users who choose them; WhatsApp default |
| SOS false alarms / liability | Countdown + cancel; always offer 995 first; wording "alerts", never "monitoring" |
| Child safety | Group sessions in public places only; Singpass-verified hosts; endorsements |
| Privacy of family sharing | Senior chooses what's shared; admin cannot see health/Safe Circle |
| LLM mistakes | Agent can only call fixed tools; confirm every change |
| "Another AI app" perception | Don't brand as AI; lead with community and safety |

## 13. Mapping to raiSE baseline checklist

| Checklist | Covered by |
|---|---|
| A1 holistic, A11 overlapping problems | Three pillars + Safe Circle |
| A2 active | Thrive: check-in, Walk With Me, Move Along |
| A3 contribute, A9 purpose | Pass It On, Captains, Little Ones |
| A4 SG + India | Same model; 4 languages incl. Tamil; Hindi later |
| A5 affordable, A6 accessible | Free core; voice; calls without internet |
| A7 motivating | Streaks, thank-yous, badges, Joy Report |
| A8 men | Skill/role-based contribution, captains, practical activities |
| A10 low manpower | Peer captains, self/family/admin onboarding, automated check-ins |
| A13 customised | User memory per person; channel preference |
| A14 commercial | §10 |
| B1–B6 | Pitch slides map each pillar to intentionality, additionality, proportionality, desirability, feasibility, viability |
| C1–C3 novelty, scan | Differentiators: pre-retirement onboarding, check-in → community action, community-powered safety, 3 channels one backend |
| E1–E3 | Pain points (§2), impact (§9), validation (testimonials, usability tests, family/employer interest) |

## 14. Open questions
See `00_README.md` → "Still open".
