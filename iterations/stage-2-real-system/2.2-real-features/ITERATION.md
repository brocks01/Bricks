# Iteration 2.2 — Real Features

Stage 2 (Real system) · **Fri 13 Nov 2026, day (SGT)** · the heaviest build day

## 1. At a glance

| | |
|---|---|
| **Goal** | Make every P0 safety and activity feature real across all three channels: escalation ladder, SOS fan-out, GPS walks with server summaries, real Buddy, 4-language and outbound calls, WhatsApp reminders / SOS / family / voice notes, and the Android posture integration |
| **Exit** | **Golden path on real phones** (all 7 steps, `07` §7) · **one sit-to-stand set counts reps on Android** · iPhone shows the Move Along fallback card |
| **Owners** | A real check-in / reminders / GPS walks / SOS + S29 + S30 / real Buddy / Move Along shell · B escalation / SOS fan-out / memory merge / walk group matching / posture engine · C (voice) calls ms/zh/ta + outbound + identity · C (WA) reminders / SOS / family / voice notes · D two-phone tests + copy review · E pitch storyline |
| **Est.** | A2.2 8 h + A2.2b 3 h · B2.2 6 h + B2.2b 6 h · C2.2 6 h · W2.2 5 h |

## 2. Entry criteria

- [ ] 2.1 exit met (app on the real API; WA onboarding; English call reads real data).
- [ ] `/assistant/turn` live with confirmation + `ui_actions`; distress pre-check deterministic.
- [ ] Scheduler + notifier work, including `DEMO_FAST_ESCALATION` and `POST /admin/jobs/{job}/run`.
- [ ] Posture module skeleton (0.1) builds in the EAS dev build with a camera preview.
- [ ] At least `daily_checkin`, `checkin_nudge`, `reminder`, `sos_alert`, `family_missed_checkin` templates approved, **or** the sandbox route decided.
- [ ] Two real test phones per role: a senior phone (Raj, Android) and a family phone (Priya); Ahmad as a helper (Android, for S30).

## 3. Scope

| Area | PRD | Screens | Channel(s) |
|---|---|---|---|
| Real check-in + escalation ladder | TH-1, TH-6 (missed check-in) | S21, S29 | App, WA, call |
| Real reminders (local + server) | TH-4 | S26 | App, WA, call |
| GPS walk recording + server summary | WK-1, WK-2, WK-6 | S22, S23 | App |
| SOS fan-out + live status + helper alert | TH-5 | S28, S30 | App, WA, call |
| Real Buddy | EV-2 | S36 | App |
| Calls in 4 languages + outbound | — | — | Call |
| WhatsApp reminders, SOS, family templates, voice notes | — | — | WA |
| `user_memory` summarise-and-merge | A13 | — | all |
| Walk group matching ("Walked with") | WK-2 | S23 | App |
| Move Along shell (Android) + iPhone fallback | TH-7 (P1) | S25 | App |

**Out:** walk history S24, group feed + cheers (3.2), Simple Mode (3.2), fall detection (P1), Gemini Live Tier 2 (3.2), Move Along polish (3.2).

## 4. Lane tasks

### Lane A — App (Sarath) · A2.2 · 8 h + A2.2b · 3 h

