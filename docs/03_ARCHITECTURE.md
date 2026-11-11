# System Architecture

Version 2.1 · 10 Nov 2026 · Owner: Person B (Backend & Platform)

> **Principle:** three doors, one brain. App, WhatsApp and phone calls are thin clients over **one backend, one database, one user memory, one set of agent tools**.

---

## 1. System diagram

```
            ┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
            │  Mobile App  │   │    WhatsApp      │   │   Phone Calls    │
            │ (Expo / RN)  │   │ (Meta Cloud API  │   │ (Twilio Voice +  │
            │  + Read Out  │   │  or Twilio WA)   │   │  Media Streams)  │
            │  + Buddy (mic icon)  │   │                  │   │                  │
            └──────┬───────┘   └────────┬─────────┘   └────────┬─────────┘
                   │ REST/JSON          │ webhook              │ webhook + websocket audio
                   ▼                    ▼                      ▼
           ┌────────────────────────────────────────────────────────────────┐
           │                    FastAPI backend (Python)                    │
           │                                                                │
           │  /api (app REST)   /wa/webhook   /voice/webhook  /voice/stream │
           │         │                │                │                    │
           │         └────────► Conversation Orchestrator ◄────┘            │
           │                     │  - loads user + memory summary           │
           │                     │  - LLM with tool-calling (Gemini)        │
           │                     │  - STT / TTS / translation               │
           │                     ▼                                          │
           │              Agent Tool Registry (fixed functions)             │
           │   join_event · set_reminder · check_in · get_today ·           │
           │   get_progress · trigger_sos · navigate · find_events · ...    │
           │                     │                                          │
           │  Domain services: users · circles · events · checkins ·        │
           │  reminders · safe_circle · skills · endorsements · stories     │
           │                     │                                          │
           │  Scheduler (APScheduler): check-ins, reminders, escalations,   │
           │  weekly reports        Notifier: push · WhatsApp · call · SMS  │
           └─────────────────────┬──────────────────────────────────────────┘
                                 ▼
                ┌────────────────────────────────────┐
                │ Supabase: Postgres (+PostGIS),     │
                │ Auth, Storage (audio, photos)      │
                └────────────────────────────────────┘
```

## 2. Tech stack (recommended defaults)

