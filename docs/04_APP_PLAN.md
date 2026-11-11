# Mobile App Build Plan

Version 2.1 · 10 Nov 2026 · Owner: **Person A (App & UX build)** · Reviewers: Kavya (design), Person B (API)

Read first: `02_DESIGN_PRINCIPLES.md`, `02b_SCREEN_DESIGNS.md` (screen IDs S1–S40), `03_ARCHITECTURE.md`. Iteration dates are in `07_PROJECT_WORKFLOW.md`.

---

## 1. Stack and setup

- **React Native + Expo (TypeScript)**, expo-router.
- **Expo SDK 58** (`expo ~58.0.23`), **React Native 0.88.1**, **React 19.3.0**, **New Architecture only**. Node.js `^22.13` or `^24.3`.
- Libraries:
```
npx create-expo-app@latest app --template blank-typescript@sdk-58
cd app
npx expo install expo-router expo-linking expo-constants expo-status-bar \
  react-native-safe-area-context react-native-screens \
  expo-speech expo-audio expo-notifications expo-location expo-sensors expo-haptics \
  expo-localization expo-font expo-splash-screen expo-secure-store expo-task-manager \
  expo-keep-awake expo-contacts expo-auth-session expo-web-browser expo-crypto \
  react-native-maps react-native-svg expo-dev-client
npm i i18next react-i18next zustand @tanstack/react-query phosphor-react-native \
  @mapbox/polyline
npx expo install --check && npx expo-doctor
```
- **`expo-av` is not in SDK 58**: record and play voice with **`expo-audio`** (`useAudioRecorder` / `useAudioPlayer`). Read It Out stays on `expo-speech`.
- Add native packages **only** with `npx expo install` (never a bare `npm i`), so versions match SDK 58. Never run `npm audit fix --force`.
- **Only libraries included in Expo Go** in shared code (all of the above are), so the same JS runs on iPhone in Expo Go. The posture module is the single exception and is Android-only.
- Sign-in via Supabase web OAuth (`expo-auth-session` / `expo-web-browser`), not a native Google SDK.
- Stay on **SDK 58** for the build week (App Store Expo Go runs only SDK 58 since 11 Nov). Patch updates via `npx expo install --fix` only; check Expo Go → Settings before each iPhone test.

### 1.1 Platforms and distribution

| | Android | iPhone |
|---|---|---|
| How it runs | Our **EAS development build** (daily work) and **EAS preview APK** (demo), downloaded by QR | **Expo Go** (free, App Store) → scan our QR |
| Needs Mac / Apple account | No | **No** |
| Move Along (posture) | Yes — `modules/posture` | Shows "Available on Android" |
| Remote push (server-sent) | Yes | **No in Expo Go** — SOS and family alerts arrive by WhatsApp + phone call; local scheduled reminders and check-ins still work |
| Walk recording | Background (screen locked) | **App open only** — keep screen awake on the recording screen; show "Keep this screen open while you walk" |
| Who tests | Person A, daily, on a real arm64 phone | **Singapore team (Santusht, Ken, Kavya) at the end of every iteration** — 10-minute check of new screens |

- Feature flags in `lib/platform.ts`: `canUsePosture` (module present), `canUseRemotePush` (dev build), `canRecordInBackground`. UI reads these flags — never `Platform.OS` scattered around screens.
- Fonts: Noto Sans, Noto Sans SC, Noto Sans Tamil (Regular 400, Semibold 600, Bold 700).
- Icons: **phosphor-react-native only** (Bold for buttons/tabs, Regular inline). No emojis anywhere.

Folder structure:
```
app/
  app/
    (onboarding)/language, who, signin, name, area, interests, voice-intro,
                 safe-circle, channel, done, family-add, family-status
    (tabs)/_layout            # Home (default) | Pass It On | Kampung | Thrive
    (tabs)/kampung/index, event/[id], going/[id], create, circles, circle/[id]
    (tabs)/thrive/index, checkin, reminders, walk/record, walk/[id], walks, move
    (tabs)/pass-it-on/index, share-skill, stories
    home, profile/[id], thanks/[eventId], sos, are-you-ok, helper-alert/[sosId],
    settings, simple, admin/index, dev/components
  components/                 # see design system §6
  theme/tokens.ts             # only place with sizes/colours
  i18n/en.json ms.json zh.json ta.json
  lib/api.ts readout.ts voice.ts walk.ts notifications.ts location.ts platform.ts
  modules/posture/            # Android-only Expo module wrapping RightPosture (see 03_ARCHITECTURE §2.1)
    android/  src/  index.ts  expo-module.config.json
  mocks/                      # mirrors backend seed
```

## 2. Engines (shared logic)

### 2.1 Read It Out (`lib/readout.ts`)
- Each screen registers `useReadOut(() => [{text, targetRef?}])` — script from `02b`.
- `expo-speech` with `en-SG | ms-MY | zh-CN | ta-IN`, rate 0.85.
- On startup check `getAvailableVoicesAsync()`; if Malay/Tamil voice missing → backend `/tts` audio (pre-generated for P0 phrases).
- Highlights `targetRef` while speaking; Pause / Repeat / Slower bar (S37); auto-read setting.

