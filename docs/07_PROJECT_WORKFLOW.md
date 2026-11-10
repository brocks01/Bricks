# Project Workflow — Phases, Iterations & Work Split

Version 2.1 · 10 Nov 2026 · 3 builders + design + business

This is the master plan. Each lane's detailed tasks are in its own doc (`03` backend, `04` app, `05` voice, `06` WhatsApp) using the **same iteration numbers**.

---

## 1. Team and lanes

Suggested from what each person said on calls #1 and #2 — swap freely, keep the lanes.

| Lane | Person (suggested) | Owns | Detailed plan |
|---|---|---|---|
| **A — App & UX build** | Sarath | Expo app, components, all screens, Read It Out, walk tracking, Buddy UI | `04_APP_PLAN.md` |
| **B — Backend & Platform** | Sayan | FastAPI, Supabase, APIs, walk processing, scheduler, notifier, SOS fan-out, seed data, deploy, **Android posture module (RightPosture → `modules/posture`)** | `03_ARCHITECTURE.md` §2.1, §10 |
| **C — Voice & WhatsApp** | Ankit | Prompts, tool schemas, STT/TTS, phone agent, WhatsApp, translations | `05_…`, `06_…` |
| **D — Design** | Kavya | Mobbin board, screen reviews against `02b`, usability tests | `02_…`, `02b_…` |
| **E — Business & research** | Santusht + Ken | Meta/WhatsApp + Singpass access, senior interviews and filming, native-speaker reviews, business model, pitch | `01_PRD.md` §10 |

**Shared contracts** (set in Iteration 0.1; change only with a heads-up in the group):
1. API routes and JSON shapes — owner B
2. Agent tool schemas — owners B + C
3. i18n string keys — owner A (translations by C)
4. Seed data and mocks — owner B
5. Screen IDs S1–S40 — owner D

## 2. Timeline at a glance

| Phase | Iteration | When (SGT) | Goal | Demo at the end |
|---|---|---|---|---|
| **0 Foundations** | 0.1 Setup & contracts | Tue 10 Nov, 9 pm–midnight | Everyone can build in parallel | App, API and webhook "hello world" all run |
| | 0.2 Design system & seed | Wed 11 Nov, morning | Components and data ready | Component gallery + seeded database |
| **1 Clickable app (mock data)** | 1.1 Home + Kampung | Wed 11 Nov, day | Community core | Join a walk in 1–2 taps |
| | 1.2 Thrive + Safety | Wed 11 Nov, evening–night | Check-in, walks, SOS | Check-in No → walk; simulated walk summary; SOS |
| | 1.3 Onboarding + Pass It On + speech | Thu 12 Nov, until 12:00 | **Filming build** | 5 senior tasks in 4 languages |
| **2 Real system** | 2.1 Wire up | Thu 12 Nov, afternoon–night | App on real backend; channels started | Real onboarding; WhatsApp onboarding; English call |
| | 2.2 Real features | Fri 13 Nov, day | Escalation, SOS, GPS walks, Buddy, WA flows, outbound calls | Golden path on real phones |
| | 2.3 Integrate & freeze | Fri 13 Nov, evening | Stable demo environment | Golden path 3× in a row, tag `v0.9-demo` |
| **3 Hackathon (36 h)** | 3.1 Stabilise | H0–H8 (from Sat 14 Nov ~5 pm) | Works at the venue | Judge QR path works |
| | 3.2 P1 features | H8–H20 | Wow features | Walk history, group cheers, Simple Mode… |
| | 3.3 Polish & proof | H20–H30 | Fix, test, record backups | Code freeze at H30 |
| | 3.4 Rehearse | H30–H36 | Pitch and Q&A | 5 clean run-throughs |
| **4 After** | — | After the event | Pilot | Roadmap slide |

India teammates land ~6 am on 14 Nov; Iteration 2.3 must close before they fly on 13 Nov night.

**Platforms:** Android = our EAS build (with posture). iPhone = **Expo Go** (no Mac, no Apple account). **Every iteration's exit check includes: "new screens open and work in Expo Go on an iPhone — checked by the Singapore team."** Posture is Android-only.

## 3. Phase 0 — Foundations

