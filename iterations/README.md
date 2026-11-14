# Iteration Docs — Bricks

Version 2.0 · 10 Nov 2026 · Built from `docs/00`–`docs/07` (v2.1)

The iterations are split by **implementation track**. Each track follows its plan doc, and every iteration has its own detailed file using the **shared iteration numbers** from `docs/07_PROJECT_WORKFLOW.md`, so "1.2" means the same evening in every track.

| Track | Folder | Source plan |
|---|---|---|
| **Mobile app** | [app/](app/README.md) | `docs/04_APP_PLAN.md` |
| **Voice helper + phone calling agent** | [voice-call-agent/](voice-call-agent/README.md) | `docs/05_VOICE_CALL_AGENT_PLAN.md` |
| **WhatsApp channel** | [whatsapp/](whatsapp/README.md) | `docs/06_WHATSAPP_PLAN.md` |
| **Migration into the shared repo** | [migration/](migration/README.md) | The two-codebase comparison (15 Nov 2026); its own M0.1–M4.2 numbering, not the shared calendar below |

> If an iteration file and a source doc disagree, the **source doc wins**. Fix the iteration file and post a note in the group.

## Iteration calendar (same for all tracks)

| Phase | Iteration | When (SGT) | App | Voice / calls | WhatsApp |
|---|---|---|---|---|---|
| 0 Foundations | 0.1 | Tue 10 Nov, 9 pm–midnight | Project skeleton | Accounts + hello-world call | Access (Meta, sandbox) |
| | 0.2 | Wed 11 Nov, morning | Core components + gallery | System prompt, tool schemas, distress list | Webhook + router + echo bot |
| 1 Clickable app | 1.1 | Wed 11 Nov, day | Home + Kampung | Translations wave 1 | 12 templates in English |
| | 1.2 | Wed 11 Nov, evening–night | Thrive + Safety | Translations wave 2 + call prompt files | Templates translated + submitted |
| | 1.3 | Thu 12 Nov, until 12:00 | Onboarding + Pass It On + speech (**filming build**) | Translations wave 3, Buddy keywords, inbound loop (English) | Onboarding + invite acceptance |
| 2 Real system | 2.1 | Thu 12 Nov, afternoon–night | Wire to the backend | Real `/assistant/turn` | Check-in + event flows |
| | 2.2 | Fri 13 Nov, day | Real features + Move Along shell | Calls in 4 languages + outbound | Reminders, SOS, family, escalation, voice notes |
| | 2.3 | Fri 13 Nov, evening | Integration + freeze | Test suite + hardening | Tests, STOP/START, idempotency, judge route |
| 3 Hackathon | 3.1 | H0–H8 (Sat 14 Nov ~5 pm) | Stabilise at the venue | Venue call tests | Judge path live |
| | 3.2 | H8–H20 | P1 features | Tier 2 Gemini Live (stretch) | Progress / walk cards, menu, location |
| | 3.3 | H20–H30 | Polish + proof, **code freeze H30** | Voice tuning + backup call | Rehearse + backup recording |
| | 3.4 | H30–H36 | Rehearse | Stage call + channel Q&A slide | Q&A slide: WhatsApp communities |

## Working in parallel

There are no fixed owners: anyone can pick up any stream. Within an iteration, the streams below run **at the same time**. Each person takes one stream, says so in the group, and moves the card to Doing. When a stream finishes, help the stream with the most work left.

### Today: Iteration 0.1 (Tue 10 Nov, 9 pm → midnight)

