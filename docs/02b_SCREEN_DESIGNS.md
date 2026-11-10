# Screen Designs — page by page, with inspiration

Version 2.1 · 10 Nov 2026 · Owners: Kavya (design) + Person A (build) · Read `02_DESIGN_PRINCIPLES.md` first.

Each screen lists:
- **Inspired by** — the existing app(s) to study on Mobbin
- **Borrow / Adapt / Avoid** — what we take, how we change it for seniors, what we must not copy
- **Layout** — top to bottom
- **Read-out** — what Read It Out says
- **Priority · Built in** — P0/P1/P2 and the iteration (see `07_PROJECT_WORKFLOW.md`)

Icons are written as *(icon: name)* and refer to Phosphor icons. There are no emojis anywhere in the product.

---

## Screen map

| Area | Screens | Main inspiration |
|---|---|---|
| Onboarding | S1 Language · S2 Who is setting up · S3 Sign in · S4 One-question steps · S5 Voice intro · S6 Safe Circle · S7 Reminder channel · S8 All set | Airbnb, Singpass/LifeSG, Hinge |
| Family & admin | S9 Add my parent · S10 Family view · S11 Admin: members & QR | LifeSG, Luma (host tools) |
| Home | S12 Home · S13 Simple Mode | Grab, Be My Eyes |
| Kampung | S14 Happenings · S15 Event details · S16 You're going · S17 Start Something · S18 My Circles · S19 Circle page | Luma, Airbnb, Strava Clubs |
| Thrive | S20 Thrive main · S21 Check-in · S22 Walk recording · S23 Walk summary · S24 Walk history · S25 Move Along (Android) · S26 Reminders · S27 Health Card | Apple Health/Fitness, Strava, RightPosture, Monzo |
| Safety | S28 SOS · S29 Are you OK? · S30 Helper alert | Be My Eyes, SGDS |
| Pass It On | S31 Pass It On main · S32 Share a skill · S33 Profile · S34 Thank-You Wall & prompt · S35 Life Stories | Hinge, Airbnb, WhatsApp |
| Everywhere | S36 Buddy (voice helper) · S37 Read It Out controls · S38 Notifications · S39 Empty & error states · S40 Settings | Be My Eyes, WhatsApp, Monzo, SGDS |

---

## A. Onboarding

### S1 · Language
- **Inspired by:** Singpass / LifeSG (clear, trusted first screen)
- **Borrow:** a single clear question, very large choices, government-grade clarity. **Adapt:** each language button written in its own script. **Avoid:** flags (languages ≠ countries), dropdowns.
- **Layout:** app name (title) · "Choose your language" in all four languages (body, stacked) · 4 BigButtons: English / Bahasa Melayu / 中文 / தமிழ் · Read it out (reads the question in all four).
- **Read-out:** "Hello. Choose your language." (in all four)
- **P0 · Iter 1.3**

### S2 · Who is setting up?
- **Inspired by:** Airbnb (simple choice cards at the start of a flow)
- **Borrow:** big choice cards with icon + one-line description. **Avoid:** small radio buttons.
- **Layout:** title "Who is setting up?" · 3 large cards: *(icon: user)* Myself · *(icon: users-three)* My family — "Set up for a parent or grandparent" · *(icon: buildings)* My community or centre — "Add many members at once".
- **Read-out:** "Who is setting up? Myself, my family, or my community or centre."
- **P0 (Myself, Family) / P1 (Community) · Iter 1.3**

### S3 · Sign in
- **Inspired by:** Singpass / LifeSG
- **Borrow:** the Singpass button pattern and the "your details will be filled in" reassurance. **Adapt:** Google and phone-number options as equal-size BigButtons below. **Avoid:** password fields.
- **Layout:** title "Sign in" · BigButton Singpass (mock) · BigButton Google · BigButton Phone number · small line "We never share your details without asking you."
- **Read-out:** "Sign in with Singpass, Google, or your phone number."
- **P0 · Iter 1.3 (UI), Iter 2.1 (real Google, Singpass mock)**