### Iteration 0.1 — Setup & contracts (Tue 10 Nov night)
| Lane | Tasks |
|---|---|
| A | Expo project, router, tab shell, fonts, `theme/tokens.ts`, i18n skeleton, mock layer |
| B | Monorepo + branch protection; Supabase schema v1; FastAPI skeleton + deploy; API contract doc; **posture module skeleton** (RightPosture code copied in, Gradle/Kotlin aligned with Expo, camera preview in a dev build) |
| C | Twilio account + number; Meta developer app + WhatsApp test number; Twilio sandbox backup; hello-world call |
| D | Start Mobbin board (Luma, Airbnb, Apple Health, Hinge, Strava, Monzo, Grab, Singpass/LifeSG, Be My Eyes, WhatsApp) |
| E | Start Meta Business verification; line up 3–5 seniors (≥ 2 men) for 12 Nov; consent form; **install Expo Go on your iPhones** for iteration checks |
**Exit:** Expo project on the Expo-Go-supported SDK; Android dev build runs; app opens in Expo Go on a Singapore teammate's iPhone; contracts merged; posture skeleton shows a camera preview on Android.

### Iteration 0.2 — Design system & seed (Wed 11 Nov morning)
| Lane | Tasks |
|---|---|
| A | Core components + `/dev/components` gallery at 100% / 200% font |
| B | Seed script + mock JSON export (users, circles, events with real photos, walks, GPS track) |
| C | System prompt + tool schemas with B; distress-phrase list; webhook + router skeleton |
| D | Review gallery vs board; sign off tokens |
| E | Find native-speaker reviewers for Malay, Mandarin, Tamil |
**Exit:** gallery signed off; seeded database live.

## 4. Phase 1 — Clickable P0 app on mock data

### Iteration 1.1 — Home + Kampung (Wed 11 Nov day)
| Lane | Tasks |
|---|---|
| A | S12 Home, S14 Happenings, S15 Event details, S16 You're going, S17 Start Something, S18 My Circles, S19 Circle page |
| B | `/me`, `/home/today`, `/events`, `/circles` APIs |
| C | Translations wave 1 (Home + Kampung); WhatsApp templates in English |
| D | Review S12–S19 against Luma / Grab / Strava Clubs references; 5-second tests with family members |
| E | Interview prep: questions for senior men (why they don't join, what they'd teach) |
**Exit:** join a walk from Home in 1 tap, from Happenings in 2 taps.

### Iteration 1.2 — Thrive + Safety (Wed 11 Nov evening–night)
| Lane | Tasks |
|---|---|
| A | S20 Thrive, S21 Check-in, S26 Reminders, S22 Walk recording (simulated), S23 Walk summary (mock), S28 SOS UI |
| B | `/checkins`, `/reminders`, `/sos`, `/safe-circle`, `/walks` + processing pipeline |
| C | Translations wave 2 (Thrive + SOS); call prompt files ×4 languages; templates translated + submitted |
| D | Review S20–S28 against Apple Health / Strava / Be My Eyes |
| E | Confirm filming slots and locations |
**Exit:** check-in No → join walk; simulated walk → summary; SOS opens from every screen.

### Iteration 1.3 — Onboarding + Pass It On + speech (Thu 12 Nov, until 12:00)
| Lane | Tasks |
|---|---|
| A | S1–S8 onboarding, S9–S10 family, S31–S34 Pass It On / profile / thank-yous, S40 settings; Read It Out on all screens; mock Buddy; translations in; EAS Update link |
| B | Auth (Google + Singpass mock), family invite, skills, endorsements, profile, stories; `/assistant/turn` stub |
| C | Translations wave 3; mock Buddy keyword lists; inbound call loop (English); WhatsApp onboarding flow |
| D | Final UX Definition-of-Done pass on every P0 screen |
| E | **Filming (12 Nov afternoon):** 5 test tasks, quotes, testimonials; notes to the group the same evening |
**Exit (12:00):** a senior can do the 5 test tasks in any of the 4 languages on mock data — on Android and in Expo Go on an iPhone.

## 5. Phase 2 — Real backend and live channels