| Task | Detail | Acceptance |
|---|---|---|
| **Real check-in** | S21 / Home / Thrive cards → `POST /checkins`. Android: push with **Yes / No** actions that call the API from the notification response handler. iPhone: a **local scheduled** 08:00 notification that opens S21 | Answer from the notification without opening the app (Android) |
| **Real reminders** | S26 → `/reminders` + a matching **local** notification (Done / Snooze 10 min). Server reminders (set by call or WhatsApp) show in the list on refresh | A reminder set by phone call appears in S26 (golden path step 5) |
| **GPS walk recording** (S22) | `lib/walk.ts` source = `gps`: `Location.watchPositionAsync` (~5 s / 10 m, `Accuracy.BestForNavigation`) + `expo-task-manager` background task on Android; foreground only on iPhone, with the "Keep this screen open while you walk" note. Pedometer for steps. Filters, auto-pause and 30 s persistence as built in 1.2. Optional spoken update each km | Real walk outdoors produces a sensible distance (± 10% vs map) |
| **Server summary** (S23) | `finish()` → `POST /walks {points, steps, started_at, ended_at, event_id?}` → render the returned summary. "Saving your walk…" state; on failure, keep the walk locally and retry | Privacy-trimmed route on the map; "Walked with" for group walks |
| **Permissions** | Location "while using" first, then background (Android) **only when the first walk starts**, with a one-line reason. Camera only when the first warm-up starts | No permission prompts at app launch |
| **Real SOS** (S28) | Help → S28 → 5 s countdown → `POST /sos {trigger:'button', lat, lng}` (current location, falling back to home) → **live status**: poll `GET /sos/{id}` every 3 s (or Supabase realtime) → "Priya — on her way", "Ahmad (300 m away) — on his way", "Lim — notified" → **I'm safe now** = `PATCH /sos/{id} resolved` | Golden path step 6: "on my way" visible on Raj's screen < 10 s after the helper taps |
| **S29 Are you OK?** | Opened by the missed-check-in push (Android) or in-app on next open: "Are you okay?" · **I'm OK** (success) · **I need help** (red → SOS) · 30 s countdown read aloud | I'm OK → stops the ladder (`POST /checkins` with `are_you_ok` key or a dedicated endpoint, agreed with B) |
| **S30 Helper alert** | Opened from the high-priority SOS push: "Raj needs help" · map with location · time · **I'm on my way** (`POST /sos/{id}/respond on_way`) · **Call Raj** (`tel:`) · "Call 995" link | Android only for push; iPhone helpers use WhatsApp / call |
| **Real Buddy** (S36) | `lib/voice.ts` → `POST /assistant/turn` with screen + the read-out script → show transcript + reply bubble, play `reply_audio_url` (fall back to device TTS) → run `ui_actions`: `navigate`, `highlight`, `confirm` (ConfirmSheet → second turn with `confirm`), `start_walk` / `finish_walk`, `open_sos`. "Thinking…" with a gentle sound; the reply starts in < 2.5 s | Offline → on-device keyword matcher (the mock from 1.3) + device TTS. Low confidence twice → 3 choice buttons |
| **Move Along shell** (S25, A2.2b) | `thrive/move.tsx`: if `isPostureAvailable` → choose an exercise (2 photo cards) → setup card "Place your phone on a table about 2 metres away…" (read aloud) → wait for `onReady` + `onTracking({visible:true})` → 3-2-1 → `<PostureCameraView exercise targetReps={10}>`. `onRep` → "6 of 10" (40pt) + soft tick + count read aloud. `onCue` → i18n `posture.cue.<cueId>` in big text + spoken (max 1 / 5 s). `onSafetyStop` → "Let's stop here and rest." `onFinish` → summary card → `POST /exercise-sessions`. Otherwise (iPhone) → info card "Camera warm-ups are available on Android" + the camera-free guided warm-up | One sit-to-stand set counts reps on Android; the iPhone card shows |

### Lane B — Backend (Sayan) · B2.2 · 6 h + B2.2b · 6 h

**Escalation ladder** (`backend/scheduler/escalation.py`), per user per day:

| Step | Normal timing | Demo timing | Action |
|---|---|---|---|
| 0 | 08:00 | T+0 | Check-in via `channel_pref` |
| 1 | +2 h (10:00) | T+1 min | Gentle reminder, same channel (`checkin_nudge` on WA) |
| 2 | +3 h (11:00) | T+2 min | **Outbound "Are you OK?" call** (all users) + S29 push |
| 3 | +4 h (12:00) | T+3 min | **Family alert**: push + WhatsApp `family_missed_checkin` (+ family call if urgent); log `sos_events(trigger='missed_checkin', status='open')` low urgency |

