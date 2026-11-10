# Iteration 1.3 — Onboarding + Pass It On + Speech (Filming Build)

Stage 1 (Clickable app on mock data) · **Thu 12 Nov 2026, until 12:00 SGT** · filming that afternoon

## 1. At a glance

| | |
|---|---|
| **Goal** | Complete the P0 app on mock data: all three onboarding paths' P0 screens, Pass It On and profile, **Read It Out on every screen**, mock Buddy, and all 4 languages |
| **Exit (12:00 hard deadline)** | A senior can do the **5 test tasks** in any of the 4 languages on mock data, on Android **and** in Expo Go on an iPhone |
| **Golden-path steps covered** | 1 (family onboarding, mock), 5 (English inbound call loop, real Twilio) |
| **Owners** | A screens + Read It Out + mock Buddy + EAS Update · B auth / family / skills / endorsements / profile / stories / assistant stub · C translations wave 3 + Buddy keywords + inbound call loop + WA onboarding · D final UX DoD pass · E **filming** |
| **Est.** | A1.3 9 h (the biggest app iteration) · B1.3 5 h · C1.3 ~2 h + C1.3b 3 h · W1.3 3 h |

> **The 5 test tasks** (`02` §10): (1) join a walk · (2) answer the check-in · (3) press Help and cancel · (4) set a reminder by voice · (5) start and finish a walk and say what the summary shows.
> Tasks 1–3 and 5 were built in 1.1–1.2. **Task 4 depends on mock Buddy, built here.** Everything else in this iteration makes the build complete and multilingual.

## 2. Entry criteria

- [ ] 1.2 exit met (No → walk, simulated walk → summary, SOS everywhere).
- [ ] Translation waves 1–2 merged; wave-3 keys exported early Thursday.
- [ ] Mocks include: profiles with skills, endorsements (thumb + voice with transcripts), a story, a family link (Priya → Raj, status `invited`).
- [ ] Components: `PromptCard`, `VoiceNoteBubble`, `ListeningSheet`, `ConfirmSheet`.

## 3. Scope

### In

| PRD ID | Feature | Pri | Screen(s) |
|---|---|---|---|
| ON-1 | Language first, each in its own script | P0 | S1 |
| ON-2 | Path A: Myself | P0 | S2 → S3 → S4 ×3 → (S5) → S6 → S7 → S8 |
| ON-3 | Path B: My family → add parent → invite → senior taps Yes | P0 | S9, S10 (status) |
| ON-5 / ON-7 | Consent always; every step skippable | P0 | all onboarding |
| PO-1 | My Story (voice intro, "Ask me about", verified tick) | P0 | S31, S33 (S5 optional in onboarding, P1) |
| PO-2 | What I Can Share (free by default; paid "coming soon") | P0 | S32 |
| PO-3 | What I've Given (auto counters, badges) | P0 | S31, S33 |
| PO-4 | Teach & Learn: a skill with a date becomes a Kampung event | P0 | S32 → S14 |
| PO-5 | Thank-You Wall (attendees only; thumb or voice) | P0 | S34 |
| EV-1 | **Read It Out on every screen** + controls | P0 | S37 |
| EV-2 | Buddy voice helper, **mock** (keyword intents) | P0 | S36 |
| EV-3 | 4 languages | P0 | all |
| — | Settings (language, read aloud) | P0 | S40 |

### Out
- Path C: community / centre onboarding (ON-4, S11, P1 → 3.2). S2 shows the card; tapping it gives "Coming soon — ask us to set up your centre."
- Real Google / Singpass sign-in in the app (2.1). S3 buttons go to the mock flow.
- Real Buddy (2.2), Life Stories S35 (3.2), Health Card S27 (3.2), Family overview S10 parent card (3.2).

## 4. Lane tasks

### Lane A — App (Sarath) · A1.3 · 9 h

**Order of work.** If time runs out, everything above the line must be done by 12:00:
1. **Read It Out engine** on all built screens (needed for filming in every language)
2. **Mock Buddy** (test task 4)
3. Translations dropped in + Tamil layout fixes
4. S1 Language + S40 Settings (the language switch)
5. Onboarding Myself S2–S4, S6–S8
6. ──── must-have line ────
7. S31 Pass It On, S33 Profile, S34 Thank-You Wall
8. S32 Share a skill
9. S9–S10 family add + status
10. S5 voice intro (P1 in onboarding)

**Files**
```
app/app/(onboarding)/language, who, signin, name, area, interests, voice-intro,
                     safe-circle, channel, done, family-add, family-status
app/app/(tabs)/pass-it-on/index.tsx, share-skill.tsx
app/app/profile/[id].tsx · app/app/thanks/[eventId].tsx · app/app/settings.tsx
app/lib/readout.ts · app/lib/voice.ts (mock mode)
```