### Iteration 2.1 — Wire up (Thu 12 Nov afternoon–night)
| Lane | Tasks |
|---|---|
| A | Mocks → real API; auth; onboarding writes; push notifications; fixes from filming |
| B | RLS policies; scheduler skeleton; notifier (push, WhatsApp, calls) |
| C | Real `/assistant/turn` with B; WhatsApp check-in + event join flows |
| D | Turn filming notes into a ranked fix list for A |
| E | Business model draft (free core, family tier, employer, centres); collect evidence slides |
**Exit:** new user onboarded in the app appears in the DB; WhatsApp onboarding writes the same user; English inbound call answers "What's on today?".

### Iteration 2.2 — Real features (Fri 13 Nov day)
| Lane | Tasks |
|---|---|
| A | Real check-in, reminders, **GPS walk recording + server summary**, SOS + S29 + S30, real Buddy; **Move Along shell on posture events + iPhone fallback card** |
| B | Escalation ladder; SOS fan-out (PostGIS); user memory merge; walk group matching; **posture engine integration** (MediaPipe → ExerciseEngine → events to JS; 2 `.rpose` bundles; `/exercise-sessions`) |
| C | Calls in ms / zh / ta; outbound calls (check-in, reminder, are-you-ok, SOS helper, family alert); WhatsApp reminders, SOS, family templates, voice notes |
| D | Test real flows on two phones; check copy in all languages with reviewers |
| E | Pitch storyline draft; judging-criteria mapping (raiSE framework) |
**Exit:** golden path on real phones (see §7); one sit-to-stand set counts reps on Android; iPhone shows the fallback card.

### Iteration 2.3 — Integrate & freeze (Fri 13 Nov evening)
| Lane | Tasks |
|---|---|
| A | Cross-channel checks; demo reset; empty/error states; Android preview APK + EAS Update `demo` channel for Expo Go |
| B | Demo env hosted + seeded; logging; golden-path load test |
| C | Voice + WhatsApp test suites; decide judge WhatsApp route |
| D | Final visual pass vs Mobbin board |
| E | Slide deck v1 |
**Exit:** golden path passes 3× in a row; `main` tagged `v0.9-demo`.

## 6. Phase 3 — Hackathon (36 hours, from Sat 14 Nov ~5 pm at SMU)

### Iteration 3.1 — Stabilise (H0–H8)
- A: venue Wi-Fi / hotspot tests; two judge QR codes (Android APK, iPhone Expo Go); camera and location permissions on Android. B: judge accounts, fallbacks. C: judge WhatsApp path; call quality at the venue. D: quick hallway tests. E: refine pitch with mentors' feedback.

### Iteration 3.2 — P1 features (H8–H20), in priority order
1. Walk history & trends + personal bests (A, B)
2. Group walk feed + Cheers (A, B)
3. Simple Mode (A)
4. Admin QR onboarding (A, B)
5. Move Along polish — overlay, safety stop, second exercise, cue translations (B with A; Android)
6. Weekly progress / walk summary cards on WhatsApp (B, C)
7. Natural Gemini Live calls (C — only if Tier 1 is rock-solid)
- Sleep in shifts (H14–H18); one person always available for deploy issues.

### Iteration 3.3 — Polish & proof (H20–H30)
- Usability check with any available seniors; fix top 3 issues.
- Impact metrics screen for the pitch (B).
- Backup screen recordings of every demo step and a live call (all).
- **Code freeze at H30.**

### Iteration 3.4 — Rehearse (H30–H36)
- 5 full run-throughs with demo reset between.
- **Pitch (5 min):** problem & insight (45 s) → seniors' voices video (30 s) → **live demo across app + WhatsApp + call (2 min)** → business model (45 s) → impact KPIs & raiSE framework (45 s) → close (15 s).
- **Backup slides for Q&A:** architecture, privacy/PDPA, child safety, SOS liability, cost per user, why not AACs/NANA, India rollout, design references (SGDS).

## 7. The golden path (demo script used for every exit check)

1. Priya sets up her father Raj (family onboarding); Raj accepts on WhatsApp.
2. Morning: Raj answers **No** to the check-in in the app → joins a walk near him → gets the WhatsApp group link.
3. Raj records a short walk → sees the Strava-style summary → shares to his Circle; Lim cheers it.
4. Mdm Tan (WhatsApp only) doesn't reply to her check-in → gets a phone call → still no answer → Priya-style family alert arrives.
5. On stage: call the number → "Remind me to take my medicine at 8" → reminder appears in the app.
6. Raj presses Help → offered 995 → Priya and Ahmad (300 m away) get the alert → "on my way" shows on Raj's screen.
7. (Android) Raj does a 10-rep sit-to-stand warm-up; reps counted and read aloud; summary saved to Thrive.

