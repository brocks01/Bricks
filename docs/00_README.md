# Kampung Connect — Project Docs (working name)

Singapore–India Hackathon 2026 · raiSE track: Social Innovation & Inclusive Development
Team: SIH-SOC Group 1 · Docs version 2.1 · 10 Nov 2026

> **One line:** A voice-friendly community platform for people aged 50+ where they **give back** (Pass It On), **stay well** (Thrive) and **stay connected** (Kampung) — through an app, WhatsApp, or a simple phone call. One helper, one profile, one safety net, for life.

## Read in this order

| # | File | What it covers | Who must read |
|---|------|----------------|---------------|
| 1 | `01_PRD.md` | Problem, users, goals, every feature with priority, metrics, risks | Everyone |
| 2 | `02_DESIGN_PRINCIPLES.md` | Design system: clean-but-readable direction, avoiding an "AI-generated" look, reference apps, tokens, components, Read It Out, languages, copy, testing | Everyone building UI or voice |
| 3 | `02b_SCREEN_DESIGNS.md` | **Every screen (S1–S40)** with the existing app it takes inspiration from, what to borrow / avoid, layout, read-out script, priority and iteration; Mobbin board checklist | Person A, Kavya |
| 4 | `03_ARCHITECTURE.md` | System diagram, stack, data model, API, agent tools, walk processing, escalation; **backend build by iteration** | All builders (Person B owns) |
| 5 | `04_APP_PLAN.md` | App engines (Read It Out, voice, walk tracking) and **app build by iteration** | Person A |
| 6 | `05_VOICE_CALL_AGENT_PLAN.md` | In-app voice helper + phone agent; **voice build by iteration** | Person C |
| 7 | `06_WHATSAPP_PLAN.md` | WhatsApp flows, templates, setup; **WhatsApp build by iteration** | Person C, Santusht |
| 8 | `07_PROJECT_WORKFLOW.md` | **Master plan: phases → iterations**, dates, every lane's tasks per iteration, golden-path demo, git, rituals, Definition of Done | Everyone |

## Phases and iterations

| Phase | Iterations | When (SGT) |
|---|---|---|
| 0 Foundations | 0.1 Setup & contracts · 0.2 Design system & seed | Tue 10 Nov night – Wed 11 Nov morning |
| 1 Clickable app on mock data | 1.1 Home + Kampung · 1.2 Thrive + Safety · 1.3 Onboarding + Pass It On + speech | Wed 11 Nov – Thu 12 Nov 12:00 (filming) |
| 2 Real system | 2.1 Wire up · 2.2 Real features · 2.3 Integrate & freeze | Thu 12 Nov pm – Fri 13 Nov |
| 3 Hackathon (36 h) | 3.1 Stabilise · 3.2 P1 features · 3.3 Polish & proof · 3.4 Rehearse | From Sat 14 Nov ~5 pm, SMU |
| 4 After | Pilot | — |

## Decisions already made

- Target: **pre-retirees ~50–60** first, so they carry the app into old age; older seniors (75+) use WhatsApp + calls.
- Three tabs: **Pass It On · Kampung (centre) · Thrive**. Build Kampung first.
- Community chat lives in **WhatsApp groups** (we link out), not in-app.
- Daily **yes/no Good Morning Check-in** is our differentiator.
- **Four languages:** English, Malay, Mandarin, Tamil. **Read It Out** on every screen.
- **Clean, minimal, emoji-free design** anchored on Luma, with page-specific references (Airbnb, Apple Health, Hinge, Strava, Monzo, Grab, Singpass/LifeSG, Be My Eyes, WhatsApp) and SGDS for accessibility. Minimal means fewer things on screen — never small or grey text.
- **Walks tracked Strava-style:** record → summary (route, distance, time, steps, pace, splits) → history, group walks and cheers.
- Don't brand it as "AI" — it's "an app you can use with your voice". **No ads.** No medical claims.
- Login: Singpass (mocked) + Google fallback; family or community admin can onboard seniors, who always confirm.
- **Stack decided: React Native + Expo.** Android runs our own build (APK); **iPhone runs in Expo Go** — no Mac or Apple Developer account needed.
- **Posture (Move Along) is Android-only**, using Sayan's RightPosture engine as a local Expo module (`modules/posture`). iPhone shows "Available on Android". Posture on iPhone is roadmap (Kotlin Multiplatform).

## Still open

| Question | Owner | By |
|---|---|---|
| WhatsApp Business / Cloud API access | Ankit + Santusht | Iteration 0.1 |
| Should seniors earn money? (built as an optional toggle) | Survey → Santusht/Ken | Iteration 2.1 |
| Business model emphasis (family tier vs employer vs centres) | Santusht + Ken | Iteration 2.2 |
| Final product name | Everyone | Iteration 2.3 |