### 2.2 Voice helper (`lib/voice.ts`)
- Tell me → record (expo-audio, max 15 s, stop on 1.5 s silence) → `POST /assistant/turn` with screen name + read-out script → execute `ui_actions` (navigate, highlight, confirm) → speak reply.
- Mock mode (Phase 1): keyword intents per language — today, join, check in yes/no, remind me, start/stop walk, help, open profile.

### 2.3 Walk tracking (`lib/walk.ts`)
- Foreground + background location (`watchPositionAsync` + `expo-task-manager`), points every ~5 s / 10 m; drop accuracy > 30 m and jumps > 50 m in 5 s.
- Distance = haversine sum; steps from `Pedometer` (fallback distance ÷ 0.7 m).
- Auto-pause: speed < 0.3 m/s for 20 s; moving time separate.
- Optional spoken update each km. `expo-keep-awake` on record screen. Persist points every 30 s.
- Finish → `POST /walks` → server returns summary (splits, pace, privacy-trimmed route, title, encouragement).
- Dev: **simulate walk** replays a recorded Bishan Park GPS track (for indoor demos).

### 2.4 Move Along — posture (Android only)
- Screen `thrive/move.tsx` (S25) renders `<PostureCameraView>` from `modules/posture` when `isPostureAvailable`; otherwise an info card "Gentle warm-ups with the camera are available on Android" + a link to a guided warm-up **without camera** (instructions read aloud, tap "Done" per move) so iPhone users still get something.
- Flow: choose exercise (2 photo cards) → "Place your phone on a table, 2 metres away, so we can see your whole body" (read aloud) → wait for `onReady` + `onTracking(visible)` → 3-2-1 → reps.
- `onRep` → big count "6 of 10" + soft tick sound + count read aloud every rep.
- `onCue` → one sentence in big text from i18n (`posture.cue.straighten_back`) and spoken via Read It Out voice; max one cue every 5 s (engine already arbitrates).
- `onSafetyStop` → stop screen: "Let's stop here and rest." No blame.
- `onFinish` → summary card (reps, "steady" / "getting tired near the end" in plain words) → `POST /exercise-sessions` → counts toward Thrive "this week".
- Camera permission asked only when the first warm-up starts, with a one-line reason.

### 2.5 Notifications
- expo-notifications categories: check-in (Yes/No), reminder (Done/Snooze), event reminder, thank-you prompt, SOS alert (helpers, high priority).
- **Remote push works only in our Android build.** In Expo Go on iPhone use **local scheduled notifications** for check-ins and reminders; server-triggered alerts (SOS, family alerts, missed check-in) go out by WhatsApp and phone call.

## 3. Build by phase and iteration

Legend: **Screens** refer to `02b_SCREEN_DESIGNS.md`. Every item must pass the UX Definition of Done (`02_DESIGN_PRINCIPLES.md` §11) before the iteration is closed.

### Phase 0 — Foundations

**Iteration 0.1 — Project skeleton**
- Expo project, router, tab shell (Kampung default), fonts, `theme/tokens.ts` (type, colour, radius, spacing from design system §5).
- `i18n` setup with key structure (`screen.element`), English only for now.
- Mock data layer (React Query hooks reading `mocks/`).
- Create the project on **Expo SDK 58** (what App Store Expo Go runs); posture module on SDK 58's Android toolchain (`03` §2.1); EAS development build for Android set up (needed for the posture module).
- **Done when:** app runs on an Android phone (dev build) and on an iPhone in Expo Go (checked by the Singapore team); tokens merged.

**Iteration 0.2 — Core components**
- BigButton, YesNo, EventCard, StatCard, Tile, ClubCard, PromptCard, VoiceNoteBubble, ScreenHeader, TellMeButton, ListeningSheet, ConfirmSheet, UndoBar, StepProgress, StatusBanner, EmptyState.
- `/dev/components` gallery: every component at 100% and 200% font, in English and a Tamil placeholder string.
- **Done when:** Kavya signs off the gallery against the Mobbin board.

### Phase 1 — Clickable P0 app on mock data (for filming 12 Nov)

**Iteration 1.1 — Home + Kampung**
- S12 Home · S14 Happenings · S15 Event details · S16 You're going (+ UndoBar) · S17 Start Something · S18 My Circles · S19 Circle page (header, upcoming, Join WhatsApp group).
- Help button wired to S28 placeholder.
- **Done when:** "join a walk from Home in 1 tap, from Happenings in 2 taps" works on mock data.

**Iteration 1.2 — Thrive + Safety**
- S20 Thrive main · S21 Check-in (Yes / No → walk suggestion) · S26 Reminders (form + mock voice) · S22 Walk recording on simulated track · S23 Walk summary (mock) · S28 SOS screen (UI + countdown + cancel).
- **Done when:** check-in "No" → join walk works; simulated walk → summary works; SOS opens from every screen.

