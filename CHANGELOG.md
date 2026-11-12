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
| App | 0.1, 0.2, 1.1, 1.2, 1.3, 2.1, 2.2; Luma-style redesign steps 0 to 12 | Voice-driven Buddy (with voice 2.1), then 2.3 integration freeze |
| Voice / call agent | 0.1 (code in the API; real call pending), 0.2 contracts (approved, re-run for "show, don't tell"), 1.1 + 1.2 translations waves 1–2 and call prompts (done) | 1.3 translations wave 3 + inbound call loop, 2.1 real `/assistant/turn` |
| WhatsApp | Branch `whatsapp` (untested, not merged) | 0.1 access (needs Meta keys) |

**App look:** Luma-style redesign (UI steps 0 to 12 below; brief in
`docs/design/LUMA_REDESIGN_PROMPT.md`). Accessibility floors still enforced by tests: touch
≥ 64 dp, contrast ≥ 4.5:1 (aim 7:1), 200% font, Tamil. Text: the member picks Small (16 pt),
Normal (18 pt, default) or Large (20 pt body).

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

### UI step 0: Luma first pass (tokens, buttons, cards, tab bar)
The brief assumed this pass was done; it wasn't in this repo, so it's done here.
- **Tokens:** ink-black accent `primary #111111` (pressed `#3A3A3C`, grey pill `#E9E9EE`);
  soft-grey panels `bgSubtle #F2F2F5`, `border #E3E3E8`; radii card 20, button 999 (pills),
  tile 14, sheet 28; one `shadow.floating`; badge and toast colours; **category art colours**
  (a soft tint + deep icon per event category, used where there's no photo). All new colour
  pairs have contrast tests.
- **Tab bar:** a floating white pill with a soft shadow; the selected tab sits in a grey pill.
  It stays in the layout (doesn't overlap screens), so footers are never hidden under it.
- **Tabs renamed and reordered:** Home · Community · Activity · Health (routes unchanged:
  `home`, `kampung`, `pass-it-on`, `thrive`). Screen titles, Home cards and read-outs use the
  same words. In Malay, Mandarin and Tamil, "Activity" is "my activity" (Aktiviti Saya / 我的活动
  / என் செயல்பாடு), because "aktiviti" / "活动" already mean the events in Community. Buddy
  understands the new names and the old ones.
- **Components:** `Card` is a borderless grey panel (`tone="plain"` is white); `BigButton` is a
  pill (secondary actions are grey pills); `SectionCard` is a grey panel with a white icon tile;
  `BackButton` is a grey pill that keeps the word "Back"; `BottomSheet` floats as an inset
  rounded panel; `Chip` is a grey pill, black with a tick when selected.
- **`EventCard`:** a Luma event row: square cover (photo or category art) with a status badge,
  host, title, when, where; "12 going" and the pill button below. From 150% system font the
  cover moves above the words so they keep the full width.
- New: `CoverArt`, `StatusBadge` (Going / Hosting / Full / New), 32 dp `Avatar`.
- Web preview only: the walk map and sign-in storage have web versions, and launch-notification
  handling is skipped on web (phones unchanged).
- **Accessibility trade-off:** Luma's grey pills have no outline. Their dark labels carry the
  meaning; `borderStrong` stays for text inputs.

### UI step 1: shared pieces
- **`Toast`** (`showToast(text)`, `ToastHost` in the root layout): a green pill that confirms an
  action, shown 5 s (long enough to read twice), announced to screen readers. It sits **below**
  the top bar so Read it out and Help are never covered.
- **`SheetHeader`**: an icon in a soft circle, a bold title, one grey line; used by
  `ConfirmSheet` (which gains `detail` and `icon`).
- **`GroupedList` / `GroupedRow`**: iOS-style grouped rows on a grey panel: coloured icon
  square, title, grey subtitle, value, chevron; rows without an action are plain information.
- **`EmptyState`**: a soft grey icon, a bold line, an optional grey line (`detail`), one button.
- **`AvatarStack`** (faces + "+12") and **`DateHeader`** ("Tomorrow / Wednesday").
- All are in the `/dev/components` gallery with tests.
- **Rule over screenshot:** Luma uses red pills for destructive actions. Red stays only for
  Help and emergencies (docs/02), so destructive actions are black pills with a clear verb
  ("Leave", "Sign out"). Sheets have no icon-only "X": they close with a labelled button.

### UI step 2: Home
- A big greeting, then the **check-in** and **next reminder** as grey cards at the top.
- **"Your events"**: the member's next three plans as a timeline under `DateHeader`s
  ("14 Nov / Saturday"), with **Going / Hosting** badges on the covers; "See all N of your
  events" when there are more; an `EmptyState` with "Find something to join" when there are none.
- **"Picked for you"**: one event worth joining (hidden when it's already the check-in's walk
  suggestion, or they're going).
- The **Community · Activity · Health** cards follow in tab order; Settings is a `GroupedRow`.
- Read-out order matches the screen (Community first).
- Event rows say **"You're hosting"** on the member's own events.

### UI step 3: event page and "You're going"
- **Event page** (`event/[id]`): the page is **tinted from the cover** (a gradient from the colour
  to white, drawn with `react-native-svg`: no new native library). The colour is the event's
  `cover_color` when the server sends one and it keeps text readable (7:1, grey 4.5:1), otherwise
  the category colour. A large square cover floats on it with a white edge; then the title, when,
  and "You're going / You're hosting".
- **Three action tiles** (`ActionTiles`): **I'm going** (black) / **WhatsApp group** / **More**.
  When going, WhatsApp becomes the black tile. At 150% font and above the tiles stack.
- **More** opens a sheet: **Add to calendar** (a Google Calendar link with the event filled in:
  no native calendar library), **Share** (the phone's share sheet), **I can't go any more**
  (then a `ConfirmSheet`), Close. Leaving now takes a deliberate extra step.
- White cards on the tint: **Location** (place, map preview with one pin via new `PlaceMap`,
  Open in Maps), **Host** and **"12 going"** with an `AvatarStack`, **About**.
- "Published." after Start Something is now a **Toast**.
- **"You're going"** (`going/[id]`) uses the same tint behind the big green tick.
- On tints, the going line uses the darker badge green (the standard green is 4.4:1 on the
  pastel tints); tests check text, grey text and green on every tint.
- **API:** optional `cover_color` on `GET /events/{id}` (app type and backend schema; null until
  events have photos).

### UI step 4: Community tab
- **Community** (`kampung/index`): a **List / Map** switch, My Circles, then **"Near you"**:
  Today, This week and the four busiest **kinds** (Walks, Tai chi, Games, Music, Cooking,
  Gardening, Classes, Coffee, With children), plus **"More kinds"** to show the rest in place.
  Happenings are grouped under `DateHeader`s. Kinds filter what's coming up on the phone.
- **Map view** (new `EventsMap`): one pin per happening; tapping a pin shows its name and time,
  and tapping that opens it. The same happenings stay listed below, so the map is never the only
  way in. Web shows the pins without map tiles.
- **Circles** (`ClubCard`, `circle/[id]`): Luma calendar rows and pages: a square cover coloured
  by the kind of Circle, the name, members, next activity; the Circle page is tinted, with a
  raised cover, the captain on a white card and an `AvatarStack` of members.
- **Start Something → Check and publish**: Luma's create screen: the cover, the name, then
  **When / Where / WhatsApp group** as `GroupedRow`s (each goes back to that question), then the
  card exactly as others will see it, now saying **"You're hosting"** (it said "I'm going").
- `GroupedRow` titles always keep 40% of the row (a long value wraps instead of squeezing them).
- **API:** event summaries now include `lat` / `lng` (for the map). Optional in the app type, so
  older servers still work; the backend and the mock data send them.
- **Rule over screenshot:** the brief asks for a sideways-scrolling chip strip. Hidden content you
  must swipe to find breaks docs/02 rule 6 (no hidden gestures), so chips wrap, and "More kinds"
  is a labelled button instead.

### UI step 5: Activity tab
- **Skills** ("What I can share") are event-style rows with a square cover coloured by the
  skill's first tag (chess = games, cooking = cooking…).
- **Thank-yous:** thumbs-ups are plain rows (face, "Siti said thank you", thumbs-up); voice
  thank-yous stay on grey cards with the black **Play** pill.
- **What I've given:** each number on its own grey panel (`BigStatsRow`, also used by Health);
  **badges** as a `GroupedList` with coloured icons (never a trophy wall).
- Section headings are larger (Luma's section style).
- **Share a skill → check step:** the cover and title, then **When / Where / Price** as
  `GroupedRow`s (When and Where go back to that question; Price is always "Free" for now).

### UI step 6: Health tab and walks
- **Health** keeps its layout; the week bar chart is black (the accent), stats sit on grey panels.
- **Reminders** (`thrive/reminders`): one grouped grey panel, a coloured icon square per kind
  (medicine, doctor, event, other), with Done / Remove buttons in each row.
- **Walk summary** (`walk/[id]`): map card, three stats on grey panels (three side by side use the
  28 pt title size so "3,000" never breaks or is cut off), and the **praise as a solid green
  panel** (new `StatusBanner` tone `celebrate`, white on green, 4.5:1+).
- **Recording** keeps a grey **Pause** and a black **Finish**.
- **Rule over screenshot:** the brief asks for a red Finish pill. Red stays only for Help and
  emergencies, so Finish is black.

### UI step 7: Settings, Profile, Family
- **Settings:** Luma's grouped style. The member at the top (face, name, "See my profile");
  **You** (Language); Read aloud and How we remind you stay as big chips (they're choices, not
  links); **People and safety** (Safe Circle, Family); the not-ready items as plain rows that each
  say "Coming soon" (no dead buttons); **Sign out** on its own, confirmed in a `SheetHeader` sheet.
- **Profile:** a 96 dp face and a larger name at the top (new `Avatar` size 96); the rest reuses
  the restyled Activity pieces.
- **Family:** the empty state is the new `EmptyState` with one line on what adding someone gives.

### UI step 8: welcome and sign-in
- **Welcome** (`onboarding/index`, the language picker): a collage of our own category art as
  tilted tiles (`WelcomeCollage`) above "Bricks" and the four language pills.
- **Sign in:** Luma's header: an icon in a soft circle, a centred title and one line on why
  ("So we know it's you…"), then Singpass (black pill) and Google (grey pill).
- **Rule over screenshot:** Luma's welcome collage drifts slowly. Ours is still: continuous motion
  breaks the 150–200 ms motion rule and can unsettle people prone to motion sickness.
- Phone and code entry screens aren't built yet (phone sign-in is off until an SMS provider
  exists), so Luma's code-entry box isn't used.

### UI step 12: every main page on one screen, in colour
Asked for by the product owner: Small looked "zoomed in" (small words in giant controls), the
app was all white "like a form", and long pages are hard for seniors to scroll.
- **Proportional sizes with Small and Normal:** buttons, chips, rows, the top bar, Back and Buddy
  are 56dp (`touch.compact`); the tab bar is slimmer; Back and the title share one line. Large is
  unchanged (64/72dp). The SOS call stays 80dp.
- **Colour:** each part of the app has a soft colour (`sectionColor`): yellow Home, teal
  Community, lilac Activity, green Health, blue Settings, washing the top of its pages and
  filling the selected tab's pill. Home's check-in card is green, the reminder card rose.
- **Home:** "What would you like to do?" is gone (the tab bar already does it); Settings moved
  beside the greeting. The next event is one short row, and "Picked for you" is a row with its
  own "I'm going" (still one tap). The check-in now lives on Home only.
- **Community:** My Circles, the next two happenings as short rows, then See all / Map. The full
  list with filters, map and "I'm going" on every event moved to a new page,
  `/kampung/happenings` (`?mine=1` for your own plans, `?view=map` for the map).
- **Activity:** the thank-you prompt, rows for My story, What I can share and the Thank-You Wall,
  then the three numbers. My story (with badges) and What I can share (with Share a skill) are
  new pages.
- **Health:** Start walk, the week card (shorter chart, one summary line), then rows for the last
  walk and reminders.
- **Settings:** one row per setting. Read aloud and How we remind you are their own pages; the
  demo alerts, walk source and component gallery moved to Settings → Demo (demo and developer
  builds only). The three "Coming soon" rows are gone (no placeholders on the main list).
- **Forms:** choice chips are a two-column grid and tiles are short rows with Small and Normal.
- **Measured on a 393×760 screen (iPhone 15 size after the status bar):** Home, Community,
  Activity, Health, Settings and all its pages, every onboarding step, SOS, Are you OK, the helper
  alert, Family, the check-in and the walk fit with no scrolling at Small and Normal. Detail pages
  and lists scroll. Still scrolling a little: the first step of Start something (≈50–80px) and
  Share a skill (≈130–175px), the reminders list, and on a small Android (360×690) the main pages
  by 30–130px.
- Tests follow each feature to its new place: 477 pass.

### UI step 11: text size (Small · Normal · Large) and one-screen layouts
- **New onboarding step** right after the language: "Text size", three white cards each written
  in its own size. Choosing one changes the whole app at once; Next moves on. Normal is chosen to
  start with. Also in **Settings → Text size** (`settings-text-size`).
- **Sizes:** Large is the old full scale (body 20 pt). Normal is the new default (×0.9, body
  18 pt). Small is ×0.8 (body 16 pt). Saved on the device with the other settings, checked on load.
  This deliberately relaxes the brief's 20 pt body floor, at the product owner's request; Large
  keeps it.
- **Compact layout with Small and Normal:** tighter screen and card spacing, 64 dp `lg` buttons,
  shorter welcome picture and walk map, the four languages as a 2×2 grid, smaller sign-in icon.
  Button labels that wrap stay centred. Tap targets stay ≥ 64 dp.
- **Result on a 393×760 phone screen (iPhone 15 size, after the status bar):** every onboarding
  step, Settings → Language and Text size, SOS, Are you OK, the helper alert, Family, check-in and
  Pass It On intro fit with no scrolling at Small and Normal; Walking fits at Small (22 px over
  at Normal). Lists and feeds (Home, Community, Activity, Settings, Profile, event page) still
  scroll: they hold more than one screen of content at any size.
- Tests: onboarding goes through the new step; Settings changes the size and the title grows.

### UI step 10: bolder Luma pass (font, white cards on grey, poster covers, immersive event page)
Steps 0–9 kept the old app's bones, and side by side with the Luma screens it still read as
the same app. This pass changes the shared building blocks, so every screen changes.
- **Font:** Inter for English and Malay (the clean, iPhone-like face of the Luma screens).
  Tamil keeps Noto Sans Tamil; Mandarin keeps the phone's font. `@expo-google-fonts/noto-sans`
  removed, `@expo-google-fonts/inter` added (JS font files only; no dev build needed).
- **Page and surfaces:** the page is pale grey (`canvas #F3F3F6`); cards, grouped lists, number
  panels, Home's section cards and tiles are white with a soft shadow (`shadow.card`), corners
  24dp. Bottom sheets are pale grey so their white buttons stand out.
- **Buttons and chips:** secondary buttons, chips, Back and Read it out are white floating pills
  (`shadow.control`), like Luma's round header buttons. Main actions stay black; Help stays red.
- **Covers:** events and Circles without a photo get poster art: a bold diagonal gradient in the
  category's colours (`posterColor`) with a big white icon, instead of a pastel square.
- **Event page:** a deep band of the category colour behind the cover, fading into the soft tint
  by the cover's bottom edge. It scrolls with the page, so the title and text always sit on the
  light part (contrast unchanged and still tested).
- **Tab bar:** the selected tab is a filled icon on a grey pill with a bold label (the old
  full-item highlight ran past the bar). The bar only reserves a second label line when a
  label has more than one word.
- **Design doc:** `docs/02_DESIGN_PRINCIPLES.md` §5 updated to these tokens (it still described
  the blue, flat look).

### UI step 9: safety screens (checked, kept plain)
- **SOS, Are you okay?, helper alert:** unchanged apart from the shared pill shapes. Still plain,
  very large, red only for the emergency call, with **no Buddy, no pictures and no gradients**.
  The safety tests pass unchanged.

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