**Read It Out engine — `lib/readout.ts` (S37)**
- `useReadOut(() => [{ text, targetRef? }])` per screen. Scripts follow **where you are → content → what you can do**.
- `expo-speech` with `en-SG | ms-MY | zh-CN | ta-IN`, rate **0.85**.
- On startup run `Speech.getAvailableVoicesAsync()`. If a Malay or Tamil voice is missing, play the backend `/tts` audio (pre-generated for P0 phrases; see Risks).
- Highlight `targetRef` while it is being read. A slim bottom bar shows **Pause · Repeat · Slower**. Tapping a card reads only that card.
- Settings: auto-read (off by default; on in Simple Mode later), speed, voice.

**Mock Buddy — `lib/voice.ts` (S36)**
- **Tell me** → `ListeningSheet` ("Listening…", live transcript 24pt, Stop) → record with expo-av (max 15 s, stop after 1.5 s of silence).
- Mock intent matching: device STT isn't available in Expo Go, so for filming use C's **keyword lists** over a transcript. In Phase 1, transcript sources are: (a) the facilitator taps a pre-set utterance chip in a hidden dev panel, or (b) the backend `/assistant/turn` stub returns a canned transcript. Agree with C and B which one is reliable by 10:00.
- Intents (per language): **today**, **join**, **check in yes / no**, **remind me**, **start / stop walk**, **help**, **open profile**.
- Reply shown as a large bubble with Play-again, spoken with device TTS. Changes go through `ConfirmSheet` ("Every day at 8 am: take medicine. Is that right?" → Yes/No). The app visibly navigates and highlights.
- **help** → open S28 immediately, with no confirmation.

**Onboarding, Myself (S1 → S8)**

| Screen | Build |
|---|---|
| S1 Language | App name · "Choose your language" in all four, stacked · 4 BigButtons in their own script: English / Bahasa Melayu / 中文 / தமிழ் · Read it out reads the question in all four. **No flags, no dropdown** |
| S2 Who | 3 cards: Myself · My family ("Set up for a parent or grandparent") · My community or centre ("Add many members at once"; P1, shows "coming soon") |
| S3 Sign in | BigButtons: Singpass (mock, autofills name) · Google · Phone number · "We never share your details without asking you." No passwords |
| S4 ×3 | Name → Area → Interests. `StepProgress` "Step 1 of 3", title 28pt, 64dp field, **Say it instead** (mic), **Next** fixed bottom. Interests as 2-per-row photo chips |
| S5 (P1) | Hinge-style prompt card, tap-to-record ≤ 10 s, playback + transcript, re-record, Skip |
| S6 Safe Circle | "Who should we tell if you need help?" · pick up to 5 from contacts (`expo-contacts`) · large rows with Remove · **Done** / **Later** |
| S7 Channel | App notification · WhatsApp message · Phone call |
| S8 All set | (icon: check-circle) "Welcome, Raj." · "Every morning we'll ask how you are." · Go to Home. No confetti |

**Onboarding, Family (S9 → S10)**
- S9 steps: Their name → Their phone → Relation chips (Mother, Father, Grandmother, Grandfather, Other) → Their language → Their interests → "Add me to their Safe Circle" (on) → Review → **Send invite**.
- S10: status banner "Waiting for Dad to say yes" → "Dad joined" (mock toggle). Buttons: Set a reminder for Dad · Turn on Simple Mode (disabled until 3.2) · Safe Circle.
- **Consent rule (ON-5):** the senior's account stays `invited` until the senior says **Yes** (via WhatsApp in this iteration's W1.3).

**Pass It On + Profile**

| Screen | Build |
|---|---|
| S31 Pass It On | My Story card (photo, voice intro player, "Ask me about" tags, Edit) · What I Can Share list + **Share a skill** · What I've Given `StatCard`s (Sessions taught · People helped · Thank-yous) · badges as labelled icons |
| S32 Share a skill | What can you share? (say it → suggested tags) → When? → Where? → Free or paid (Free default; Paid "coming soon") → Preview card → **Publish**. If a date is set, it also creates a Kampung event (PO-4) |
| S33 Profile | Photo, name, area, languages, verified tick · voice intro · "Ask me about" tags · two buttons **What I've Given** / **What I Can Share** · skill endorsements ("Endorsed for Chess by 12 people") · Thank-You Wall preview |
| S34 Thank-You Wall + prompt | `VoiceNoteBubble`s (sender name + photo, play, waveform, duration, transcript, linked skill). Prompt: "How was Raj's chess session?" · **Thank Raj** (one tap) · **Say thank you** (record ≤ 20 s → preview → Send) · Skip. **Attendees only**; no stars, no negatives |
| S40 Settings | Rows: Language · Read aloud (auto, speed, voice) · How we remind you · Safe Circle · Family · Sign out. Simple Mode, Health Card and Privacy show as disabled rows labelled "coming soon" |

