# Iteration 2.1 — Wire Up

Stage 2 (Real system) · **Thu 12 Nov 2026, afternoon → night (SGT)**, starting while filming is still going on

## 1. At a glance

| | |
|---|---|
| **Goal** | App runs on the real backend with real auth; security (RLS) is on; the scheduler and notifier exist; the real assistant turn works; the WhatsApp check-in and event-join flows go live |
| **Exit** | (1) A new user onboarded **in the app** appears in the DB and sees seeded events · (2) **WhatsApp onboarding** writes the same `users` table · (3) The **English inbound call** answers "What's on today?" from real data |
| **Owners** | A wiring + auth + push + filming fixes · B RLS + scheduler + notifier · C real `/assistant/turn` (with B) + WA check-in + events · D fix list · E business model draft |
| **Est.** | A2.1 5 h · B2.1 4 h · C2.1 4 h · W2.1 3 h |

## 2. Entry criteria

- [ ] Stage 1 exit (filming build) met.
- [ ] Every Stage-1 endpoint on `demo` returns JSON that matches A's mock hook shapes. Diff them before starting: A and B pair for 20 minutes.
- [ ] Supabase Google OAuth configured, with redirect URIs for Expo Go (`exp://…`) and the dev build scheme.
- [ ] Gemini API key in `.env` on `demo`; Google Cloud STT/TTS enabled.
- [ ] Filming notes arriving from E (the evening of 12 Nov).

## 3. Scope

### In
- Mock → real API for every Stage-1 screen (`lib/api.ts`, Supabase JWT).
- Real sign-in: Google (Supabase web OAuth) + Singpass mock (S3). Onboarding writes to `/me`. Family invite + status are real.
- Push registration (Android build) and S38 notification copy rules.
- RLS policies; scheduler skeleton (morning check-in, reminders, event reminders); notifier (push, WhatsApp, call).
- Real `/assistant/turn`: STT → Gemini tool-calling → TTS, confirmation pattern, `ui_actions`.
- WhatsApp: daily check-in Yes / No → walk suggestion → join → group link; event invites + joins.
- Top filming fixes.

### Out
- Escalation ladder logic (nudge → call → family alert) and SOS fan-out (2.2).
- Real Buddy *in the app* (2.2). In 2.1 the endpoint works and is tested by curl / a dev screen.
- GPS walks (2.2), outbound calls (2.2), calls in ms/zh/ta (2.2).
- WhatsApp reminders, SOS, family templates, voice notes (2.2).

## 4. Lane tasks

### Lane A — App (Sarath) · A2.1 · 5 h

| Task | Detail |
|---|---|
| **API client** `lib/api.ts` | `fetch` wrapper with base URL per env (`local` ngrok / `demo`), Supabase JWT in `Authorization`, 10 s timeout, error → S39 copy ("That didn't work. Let's try again." [Try again]). React Query keys unchanged, so each hook swaps its `queryFn` only |
| **Swap hooks** | `useMe`, `useToday`, `useEvents`, `useEvent`, `useRsvp`, `useCancelRsvp`, `useCreateEvent`, `useCircles`, `useCircle`, `useJoinCircle`, `useCheckin`, `useCheckinWeek`, `useReminders`, `useSafeCircle`, `useSkills`, `useProfile`, `useEndorse`. Keep a `USE_MOCKS` flag for offline demos |
| **Auth** (S3) | Google via `expo-auth-session` + `expo-web-browser` → Supabase session in `expo-secure-store`. Singpass button → `POST /auth/singpass-mock` → prefilled name/area. Phone number: OTP via Supabase if quick, otherwise hide it and keep it on the roadmap |
| **Onboarding writes** | S4 name / area / interests → `PATCH /me`; S6 → `PUT /safe-circle`; S7 → `PATCH /me {channel_pref}`; S1 language persisted to `/me` and i18n |
| **Family** (S9, S10) | `POST /family/invite`; S10 polls the invite status (React Query refetch every 10 s while visible) → "Dad joined" |
| **Push** | `expo-notifications` registration on the Android build → `PATCH /me {push_token}`. Categories: check-in (Yes/No), reminder (Done/Snooze), event reminder, thank-you prompt, SOS alert (high priority). In Expo Go, skip remote registration (`canUseRemotePush=false`) and schedule local notifications for check-ins and reminders |
| **S38 copy** | First words say what it is ("Reminder: take medicine"), action buttons, no emojis, read aloud on open |
| **Filming fixes** | Top items from Kavya's ranked list (D). Timebox ~1.5 h; the rest goes to 2.2 / 3.3 |

