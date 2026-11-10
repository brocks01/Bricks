# Iteration 1.2 — Thrive + Safety

Stage 1 (Clickable app on mock data) · **Wed 11 Nov 2026, evening → night (SGT)**

## 1. At a glance

| | |
|---|---|
| **Goal** | The daily check-in (our differentiator), Strava-style walks on a simulated track, reminders, and the SOS screen |
| **Exit** | Check-in **No → join walk** works · **simulated walk → summary** works · **SOS opens from every screen** |
| **Golden-path steps covered (mock)** | 2 (No → walk), 3 (record → summary), 6 (Help → 995 offer → countdown) |
| **Owners** | A screens + walk engine (simulate) · B check-in / reminders / SOS / safe-circle / walks + processing pipeline · C translations wave 2 + call prompts + templates submitted · D review · E filming logistics |
| **Est.** | A1.2 7 h · B1.2 6 h · C ~3 h · W1.2 ~1.5 h |

## 2. Entry criteria

- [ ] 1.1 exit met: join a walk in 1 / 2 taps; `useRsvp` works (the check-in "No" path reuses it).
- [ ] Mocks include: Raj's check-in history (5-day streak), 3 weeks of walks (2 group walks), **one recorded Bishan Park GPS track** (points with timestamps), reminders ("8 am Take medicine, every day"), Safe Circle (Priya family, Ahmad 300 m, Lim).
- [ ] Components: `StatCard` (with 7-bar chart), `YesNo`, `ConfirmSheet`, `StatusBanner`.
- [ ] Wave-1 translations dropped in (or a follow-up card exists).

## 3. Scope

### In

| PRD ID | Feature | Pri | Screen(s) |
|---|---|---|---|
| TH-1 | Good Morning Check-in (yes/no, streak) | P0 | S21, card on S12 + S20 |
| TH-2 | Walk With Me ("No" → nearby group walk → join + WA group) | P0 | S21 → S16 |
| TH-3 | Streak & 7-day bar, celebrate never scold | P0 | S20 |
| TH-4 | Gentle Reminders (form + mock voice) | P0 | S26 |
| WK-1 | Record a walk (3 big numbers + map line, auto-pause), **simulated track** | P0 | S22 |
| WK-2 | Walk summary (route, distance, time, steps, pace, splits, walked with, well-done line), **mock** | P0 | S23 |
| WK-6 | Home privacy zone (start/end hidden within ~200 m of home) | P0 | S23 map, server pipeline |
| TH-5 | Safe Circle SOS: **UI**, 995 offer, countdown, cancel | P0 | S28 |

### Out
- Real GPS recording, background location, server-computed summary in the app (2.2). B's pipeline **is** built now, but the app uses the mock summary.
- SOS fan-out, helper alert S30, Are you OK? S29 (2.2).
- Push notification actions for check-in (2.1 / 2.2).
- Walk history S24, personal bests, group feed + cheers (3.2).
- Move Along S25 (2.2 shell). Show the Thrive card as "coming soon" or hide it.

## 4. Lane tasks

### Lane A — App (Sarath) · A1.2 · 7 h

**Files**
```
app/app/(tabs)/thrive/index.tsx        S20 Thrive main
app/app/(tabs)/thrive/checkin.tsx      S21 Check-in
app/app/(tabs)/thrive/reminders.tsx    S26 Reminders
app/app/(tabs)/thrive/walk/record.tsx  S22 Walk recording (simulate mode)
app/app/(tabs)/thrive/walk/[id].tsx    S23 Walk summary
app/app/sos.tsx                        S28 SOS (full UI, replaces placeholder)
app/lib/walk.ts                        walk engine (simulate source now, GPS in 2.2)
```

**Walk engine `lib/walk.ts`.** Build the real interface now and only swap the *source* in 2.2:

```ts
type WalkSource = 'simulate' | 'gps';
startWalk({ source, eventId? }) → WalkSession
session.onTick(({ elapsed_s, moving_s, distance_m, steps, points }) => …)  // ~1 s
session.pause() / resume() / finish() → WalkUpload  // { points[], steps, started_at, ended_at, event_id? }
```
- **Simulate:** replays the Bishan Park track at real speed, with a dev-only 10× toggle for quick tests.
- Same filters as GPS will use: drop points with accuracy > 30 m and jumps > 50 m in 5 s; haversine distance; steps from `Pedometer`, falling back to `distance ÷ 0.7 m`.
- **Auto-pause:** speed < 0.3 m/s for 20 s. Keep `moving_s` separate from elapsed time.
- `expo-keep-awake` on the record screen. Persist points every 30 s (AsyncStorage) so a crash doesn't lose the walk.
- `finish()` → in mock mode, returns a summary built from mock data or computed locally. In 2.2 it becomes `POST /walks`.

**Per screen**