### S4 · One-question steps (Name · Area · Interests)
- **Inspired by:** **Airbnb host onboarding**
- **Borrow:** one question per screen, large heading, big **Next** fixed at the bottom, progress as words. **Adapt:** every answer has a mic option; interests as large photo chips. **Avoid:** Airbnb's small helper text and thin progress bar.
- **Layout:**
```
 Back                                   Read it out
 Step 1 of 3
 What should we call you?          (title, 28pt)
 [ text field, 64dp tall ]
 ( (icon: microphone) Say it instead )
                                   ...space...
 [ Next ]                          (full width, bottom)
```
- Interests screen: 2-per-row photo chips (Walking, Tai Chi, Cooking, Chess, Music, Gardening, Teaching, Technology, Other by voice).
- **Read-out:** "Step 1 of 3. What should we call you? Type it, or tap 'Say it instead'."
- **P0 · Iter 1.3**

### S5 · Voice intro ("My Story" starter)
- **Inspired by:** **Hinge voice prompts**
- **Borrow:** a prompt card ("I spent 30 years as…") with a large record button and playback. **Adapt:** 10-second max, transcript shown, re-record button, skip allowed. **Avoid:** dating-style prompts.
- **Layout:** prompt card "Tell people a little about you" · examples (body) · big record button (hold not required — tap to start/stop) · playback + transcript · Next / Skip.
- **Read-out:** "Tell people a little about you. Tap record, speak for up to 10 seconds."
- **P1 (onboarding) / P0 (editable on profile) · Iter 1.3**

### S6 · Safe Circle setup
- **Inspired by:** Singpass / LifeSG (trusted, serious tone) + Be My Eyes (clarity)
- **Borrow:** plain explanation, contact list with large rows. **Avoid:** permission walls without explanation.
- **Layout:** title "Who should we tell if you need help?" · one sentence why · Pick from contacts (up to 5) · each selected contact as a large row with Remove · **Done** / **Later**.
- **Read-out:** "Who should we tell if you need help? Choose up to five people."
- **P0 · Iter 1.3**

### S7 · Reminder channel
- **Inspired by:** Airbnb (choice cards)
- **Layout:** "How should we remind you?" · cards: App notification · WhatsApp message · Phone call.
- **P0 · Iter 1.3**

### S8 · All set
- **Inspired by:** Monzo (calm success)
- **Borrow:** check icon + one sentence + one button. **Avoid:** confetti.
- **Layout:** *(icon: check-circle)* "Welcome, Raj." · "Every morning we'll ask how you are." · Go to Home.
- **P0 · Iter 1.3**

## B. Family & admin

### S9 · Add my parent
- **Inspired by:** **LifeSG** forms
- **Borrow:** clear labelled fields, one section at a time, review before submit. **Adapt:** relation as chips (Mother, Father, Grandmother, Grandfather, Other). **Avoid:** long single-page forms.
- **Steps:** Their name → Their phone → Relation → Their language → Their interests → "Add me to their Safe Circle" (on) → Review → Send invite.
- **Read-out:** per step.
- **P0 · Iter 1.3**

### S10 · Family view (invite status + parent overview)
- **Inspired by:** LifeSG (status) + Apple Health sharing (summary)
- **Layout:** status banner ("Waiting for Dad to say yes" → "Dad joined") · parent card: this week's walks, check-in streak, next event (only what the senior shares) · buttons: Set a reminder for Dad · Turn on Simple Mode · Safe Circle.
- **P0 (status) / P1 (overview) · Iter 1.3 / 3.2**

### S11 · Admin: members & QR
- **Inspired by:** **Luma host/manage-event screens**
- **Borrow:** clean guest list with status, share/QR panel. **Avoid:** dashboards full of charts.
- **Layout:** organisation name + verified badge · **Show QR** (full-screen QR for sessions) · Share WhatsApp join link · Upload list · Members list: name, status (Joined / Invited / Needs help).
- **P1 · Iter 3.2**