### Lane B — Backend (Sayan) · B2.1 · 4 h

**RLS policies** (Supabase):

| Table | Rule |
|---|---|
| `users`, `user_memory` | Owner read/write; accepted family read (limited columns) |
| `health_cards`, `safe_circle` | **Only the senior and accepted family** (`family_links.status='accepted'`) |
| `org_members`, `rsvps` (attendance) | Org admins see membership and attendance only, **never health or Safe Circle** |
| `walks` | Owner sees `route_polyline`; circle members see `route_public_polyline` when `visibility='circle'` |
| `events`, `circles` | Public read; write by host / captain |

The FastAPI service uses the service role and enforces the same rules in code. RLS protects anything that reads Supabase directly.

**Scheduler skeleton** (APScheduler in the backend process; `backend/scheduler/`):

| Job | When | 2.1 behaviour |
|---|---|---|
| Morning check-in | 08:00 user local (configurable per user) | `notify(user, checkin, normal)` via `channel_pref` |
| Reminders | `reminders.next_at` | Send + compute the next `next_at` from rrule |
| Event reminder | 1 h before `start_at` | To all `rsvps.status='going'` |

Add a **demo clock** override (`DEMO_FAST_ESCALATION`, plus a manual "fire now" admin endpoint `POST /admin/jobs/{job}/run`) so exit checks don't wait for 08:00.

**Notifier** (`backend/services/notifier.py`):
```
notify(user, message, urgency):
  normal → channel_pref only
  high   → app push + WhatsApp
  urgent → app push + WhatsApp + phone call
```
- Push via the Expo push API. WhatsApp via C's `sender.send_template()`. Calls via C's voice module `calls.create(url=/voice/outbound/{type}?user=…)`.
- Log every send to `messages_log` (channel, direction, type, payload, no personal free text).

### Lane C — Voice (Ankit, with B) · C2.1 · 4 h

**Real `POST /assistant/turn`** (`backend/agent/`), using the `05` §2.2 contract:

```
in:  {audio? | text?, language, screen, screen_script, confirm?: {tool, args, answer}}
1. STT: Gemini audio input or Google Cloud STT (en-SG, ms-MY, cmn-Hans-CN, ta-IN)
2. Load user + user_memory.summary (never the health card)
3. Gemini with the system prompt (05 §1) + tool registry (03 §5) as function declarations
4. Mutating tool → return needs_confirmation → ui_action {type:'confirm', tool, args}
   trigger_sos → execute immediately (no confirmation)
5. Execute tools against domain services; build reply_text (≤ 2 sentences, user's language)
6. TTS → reply_audio_url (Google Cloud TTS; cache by text hash)
out: {transcript, reply_text, reply_audio_url, ui_actions[], done}
```

- Tools wired in 2.1: `get_today`, `find_events`, `join_event`, `cancel_event`, `check_in`, `set_reminder`, `list_reminders`, `delete_reminder`, `get_progress`, `get_walk_stats`, `trigger_sos`, `navigate`, `read_screen`, `set_language`. Create / offer / story tools return a "please use the app screen" reply for now.
- **Distress pre-check before the LLM:** match the distress-phrase list on the transcript → `trigger_sos` deterministically. Never depend on the model for SOS.
- **Swap the inbound call loop to the orchestrator:** `/voice/turn` now calls the same orchestrator (minus `navigate`/`read_screen`), so "What's on today?" reads real data. This is part of the exit criterion.
- Unit tests: 10 English utterances per P0 intent → correct tool + args.

### Lane C — WhatsApp · W2.1 · 3 h