| Screen | Build | Acceptance |
|---|---|---|
| **S20 Thrive** | Pending check-in card (Yes/No) · primary **Start walk** · "This week" `StatCard` (8.6 km walked, 40pt; "4 walks · 5-day streak"; 7 bars M–S, done days in `primary`/`success`, missed days **neutral, never red**) · Last walk card → S23 · Reminders card (next one + **Add reminder**) · Move Along card (hidden or "coming soon") | Read-out: "Thrive. This week you walked 8.6 kilometres in 4 walks. 5-day streak." |
| **S21 Check-in** | Title "Did you move yesterday?" + `YesNo` (Yes = success, No = outline, never red). **Yes** → check icon + "5 days in a row. Well done." **No** → "Want company today?" + one walk `EventCard` + **Join walk** / **Maybe later** | **Join walk** uses `useRsvp` → S16 (with Join WhatsApp group). Tap count from S21 = 2. The Home and Thrive cards disappear once answered |
| **S26 Reminders** | List rows (time, text, repeat) with **Done**; **Add reminder** → two routes: **Say it** (mock: a canned transcript "Take medicine at 8 every morning" → `ConfirmSheet` "Every day at 8 am: take medicine. Is that right?") or the form: What (chips: Medicine, Doctor, Event, Other) → Time (big wheels) → Repeat (Once / Every day / Weekdays) | After saving, schedule a **local notification** (`expo-notifications`), which also works in Expo Go. UndoBar after add/delete |
| **S22 Walk recording** | Help (red) only in the header · map top half (route `primary` 6dp, light basemap) · **3 numbers at 40pt**: Time, Distance, Steps · **Pause** + **Finish** (72dp each). "Keep this screen open while you walk" note on iPhone (flag `canRecordInBackground=false`) | Read-out: "Walking. 24 minutes, 1.8 kilometres, 2,430 steps." No pace, HR or sport selector |
| **S23 Walk summary** | Title "Morning walk · Bishan Park" (editable) · date/time · route map (privacy-trimmed polyline) · 3 big stats: Distance, Time, Steps · one smaller line "Average pace 13 min 20 s per km" · "Each kilometre" bars (same colour, plain labels) · Walked with avatars · encouragement sentence · **Share to my Circle** (mock toast in 1.2) + **Done** | Read-out: "Morning walk at Bishan Park. 2.4 kilometres in 32 minutes, 3,210 steps. Your longest walk this month." No calories, elevation or red/green |
| **S28 SOS** | Red header "Getting help" · **Call 995 now** (red, 80dp, `Linking.openURL('tel:995')`; `112` when region = IN) · "Telling your Safe Circle in 5…" countdown (read aloud) · **Cancel — I'm OK** (outline 72dp) · after the countdown: mock statuses from Safe Circle ("Priya — on her way", "Ahmad (300 m away) — on his way", "Lim — notified") · **I'm safe now** | Opens from **every** screen's Help button. Cancel during the countdown sends nothing. Haptic on open |

**Help on every screen** is the exit criterion. Check S12, S14–S23, S26 and the tab roots one by one.

### Lane B — Backend (Sayan) · B1.2 · 6 h

| Endpoint | Behaviour |
|---|---|
| `POST /checkins` | `{answer: 'yes'\|'no', question_key, channel}` → upsert today's row; returns `{streak, week[7], suggestion?}`. On **no**, `suggestion` = nearest upcoming walk event within 2 km in the next 24 h (with `whatsapp_link`) |
| `GET /checkins/week` | `{streak, days:[{date, answer}]×7, goal_days_per_week}` |
| `GET/POST/DELETE /reminders` | `text, rrule, next_at, channel, created_by`. Compute `next_at` from rrule (python-dateutil). Validate the time is in the future |
| `POST /sos` | `{trigger, lat?, lng?}` → `sos_events(status='open')`, returns `{id, helpers:[{id,name,distance_m,status:'notified'}]}`. **No fan-out yet**: statuses are stored only |
| `PATCH /sos/{id}` | `cancelled` / `resolved` |
| `POST /sos/{id}/respond` | Helper → `on_way` / `arrived` (used by S30 in 2.2) |
| `GET/PUT /safe-circle` | Ordered helpers, `is_family` |
| `POST /walks` | **Processing pipeline** (`03` §6), see below |
| `GET /walks/{id}` | Public route unless the caller is the owner |
| `GET /walks?period=week\|month` · `GET /walks/stats` | List; totals + comparison sentence + personal bests (used fully in 3.2) |

**Walk processing pipeline** (`backend/services/walks.py`), unit-tested with the Bishan track:
1. Filter points (accuracy > 30 m, impossible jumps) → haversine distance, moving time.
2. Splits per km `[{km, pace_s}]`; average pace = moving time ÷ distance.
3. **Privacy zone:** drop points within **200 m of `home_lat/lng`** → `route_public_polyline` (encoded). Keep `route_polyline` for the owner only.
4. Title from time of day + nearest place (static list of SG parks / CCs).
5. Group link: `event_id` set, **or** another member's walk overlaps ≥ 70% in time and starts within 300 m → "Walked with".
6. Update `walk_stats_weekly`; detect personal bests; encouragement line from **templates** (translated, no LLM).

Return the full summary JSON so A can use it as the mock fixture shape: `{id, title, started_at, distance_m, duration_s, moving_s, steps, avg_pace_s_per_km, splits, route_public_polyline, walked_with:[…], encouragement_key, encouragement_params}`.