## C. Home

### S12 · Home
- **Inspired by:** **Grab home** (few large tiles, familiar to Singapore seniors) + Luma (one next-event card)
- **Borrow:** greeting, a "today" area, large tiles. **Adapt:** max 3 cards, then 4 tiles. **Avoid:** Grab's promo banners, ads, dense icon grid.
- **Layout:**
```
 Read it out                                         Help (red)
 Good morning, Raj                         (display 34pt)

 ┌ Did you move yesterday? ───────────────────────┐
 │ [ Yes ]                  [ No ]                │   (only if unanswered)
 └────────────────────────────────────────────────┘
 ┌ [photo] Morning walk ──────────────────────────┐
 │ Tomorrow, 7 am · Bishan Park                   │
 │ [ I'm going ]                                  │
 └────────────────────────────────────────────────┘
 ┌ (icon: pill) 8 am · Take medicine   [ Done ] ──┘

 [ (icon: person-simple-walk) Start walk ] [ (icon: calendar) Happenings ]
 [ (icon: gift) Share a skill ]           [ (icon: users) My Circles ]

                    ( (icon: microphone) Tell me )
 Pass It On        Kampung        Thrive
```
- **Read-out:** "Good morning Raj. You have a check-in, a walk tomorrow at 7 am, and medicine at 8 am."
- **P0 · Iter 1.1**

### S13 · Simple Mode
- **Inspired by:** **Be My Eyes** (one huge action) + Grab tiles
- **Layout:** three full-width buttons, each ~25% of screen height: *(icon: calendar)* Today · *(icon: microphone)* Talk · *(icon: warning)* Help (red). Auto-read on.
- **P1 · Iter 3.2**

## D. Kampung (community)

