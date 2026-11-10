# Iteration 3.2 — P1 Features

Stage 3 (Hackathon) · **H8–H20** (≈ Sun 01:00 → 13:00 SGT) · sleep in shifts H14–H18

## 1. At a glance

| | |
|---|---|
| **Goal** | Add the P1 features that make the demo and pitch memorable, **strictly in priority order**, without breaking the golden path |
| **Exit** | As many items as possible from the priority list are merged, each one demoable; golden path green after every merge |
| **Owners** | A screens · B endpoints + jobs + posture polish · C WhatsApp cards / menu / location; Gemini Live (stretch) · D reviews each screen · E pitch + Q&A |
| **Est.** | A3.2 8–10 h · B3.x ~10 h (shared with 3.3) · W3.x ~4 h · C3.2 6 h (stretch) |

## 2. Entry criteria

- [ ] 3.1 exit: judge paths work; golden path green at the venue.
- [ ] **Rule:** nothing P1 starts until the golden path passes (`07` §8).

## 3. Priority list (stop when time runs out)

| # | Feature | PRD | Screens | Lanes | Why it matters for the pitch |
|---|---|---|---|---|---|
| 1 | **Walk history & trends + personal bests** | WK-3, WK-4 | S24 | A, B | Shows progress over time, which is the outcome KPI story (physical activity) |
| 2 | **Group walk feed + Cheers** | WK-5 | S19 feed | A, B | Golden path step 3 "Lim cheers it"; community + activity linked |
| 3 | **Simple Mode** | HM-3 | S13 | A | Shows we serve 75+ users too; the family sets it |
| 4 | **Admin QR onboarding** | ON-4 | S11 | A, B | User story 7 (Mr Ahmad, 20 residents); low-manpower scaling (A10) |
| 5 | **Move Along polish** (Android) | TH-7 | S25 | B with A | Overlay, safety stop, second exercise, cue translations; the unique tech moment |
| 6 | **Weekly progress / walk summary cards on WhatsApp** | WA P1 | — | B, C | Shareable to family groups; Strava-style card without an app |
| 7 | **Natural Gemini Live calls (Tier 2)** | — | — | C | **Only if Tier 1 is rock-solid** |

Also P1 if cheap and an owner is free (app doc §3 item 6): S27 Health Card, S35 Life Stories, S10 family overview, Weekly Joy Report (B), WA Menu + SOS location request (C).

## 4. Feature specs

### 1. Walk history & trends + personal bests (S24)

**A:** `thrive/walks.tsx`
- **Week · Month** as two big buttons (not a tiny segmented control).
- `StatCard` "8.6 km this week" + "4 walks · 2 h 10 min".
- Bar chart: distance per day (week) or per week (month), one colour (`primary`), plain labels.
- Comparison sentence: "1.2 km more than last week". Never negative framing; if lower: "A lighter week. A walk today?"
- Personal bests card: Longest walk · Most steps in a day · Walks this month, as clean labelled badges.
- List of walks: route thumbnail, date, place, km → S23.
- Read-out: "This week you walked 8.6 kilometres in 4 walks. 1.2 kilometres more than last week."

**B:** `GET /walks?period=week|month`, `GET /walks/stats` (totals, comparison sentence key + params, personal bests) from `walk_stats_weekly`. Milestone detection (10 walks, first 5 km week) in the rollup job.

**Avoid:** multi-metric charts, pace graphs, red/green.

### 2. Group walk feed + Cheers (S19)

**B:** `GET /circles/{id}/walks` (recent group walks: public route thumbnail, "9 people · 3.1 km · Saturday", walkers, cheer count, my_cheer). `POST /walks/{id}/cheers {kind:'tap'|'voice', audio?}`. Only `visibility='circle'` walks; **public polyline only** (privacy zone).

**A:** S19 "Recent group walks" section; **Cheer** BigButton (tap) and **Voice cheer** (record ≤ 10 s, `VoiceNoteBubble`). S23 **Share to my Circle** now sets `visibility='circle'`. The walk owner sees the cheers on S23.

**No leaderboards, no rankings.**

### 3. Simple Mode (S13)