- Any answer from any channel (app, WA button, call "yes", S29 I'm OK) **stops the ladder**. Store the ladder state per user/date. The jobs are idempotent.

**SOS fan-out** (`backend/services/sos.py`):
- On `POST /sos` (or the `trigger_sos` tool from any channel): load `safe_circle` → **all family helpers** + the **2 nearest non-family helpers within 2 km** (PostGIS `ST_DWithin` + `ORDER BY ST_Distance`) → `notify(helper, sos_alert, urgent)` = push + WA `sos_alert` (map link, time, [I'm on my way] [Call Raj]) + SOS helper call.
- `sos_responses` rows per helper (`notified` → `on_way` → `arrived`); `GET /sos/{id}` returns the helper statuses with distance.
- Target: **all alerts sent < 10 s** from the trigger (PRD user story 6). Fan out concurrently (asyncio).

**`user_memory` summarise-and-merge:** after each conversation (Buddy, WA free-text / voice, call), a short Gemini call merges durable facts (preferences, interests, upcoming events, notes) into `user_memory.summary` (`03` §3 shape). It never stores long chat history and never includes the health card.

**Walk group matching:** finish the pipeline step 5 against real data. Walks with `event_id`, or ≥ 70% time overlap and starts within 300 m, get linked both ways.

**Posture integration (B2.2b, Android):**
- Inside `modules/posture`: CameraX frames → MediaPipe `PoseLandmarkerSource` (`pose_landmarker_lite.task`) → RightPosture `ExerciseEngine` on a **single background executor**.
- Emit events to JS: `onReady`, `onTracking`, `onRep {count, quality}`, `onCue {cueId, side}`, `onSafetyStop {reason}`, `onFinish(summary)`, `onError {code}`.
- Load **2 `.rpose` bundles**: `sit_to_stand`, `seated_knee_extension`. Release camera + model on unmount.
- `POST /exercise-sessions` (and `GET ?period=week` for Thrive) → `exercise_sessions` table. **Frames never leave the phone.**
- `abiFilters = ["arm64-v8a"]`; test on a real arm64 phone.

### Lane C — Voice (Ankit) · C2.2 · 6 h

| Task | Detail |
|---|---|
| **Inbound in ms / zh / ta** | Verify Twilio `<Gather>` speech support for `ms-MY`, `cmn-CN`, `ta-IN`. Where it's weak: `<Record>` → our STT (Gemini / Google) → orchestrator → reply. Language from `users.language` (known caller) or the DTMF menu (unknown caller) |
| **Outbound calls** (`/voice/outbound/{type}?user=…`) | `checkin` · `reminder` ("Say 'done' when you have") · `event_reminder` · `are_you_ok` ("Say yes, or say help"; 2 tries → family alert) · `sos_helper` ("Raj pressed Help near Block 123. Say 'coming' if you can go, or press 1" → `sos_responses on_way`) · `family_alert` ("Say 'call him' to connect now" → `<Dial>` the senior). Scripts from `05` §3.2, all 4 languages |
| **Retry policy** | Unanswered → retry once after 10 min (1 min in demo mode); voicemail (Twilio `AnsweredBy` machine detection) → short message + WhatsApp text |
| **Identity & safety** | Caller ID must match a registered phone. **4-digit PIN** for sensitive actions (Safe Circle, family links, phone number); otherwise "Please ask Priya to do that in the app." Never read the health card aloud. Log every call to `messages_log`, store the transcript, delete the audio |
| **TTS library** | Pre-generate all fixed prompts × 4 languages (Google Cloud TTS) into Storage; only dynamic parts (names, event titles, times) use live TTS. `<Play>` fixed + live segments |

### Lane C — WhatsApp (Ankit + B) · W2.2 · 5 h

| Flow | Detail |
|---|---|
| **Reminders** (`flows/reminders.py`) | `reminder` template ("8:00 am — Take your medicine, Mdm Tan.") + TTS voice note → [Done] [Snooze 10 min] |
| **SOS** (`flows/sos.py`) | Triggers: "HELP" / "TOLONG" / "救命" / "உதவி", a [Need help] button, or a voice note whose transcript has distress words → **immediately**: "Help is coming. If you can, call 995 now. I'm telling Priya and your neighbours." [I'm OK now] [Call my daughter] → location request (falls back to home) → B's fan-out → status updates to the member: "Priya is on her way. Ahmad (300 m) is on his way." |
| **Family templates** | `family_missed_checkin` [Call Dad] [I'll check]; `welcome_invite_family` status → "Dad joined Kampung Connect" |
| **Escalation hooks** | Ladder steps 1 and 3 call `send_template('checkin_nudge' / 'family_missed_checkin')`; WA [I'm OK] stops the ladder |
| **Voice notes** (`media.py`) | Incoming ogg/opus → download via the media API → STT in the user's language → orchestrator (no `navigate`) → text reply + optional TTS voice note (ogg/opus) → changes need [Yes] [No] buttons |

### Lane D — Design (Kavya)

- Run the real flows **on two phones** (senior + family): check-in No → walk; SOS → S30; Are you OK?; GPS walk outdoors.
- Check copy in all languages with the native-speaker reviewers: WA templates, call scripts (listen to the TTS!), S28 / S29 / S30, posture cues.

### Lane E — Business & research

- **Pitch storyline draft** (5 min): problem & insight → seniors' voices → live demo across app + WA + call → business model → impact KPIs & raiSE → close.
- **Judging-criteria mapping** to the raiSE framework (B1–B6: intentionality, additionality, proportionality, desirability, feasibility, viability).

## 5. Integration points (time-critical today)

| Time (suggested) | Handoff |
|---|---|
| 10:00 | B: escalation ladder + SOS fan-out on `demo` → C wires the WA / call steps into it |
| 12:00 | B: posture events reaching JS on the dev build → A builds the S25 shell |
| 13:00 | A: real Buddy against `/assistant/turn` → C tunes the prompts from the real transcripts |
| 15:00 | C: all outbound call types + WA SOS live → first full golden-path attempt |
| 17:00 | Golden path on real phones (exit check); fix → retry |

## 6. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | Golden path 1 → 7 on real phones | Every step works without manual DB edits |
| T2 | Escalation dry run (demo timings): Mdm Tan ignores WA check-in | Nudge at +1 min → call at +2 min (unanswered, retry) → family alert at +3 min, **in that order** |
| T3 | Same, but Mdm Tan presses [I'm OK] after the nudge | Ladder stops; no call, no family alert |
| T4 | SOS from the app, WA "TOLONG", a WA voice note "I fell", and a call "help" | Fan-out each time; all helpers alerted < 10 s; statuses visible to the senior |
| T5 | Ahmad taps **I'm on my way** on S30 / WA / says "coming" on the call | Raj's S28 shows "Ahmad (300 m away) — on his way" |
| T6 | Outdoor GPS walk ~10 min | Plausible distance, splits, privacy-trimmed route, title with the nearest park |
| T7 | Two people walk together (one with `event_id`) | "Walked with" on both summaries |
| T8 | Buddy: "Any walks tomorrow?" → "Join the first one" → Yes | Confirm → joined → WhatsApp link offered |
| T9 | Buddy: "Start a walk" / "Stop walk" | S22 opens and starts; finish → S23 |
| T10 | Call in Tamil: "remind me to take medicine at 8" | Reminder created with the correct time; appears in S26 |
| T11 | Unknown caller → language menu → short onboarding | User created; WhatsApp / SMS welcome sent |
| T12 | Sensitive change by phone without a PIN | Refused politely |
| T13 | Android sit-to-stand 10 reps | Count correct ± 1; cues spoken in the user's language; session saved; Thrive "this week" updates |
| T14 | iPhone Move Along | Fallback card + camera-free warm-up |
| T15 | Distress phrases × 4 languages through Buddy, WA and call | 100% trigger SOS |

## 7. Exit demo (15 min)

Run the golden path live with two phones (senior + family) plus a helper phone, with demo timings on. Then show one sit-to-stand set on Android and the iPhone fallback card.

## 8. Risks, fallbacks and the cut order

| Risk | Fallback |
|---|---|
| Posture module fails to build or run inside Expo (Gradle / Kotlin mismatch) | **Plan B (`07` §10):** launch RightPosture's own Android app from our app via an intent and keep integration on the roadmap. Decide by **13:00** |
| Twilio speech weak in ms / ta | `<Record>` → our STT; DTMF for yes/no everywhere |
| GPS unreliable (indoors, tall blocks) | The "simulate walk" replay of the Bishan track remains a dev toggle for the demo |
| Remote push flaky | WhatsApp + call carry the alert (the escalation already uses all channels for urgent) |
| Gemini latency > 2.5 s | Keyword pre-router for core intents; pre-generated TTS for common replies |

**If the day overruns, cut in this order** (protect the golden path):
1. Move Along shell → Plan B (launch RightPosture) or move it to 3.2
2. WA voice notes *out* (TTS reply notes); keep voice notes *in* for SOS
3. Family-alert call (keep the WA + push family alert)
4. Outbound event-reminder call (WA event reminder is enough)
5. Unknown-caller onboarding by phone

## 9. Definition of Done

- [ ] Golden path passes once on real phones (recorded)
- [ ] Escalation ladder in the correct order; stops on any answer from any channel
- [ ] SOS fan-out < 10 s; 995 always offered first; Cancel works
- [ ] Distress phrases 100% across Buddy, WA and call
- [ ] Calls in 4 languages; identity + PIN rules enforced; audio deleted after transcription
- [ ] Camera frames never uploaded; only the session summary reaches the backend
- [ ] `user_memory` merges after conversations; no long history stored
- [ ] Android (with posture) + iPhone Expo Go (fallbacks) checked