**Languages:** drop in waves 1–3 from C; **design for Tamil first** and fix any overflow at 200% font. User content shows the original plus a **Translate** button (stub).

**Distribution:** publish an **EAS Update** to a `filming` (or `demo`) channel. Give Santusht and Ken a QR for Expo Go (iPhone) plus the Android dev/preview build.

### Lane B — Backend (Sayan) · B1.3 · 5 h

| Endpoint | Behaviour |
|---|---|
| `POST /auth/singpass-mock` | Returns a fake verified MyInfo profile (name, birth year, area) and sets `singpass_verified=true` |
| Google auth | Supabase Auth Google OAuth configured. The app uses the web flow (`expo-auth-session`), wired in 2.1 |
| `POST /family/invite` | `{senior_name, phone, relation, language, interests, add_me_to_safe_circle}` → creates `users(status='invited', onboarded_by='family')` + `family_links(status='invited')` + optional `safe_circle` row; returns `invite_id`; queues the WA `welcome_invite_family` template (C's sender, when ready) |
| `POST /invites/{id}/accept` | Senior consents → `users.status='active'`, `family_links.status='accepted'`; consent record stored |
| Duplicate merge (ON-6, P1) | If the phone already exists, link to the existing user (cheap to add now) |
| `GET/POST /skills` | Skill offers; `is_paid=false` default. With `start_at`, it also creates an `events` row with `skill_offer_id` |
| `POST /endorsements` | `kind: thumb\|voice`. **Server checks `rsvps.attended=true` for `from_user` on `event_id`, otherwise 403** |
| `GET /users/{id}/profile` | Public: header, given counters, share cards with per-skill endorsement counts, thank-you previews. **Never** health card or Safe Circle |
| `POST /stories` | Upload audio to Supabase Storage, store the transcript (STT stub OK) |
| `POST /assistant/turn` **stub** | Accepts `{audio?\|text?, language, screen, screen_script}` and returns the `05` §2.2 response contract with canned replies per intent, including a `confirm` ui_action for `set_reminder` |

### Lane C — Voice (Ankit) · C1.3 + C1.3b

- **Translations wave 3:** onboarding + Pass It On + Settings + Buddy replies. Native-speaker check.
- **Mock Buddy keyword lists** per language → A (JSON: `intent → [keywords/phrases]`), covering the 8 intents above. Include Singlish / mixed-language variants for English ("can remind me take medicine 8 o'clock"), Malay "tolong" → help, Mandarin "救命" → help, Tamil "உதவி" → help.
- **Inbound call loop, Tier 1, English** (C1.3b, `05` §3.1, §3.4):
  - `POST /voice/incoming` → caller-ID lookup → known member greeting, or unknown → language menu (DTMF 1–4).
  - `<Gather input="speech dtmf" language="en-SG" speechTimeout="auto" action="/voice/turn">` with `<Play>` pre-generated TTS or `<Say>`.
  - `POST /voice/turn` → `SpeechResult` → intent (keyword match, or the B stub) → reply TwiML + next `<Gather>`.
  - Intents this iteration: **"What's on today?"** (`get_today`), **"Remind me…"** (confirm → `set_reminder` → writes a `reminders` row), **"Help"** (→ `trigger_sos` row + "Help is on the way. If you can, hang up and call 995.").
  - Silence for 5 s twice → "I'll call back later. Take care!" DTMF fallback at every prompt: "Say yes, or press 1."
  - Log every call to `messages_log`.

### Lane C — WhatsApp · W1.3 · 3 h

- **Onboarding flow** (`06` §3.1) in `channels/whatsapp/flows/onboarding.py`: "Hi" → language buttons ([English] [Bahasa Melayu] [More…] → list 中文 · தமிழ்) → name (text or voice note) → area → interests (list) → "You're in! Every morning at 8 I'll ask how you are." Writes the **same `users` table** with `channel_pref='whatsapp'`.
- **Invite acceptance:** `welcome_invite_family` / `welcome_invite_org` [Yes] [No] → calls the `/invites/{id}/accept` logic. Button payload IDs encode the action (`invite:yes:<id>`).
- `wa_session` state (flow + step, 30-min expiry); idempotency on `message.id`.

### Lane D — Design (Kavya)

- **Final UX Definition-of-Done pass on every P0 screen** built so far (S1–S4, S6–S10, S12, S14–S23, S26, S28, S31–S34, S36, S37, S40).
- Prepare the **filming task sheet**: 5 tasks, a neutral prompt for each ("You'd like some company for a walk tomorrow. Show me how you'd find one."), what to observe (hesitation, wrong taps, words they say), time per task.

### Lane E — Business & research — **Filming (12 Nov afternoon)**

- 5 test tasks with 3–5 seniors (≥ 2 men) in at least **two languages** and at large system font; think-aloud.
- Capture quotes and testimonials (video with consent), especially from men on purpose and roles.
- Native speakers sit in for Malay / Mandarin / Tamil sessions to catch wording problems.
- **Notes to the group the same evening**: per task, pass/fail, hesitation points, quotes. D turns them into the ranked fix list in 2.1.

## 5. Integration points

| From → To | What | By |
|---|---|---|
| A → C | Wave-3 keys | Thu 07:00 |
| C → A | Wave-3 translations + keyword lists | Thu 10:00 |
| B → A / C | `/assistant/turn` stub live on `demo` | Thu 09:00 |
| C → B | Inbound loop uses B's reminders / SOS services directly (no HTTP) | During 1.3 |
| A → E | EAS Update link + install instructions | **Thu 12:00** |
| E → D → A | Filming notes | Thu evening → 2.1 |

## 6. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | 5 test tasks in **Tamil** at 200% font, Android | All complete; no clipped text |
| T2 | 5 test tasks in **Mandarin**, iPhone Expo Go | All complete; Read It Out speaks Mandarin |
| T3 | Read It Out on every screen in **Malay** | Speaks Malay (device voice or `/tts` fallback); highlight follows |
| T4 | Tell me → "remind me to take medicine at 8" (each language) | ConfirmSheet → Yes → reminder in S26 |
| T5 | Tell me → "help" / "tolong" / "救命" / "உதவி" | S28 opens immediately |
| T6 | Myself onboarding, skipping every optional step | Lands on Home; "finish later" reminder queued |
| T7 | Family: Priya adds Raj → S10 "Waiting" → (WA) Raj taps Yes | S10 shows "Dad joined" (mock toggle or real if W1.3 is ready) |
| T8 | Share a skill with a date | Appears in S31 and as an event in S14 |
| T9 | Non-attendee tries to endorse (API) | 403 |
| T10 | Call the Twilio number (English): "What's on today?" → "Remind me to take my medicine at 8" → "Help" | Correct spoken replies; reminder row created; SOS row created |
| T11 | WhatsApp "Hi" → full onboarding | User row with `channel_pref='whatsapp'` and the chosen language |

## 7. Exit demo (11:30–12:00)

1. Fresh install → S1 Tamil → Myself → Home (under 3 minutes: PRD user story 1).
2. Run the 5 test tasks in Mandarin on an iPhone (Expo Go).
3. Tell me → set a reminder by voice → ConfirmSheet → it shows in Reminders.
4. Priya adds Dad → invite status.
5. Ankit calls the number live: "What's on today?" + "Remind me…".
6. Hand the EAS Update link to Santusht and Ken. **Filming starts.**

## 8. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Malay / Tamil device voices missing | Pre-generate P0 phrases via backend `/tts` (Google Cloud TTS) and ship them as audio. For filming, prefer phones that have the voices installed |
| No STT in Expo Go for mock Buddy | Dev-panel utterance chips (facilitator taps), or the stub returns a fixed transcript. Be honest on camera: the task tests the *flow*, not recognition |
| A doesn't finish everything by 12:00 | Cut below the must-have line (S9–S10, S32, S5 move to 2.1). Filming needs only the 5 tasks + languages |
| Translations late or wrong | Film in English + one other language; native speaker corrects live; fix in 2.1 |
| Twilio speech in en-SG is weak with accents | DTMF fallback in every prompt; slow, short prompts |

## 9. Definition of Done

- [ ] Read It Out works on **every** built screen in all 4 languages
- [ ] Mock Buddy handles the 8 intents in all 4 languages; "help" always opens SOS
- [ ] All P0 screens pass Kavya's final UX DoD pass
- [ ] Consent: no account becomes active without the senior's Yes
- [ ] Endorsements blocked for non-attendees (server-side)
- [ ] English inbound call loop answers "What's on today?", sets a reminder, and handles Help
- [ ] WhatsApp onboarding writes the same user table
- [ ] EAS Update published; works on Android **and** iPhone Expo Go
- [ ] Filming notes posted the same evening