**A:** Toggle in S40 (and on S10 for family). When on, the app shows 3 full-width buttons (~25% of screen height each): **Today** (reads today's plan + check-in YesNo) · **Talk** (Buddy) · **Help** (red → S28). Auto-read on. Persist via `PATCH /me {simple_mode}`.

### 4. Admin QR onboarding (S11)

**B:** `POST /orgs`, `POST /orgs/{id}/members/bulk` (CSV / list), `GET /orgs/{id}/qr` (returns a join URL; the QR encodes a WhatsApp deep link with an org code, plus an app link). Joining creates `org_members` + auto-joins the org Circle, **after the senior confirms** (`welcome_invite_org` [Yes] [No]). Admin sees membership + attendance only.

**A:** S11: org name + verified badge · **Show QR** (full-screen) · Share WhatsApp join link · Upload list · Members list with status (Joined / Invited / Needs help). Luma-style guest list; no chart dashboards.

**Demo:** project the QR; 3–5 people scan → they appear as Joined.

### 5. Move Along polish (S25, Android)

**B with A:**
- Simple **one-colour skeleton overlay** (blue; green on a good rep, **never red**).
- **Safety stop** wired end-to-end: "Let's stop here and rest." + Done; the session saved with `safety_stopped=true`.
- **Second exercise** (seated knee extension) bundle verified.
- **Cue translations:** every `cueId` → `posture.cue.*` in en / ms / zh / ta, spoken via the Read It Out voice.
- Finish card: "10 sit-to-stands. Nice and steady." + "Getting a little tired near the end" if fatigue was detected. Plain words, no numbers or scores.
- iPhone: the camera-free guided warm-up (each move read aloud with a photo, tap Done).

### 6. Weekly progress / walk summary cards on WhatsApp

**B:** Render a clean image card server-side (e.g. Pillow / HTML-to-image): name, km, walks, streak, thank-yous, mini route of the best walk (public polyline). No emojis; brand tokens.
**C:** `weekly_progress_card` template (image header) [See my walks]; post-walk message "Morning walk, 2.4 km in 32 min. Well done, Raj." + card. Also **Menu** (list: Today · Find events · Reminders · My progress · Help · Language) and the **location request** for SOS (`06` §3.5).

### 7. Gemini Live calls (Tier 2), stretch

**C:** Twilio Media Streams websocket → Ankit's Gemini Live agent (real-time audio in/out, barge-in) → **same tool registry** over function calling. Feature flag per number. **Ship only if** the Tier 1 suite still passes and latency / quality are clearly better; otherwise demo Tier 1 and show Tier 2 as a recorded roadmap clip.

## 5. Working rules for this iteration

- **One feature = one branch = one PR**, merged behind a feature flag where possible.
- After each merge: run the golden path (quick version, ~5 min). Red → revert immediately.
- **Sleep in shifts H14–H18.** Suggested: A and C sleep H14–H16, B and D sleep H16–H18; one person always on deploy duty.
- D reviews each new screen against its `02b` reference and the UX DoD before merge.

## 6. Test plan

| # | Feature | Case | Expected |
|---|---|---|---|
| T1 | S24 | Raj, week → month | Totals match the seeded walks; comparison sentence friendly; PBs correct |
| T2 | Cheers | Raj shares a walk; Lim cheers (tap + voice) | Appears in the circle feed; Raj sees cheers on S23 |
| T3 | Privacy | Circle feed map of Raj's walk | No points within 200 m of Raj's home |
| T4 | Simple Mode | Priya turns it on from S10 | Raj's app shows 3 buttons; auto-read on |
| T5 | Admin QR | 3 phones scan the QR | Each confirms → Joined in S11; auto-joined to the org Circle |
| T6 | Admin privacy | Admin views a member | No health card or Safe Circle visible |
| T7 | Move Along | Safety stop triggered (stand up too fast / leave frame) | Stop screen; session saved with `safety_stopped` |
| T8 | Move Along | Cues in Tamil | Spoken and shown in Tamil |
| T9 | WA card | Trigger the weekly card job | Image renders correctly; template delivered |
| T10 | Golden path | After every merge | Green |

## 7. Exit check (~H20)

Demo each merged P1 feature in under 1 minute. Decide which ones go into the live pitch (max 2–3; the rest go to backup / Q&A). Golden path green.

## 8. Risks and fallbacks

| Risk | Fallback |
|---|---|
| A P1 feature breaks the golden path | Revert; continue debugging on a branch |
| Time runs out mid-list | Stop at the last fully working item; unmerged work → roadmap slide |
| Image card rendering is slow | Pre-render cards for the demo users |
| Gemini Live unstable | Tier 1 on stage; Tier 2 as a recorded clip |

## 9. Definition of Done (per feature)

- [ ] Passes the UX DoD (200% font, Tamil, Read It Out, tap + voice, no emojis)
- [ ] Strings in i18n (4 languages, or a follow-up card)
- [ ] Works on Android + iPhone Expo Go (posture: Android + iPhone fallback)
- [ ] Golden path still green after the merge
- [ ] Privacy rules respected (public polyline, admin limits, consent)