### Lane C — Voice (Ankit)

- **Translations wave 2:** Thrive + SOS strings → ms, zh, ta, then native-speaker review. SOS strings get priority review, because a wrong word here is a safety issue.
- **Call prompt files** (`channels/voice/prompts/`), × 4 languages:
  `inbound_welcome`, `checkin`, `reminder`, `are_you_ok`, `sos_helper`, `family_alert`, `goodbye`, plus `system.md` (shared rules from `05` §1). Fixed parts only; mark the dynamic slots `{name}`, `{event_title}`, `{time}`, `{place}`.
- **Distress-phrase list** (from 0.2) checked again against the SOS copy: "help", "I fell", "pain", "can't breathe", "emergency", "tolong", "救命", "உதவி".

### Lane C — WhatsApp (Ankit, Santusht) · W1.2

- Translate the 12 templates into ms / zh_CN / ta.
- **Submit all 48 for approval** (Utility category) on the Meta test app. Do it tonight, because approval time is the external dependency for 2.1–2.2.
- Record the template names and statuses in a shared table.

### Lane D — Design (Kavya)

- Review S20–S28 against **Apple Health** (S20), **Strava record / activity** (S22, S23), **Be My Eyes** (S28), **Monzo** (S21, S26).
- Specific checks: missed days never red; S22 shows only 3 numbers; S23 has no jargon (no "Elev gain", "Cadence"); S28 has one obvious action and calm wording ("get help fast", never "monitoring").

### Lane E — Business & research

- Confirm filming slots and locations for Thu 12 Nov afternoon; consent forms printed / signed digitally.
- Find a walkable spot near the filming location for task 5 (start/finish a walk). Simulate mode is the fallback.

## 5. Integration points

| From → To | What | By |
|---|---|---|
| B → A | Walk summary JSON shape (fixture) | Early in 1.2, so S23 is built on the real shape |
| B → A | `POST /checkins` "no" suggestion shape | Early in 1.2 |
| A → C | Thrive + SOS i18n keys | Mid-evening |
| C → Meta | 48 templates submitted | End of 1.2 |
| C → B | Call prompt files in `channels/voice/prompts/` | End of 1.2 (used by the 1.3 inbound loop) |

## 6. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | Home → check-in **No** → **Join walk** | S16 with WhatsApp link; the check-in card disappears from Home and Thrive |
| T2 | Check-in **Yes** | "5 days in a row. Well done."; 7-day bar updates |
| T3 | Thrive → **Start walk** (simulate 10×) → Finish | S23 with distance ≈ the track length, splits per km, encouragement |
| T4 | Pause 30 s during the simulated walk | `moving_s` excludes the pause; auto-pause triggers when the speed drops |
| T5 | Kill the app mid-walk, reopen | Walk resumes from persisted points (or offers "Save the walk you started") |
| T6 | B pipeline unit test: track starting at Raj's home | `route_public_polyline` has no points within 200 m of home |
| T7 | B pipeline: two overlapping walks | "Walked with" set on both |
| T8 | Add reminder by form, set for +1 min | Local notification fires (Android + iPhone Expo Go) |
| T9 | Add reminder via mock "Say it" | ConfirmSheet → Yes → row appears; Undo removes it |
| T10 | Help from **every** screen | S28 opens; Call 995 opens the dialler; Cancel inside 5 s → nothing sent |
| T11 | Let the SOS countdown finish | Mock statuses appear; `POST /sos` logged when the backend is reachable (optional) |
| T12 | 200% font on S22 | 3 numbers fit; Pause / Finish not clipped |

## 7. Exit demo (15 min)

1. Home: answer **No** → walk → join → WhatsApp group (golden path step 2, mock).
2. Thrive → Start walk (simulate) → Finish → summary read-out (step 3).
3. Add "Take medicine at 8" by form; show the local notification firing a minute later.
4. Press Help on three different screens → 995 / countdown / Cancel → statuses (step 6, UI).
5. B shows the pipeline test output (privacy zone trimmed, splits).
6. iPhone Expo Go check of S20–S28.

## 8. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Maps rendering issues in Expo Go | `react-native-maps` is in Expo Go. If the tiles misbehave, draw the polyline over a static background with `react-native-svg` |
| Pedometer unavailable (simulator / some phones) | `distance ÷ 0.7 m` estimate, labelled the same |
| Template approval slow | Twilio sandbox for the demo; free-form messages inside the 24 h window |
| Running out of time | S26 voice route stays a mock (it's mock in 1.3 anyway); S23 "Share to my Circle" is a toast |

## 9. Definition of Done

- [ ] UX DoD on S20–S23, S26, S28 (200% font, Tamil screenshot)
- [ ] Missed days neutral, red only on SOS; no calorie or medical claims
- [ ] Read-out scripts registered for every new screen
- [ ] Walk pipeline unit-tested with the Bishan track; privacy zone verified
- [ ] Help → S28 from every screen
- [ ] Templates submitted; call prompt files committed in 4 languages
- [ ] Android dev build + iPhone Expo Go check done