| # | Stream | File | Starts | Depends on |
|---|---|---|---|---|
| 1 | **Repo + backend skeleton**: monorepo, `.env.example`, FastAPI `/health` deployed, ngrok, Supabase schema v1, API contract draft | `docs/03` §10 Iteration 0.1 | **First, ~30 min**; everyone else can start alongside | — |
| 2 | **App skeleton**: check the Expo Go SDK, create the project, tabs, tokens, fonts, i18n, mocks, EAS dev build | [app/0.1](app/0.1-project-skeleton.md) | Right away (push into the repo once stream 1 creates it) | — |
| 3 | **Voice access**: Twilio account + number (check SG number rules), 4-language greeting audio, hello-world call | [voice-call-agent/0.1](voice-call-agent/0.1-accounts-hello-world.md) | Right away | `/voice/incoming` needs stream 1's FastAPI + ngrok (write it locally meanwhile) |
| 4 | **WhatsApp access**: Meta app + test number, `hello_world` send, Twilio sandbox | [whatsapp/0.1](whatsapp/0.1-access.md) §2.1, §2.3 | Right away | — |
| 5 | **Meta Business verification** + collecting tester phone numbers | [whatsapp/0.1](whatsapp/0.1-access.md) §2.2 | **Right away: takes days** | — |
| 6 | **Posture module skeleton** (Android): RightPosture code in `modules/posture`, Gradle / Kotlin aligned, camera preview | `docs/03` §2.1 | After stream 2 has an Expo project | Stream 2 |
| 7 | **Design board**: Mobbin board (Luma, Airbnb, Apple Health, Hinge, Strava, Monzo, Grab, Singpass/LifeSG, Be My Eyes, WhatsApp) | `docs/02` §4 | Right away | — |
| 8 | **Research setup**: line up 3–5 seniors (≥ 2 men) for 12 Nov, consent form, Expo Go installed on Singapore iPhones | `docs/07` §3 | Right away | — |

**With fewer people than streams**, pair them up: 1 + 6 (backend / native), 2 alone (biggest), 3 + 4 (both are account setup), 5 + 8 (both are admin / people work), and 7 whenever someone is free.

**End of tonight (exit check):** the app opens on Android and in Expo Go on an iPhone; the number answers with 4 greetings; the Meta test number delivers `hello_world`; verification submitted; contracts drafted for 0.2.

### Later iterations
Each track's iteration file lists its tasks as numbered sections, so split them the same way: one person per section, and hand-offs as listed. The app track carries the most hours in Phase 1, so put the most people there and split it by screens (e.g. one on Kampung, one on Thrive, one on the Read It Out / Buddy / walk engines).

## How each iteration file is laid out

1. **At a glance**: when, goal, exit criterion, estimate
2. **Entry criteria**: what must already be true, including cross-track dependencies
3. **Scope**: in / out, with PRD feature IDs and screen IDs (S1–S40)
4. **Tasks**: numbered, with files, code / contract sketches and acceptance notes
5. **Hand-offs**: what this track gives to and needs from the others
6. **Test cases**
7. **Exit demo**: what to show in the 15-minute end-of-iteration demo
8. **Risks and fallbacks**
9. **Definition of Done**

## Cross-track dependencies to watch

```
0.1 Twilio / Meta access (Voice, WA) ─────────► every channel iteration
0.2 tool schemas (Voice + backend) ───────────► 1.3 inbound loop, 2.1 assistant turn
App i18n keys (each 1.x) ─► Voice translates (same iteration) ─► App drops files in
1.2 call prompt files (Voice) ────────────────► 1.3 inbound loop, 2.2 outbound calls
1.2 templates submitted (WA) ─────────────────► 2.1 / 2.2 scheduled messages
2.1 /assistant/turn (Voice + backend) ────────► 2.2 real Buddy (App), WA free text / voice notes
2.1 scheduler + notifier (backend) ───────────► 2.2 escalation via WA + calls
2.2 all tracks ───────────────────────────────► 2.3 golden path 3× → tag v0.9-demo
```

## Golden path (exit check from 2.2 onward, `docs/07` §7)

1. Priya sets up Raj (**App**); Raj accepts on **WhatsApp**.
2. Raj answers **No** in the **App** → joins a walk → gets the WhatsApp group link.
3. Raj records a walk → Strava-style summary → shares to his Circle; Lim cheers (**App**).
4. Mdm Tan misses her **WhatsApp** check-in → **phone call** → no answer → family alert.
5. On stage: **call** the number → "Remind me to take my medicine at 8" → reminder appears in the **App**.
6. Raj presses Help (**App**) → 995 offered → Priya + Ahmad alerted (**App / WhatsApp / call**) → "on my way".
7. (Android) 10-rep sit-to-stand, reps read aloud, saved to Thrive (**App**).

## Rules for every iteration

- Board cards tagged with track, priority (P0/P1/P2), iteration and screen ID. Branches `feat/<track>-<iteration>-<thing>`. PRs < 400 lines, reviewed by someone from another track.
- Every app exit includes an **iPhone Expo Go** check by the Singapore team. Posture is Android-only, with an iPhone fallback.
- Voice and WhatsApp work is tested with **distress phrases** and **at least one non-English language**.
- No emojis anywhere (UI, WhatsApp, call scripts). Never brand it as "AI". No medical claims.
- Nothing P1 starts until the golden path passes.