## 8. Way of working

### Git
- Monorepo `kampung-connect/` (`app/`, `backend/`, `channels/`, `shared/`, `docs/`). `main` protected and always demo-able.
- Branches: `feat/<lane>-<iteration>-<thing>` e.g. `feat/app-1.2-walk-summary`, `feat/be-2.2-sos-fanout`, `feat/wa-2.1-checkin`.
- Small PRs (< 400 lines), one reviewer from another lane. PR template:
  - [ ] Iteration ID and screen IDs listed
  - [ ] Matches API / tool contract (or contract updated)
  - [ ] UX Definition of Done (UI PRs) — screenshot at 200% font, in Tamil
  - [ ] Strings in i18n
  - [ ] Recording / curl output attached
- Merge → backend auto-deploys to `demo`; app via EAS Update channel `demo`. Secrets only in `.env`.

### Rituals
| When | What | Length |
|---|---|---|
| Start of each iteration | Pick cards for the iteration; confirm exit criteria | 10 min |
| Daily 10 pm SGT (7:30 pm IST) | Stand-up: done / next / blocked | 15 min |
| End of each iteration | Demo the exit criteria to the whole team; decide cuts | 15 min |
| Hackathon | Check-in every 4 hours; code freeze at H30 | 5 min |

**Board:** GitHub Projects — Backlog · This iteration · Doing · Review · Done. Every card tagged with lane (A–E), priority (P0/P1/P2), iteration (e.g. 1.2) and screen ID.

**Rule from the baseline checklist:** no feature goes in unless it answers a checklist point. Nothing P1 starts until the golden path passes.

### Definition of Done (all work)
- Works on a real Android phone (our build) **and** on an iPhone in **Expo Go**, at large system font. Android-only features (posture) show their iPhone fallback.
- Available in all 4 languages (or a follow-up card exists).
- Read It Out script for any new screen; matches its reference in `02b`.
- Backend: documented, validated, logged; idempotent for webhooks.
- Voice / WhatsApp: tested with distress phrases and one non-English language.
- No secrets or personal data in logs; health card never sent to the LLM.

## 9. Dependencies

```
0.1 contracts (B, C) ──► A builds on mocks from 1.1 (no waiting)
0.2 seed (B) ──► A mocks mirror it
A i18n keys (each iteration) ──► C translates in the same iteration ──► A drops files in
1.2 walk processing (B) ──► 2.2 real GPS walks (A)
2.1 assistant turn (B + C) ──► 2.2 real Buddy (A)
2.1 scheduler + notifier (B) ──► 2.2 escalation via WhatsApp + calls (C)
0.1 Meta / Twilio access (E + C) ──► WhatsApp and calls (fallback: sandbox / any number)
1.3 filming feedback (E, D) ──► 2.1 fixes (A)
```

## 10. Top risks

| Risk | Plan B |
|---|---|
| Posture module won't build inside Expo (Gradle/Kotlin mismatch) | Align versions in 0.1; if still blocked by 2.2, demo posture as RightPosture's own Android app launched from our app, and keep integration on the roadmap |
| A library isn't in Expo Go | Check the Expo Go library list before adding anything; if needed, make it Android-only behind a flag |
| No iPhone tester available | Singapore team installs Expo Go in 0.1; WhatsApp and calls cover iPhone judges regardless |
| WhatsApp access delayed | Twilio sandbox; pre-registered numbers on the Meta test number |
| No Singapore phone number | Any available Twilio number for demo |
| Malay / Tamil device voices missing | Backend TTS + pre-generated audio |
| GPS unreliable indoors at the venue | "Simulate walk" replay of a real Bishan Park track |
| Live demo fails | Backup recordings; demo reset; hotspot |
| Scope creep | Iteration exit criteria; P1 only after golden path passes |
| Time zones | Stand-up 10 pm SGT; async updates with screenshots |
