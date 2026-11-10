# Iteration Docs — Kampung Connect

Version 1.0 · 10 Nov 2026 · Built from `docs/00`–`docs/07` (v2.1)

The lane docs (`03` backend, `04` app, `05` voice, `06` WhatsApp) say what each **person** builds. The master plan (`07`) says **when**. These folders turn that around: **one doc per iteration**, holding every lane's work for that iteration. Use it at the start of the iteration, on the board and in the exit demo.

> If an iteration doc and a source doc disagree, the **source doc wins**. Fix the iteration doc and post a note in the group. Contracts (API shapes, tool schemas, i18n keys, seed data, screen IDs) stay owned as stated in `07` §1.

## Folder map

```
iterations/
  README.md                                   ← you are here
  stage-1-clickable-app/                      Phase 1 · Wed 11 – Thu 12 Nov 12:00
    README.md                                 stage overview, goal, exit
    1.1-home-kampung/ITERATION.md
    1.2-thrive-safety/ITERATION.md
    1.3-onboarding-passiton-speech/ITERATION.md
  stage-2-real-system/                        Phase 2 · Thu 12 pm – Fri 13 Nov
    README.md
    2.1-wire-up/ITERATION.md
    2.2-real-features/ITERATION.md
    2.3-integrate-freeze/ITERATION.md
  stage-3-hackathon/                          Phase 3 · 36 h from Sat 14 Nov ~5 pm, SMU
    README.md
    3.1-stabilise/ITERATION.md
    3.2-p1-features/ITERATION.md
    3.3-polish-proof/ITERATION.md
    3.4-rehearse/ITERATION.md
```

Phase 0 (Foundations: 0.1 setup & contracts, 0.2 design system & seed) is the **entry condition** for Stage 1. It isn't covered here. See `docs/07_PROJECT_WORKFLOW.md` §3.

## The three stages at a glance

| Stage | Iterations | Question it answers | Stage exit |
|---|---|---|---|
| **1 Clickable app** | 1.1 · 1.2 · 1.3 | *Can a senior use it without help?* | A senior does the 5 test tasks in any of the 4 languages on mock data, on Android and in Expo Go on iPhone (Thu 12 Nov 12:00) |
| **2 Real system** | 2.1 · 2.2 · 2.3 | *Does it really work, across all three channels?* | Golden path passes 3× in a row on real phones; `main` tagged `v0.9-demo` (Fri 13 Nov evening, before India teammates fly) |
| **3 Hackathon** | 3.1 · 3.2 · 3.3 · 3.4 | *Can we prove it to judges, live?* | Code freeze H30; 5 clean pitch run-throughs; backup recordings of every step |

## How every iteration doc is laid out

1. **At a glance**: when, goal, exit, owners
2. **Entry criteria**: what must already be true
3. **Scope**: feature IDs (PRD) and screen IDs (S1–S40), plus what is *out*
4. **Lane tasks**: A App · B Backend · C Voice · C WhatsApp · D Design · E Business, with file paths, endpoints, data and acceptance notes
5. **Integration points**: who hands what to whom, and when
6. **Test plan**: concrete cases to run before the exit demo
7. **Exit demo script**: what to show the team in the 15-minute end-of-iteration demo
8. **Risks and fallbacks**
9. **Definition of Done checklist**

## Rules that apply to every iteration

- **Board cards** carry lane (A–E), priority (P0/P1/P2), iteration (e.g. `1.2`) and screen ID.
- **Branches:** `feat/<lane>-<iteration>-<thing>`, e.g. `feat/app-1.2-walk-summary`. PRs < 400 lines, reviewed by someone from another lane.
- **Every exit check includes:** new screens open and work in **Expo Go on an iPhone** (checked by the Singapore team). Android-only features (posture) show their iPhone fallback.
- **Nothing P1 starts until the golden path passes** (`07` §7).
- **No feature goes in unless it answers a raiSE baseline checklist point** (`01` §13).
- **Rituals:** 10-min kick-off (pick cards, confirm exit) → 10 pm SGT stand-up → 15-min exit demo, where the team decides any cuts.

## Golden path, and where each step becomes real

| # | Golden-path step | Mock / UI | Real |
|---|---|---|---|
| 1 | Priya sets up Raj; Raj accepts on WhatsApp | 1.3 | 2.1 (app writes) / 1.3–2.1 (WA accept) |
| 2 | Raj answers **No** → joins a walk → gets group link | 1.2 | 2.1 (WA) / 2.2 (app) |
| 3 | Raj records a walk → summary → shares; Lim cheers | 1.2 | 2.2 (GPS + summary) / 3.2 (cheers) |
| 4 | Mdm Tan misses check-in → call → family alert | — | 2.2 |
| 5 | On-stage call: "Remind me to take my medicine at 8" → shows in app | 1.3 (English loop) | 2.2 (4 languages) / 2.3 (cross-channel check) |
| 6 | Raj presses Help → 995 offered → Priya + Ahmad alerted → "on my way" | 1.2 (UI) | 2.2 (fan-out) |
| 7 | (Android) 10-rep sit-to-stand, reps read aloud, saved to Thrive | — | 2.2 (shell) / 3.2 (polish) |