| Layer | Choice | Why |
|---|---|---|
| Mobile app | **React Native + Expo** (TypeScript) — **decided** | One codebase. **Android:** our own EAS build (APK) including the posture module. **iPhone:** runs in **Expo Go** (free App Store app) — no Mac, no Apple Developer account, no iOS build needed. **Expo SDK 58** (React Native 0.88.1, React 19.3.0, New Architecture), the SDK App Store Expo Go runs |
| App libraries | expo-router, i18next + react-i18next, expo-speech (on-device TTS for Read It Out), expo-audio (record voice), expo-notifications, expo-location, expo-sensors (pedometer/fall), expo-task-manager + react-native-maps (walk recording), phosphor-react-native (icons) | **Only libraries included in Expo Go**, so the same JS runs on iPhone. Sign-in uses Supabase's web OAuth flow (no native Google SDK) |
| Posture (Move Along) | **Local Expo module `modules/posture`, Android only** — Kotlin, wrapping RightPosture's engine, camera and pose code | See §2.1 |
| Backend | **Python FastAPI** | Most logic is AI/voice; team knows Python |
| Database/Auth/Storage | **Supabase** (Postgres + PostGIS, Auth, Storage) | Fast to set up; Google OAuth built in; row-level security |
| Scheduler | APScheduler in backend (or Supabase cron) | Check-ins, reminders, escalations |
| LLM | **Gemini** (function calling) now; SEA-LION (text) / MERaLiON (speech) as pitch roadmap | Free tier; multilingual |
| Speech-to-text | Gemini audio input or Google Cloud STT (en-SG, ms-MY, cmn-Hans-CN, ta-IN/ta-SG) | Four languages |
| Text-to-speech | App: device TTS (expo-speech) with cloud fallback; WhatsApp/calls: Google Cloud TTS | Read It Out works offline on device |
| WhatsApp | Meta WhatsApp Cloud API (production) · **Twilio WhatsApp Sandbox** (demo fallback) | See `06_WHATSAPP_PLAN.md` |
| Phone | Twilio Voice + Media Streams (or Ankit's Gemini Live agent behind it) | See `05_VOICE_CALL_AGENT_PLAN.md` |
| Hosting | Backend on Railway / Render / Fly.io (HTTPS needed for webhooks); ngrok for local dev | Quick public URL |
| Singpass | **Mocked** button + fake MyInfo autofill | Real access needs a registered SG organisation |

### 2.1 Posture module (Android only)

Source: Sayan's RightPosture app (`github.com/codinsayan/RightPosture_AWS`) — native Kotlin, Jetpack Compose, CameraX, MediaPipe Tasks pose landmarker.

**What we take**
- `core/` (~10k lines, pure Kotlin, no Android imports): pose maths, live `ExerciseEngine` (phase tracking, rep counting, z-scores, scoring, fault detection, one-cue-at-a-time arbitration, CUSUM fatigue), `.rpose` reference bundles.
- `camera/` (CameraX controller + preview) and `pose/` (MediaPipe `PoseLandmarkerSource`, frame mapping).
- The form-safety stop behaviour.
- **2–3 pre-authored `.rpose` bundles** for gentle, senior-safe moves: **seated knee extension**, **sit-to-stand with a chair** (both already in RightPosture's demo set). No wall sit.
- `pose_landmarker_lite.task` model only.

**What we drop**
- On-device LLM (LiteRT-LM, ~21 MB native libs, NPU/QNN path) — summaries come from our backend Gemini.
- Physio authoring pipeline UI, physio/patient roles, invites, progression approval.
- Room database and RightPosture's Supabase sync — sessions go to *our* backend.
- RightPosture's Google TTS (en-IN/Hindi) — cues are spoken by our app in 4 languages.

**Module interface (JS ↔ Kotlin)**
```ts
// modules/posture/index.ts
export const isPostureAvailable: boolean   // false on iPhone / Expo Go
<PostureCameraView
  exercise="sit_to_stand" | "seated_knee_extension"
  targetReps={10}
  onReady={() => {}}                          // camera + model loaded
  onTracking={({ visible }) => {}}            // person in frame or not
  onRep={({ count, quality }) => {}}          // quality 0–100
  onCue={({ cueId, side }) => {}}             // e.g. "straighten_back"
  onSafetyStop={({ reason }) => {}}           // form/fatigue stop
  onFinish={(summary) => {}}                  // ExerciseSessionSummary
  onError={({ code }) => {}}
/>
```
- Native side: `ExpoView` hosting CameraX `PreviewView` + a simple skeleton overlay; frames → MediaPipe → `ExerciseEngine` on a single background executor (RightPosture's threading model).
- **Cue IDs, not sentences**: the app maps `cueId` → i18n string → Read It Out voice, so cues work in English, Malay, Mandarin and Tamil.
- Release camera and model on unmount; never run the camera when the screen isn't visible.

**Build notes**
- Keep `abiFilters = ["arm64-v8a"]`; test on real arm64 phones only.
- RightPosture uses AGP 9.0.1 / Kotlin 2.0.21. **Upgrade the module to Expo SDK 58's toolchain** before writing features: **AGP 9.2.1, Kotlin 2.2.0, compileSdk 37, targetSdk 36, minSdk 24, NDK 27.1.12297006** (from React Native 0.88.1). Kotlin 2.2 needs the Compose compiler Gradle plugin (`org.jetbrains.kotlin.plugin.compose`, same version as Kotlin) if any Compose code is kept. Check that the CameraX and MediaPipe Tasks versions build with compileSdk 37. The module is an Expo module, so it runs on the New Architecture with no extra work.
- Make the 3 JVM-only spots safe for later KMP: `Rpose.kt` (zip I/O), `Phrases.kt` (`Locale`), `SyntheticLandmarkGenerator.kt` (`java.util.Random`).
- **Roadmap (after hackathon):** move `core/` into a Kotlin Multiplatform library + MediaPipe iOS pose landmarker → posture on iPhone (needs a Mac + Apple Developer account).

## 3. Data model (Postgres)

```sql
users(id, name, phone UNIQUE, language ENUM('en','ms','zh','ta'),
      channel_pref ENUM('app','whatsapp','call'), birth_year, area_name,
      home_lat, home_lng, singpass_verified BOOL, simple_mode BOOL,
      onboarded_by ENUM('self','family','admin'), status ENUM('invited','active'),
      gender, created_at)

user_memory(user_id PK, summary JSONB, updated_at)       -- the small per-user "memory"

family_links(id, senior_id, family_id, relation, can_view_report BOOL,
             can_set_reminders BOOL, status ENUM('invited','accepted'))

organisations(id, name, type ENUM('rc','centre','society','employer'),
              verified BOOL, admin_id)
org_members(org_id, user_id, role ENUM('member','admin'))

circles(id, name, type ENUM('neighbourhood','interest','org'), org_id NULL,
        captain_id, whatsapp_link, area_name, lat, lng, language)
circle_members(circle_id, user_id, joined_at)

events(id, circle_id NULL, host_id, title, category, description,
       start_at, end_at, place_name, lat, lng, capacity, language,
       skill_offer_id NULL, is_kids BOOL, whatsapp_link, status)
rsvps(event_id, user_id, status ENUM('going','cancelled'), attended BOOL)

skill_offers(id, user_id, title, tags TEXT[], availability, place_type,
             is_paid BOOL DEFAULT false, price NULL, status)
endorsements(id, from_user, to_user, event_id, skill_offer_id NULL,
             kind ENUM('thumb','voice'), audio_url NULL, transcript NULL,
             language, created_at)          -- only allowed if from_user attended event_id
stories(id, user_id, audio_url, transcript, language, prompt_text NULL,
        asked_by NULL, created_at)

checkins(id, user_id, date, question_key, answer ENUM('yes','no','none'),
         channel, answered_at)
reminders(id, user_id, text, rrule, next_at, channel, created_by, active)

safe_circle(user_id, helper_id, order_no, is_family BOOL)
sos_events(id, user_id, trigger ENUM('button','voice','volume','missed_checkin','fall','call','whatsapp'),
           lat, lng, status ENUM('open','helper_coming','resolved','cancelled'),
           created_at, resolved_at)
sos_responses(sos_id, helper_id, status ENUM('notified','on_way','arrived'), at)

health_cards(user_id, blood_group, conditions TEXT, medicines TEXT,
             notes, updated_by)                  -- encrypted at rest, private RLS

walks(id, user_id, event_id NULL, title, started_at, ended_at,
      distance_m, duration_s, moving_s, steps, avg_pace_s_per_km,
      route_polyline TEXT,            -- encoded, full precision (owner only)
      route_public_polyline TEXT,     -- home privacy zone (200 m) trimmed
      splits JSONB,                   -- [{km:1, pace_s:790}, ...]
      start_place_name, visibility ENUM('private','circle'), created_at)
walk_cheers(walk_id, from_user, kind ENUM('tap','voice'), audio_url NULL, at)
walk_stats_weekly(user_id, week_start, walks, distance_m, moving_s, steps)  -- materialised for fast trends
walk_live_shares(walk_id, viewer_id, last_lat, last_lng, updated_at)        -- safe walk sharing (P1)

exercise_sessions(id, user_id, exercise_key, started_at, duration_s,
      target_reps, reps_done, avg_quality, fatigue_detected BOOL,
      safety_stopped BOOL, top_cues TEXT[], device, created_at)   -- from posture module onFinish

messages_log(id, user_id, channel, direction, type, payload JSONB, at)
surveys(id, user_id, instrument ENUM('ucla3','ryff_purpose','who5'), score, at)
```

**Privacy rules (RLS):** health_cards and safe_circle readable only by the senior and accepted family; org admins see membership and attendance only.

### `user_memory.summary` example
```json
{
  "preferred_name": "Raj",
  "language": "ta",
  "channel_pref": "app",
  "interests": ["chess", "walking", "tai chi"],
  "circles": ["Bishan Walkers", "Block 123 Neighbours"],
  "checkin": {"streak": 5, "last_answer": "no", "goal_days_per_week": 3},
  "upcoming": [{"event_id": "e_12", "title": "Morning walk", "start": "2026-11-15T07:00+08:00"}],
  "notes": ["prefers evening walks", "teaches chess on Saturdays"],
  "last_seen": {"app": "2026-11-14", "whatsapp": "2026-11-13"}
}
```
Updated after each conversation by a short "summarise and merge" step — we never store long chat history.

## 4. App REST API (v1)

| Method | Path | Purpose |
|---|---|---|
| POST | /auth/singpass-mock | Returns fake verified profile |
| GET/PATCH | /me | Profile, language, channel, simple mode |
| POST | /family/invite | Family adds a senior (sends invite) |
| POST | /invites/{id}/accept | Senior consents |
| POST | /orgs · POST /orgs/{id}/members/bulk · GET /orgs/{id}/qr | Admin onboarding |
| GET | /home/today | Today card: check-in, next event, reminders |
| GET | /events?near=lat,lng&category= | Happenings |
| POST | /events · GET /events/{id} | Create / details |
| POST/DELETE | /events/{id}/rsvp | Join / undo |
| GET/POST | /circles · /circles/{id}/join | Circles |
| POST | /checkins | Answer check-in |
| GET | /checkins/week | Streak + 7-day bars |
| GET/POST/DELETE | /reminders | Reminders |
| POST | /sos · PATCH /sos/{id} | Trigger / resolve / cancel |
| POST | /sos/{id}/respond | Helper "on my way" |
| GET/PUT | /safe-circle | Helpers |
| GET/POST | /skills | Skill offers |
| POST | /endorsements | Thumb/voice thank-you (server checks attendance) |
| GET | /users/{id}/profile | Public profile: given, share, thank-yous |
| POST | /stories | Upload voice story |
| POST | /walks | Upload finished walk (points or polyline, steps); server computes distance, pace, splits, privacy-trimmed route, title, encouragement |
| GET | /walks/{id} | Walk summary (public route unless owner) |
| GET | /walks?period=week\|month | History list |
| GET | /walks/stats | Totals, comparison sentence, personal bests |
| GET | /circles/{id}/walks | Group walk feed |
| POST | /walks/{id}/cheers | Cheer (tap or voice) |
| POST | /walks/{id}/live | Safe walk sharing location ping (P1) |
| POST | /exercise-sessions | Save a Move Along session summary (Android) |
| GET | /exercise-sessions?period=week | Warm-up history for Thrive weekly summary |
| POST | /assistant/turn | Voice helper: audio/text in → reply + tool actions + `ui_actions` |
| POST | /tts · /translate | Cloud TTS and translation fallback |

## 5. Agent tool registry (shared by Buddy, WhatsApp and calls)

The LLM may **only** call these. Every tool that changes data returns a `needs_confirmation` payload first unless the user already confirmed.

| Tool | Args | Effect |
|---|---|---|
| `get_today` | – | Today's check-in, events, reminders |
| `find_events` | category?, when?, near? | Up to 3 events |
| `join_event` | event_id | RSVP + returns WhatsApp link |
| `cancel_event` | event_id | Undo RSVP |
| `check_in` | answer (yes/no) | Record check-in; on "no" returns a walk suggestion |
| `set_reminder` | text, time, repeat? | Create reminder |
| `list_reminders` / `delete_reminder` | id | Manage reminders |
| `get_progress` | period (week) | Streak, events, sessions taught, thank-yous |
| `get_walk_stats` | period (week/month), last? | Distance, walks, time, steps, last walk summary, personal bests |
| `start_walk` / `finish_walk` (app only) | – | Returns `ui_action` to start/stop recording |
| `start_warmup` (app, Android only) | exercise? | Opens Move Along; on iPhone replies that warm-ups are available on Android |
| `create_event` | title, when, where | Start Something |
| `offer_skill` | title, availability, place | Pass It On |
| `record_story` / `send_thanks` | audio | Stories / endorsements |
| `trigger_sos` | reason? | Starts Safe Circle immediately (no confirmation) |
| `navigate` (app only) | screen, params | Returns `ui_action` for the app to perform |
| `read_screen` (app only) | – | App sends screen script; helper reads it |
| `set_language` | lang | Switch language |

**Guardrails (system prompt):** no medical advice (suggest contacting family/doctor; offer SOS if urgent words are heard), no money, no message drafting, ≤ 2 short sentences, answer in user's language, always confirm changes, hand off to people/events rather than long chit-chat.

## 6. Scheduler jobs

| Job | When | Logic |
|---|---|---|
| Morning check-in | 08:00 user local (configurable) | Send via `channel_pref` |
| Check-in reminder | +2 h if no answer | Same channel, gentle |
| Check-in call | +3 h if no answer | Outbound call ("Are you OK?") |
| Family alert | +4 h if no answer | Push + WhatsApp to family; logs `sos_events(trigger=missed_checkin, status=open)` low urgency |
| Reminders | `next_at` | Send + compute next from rrule |
| Event reminder | 1 h before start | To all `going` |
| Thank-you prompt | 1 h after event end | To attendees |
| Thinking of You | Weekly | Members absent 14 days → captain nudge |
| Weekly Joy Report | Sunday 18:00 | Family summary (respect sharing settings), includes walking totals |
| Walk stats rollup | On each `POST /walks` + nightly | Update `walk_stats_weekly`, personal bests, milestone messages |

### Walk processing (server, on `POST /walks`)
1. Filter GPS points (accuracy > 30 m, impossible jumps) → recompute distance (haversine) and moving time.
2. Splits per km; average pace = moving time ÷ distance.
3. **Privacy zone:** remove points within 200 m of `home_lat/lng` → `route_public_polyline`.
4. Title: time-of-day + nearest park/place (static list of SG parks/CCs for the demo; reverse geocode later).
5. Link to group walk: if `event_id` set, or another member's walk overlaps ≥ 70% in time and starts within 300 m → "Walked with".
6. Update weekly stats; detect personal bests; write a friendly encouragement line (template-based, translated — no LLM needed).

## 7. Notifier and escalation ladder

```
notify(user, message, urgency):
  normal  → channel_pref only
  high    → app push + WhatsApp
  urgent  → app push + WhatsApp + phone call (SOS, family alerts)
SOS fan-out: family helpers (all) + 2 nearest non-family helpers by PostGIS distance (≤ 2 km)
```

## 8. Security & privacy
- Supabase Auth; JWT on all app calls; webhook signature verification (Meta `X-Hub-Signature-256`, Twilio signature).
- Phone-call identity: caller ID matched to registered phone; PIN (4 digits, set by family) for sensitive changes (Safe Circle, family links).
- Health card encrypted column; never sent to LLM.
- Camera frames for posture are processed **on the phone only** and never uploaded; only the session summary (reps, quality, cues) reaches the backend.
- LLM receives only `user_memory.summary` + current turn.
- Consent records for every onboarding by family/admin.
- Data retention: voice audio kept only for stories/thank-yous the user published; call/WA audio transcribed then deleted.

## 9. Environments & repo

```
bricks/
  app/          Expo app (Person A)
  backend/      FastAPI: api/, services/, agent/, scheduler/, db/ (Person B)
  channels/     whatsapp/, voice/ handlers + prompts (Person C) — imported by backend
  shared/       i18n strings (en, ms, zh, ta), tool schemas, types
  docs/         these files
```
Environments: `local` (ngrok) · `demo` (hosted, seeded data). **Seed script** creates: 3 circles, 8 events around Bishan/Toa Payoh, 5 users (Raj, Mdm Tan, Priya, Ahmad, Lim), streaks and thank-yous so every screen looks alive — including **3 weeks of walks for Raj** (2 group walks with others) and one recorded GPS track around Bishan Park for the in-app "simulate walk" replay.


## 10. Backend build by phase and iteration (Person B)

Iteration dates: `07_PROJECT_WORKFLOW.md`.

### Phase 0 — Foundations
**Iteration 0.1 — Repo and contracts**
- Monorepo, branch protection, PR template, `.env.example`.
- **Posture module skeleton:** `app/modules/posture` (Android), RightPosture `core/` + `camera/` + `pose/` copied in, Gradle/Kotlin versions aligned with Expo's Android project, empty `PostureCameraView` renders a camera preview in an EAS development build.
- Supabase project; migration v1 (all tables in §3, including walks).
- FastAPI skeleton, `/health`, deploy to Railway/Render; ngrok for local webhooks.
- Publish API contract (§4) and tool schemas (§5) — agreed with A and C.

**Iteration 0.2 — Seed data**
- `seed.py`: 5 users (Raj, Mdm Tan, Priya, Ahmad, Lim), 3 circles, 8 events around Bishan / Toa Payoh with real photos, streaks, thank-yous, 3 weeks of walks for Raj (2 group walks), one recorded Bishan Park GPS track. Export the same data as JSON for the app's `mocks/`.

### Phase 1 — APIs against seed data (app builds on mocks in parallel)
**Iteration 1.1** — `/me`, `/home/today`, `/events` (list, detail, create, RSVP + undo), `/circles` (list, detail, join).
**Iteration 1.2** — `/checkins` (+ week), `/reminders`, `/sos` (create, status, respond, resolve), `/safe-circle`, `/walks` (upload, processing pipeline in §6, history, stats).
**Iteration 1.3** — `/auth/singpass-mock`, Google auth via Supabase, `/family/invite` + accept, `/skills`, `/endorsements` (attendance check), `/users/{id}/profile`, `/stories`; `/assistant/turn` stub with canned replies.

### Phase 2 — Live system
**Iteration 2.1** — RLS policies; scheduler skeleton (morning check-in, reminders, event reminders); notifier (push via Expo, WhatsApp via C's sender, calls via C's voice module).
**Iteration 2.2** — Escalation ladder (check-in → nudge → call → family alert); SOS fan-out with PostGIS nearest helpers ≤ 2 km; real `/assistant/turn` with Gemini tool-calling (with C); `user_memory` summarise-and-merge after each conversation.
- **Posture integration (Android):** MediaPipe → `ExerciseEngine` running inside the module; events (`onRep`, `onCue`, `onFinish`…) reaching JS; 2 `.rpose` bundles loaded; `/exercise-sessions` endpoint.
**Iteration 2.3** — Demo environment hosted and seeded; demo reset endpoint; logging and basic monitoring; load test the golden path.

### Phase 3 — Hackathon
**Iteration 3.1** — Stabilise; add judge accounts; venue network fallbacks.
**Iteration 3.2** — Group walk matching + cheers (`/circles/{id}/walks`, `/walks/{id}/cheers`), weekly progress image card, admin org + QR + bulk members, Move Along polish with A (overlay, safety stop, cue mapping in 4 languages), weekly Joy Report.
**Iteration 3.3** — Impact metrics endpoint for the pitch (output KPIs from data + outcome survey scores); backup recordings; code freeze H30.
**Iteration 3.4** — System-design Q&A slides (this doc's diagram, data model, privacy).

| ID | Task | Iteration | Est. |
|---|---|---|---|
| B0.1 | Repo, Supabase schema v1, FastAPI skeleton, deploy, contracts | 0.1 | 3 h |
| B0.2 | Seed script + mock JSON export | 0.2 | 2 h |
| B1.1 | Me, home, events, circles APIs | 1.1 | 4 h |
| B1.2 | Check-ins, reminders, SOS, safe circle, walks + processing | 1.2 | 6 h |
| B1.3 | Auth, family invite, skills, endorsements, profile, stories, assistant stub | 1.3 | 5 h |
| B2.1 | RLS, scheduler, notifier | 2.1 | 4 h |
| B2.2 | Escalation ladder, SOS fan-out, real assistant + memory (with C) | 2.2 | 6 h |
| B0.1b | Posture module skeleton + Gradle/Kotlin alignment | 0.1 | 3 h |
| B2.2b | Posture engine integration + events + bundles + `/exercise-sessions` | 2.2 | 6 h |
| B2.3 | Demo env, reset, logging, golden-path load test | 2.3 | 3 h |
| B3.x | Group walks + cheers, progress card, admin QR, Move Along, Joy Report, impact metrics | 3.2–3.3 | 10 h |
