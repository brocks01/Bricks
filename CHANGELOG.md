# Changelog

All progress on Bricks, newest first. Each iteration doc in [iterations/](iterations/) holds the full
plan and its Outcome section; this file is the running summary, kept so anyone (or any agent)
picking the work up knows where things stand and why.

**How to update:** add an entry under *Unreleased* with every change, move it under a dated
heading when it's committed, and keep *Current state* and *Open items* true. Never write secrets,
keys or personal URLs here.

---

## Current state (Wed 11 Nov 2026)

| Track | Done | Next |
|---|---|---|
| App | 0.1, 0.2, 1.1, 1.2, 1.3, 2.1, 2.2 | Voice-driven Buddy (with voice 2.1), then 2.3 integration freeze; Luma-style UI redesign (design system done; screens next) |
| Voice / call agent | 0.1 (code in the API; real call pending), 0.2 contracts (approved, re-run for "show, don't tell"), 1.1 + 1.2 translations waves 1–2 and call prompts (done) | 1.3 translations wave 3 + inbound call loop, 2.1 real `/assistant/turn` |
| WhatsApp | – | 0.1 access (needs Meta keys) |

**Running it locally**
- Backend: `cd backend && uv run python -m bricks_api` (port 8000), exposed with ngrok. The
  app's `EXPO_PUBLIC_API_URL` points at the ngrok address.
- App on the phone: EAS **development** build ("Bricks (Dev)") + `npx expo start --dev-client`
  (with `APP_VARIANT=development`); USB: `adb reverse tcp:8081 tcp:8081`. Code changes load
  live; only new native modules need a new EAS build (about 25 min).
- Standalone APK: EAS **preview** profile ("Bricks").
- Database: Supabase Postgres, schema `bricks`, via the session pooler. `uv run python -m
  bricks_api.seed` **wipes every table** and reloads the sample data; run it only on purpose.
- Some networks block ports 5432 / 6543 to the pooler; use another network or WARP. After a
  network switch, restart the backend (its database pool times out at startup otherwise).