### S14 · Happenings (events feed)
- **Inspired by:** **Luma event list**
- **Borrow:** cards with one photo, title, date and place; lots of white space; calm list. **Adapt:** larger type, one "I'm going" button on each card, filter chips as big buttons. **Avoid:** Luma's small grey metadata, horizontal carousels.
- **Layout:** title "Happenings" · filter buttons (Today · This week · Walking · Classes · Kids) — max 5 · EventCards (photo 16:9, title, "Tomorrow, 7 am · Bishan Park", "12 going", I'm going) · bottom BigButton **Start something**.
- **Read-out:** "Happenings. 3 events today. First: Morning walk, 7 am, Bishan Park. Tap 'I'm going' to join."
- **P0 · Iter 1.1**

### S15 · Event details
- **Inspired by:** **Luma event page**
- **Borrow:** big cover photo, calm hierarchy (title → when → where → host → who's going), single Register button. **Adapt:** "Register" becomes **I'm going**; after joining it becomes **Join WhatsApp group**; Translate button when not in user's language. **Avoid:** long descriptions above the fold, ticket tiers.
- **Layout:**
```
 Back                                    Read it out   Help
 [ cover photo 16:9 ]
 Morning walk                                  (title)
 (icon: calendar) Tomorrow, 7 am – 8 am
 (icon: map-pin)  Bishan Park, Gate 2   [ Open in Maps ]
 Hosted by  [avatar] Raj Kumar  >             (taps to profile)
 Going  [avatars] 12 people
 Language: English · [ Translate ]
 About (2–3 lines max)
 [ I'm going ]                                 (bottom, full width)
```
- **Read-out:** "Morning walk. Tomorrow, 7 to 8 am, Bishan Park Gate 2. Hosted by Raj. 12 people going. Tap 'I'm going' to join."
- **P0 · Iter 1.1**

### S16 · You're going (confirmation)
- **Inspired by:** **Monzo** confirmation
- **Layout:** *(icon: check-circle, success)* "You're going." · "We'll remind you at 6 am." · BigButton **Join WhatsApp group** · outline **Done** · UndoBar 8 s.
- **P0 · Iter 1.1**

### S17 · Start Something (create event)
- **Inspired by:** **Airbnb** one-question-per-screen + **Luma create event** (simple fields)
- **Steps:** What? (category photo chips or say it) → When? (Today / Tomorrow / This weekend / Pick; time chips) → Where? (Near me / Community centre / Park / Pick on map) → Add WhatsApp group link (optional) → Preview (looks exactly like an EventCard) → **Publish**.
- **Avoid:** Luma's many optional fields (tickets, capacity rules) — hide or drop.
- **P0 · Iter 1.1**

### S18 · My Circles
- **Inspired by:** **Strava Clubs list**
- **Borrow:** club cards with photo, name, member count and next activity. **Adapt:** **Join WhatsApp group** and **See events** as the two actions. **Avoid:** leaderboards, club rankings.
- **Layout:** title "My Circles" · ClubCards · section "Circles near you" · Join.
- **P0 · Iter 1.1**

### S19 · Circle page
- **Inspired by:** **Strava club page**
- **Borrow:** header photo, members, upcoming group activities, recent group activities feed with kudos. **Adapt:** kudos become **Cheer** (tap or voice); captain shown with badge. **Avoid:** weekly leaderboard.
- **Layout:** header photo + name + "48 members" · captain · **Join WhatsApp group** · Upcoming (EventCards) · Recent group walks (route thumbnail, "9 people · 3.1 km · Saturday", Cheer) · Members (avatars).
- **P0 (header, upcoming, join) / P1 (group walk feed, cheers) · Iter 1.1 / 3.2**

## E. Thrive (health & activity)

### S20 · Thrive main
- **Inspired by:** **Apple Health summary**
- **Borrow:** stacked summary cards, each with one big number and a plain label; small weekly bars. **Adapt:** primary action **Start walk** at the top; never red for missed days. **Avoid:** Apple's dense "Highlights" text and small charts.
- **Layout:**
```
 Read it out          Thrive                          Help
 ┌ Did you move yesterday?  [Yes] [No] ┐            (if pending)
 [ (icon: person-simple-walk) Start walk ]          (primary)
 ┌ This week ──────────────────────────┐
 │ 8.6 km walked            (stat 40pt) │
 │ 4 walks · 5-day streak              │
 │ ▮ ▮ ▯ ▮ ▮ ▯ ▯   M T W T F S S       │
 └──────────────────────────────────────┘
 ┌ Last walk: Bishan Park · 2.4 km · 32 min  > ┐
 ┌ Reminders ─ 8 am Take medicine ─ [ Add reminder ] ┐
 ┌ Move Along (P1) ─ 5-minute warm-up  > ┐
```
- **Read-out:** "Thrive. This week you walked 8.6 kilometres in 4 walks. 5-day streak."
- **P0 · Iter 1.2**

### S21 · Good Morning Check-in
- **Inspired by:** **Monzo** (clear yes/no) + **Duolingo mechanics only** (streak, gentle nudge)
- **Layout:** question (title) · YesNo · Yes → check icon + "5 days in a row. Well done." · No → "Want company today?" + one walk EventCard + **Join walk** / **Maybe later**.
- **Avoid:** Duolingo's mascot, guilt messages, flames.
- **P0 · Iter 1.2**

### S22 · Walk recording (live)
- **Inspired by:** **Strava record screen**
- **Borrow:** map on top, live stats below, big pause/finish controls, works with screen locked. **Adapt:** **only 3 numbers** (Time, Distance, Steps) at 40pt; no pace, no heart rate; auto-pause; optional spoken update every km. **Avoid:** Strava's sport selector, segments, sensors menu.
- **Layout:**
```
 Help (red)
 [ map with route line — top half ]
 Time       24:10
 Distance   1.8 km
 Steps      2,430
 [ Pause ]            [ Finish ]          (72dp each)
```
- **Read-out:** "Walking. 24 minutes, 1.8 kilometres, 2,430 steps."
- **P0 · Iter 1.2 (mock track) → Iter 2.2 (real GPS)**

### S23 · Walk summary
- **Inspired by:** **Strava activity summary** + **Apple Fitness** (clean stat layout)
- **Borrow:** title + map + key stats + splits + "who you walked with"; Strava's sense of achievement. **Adapt:** 3 big stats then one smaller line (average pace); splits as same-colour bars with plain labels; friendly sentence ("Your longest walk this month"); home privacy zone on the map. **Avoid:** elevation profiles, calorie claims, comparisons to strangers, red/green "good/bad" colouring.
- **Layout:**
```
 Back                                   Read it out
 Morning walk · Bishan Park              (title, editable)
 Saturday, 7:05 am
 [ route map ]
 2.4 km        32 min        3,210
 Distance      Time          Steps
 Average pace  13 min 20 s per km
 Each kilometre
   1 km  ███████████  13:05
   2 km  ████████████ 13:35
 Walked with  [avatars] Lim, Ahmad, +6
 "Well done, Raj. That's your longest walk this month."
 [ Share to my Circle ]      [ Done ]
```
- **Read-out:** "Morning walk at Bishan Park. 2.4 kilometres in 32 minutes, 3,210 steps. Your longest walk this month."
- **P0 · Iter 1.2 (mock) → Iter 2.2 (real)**

### S24 · Walk history & trends
- **Inspired by:** **Apple Health trends** + **Strava training log**
- **Borrow:** Week/Month toggle, one big total, simple bar chart, list of activities. **Adapt:** toggle as two big buttons; plain comparison sentence ("1.2 km more than last week"); personal bests card. **Avoid:** multi-metric charts, pace graphs.
- **Layout:** Week · Month buttons · StatCard "8.6 km this week" + "4 walks · 2 h 10 min" · bar chart (distance per day) · sentence · Personal bests (Longest walk · Most steps in a day · Walks this month) · list of walks (thumbnail, date, place, km).
- **P1 · Iter 3.2**

### S25 · Move Along (camera warm-ups) — Android only
- **Inspired by:** **RightPosture's live-set screen** (Sayan's app — the engine behind this feature), simplified with **Apple Fitness+** restraint
- **Borrow from RightPosture:** live camera with skeleton, rep counting, one cue at a time, form-safety stop, end-of-set summary. **Adapt for seniors:** only 2 gentle moves (seated knee extension, sit-to-stand with a chair); rep count huge; one tip in big text and spoken in the user's language; skeleton in one colour (blue, turns green on a good rep — never red). **Drop:** quality bar, ghost overlay, correction arrows, physio screens, fatigue graphs, any "score" pressure.
- **Layout:**
```
 Back      Sit to stand                 Help (red)
 [ camera view, full width, simple blue skeleton ]
 6 of 10                                  (stat 40pt)
 "Stand up slowly, push through your feet"   (24pt, read aloud)
 [ Stop ]                                 (72dp, outline)
```
- **Before starting:** setup card with a photo — "Place your phone on a table about 2 metres away so we can see your whole body." Waits until the person is visible, then 3-2-1.
- **Safety stop:** "Let's stop here and rest." + Done. **Finish:** "10 sit-to-stands. Nice and steady." + "Getting a little tired near the end" if fatigue was detected — plain words, no numbers.
- **On iPhone (Expo Go):** info card "Camera warm-ups are available on Android" + a **camera-free guided warm-up** (each move read aloud with a photo, tap Done).
- **Read-out:** "Sit to stand. 6 of 10. Stand up slowly, push through your feet."
- **P1 · Iter 2.2 (shell on Android) → Iter 3.2 (polish)**

### S26 · Reminders
- **Inspired by:** **Monzo** (clear list + add) + iOS Reminders simplicity
- **Layout:** list rows (time, text, repeat) with Done · **Add reminder** → Say it ("Take medicine at 8 every morning") → ConfirmSheet; or form: What (chips) → Time (big wheels) → Repeat (Once / Every day / Weekdays).
- **P0 · Iter 1.2**

### S27 · Health Card
- **Inspired by:** **LifeSG / Apple Medical ID**
- **Layout:** blood group, conditions, medicines, emergency contacts; "Only you and your family can see this." · Edit (family can edit).
- **P1 · Iter 3.2**

## F. Safety

### S28 · SOS
- **Inspired by:** **Be My Eyes** (huge single action, calm clarity) + **SGDS** (trusted government tone)
- **Borrow:** full-screen, one obvious action, live status in plain words. **Adapt:** **Call 995** first, then auto-alert countdown with Cancel. **Avoid:** small text, anything decorative, multiple competing buttons.
- **Layout:**
```
 Getting help                              (red header)
 [ (icon: phone) Call 995 now ]            (red, 80dp)
 Telling your Safe Circle in 5…
 [ Cancel — I'm OK ]                        (outline, 72dp)
 ── after sending ──
 Priya — on her way
 Ahmad (300 m away) — on his way
 Lim — notified
 [ I'm safe now ]
```
- **Read-out:** "Getting help. Call 995 now, or cancel if you're okay. Telling your Safe Circle in 5 seconds."
- **P0 · Iter 1.2 (UI) → Iter 2.2 (fan-out)**

### S29 · Are you OK? (missed check-in / fall)
- **Inspired by:** **Apple fall detection** prompt
- **Layout:** "Are you okay?" (display) · big **I'm OK** (success) · **I need help** (red) · countdown 30 s read aloud.
- **P0 (missed check-in) / P1 (fall) · Iter 2.2 / 3.2**

### S30 · Helper alert (receiving side)
- **Inspired by:** **Be My Eyes incoming call** screen
- **Layout:** "Raj needs help" · map with location · time · **I'm on my way** (primary) · **Call Raj** · "Call 995" link.
- **P0 · Iter 2.2**

## G. Pass It On (skills & contributions)

### S31 · Pass It On main
- **Inspired by:** **Hinge profile** (prompt-based) + **Apple Health** (counters)
- **Layout:** My Story card (photo, voice intro player, "Ask me about" tags, Edit) · **What I Can Share** list + **Share a skill** · **What I've Given** StatCards (Sessions taught · People helped · Thank-yous) · badges as plain labelled icons.
- **P0 · Iter 1.3**

### S32 · Share a skill
- **Inspired by:** **Airbnb host onboarding / Airbnb Experiences listing**
- **Steps:** What can you share? (say it → suggested tags) → When? → Where? → Free or paid (Free default; Paid "coming soon") → Preview card → **Publish** (also becomes a Kampung event if a date is chosen).
- **P0 · Iter 1.3**

### S33 · Profile (public)
- **Inspired by:** **Hinge profile**
- **Borrow:** profile as a stack of cards — photo, prompt answers, voice. **Adapt:** two clear buttons instead of tabs: **What I've Given** · **What I Can Share**; verified tick (Singpass); endorsements per skill ("Endorsed for Chess by 12 people"). **Avoid:** swipe navigation, likes on photos.
- **Layout:** photo, name, area, languages, verified · voice intro player · "Ask me about" tags · section buttons · cards · Thank-You Wall preview.
- **P0 · Iter 1.3**

### S34 · Thank-You Wall & thank-you prompt
- **Inspired by:** **WhatsApp voice notes**
- **Borrow:** familiar voice-note bubble (play, waveform, duration). **Adapt:** name + photo of sender, transcript below, linked skill. **Avoid:** star ratings, public negative reviews.
- **Prompt (after an event, attendees only):** "How was Raj's chess session?" · **Thank Raj** (one tap) · **Say thank you** (record ≤ 20 s → preview → Send) · Skip.
- **P0 · Iter 1.3**

### S35 · Life Stories
- **Inspired by:** **Hinge voice prompts** + podcast-style list
- **Layout:** list of stories (title, length, play) · Record a story (prompt suggestions, "Ask Grandpa" questions from family).
- **P1 · Iter 3.2**

## H. Everywhere

### S36 · Buddy (voice helper)
- **Inspired by:** **Be My Eyes** (one big action) + **WhatsApp** bubbles for replies
- **Layout:** tap Tell me → bottom sheet: "Listening…" + live transcript (24pt) + Stop → reply as a large chat bubble with Play-again → ConfirmSheet when needed → app visibly navigates/highlights.
- **Avoid:** chatbot look, typing indicator gimmicks, "AI" labels.
- **P0 · Iter 1.3 (mock) → Iter 2.2 (real)**

### S37 · Read It Out controls
- **Inspired by:** **Apple Spoken Content** / podcast mini-player
- **Layout:** while reading, a slim bottom bar: Pause · Repeat · Slower; highlighted text on screen.
- **P0 · Iter 1.3**

### S38 · Notifications
- **Inspired by:** **Monzo** notifications (short, clear)
- **Rules:** first words say what it is ("Reminder: take medicine"), action buttons where supported (Yes/No, Done), no emojis, read aloud on open.
- **P0 · Iter 2.1**

### S39 · Empty, loading & error states
- **Inspired by:** **Monzo**
- **Examples:** "No events near you yet. Start one?" [Start something] · "Saving your walk…" · "That didn't work. Let's try again." [Try again]
- **P0 · each iteration**

### S40 · Settings
- **Inspired by:** **SGDS / LifeSG** settings lists
- **Rows (large, icon + label):** Language · Read aloud (auto, speed, voice) · Simple Mode · How we remind you · Safe Circle · Family · Health Card · Privacy · Sign out.
- **P0 (basic) · Iter 1.3**

---

## Core flows (screen sequences)

| Flow | Screens | Max taps from Home |
|---|---|---|
| Onboarding — Myself | S1 → S2 → S3 → S4 ×3 → S6 → S7 → S8 → S12 | — |
| Onboarding — Family | S1 → S2 → S3 → S9 (steps) → S10; senior accepts on WhatsApp/SMS | — |
| Join an event | S12 card → S16 (1 tap) or S14 → S15 → S16 (2 taps) | 2 |
| Check-in "No" → walk | S21 → walk card → S16 | 2 |
| Record a walk | S20 → S22 → Finish → S23 | 2 |
| Offer a skill | S31 → S32 (5 steps) | 1 + steps |
| Thank someone | notification → S34 prompt → Thank | 1 |
| SOS | Help (any screen) → S28 | 1 |
| Missed check-in | S29 → if no reply: call → family alert (S30 for family) | 0 |
| Voice action | Tell me → S36 → ConfirmSheet → done | 1 + voice |

## Mobbin board checklist (Kavya, Iter 0.2)

| Our screen(s) | Search on Mobbin |
|---|---|
| S14, S15, S17, S11 | Luma — event list, event page, create event, manage guests |
| S2, S4, S7, S17, S32 | Airbnb — host onboarding, listing creation |
| S20, S24, S10 | Apple Health — summary, trends, sharing |
| S5, S31, S33, S35 | Hinge — profile, prompts, voice prompts |
| S18, S19, S22, S23, S24 | Strava — clubs, club page, record, activity detail, training log |
| S25 | RightPosture's own `UI_screens/performing_a_set_hud` and `patient_session_summary` (in Sayan's repo) + Apple Fitness+ workout screen |
| S8, S16, S21, S26, S38, S39 | Monzo — confirmations, notifications, empty states |
| S12, S13 | Grab — home |
| S1, S3, S6, S9, S27, S40 | Singpass / LifeSG |
| S13, S28, S30, S36 | Be My Eyes — home, call screen |
| S34, S36 | WhatsApp — voice notes, chat |
