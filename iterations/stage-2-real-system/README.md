# Stage 2 — Real Backend and Live Channels

Phase 2 · Thu 12 Nov afternoon → Fri 13 Nov evening SGT · Iterations 2.1, 2.2, 2.3

## Why this stage exists

Stage 1 proved seniors *can* use it. Stage 2 makes it **actually work**, across all three doors: **three doors, one brain** (`03`). The app moves from mocks to the real API. WhatsApp and phone calls run real flows on the same user, memory and tools. The scheduler and notifier drive the escalation ladder that makes the check-in a safety net.

**Hard deadline:** Iteration 2.3 must close **before the India teammates fly on Fri 13 Nov night**. They land ~6 am on 14 Nov, and the hackathon starts that evening. Anything not stable by then is demoed from the frozen `v0.9-demo` tag.

## Iterations

| Iteration | When (SGT) | Theme | Exit criterion |
|---|---|---|---|
| [2.1 Wire up](2.1-wire-up/ITERATION.md) | Thu 12 Nov, afternoon–night | App on the real backend; channels started | New app user appears in the DB; WhatsApp onboarding writes the same user; English inbound call answers "What's on today?" |
| [2.2 Real features](2.2-real-features/ITERATION.md) | Fri 13 Nov, day | Escalation, SOS fan-out, GPS walks, real Buddy, WA flows, outbound calls, posture | **Golden path on real phones**; one sit-to-stand set counts reps on Android; iPhone shows the fallback card |
| [2.3 Integrate & freeze](2.3-integrate-freeze/ITERATION.md) | Fri 13 Nov, evening | Stable demo environment | Golden path passes **3× in a row**; `main` tagged **`v0.9-demo`** |

## Stage entry criteria (Stage 1 exit)

- [ ] Filming build done: 5 test tasks in 4 languages on Android + iPhone Expo Go.
- [ ] Every Stage-1 endpoint live on `demo` against the seeded DB: `/me`, `/home/today`, `/events`, `/circles`, `/checkins`, `/reminders`, `/sos`, `/safe-circle`, `/walks` (+ pipeline), auth mocks, `/family/invite`, `/skills`, `/endorsements`, `/users/{id}/profile`, `/stories`, `/assistant/turn` stub.
- [ ] 48 WhatsApp templates submitted (en/ms/zh_CN/ta × 12).
- [ ] English inbound call loop (Tier 1) works; call prompt files in 4 languages committed.
- [ ] Filming notes posted.

## Stage exit (Fri 13 Nov evening)

The **golden path** (`07` §7) passes **3 times in a row** on real phones, end to end, without manual DB edits. Then `main` is tagged `v0.9-demo`:

1. Priya sets up Raj → Raj accepts on WhatsApp.
2. Raj answers **No** in the app → joins a walk → gets the WhatsApp group link.
3. Raj records a short walk → Strava-style summary → shares to his Circle (Lim's cheer is P1 / 3.2).
4. Mdm Tan doesn't reply to her WhatsApp check-in → phone call → still no answer → family alert.
5. Call the number → "Remind me to take my medicine at 8" → reminder appears in the app.
6. Raj presses Help → offered 995 → Priya and Ahmad (300 m) alerted → "on my way" on Raj's screen.
7. (Android) 10-rep sit-to-stand; reps counted and read aloud; summary saved to Thrive.

Use **1-minute test timings** for the escalation ladder in step 4, behind a `DEMO_FAST_ESCALATION` flag.

## Hours by lane

| Lane | 2.1 | 2.2 | 2.3 |
|---|---|---|---|
| A App | A2.1 · 5 h | A2.2 · 8 h + A2.2b · 3 h | A2.3 · 3 h |
| B Backend | B2.1 · 4 h | B2.2 · 6 h + B2.2b · 6 h | B2.3 · 3 h |
| C Voice | C2.1 · 4 h (with B) | C2.2 · 6 h | C2.3 · 2 h |
| C WhatsApp | W2.1 · 3 h | W2.2 · 5 h (with B) | W2.3 · 2 h |

**2.2 is the riskiest day**. B carries 12 h of estimates (escalation + SOS + assistant + posture integration) and C carries 11 h. Decide at the start of 2.2 which item gets cut first if the day overruns. The suggested cut order is in the 2.2 doc §8.

## Dependencies inside the stage

```
2.1 assistant turn (B+C) ───────────► 2.2 real Buddy (A)
2.1 scheduler + notifier (B) ───────► 2.2 escalation via WhatsApp + calls (C)
1.2 walk pipeline (B) ──────────────► 2.2 real GPS walks (A)
0.1 posture skeleton (B) ───────────► 2.2 posture integration (B) ──► 2.2 Move Along shell (A)
2.1 filming fix list (D) ───────────► 2.1/2.2 fixes (A)
2.2 everything ─────────────────────► 2.3 cross-channel checks + freeze
```

## Platform realities to design around

| Concern | Android (our EAS build) | iPhone (Expo Go) |
|---|---|---|
| Remote push (SOS, family alerts) | Yes | **No.** These alerts arrive by **WhatsApp + phone call** |
| Check-in / reminder notifications | Push with Yes/No / Done actions | **Local scheduled** notifications |
| Walk recording | Background (screen locked) | **App open only**, keep-awake on S22 |
| Move Along (posture) | Yes | Fallback card + camera-free guided warm-up |

For the golden path, the **helper alert screen S30** (step 6) is shown on an **Android** phone. iPhone helpers get the WhatsApp `sos_alert` and an SOS helper call.