| Flow | Detail |
|---|---|
| **Daily check-in** (`flows/checkin.py`) | Scheduler → `daily_checkin` template [Yes] [No]. **Yes** → "Wonderful! 4 days in a row. See you tomorrow!" **No** → `find_events(category=walk, when=today, near=home)` → "No worries! Walk with 3 neighbours today, 6 pm, Toa Payoh Town Park. Join?" [Join walk] [Maybe later] → **Join** → RSVP + "You're going! Here's the group to say hi: <link>. I'll remind you at 5 pm." Payload IDs: `checkin:yes:2026-11-13`, `join:e_12` |
| **Event invites** (`flows/events.py`) | `event_invite` template [I'm going] [Not this time] [Tell me more] → RSVP → confirmation + **group invite link** |
| Writes | Same `checkins` / `rsvps` tables as the app, with `channel='whatsapp'`. An RSVP made on WhatsApp appears in the app |
| Hygiene | Signature verification (`X-Hub-Signature-256` / Twilio signature), idempotency on `message.id`, `wa_session` 30-min expiry |
| Route | Meta test number with pre-registered numbers, or Twilio sandbox, whichever has approved templates first. Inside the 24 h window, free-form replies are fine |

### Lane D — Design (Kavya)

- Turn the filming notes into a **ranked fix list** for A: severity (blocked task / hesitation / cosmetic) × frequency. Top 5 must land in 2.1–2.2.
- Write down any wording problems the native speakers flagged → C.

### Lane E — Business & research (Santusht + Ken)

- **Business model draft:** free core for seniors; **Peace of Mind** family tier; employer retirement-transition programme; centres / RCs admin + reports. Rejected: ads, donations (`01` §10).
- Collect evidence slides: SG super-aged stats, men's participation, Lancet 2024 risk factors, the purpose-in-life association (stated as association, not causation).
- Open question to close by 2.1: **should seniors earn money?** Use survey results. It's built as an optional toggle, off by default.

## 5. Integration points

| From → To | What | By |
|---|---|---|
| B → A | Final JSON diffs vs mock shapes | Start of 2.1 |
| B ↔ C | Orchestrator lives in `backend/agent/`; C owns prompts + tool schema text, B owns tool implementations | Pair session at the start |
| C → B | `sender.send_template()` and `voice.calls.create()` interfaces for the notifier | Mid 2.1 |
| D → A | Ranked fix list | Thu ~22:00 |

## 6. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | Fresh install → Google sign-in → onboarding (Myself) | `users` row with name / area / language / channel_pref; `user_memory` created; Home shows seeded events |
| T2 | Same on iPhone Expo Go | Works (web OAuth redirect OK) |
| T3 | Priya invites Raj (app) → Raj taps **Yes** on WhatsApp | `users.status='active'`, `family_links.status='accepted'`; S10 shows "Dad joined" |
| T4 | WhatsApp "Hi" onboarding (new number) | Same `users` table, `channel_pref='whatsapp'` |
| T5 | `POST /admin/jobs/morning_checkin/run` for a WA user → **No** → **Join walk** | RSVP row with channel whatsapp; group link delivered; RSVP visible in the app's event details |
| T6 | Call the number (English): "What's on today?" | Reads the real next event / reminder for the caller |
| T7 | `curl /assistant/turn` "remind me to take medicine at 8 every morning" | `ui_actions[0].type='confirm'`, `tool='set_reminder'`, correct args; second turn with `confirm.answer='yes'` creates the reminder |
| T8 | `/assistant/turn` "I fell" | `trigger_sos` executed with no confirmation step |
| T9 | RLS: a user JWT reads another user's `health_cards` | Denied |
| T10 | Push on Android: scheduled check-in fires | Notification with Yes / No actions |
| T11 | Duplicate WA webhook delivery | Single action |

## 7. Exit demo (15 min)

1. New person signs up live in the app → show the row in Supabase.
2. Text "Hi" from a second phone on WhatsApp → onboarding → same table.
3. Fire the morning check-in job → answer **No** on WhatsApp → join → link → open the app and see the RSVP.
4. Call the number: "What's on today?" (real data).
5. curl `/assistant/turn` for set_reminder (confirm flow) and "help".

## 8. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Google OAuth redirect fails in Expo Go | Singpass mock + a demo-account picker (seeded users) behind a dev flag; real Google on the Android build only |
| Templates not approved yet | Twilio sandbox; trigger the check-in after the user has messaged (24 h window open) |
| Gemini tool-calling picks the wrong tools | Tighten tool descriptions; add a keyword pre-router for the 6 core intents; keep confirmation on every change |
| RLS breaks app reads late at night | The backend uses the service role; ship RLS for the sensitive tables (health_cards, safe_circle) first, the others after the exit check |
| Filming fixes swamp A | Timebox to 1.5 h; carry the rest |

## 9. Definition of Done

- [ ] No mock data used by default in the app (`USE_MOCKS=false`)
- [ ] All three exit checks pass and are recorded (screen recording / curl output)
- [ ] RLS on `health_cards`, `safe_circle`; verified with a negative test
- [ ] Health card never in the LLM context; no personal data in logs
- [ ] Webhooks signature-verified and idempotent
- [ ] Assistant: confirmation on every mutating tool; SOS deterministic
- [ ] Android + iPhone Expo Go checks of the wired screens
