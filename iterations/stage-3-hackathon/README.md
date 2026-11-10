# Stage 3 — Hackathon (36 hours at SMU)

Phase 3 · from **Sat 14 Nov 2026 ~5 pm SGT** · Iterations 3.1, 3.2, 3.3, 3.4

## Why this stage exists

We arrive with a frozen, working `v0.9-demo`. The 36 hours are for three things, in this order:
1. **Make it work at the venue** (Wi-Fi, judges' phones, call quality).
2. **Add the "wow" P1 features** that make the pitch memorable, but only while the golden path stays green.
3. **Prove it**: usability evidence, impact metrics, backup recordings, and a rehearsed 5-minute pitch.

**Stage rule:** the golden path must pass before *any* P1 work starts, and again after *every* P1 merge. If a P1 feature breaks it, revert first and debug later.

## Clock (approximate; H0 = start of hacking)

| Hour | Clock (SGT, if H0 = Sat 17:00) | Iteration |
|---|---|---|
| H0–H8 | Sat 17:00 → Sun 01:00 | [3.1 Stabilise](3.1-stabilise/ITERATION.md) |
| H8–H20 | Sun 01:00 → Sun 13:00 (sleep in shifts H14–H18 ≈ 07:00–11:00) | [3.2 P1 features](3.2-p1-features/ITERATION.md) |
| H20–H30 | Sun 13:00 → Sun 23:00 · **code freeze at H30** | [3.3 Polish & proof](3.3-polish-proof/ITERATION.md) |
| H30–H36 | Sun 23:00 → Mon 05:00 | [3.4 Rehearse](3.4-rehearse/ITERATION.md) |

Shift these clock times if the official start differs. The H-numbers are what count.

## Stage entry criteria

- [ ] `v0.9-demo` tagged; golden path passed 3× in a row before travel.
- [ ] Demo runbook exists (phones, roles, steps, recovery moves, QRs).
- [ ] India teammates landed (~6 am, 14 Nov) and rested; laptops have the repo, `.env` and EAS access.
- [ ] Slide deck v1 exists.

## Stage exit

- [ ] Code frozen at H30 on a tag (e.g. `v1.0-hackathon`).
- [ ] Backup screen recordings of **every** demo step + one full live call + the WhatsApp flow.
- [ ] Impact metrics screen / slide populated from real data.
- [ ] **5 clean full run-throughs** of the pitch with a demo reset between.
- [ ] Q&A backup slides ready.

## Check-in rhythm

- **Every 4 hours** a 5-minute check-in: golden path status (green / red), what's in progress, what's cut.
- One person is **always awake and on deploy duty** during sleep shifts.

## Ownership during the event

| Lane | 3.1 | 3.2 | 3.3 | 3.4 |
|---|---|---|---|---|
| A App | Venue tests, judge QR path, permissions (3 h) | P1 screens in order (8–10 h) | Usability fixes, visual pass, backup videos (5 h) | Rehearsals (2 h) |
| B Backend | Judge accounts, fallbacks | Group walks + cheers, progress card, admin QR, Move Along polish, Joy Report | Impact metrics endpoint, backups | System-design Q&A slides |
| C Voice / WA | Judge WA path, call quality at the venue | Weekly cards on WA, menu, SOS location; Gemini Live (stretch) | Voice tuning ms / zh / ta, backup call recording | Rehearse the on-stage call; channel-architecture slide |
| D Design | Hallway tests | Review each P1 screen | Usability check, visual pass | Slide visuals |
| E Business | Refine the pitch with mentor feedback | Pitch + Q&A | Impact KPI story | Lead the rehearsals, timing |