**Iteration 1.3 — Onboarding + Pass It On + speech + languages (filming build)**
- S1–S4, S6–S8 onboarding (Myself) · S9–S10 family add + status · S31 Pass It On · S32 Share a skill · S33 Profile · S34 Thank-You Wall + prompt · S40 Settings (language, read aloud).
- Read It Out engine on **every** built screen (S37) · mock Buddy (S36) · translations ms/zh/ta dropped in from Person C · Tamil layout fixes.
- Publish via **EAS Update** link for Santusht/Ken.
- **Done when:** a senior can do the 5 test tasks (design system §10) in any of the 4 languages, on mock data — on Android **and** on an iPhone in Expo Go.

### Phase 2 — Real backend and live channels

**Iteration 2.1 — Wire to the backend**
- Swap mock hooks → `lib/api.ts`; Google sign-in + Singpass mock (S3); onboarding writes to `/me`; family invite (`/family/invite`) and invite status.
- Push notifications registered; S38 notification copy.
- Fix the top issues from the 12 Nov filming (Kavya + Santusht list).
- **Done when:** a new user onboarded in the app appears in the database and sees seeded events.

**Iteration 2.2 — Real features**
- Real check-in (`/checkins`) with push Yes/No actions on Android, local scheduled notifications on iPhone · real reminders (local + server) · **real GPS walk recording + upload + server summary** (S22, S23) · real SOS (`/sos` with location, live status) · S29 Are you OK? · S30 Helper alert · real Buddy via `/assistant/turn` (S36).
- **Move Along shell (Android):** S25 wired to `PostureCameraView` from Person B's module; rep/cue/finish events shown and read aloud; iPhone fallback card.
- **Done when:** golden path works on two real phones (senior + family): check-in No → join walk → record a short walk → summary; SOS → family phone shows S30; one sit-to-stand set counts reps on Android.

**Iteration 2.3 — Integration and freeze for travel**
- Cross-channel checks: RSVP made on WhatsApp shows in app; reminder set by phone call shows in S26.
- Demo reset (hidden in settings), seeded demo accounts, error/empty states (S39) everywhere.
- Build: EAS Android preview APK + EAS Update `demo` channel (which Expo Go on iPhone loads from the QR).
- **Done when:** golden path passes 3 times in a row; main is tagged `v0.9-demo`.

### Phase 3 — Hackathon (36 hours)

**Iteration 3.1 — Stabilise at the venue (H0–H8)**
- Test on venue Wi-Fi and mobile hotspot; fix crashes; check background location permissions on judges' phone types.
- Two QR codes on the slide: **Android** → APK download; **iPhone** → "Install Expo Go, then scan" → seeded "Judge" account. Plus the WhatsApp QR and phone number for judges who don't want to install anything.

**Iteration 3.2 — P1 features (H8–H20)** — pick in this order, stop when time runs out:
1. S24 Walk history & trends + personal bests
2. S19 group walk feed + Cheers
3. S13 Simple Mode
4. S11 Admin QR onboarding
5. S25 Move Along polish (overlay, safety stop, second exercise, cue translations) — Android; camera-free guided warm-up on iPhone
6. S27 Health Card, S35 Life Stories, S10 family overview

**Iteration 3.3 — Polish and proof (H20–H30)**
- Quick usability test with any seniors available at/near the venue; fix top 3 issues.
- Visual pass against the Mobbin board: spacing, radius, one accent colour, no stray icons.
- Record backup screen videos of every demo step. **Code freeze at H30.**

**Iteration 3.4 — Rehearse (H30–H36)**
- Run the live demo 5 times; demo reset between runs; help prepare system-design Q&A slides.

## 4. Task checklist with estimates

| ID | Task | Iteration | Est. |
|---|---|---|---|
| A0.1 | Expo setup, router, tabs, fonts, tokens, i18n skeleton, mocks | 0.1 | 3 h |
| A0.2 | Core components + dev gallery | 0.2 | 4 h |
| A1.1 | Home, Happenings, Event details, You're going, Start Something, Circles, Circle page | 1.1 | 7 h |
| A1.2 | Thrive main, Check-in, Reminders, Walk record (simulated), Walk summary (mock), SOS UI | 1.2 | 7 h |
| A1.3 | Onboarding, Family add/status, Pass It On, Share a skill, Profile, Thank-You Wall, Settings, Read It Out everywhere, mock Buddy, translations | 1.3 | 9 h |
| A2.1 | API wiring, auth, onboarding writes, push, filming fixes | 2.1 | 5 h |
| A2.2 | Real check-in, reminders, GPS walks, SOS + helper alert, Are you OK?, real Buddy | 2.2 | 8 h |
| A2.2b | Move Along shell on posture module events + iPhone fallback | 2.2 | 3 h |
| A2.3 | Cross-channel checks, demo reset, empty/error states, builds | 2.3 | 3 h |
| A3.1 | Venue stabilisation, judge QR path | 3.1 | 3 h |
| A3.2 | P1 features in order | 3.2 | 8–10 h |
| A3.3 | Usability fixes, visual pass, backup videos | 3.3 | 5 h |
| A3.4 | Rehearsals | 3.4 | 2 h |