**Environment files** (all git-ignored; templates are the `.env.example` files)
- `backend/.env`: Supabase URL and secret key, `DATABASE_URL`, `DEMO_MODE`, `GEMINI_API_KEY`
  (free-tier project, no billing), `PUBLIC_BASE_URL`, Twilio SID / token / `TWILIO_NUMBER`
  (a US voice number on a **trial** account; its webhook still points at Twilio's demo).
  Still empty: Google service account, Meta WhatsApp keys.
- `app/.env.local`: API URL, `EXPO_PUBLIC_USE_MOCKS=false`, Supabase URL and publishable key.
- Google Maps Android key: only as the EAS environment variable `GOOGLE_MAPS_ANDROID_API_KEY`
  (development + preview), restricted to the two Android package names. iOS uses Apple Maps.

**Team rules**
- Commits are authored by the repo owner only, no AI co-author lines.
- Docs name work streams, never people.
- No `.env` or key files are ever committed.

---

## Unreleased

### App: Luma-style redesign, first pass (design system)
- Theme: ink-black main colour (was blue), Luma's soft greys, pill buttons, rounder cards
  (20), photo tiles (14), floating sheets (28) and one floating shadow (`theme/tokens.ts`).
  Light mode only; all colours are in one place so dark mode can follow.
- Tab bar: a white pill floating above the content, with the selected tab in a grey pill.
- Cards, Home section cards and the Back button are grey panels/pills with no borders;
  secondary buttons are grey pills; bottom sheets float as rounded panels.
- Event cards are Luma event rows: square photo on the left, host, title, when, where and
  how many are going, then the "I'm going" pill.
- No new native libraries (no rebuild needed): it reaches the phone over Metro. 506 app tests
  pass.
- Next: event page with a cover-tinted background, Community list and map, sheets with an icon
  header, toasts, Profile and Settings as grouped lists.
- `docs/design/LUMA_REDESIGN_PROMPT.md`: one prompt to hand the rest of the redesign to an
  agent on another PC (context, decisions, accessibility rules, a 9-step plan with Luma screen
  numbers, checks). `Luma ios Sep 2026/` is now git-ignored.

### App: tabs renamed and reordered (start of the Luma-style redesign)
- Tabs are now **Home · Community · Activity · Health** (were Home · Pass It On · Kampung ·
  Thrive). Community = Kampung, Activity = Pass It On, Health = Thrive; routes are unchanged
  (`/kampung`, `/pass-it-on`, `/thrive`).
- Same names on the Home cards (now in tab order), screen titles, read-outs and messages, in all
  4 languages: ms Komuniti / Aktiviti / Kesihatan, zh 社区 / 动态 / 健康, ta சமூகம் /
  செயல்பாடுகள் / நலம். To avoid two things sharing one name: the Malay events list is now
  "Acara", and the Chinese Activity tab is 动态 (活动 stays the events).
- Buddy understands the new names and still the old ones. 496 app tests pass (8 updated to the
  new names, 10 Buddy phrases added).

### Voice 1.2: translations wave 2 (Thrive and SOS) + call prompts
- About 148 Thrive / check-in / walk / reminder / notification / safety / SOS strings reviewed in
  Malay, Chinese and Tamil, SOS first: Malay "Sedang meminta bantuan", Safe Circle "Kumpulan
  Selamat" everywhere (Buddy understands both names), "Soalan pagi" in place of "Daftar masuk";
  Tamil "உதவி அழைக்கிறோம்", "tap" = தொடுங்கள் everywhere; Chinese check-in wording matches.
- Read-outs say units in words: `sayDistance`, `sayMinutes`, `sayDigits` and the `units.spoken.*`
  keys ("2.4 kilometres", "32 minutes", "9 9 5"). 496 app tests pass.
- Call prompts: `backend/src/bricks_api/calls/prompts/` has 13 prompts × 4 languages, split into
  fixed (pre-generated) and live sections, with a README (rules, what callers say per language)
  and PRONUNCIATION.md. `calls/prompts.py` loads them; `/voice/incoming` and `gen_audio` use
  them. 170 backend tests pass.
- Restart the backend before the next test call.

### Voice 1.1: translations wave 1 (Home and Kampung)
- 182 strings checked in Malay, Chinese and Tamil: none missing or left in English, placeholders
  kept, no "RSVP" / "elderly" words.
- Fixes: Tamil read-outs no longer say "2 / 5" (read as a slash), now "படி 2, மொத்தம் 5 படிகள்";
  Malay Play button "Mainkan"; a more natural Chinese hint on Start Something.
- Review sheet for native speakers: `docs/translations/wave-1-review.xlsx` (Tamil lines over
  1.5× English marked; notes say what changed and why).
- Language review done in the team (second pass): Malay "Saya ikut", Circle "Kumpulan",
  "bertegur sapa", "tidak jadi pergi", jam/saat; Chinese No "否", Circle captain "组长"; Tamil Undo
  "ரத்து செய்", Play "கேளுங்கள்", afternoon "வணக்கம்", units written out. 495 app tests pass.
- Left open: Malay "Selamat malam" from 5 pm; Malay Safe Circle naming (wave 2).

### Voice 0.1: hello-world call, moved into the API
- The parked 0.1 code (local stash, never committed) now lives in `bricks_api`:
  `POST /voice/incoming` greets in English, Malay, Chinese and Tamil ("Hello, this is Bricks"),
  rejects webhooks Twilio didn't sign (403), and serves pre-generated call audio at
  `/static/voice/` (optional generator: `python -m bricks_api.calls.gen_audio`).
- New settings: `PUBLIC_BASE_URL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER`,
  `TWILIO_VALIDATE_SIGNATURE`. New dependency: `twilio`.
- Tests: `tests/test_calls_incoming.py`, 4 pass (no database).
- Waiting: the number's webhook set in the Twilio console, then a real test call.

### Voice 0.2: contracts (approved Wed 11 Nov)
Buddy's "brain" contracts, shared by the app, phone calls and WhatsApp. Lives in
`backend/src/bricks_api/assistant/`.
- **System prompt** `system_prompt.md` + `prompt.py`: speaks the member's language, 2 short
  sentences, acts only through tools, asks "Is that right?" before any change, SOS first, no
  medical / money advice, offers 2–3 choices when it doesn't understand. Knows today's date and
  time (Singapore), the member's name and the channel; calls and WhatsApp never mention screens.
- **Tools** `tools.json` + `tools.py`: 22 Gemini function declarations (look-ups, join / cancel,
  reminders, check-in, walks, warm-ups (Android only), create event / offer skill (P1),
  navigate, read screen, fill field, SOS, language). Each says whether it changes data (needs a
  Yes), which channels get it and which app action it triggers.
- **Distress list** `distress.json` + `distress.py`: emergency words in English, Malay, Chinese
  and Tamil, checked in **all** languages **before** the model, so SOS never depends on AI.
  The app's own Buddy opens SOS for every phrase too (`distress-sync.test.ts`).
- **Turn contract** `contract.py` (app copy in `app/src/api/types.ts`): `TurnIn` (audio or text,
  screen, form fields, platform, Yes / No answer) → `TurnOut` (transcript, reply, audio URL,
  ordered `ui_actions`, done).
- **Decisions approved:** all 9 in [0.2-contracts.md](iterations/voice-call-agent/0.2-contracts.md) §6.
- **Model:** `gemini-3.5-flash` (2.5 models aren't offered to new projects; 3.8 / 3.7 flash were
  overloaded), fallback `gemini-3.1-flash-lite`; overridable with `GEMINI_MODEL`.
- Live check passed: Gemini accepts all tools and picks `get_today` for "What's on for me today?".

### Voice 0.2 re-run: "show, don't tell" and the wake word
Direction agreed at review (app only for now):
- **Wake word "Buddy"** while the app is open (plus the round button). "Buddy, help" /
  "Buddy, stroke" go straight to SOS; "help" alone does nothing, so normal talk never triggers
  the app. Engine: **Vosk** (`react-native-vosk`, open source, offline, grammar of just
  "buddy"); Picovoice dropped (wants a business account). After the wake word, the phone's own
  recogniser takes the command in the member's language.
- **Show, don't tell (main rule):** every command visibly changes the screen. Buddy opens the
  screen, types into fields, picks options, scrolls and highlights while the member watches.
  The member can carry on by hand or by voice at any point; Buddy keeps what they typed. Saving
  still needs a Yes. Saying "done" while the screen stays the same is a bug.
- **Buddy decides** per command: answer a question, or call a tool.
- Contract changes: `TurnIn.screen_fields` (the form on screen and its values), new
  `ui_action` `fill {target, value}`, new app tool `fill_field`, `highlight` also scrolls,
  `ui_actions` play in order. The app prompt carries the show-don't-tell rule.
- Tests: backend 79 pass. Live: with "Saturday" picked by hand, "call it Morning walk, at Bishan
  Park" → `fill_field(title)` + `fill_field(place)`, day left alone.

---

## Wed 11 Nov 2026: App 2.2 (app side), voice, Buddy everywhere (`d184ea1`)
- **Release crash fixed:** R8 removed WorkManager's database class; keep rules added via
  `expo-build-properties`.
- **Real speech recognition:** `expo-speech-recognition` (en-SG, ms-MY, cmn-Hans-CN, ta-IN) for
  "Say it instead" and Buddy; falls back to recording where it's missing (Expo Go).
- **Buddy everywhere:** a round floating Buddy button (mic, pulse while listening) on every
  screen, replacing the "Tell me" bar. Hidden on safety screens (SOS, Are you OK?, helper
  alert) and the recording screens. Keyword navigation in 4 languages ("open settings", "go
  back"…). Full understanding comes with voice 2.1.
- **Start Something:** every question has an own-answer option: "Something else" (type it),
  "Another day" (day / week adjuster, up to 90 days), "Another time" (warns if too soon),
  "Somewhere else" (type the place).
- Smaller: tab labels fit on one line, notification channels no longer ask for a missing sound,
  Top bar Help button can't push the title off screen.
- EAS project set up (development / preview / production profiles); Google Maps key wired in
  through an EAS env var.
- Tests: 29 suites, 495 pass.

## Wed 11 Nov 2026: App 2.1, wired to the backend (`4c3bc57`)
- **Backend** `bricks_api` (FastAPI, uv, psycopg pool, Supabase Postgres): me, events, circles,
  family, Pass It On, SOS, Thrive (check-in, reminders), walks, voice upload; seed data; demo
  mode acting as the sample member. CI workflow for the backend.
- **App:** real HTTP client with online / offline handling, Google sign-in through Supabase,
  sessions in secure storage, auth callback screen, reminder alarms as notifications, resume
  onboarding where they left off.

## Wed 11 Nov 2026: App 1.3, onboarding, Pass It On, speech (`c46044b`)
- Onboarding: who you are, about you, sign-in, safe circle, family, reminders, voice intro, done.
- Pass It On: intro, share a skill, thank-you recordings; profile, family, settings and language
  screens; demo audio; filming notes.

## Tue–Wed 10–11 Nov 2026: App 1.2, Thrive and safety (`1fb2866`)
- Thrive: morning check-in, reminders (list, new, alarms), walk recording with route map and
  stats, SOS screen. Components: big stats, split bars, time adjuster, route map.

## App 1.1, Home and Kampung (`0ca5d1f`)
- Expo app skeleton (Expo Router, tabs, i18n in 4 languages, mock API, theme and shared
  components, tests, CI). Home "today", Kampung events and circles, Start Something.

## Tue 10 Nov 2026: Plans (`e5fdf59`, `3285fc2`)
- Iteration plans for the app, voice / call agent and WhatsApp tracks, and the project README.

---

## Open items
- Voice 2.1: real `/assistant/turn` (speech → Gemini tools → reply / audio), wire the app's
  Buddy to it; then the wake word (new EAS dev
  build) and the "fill" steps on each form.
- Phone calls: Twilio trial limits (calls only to verified numbers, a trial message plays
  first; Singapore / India need Voice geo permissions). Point the number's voice webhook at
  the API in voice 2.2. Meta keys for WhatsApp.
- Native-speaker review of the Malay, Chinese and Tamil strings and distress words.
- UI redesign (Luma style): the design source is the Luma iOS screenshots in `Luma ios Sep 2026/`
  (not ours, don't commit). Decided: Luma's look, not its brand; light mode only for now (colours
  built so dark can follow); WhatsApp links stay, in-app chat later if time allows; no QR tickets
  or check-in; no payments, coupons or slide-to-confirm. Keep the accessibility floors (large
  text, contrast, 48 dp targets, red Help). Plan: design system → tab pill + Home → event page →
  Community (with map) → Start Something → Profile + Settings → Manage my event.
- A static ngrok domain so the API address stops changing.
