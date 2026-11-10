# Voice Helper & Phone Calling Agent Plan

Version 2.1 · 10 Nov 2026 · Owner: **Person C (Voice & WhatsApp)** · Backend support: Person B

Two products, one brain:
1. **Buddy (in-app voice helper)** — tap (mic icon) in the app.
2. **Phone agent** — seniors call a number, or the system calls them. No internet needed.

Both use the **Conversation Orchestrator** and **Agent Tool Registry** in `03_ARCHITECTURE.md` §5. Never market either as "AI": it's "Buddy, your helper" and "just call us".

---

## 1. Shared behaviour rules (system prompt essentials)

```
You are Buddy, a friendly helper in Kampung Connect for members aged 50+.
- Speak in the member's language: {language}. Use simple everyday words.
- Reply in at most 2 short sentences. Speak warmly; use their name.
- You can ONLY act through the provided tools. Never invent events or data.
- Before any change (join, cancel, reminder, create), confirm in one sentence and wait for yes.
- If the member says words like "help", "fall", "pain", "can't breathe", "emergency":
  call trigger_sos immediately and tell them help is coming and to call 995 if they can.
- No medical advice, no money, no drafting messages, no long chit-chat.
  If they want company, suggest a real event or circle.
- If you don't understand twice, offer 2–3 choices.
Member memory: {user_memory.summary}
Current screen (app only): {screen_name} — {screen_script}
```

Languages: `en` (handle Singapore-accented and mixed-language speech), `ms`, `zh` (Mandarin), `ta`.

## 2. Buddy — in-app voice helper

### 2.1 What it does

| Priority | Capability | Example utterance | Tool(s) | App result |
|---|---|---|---|---|
| P0 | Navigate | "Open my walks" / "Go to my profile" / "Go back" | `navigate` | Screen changes, target highlighted |
| P0 | Today's plan | "What's on today?" | `get_today` | Reads check-in, events, reminders |
| P0 | Find & join events | "Any walks tomorrow?" → "Join the first one" | `find_events`, `join_event` | Confirm → joined → WhatsApp link offered |
| P0 | Check-in | "Yes I walked today" | `check_in` | Streak updated |
| P0 | Reminders & alarms | "Remind me to take medicine at 8 every morning" | `set_reminder` | Confirm → local notification scheduled |
| P0 | Read notifications | "What did I miss?" | `get_today` | Reads new items |
| P0 | Progress | "How am I doing this week?" | `get_progress` | "4 walks, 1 class taught, 3 thank-yous. Great week!" |
| P0 | Walks | "Start a walk" / "Stop walk" / "How far did I walk this week?" | `start_walk`, `finish_walk`, `get_walk_stats` | Recording starts/stops; weekly totals read out |
| P1 | Warm-up | "Start my warm-up" | `start_warmup` | Android: opens Move Along. iPhone: "Camera warm-ups are on Android. Shall I read you a gentle warm-up instead?" |
| P0 | Emergency | "Help!" | `trigger_sos` | SOS screen opens immediately |
| P1 | Explain screen | "What does this button do?" | `read_screen` | Explains the highlighted control |
| P1 | Create by voice | "Start a chess session Saturday 10 am at the CC" | `create_event` | Preview → publish |
| P1 | Offer a skill | "I can teach Tamil to kids" | `offer_skill` | Skill card draft |
| P1 | Story / thank-you | "Record a story" / "Thank Raj" | `record_story`, `send_thanks` | Recorder opens |
| P1 | Language | "Speak Tamil" | `set_language` | App + voice switch |

**Alarms on iOS vs Android:** Android can open the system alarm (`AlarmClock.ACTION_SET_ALARM`) via native intent; iOS cannot set system alarms, so on iOS (and as default everywhere) "alarms" are **in-app scheduled notifications with sound**. Say "reminder" in UI for consistency.

### 2.2 Turn lifecycle

```
1. Tap (mic icon) → record (max 15 s, auto-stop on 1.5 s silence)
2. POST /assistant/turn {audio, language, screen, screen_script}
3. Backend: STT → orchestrator(LLM + tools) → response JSON
4. App: show transcript + reply text (large), speak reply, run ui_actions
5. If needs confirmation → ConfirmSheet (Yes/No by tap or voice) → second turn
6. Backend merges anything durable into user_memory.summary
```

Response contract:
```json
{
  "transcript": "remind me to take medicine at 8 every morning",
  "reply_text": "Every day at 8 am: take medicine. Is that right?",
  "reply_audio_url": "https://.../tts/abc.mp3",
  "ui_actions": [{"type": "confirm", "tool": "set_reminder",
                  "args": {"text": "Take medicine", "time": "08:00", "repeat": "daily"}}],
  "done": false
}
```

### 2.3 Fallbacks
- No network → on-device keyword matcher (6 core intents per language) + device TTS.
- STT confidence low twice → show 3 choice buttons.
- Latency target: reply starts < 2.5 s; show "Thinking…" with a gentle sound.

## 3. Phone calling agent

### 3.1 Inbound — member calls the Kampung number

```
Ring → caller ID lookup
  ├─ Known member → "Hi Mr Lim! It's Buddy from Kampung. What would you like to do?
  │                  You can say: what's on today, join a walk, set a reminder, or get help."
  └─ Unknown → "Welcome to Kampung Connect. Which language? English press 1, Melayu 2, 中文 3, தமிழ் 4."
               → short onboarding: name → area → interests → "A family member can also set you up."
               → creates user (status active, onboarded_by=self via call), sends SMS/WhatsApp welcome

Main loop (max ~3 minutes):
  "What's on today?"      → get_today → reads 1–3 items → "Want to join the walk?"
  "Join the walk"         → confirm → join_event → "Done! I'll call/remind you at 6."
  "Remind me ..."         → confirm → set_reminder
  "I walked today"        → check_in yes
  "How far did I walk?"  → get_walk_stats → "This week you walked 8.6 kilometres in 4 walks. Well done."
  "Help" / distress words → trigger_sos → "Help is on the way. If you can, hang up and call 995."
                             (also offers to connect: "Say 'connect' and I'll call your daughter now")
  Silence 5 s twice       → "Are you still there?" → then "I'll call back later. Take care!"
Goodbye: always end with the next thing: "See you at the walk at 6 pm!"
```

DTMF fallback at any prompt: "Say yes, or press 1."

### 3.2 Outbound calls (from scheduler)

| Call | When | Script (English; translated for each language) |
|---|---|---|
| **Morning check-in** | 08:00 for `channel_pref=call` | "Good morning Mdm Tan, it's Buddy. Did you move yesterday? Say yes or no." → Yes: "Wonderful! Keep it up." → No: "There's a walk at 6 pm near Block 45 with 4 neighbours. Want to join?" |
| **Reminder** | reminder `next_at` | "Hi Mdm Tan, a reminder: take your medicine. Say 'done' when you have." |
| **Event reminder** | 1 h before | "Your walk starts at 6 pm at Block 45 park. See you there!" |
| **Are you OK?** | Check-in +3 h unanswered (all users) | "Hi Raj, we haven't heard from you today. Are you okay? Say yes, or say help." → no answer after 2 tries → family alert |
| **SOS helper call** | SOS fan-out | "This is Kampung Connect. Raj pressed Help near Block 123. Say 'coming' if you can go, or press 1." → `sos_responses` |
| **Family alert** | Missed check-in +4 h | "Hi Priya, your dad hasn't checked in today. Say 'call him' to connect now." |

Retry policy: unanswered → retry once after 10 min; voicemail → leave short message + WhatsApp text.

### 3.3 Identity & safety on calls
- Caller ID must match a registered phone.
- **Sensitive actions** (change Safe Circle, family links, phone number) need the 4-digit PIN set by the member/family; otherwise: "Please ask Priya to do that in the app."
- Never read health card details aloud on outbound calls.
- Don't act on a second voice in the background for sensitive actions.
- Log every call (`messages_log`), store transcript, delete audio.

### 3.4 Implementation — two tiers (build Tier 1 first)

**Tier 1 — reliable (P0, demo-safe):** Twilio Programmable Voice + TwiML
- `POST /voice/incoming` → TwiML `<Gather input="speech dtmf" language="{lang}" speechTimeout="auto" action="/voice/turn">` with `<Play>` of our TTS audio (Google Cloud TTS) or `<Say>`.
- `POST /voice/turn` → `SpeechResult` text → orchestrator → reply TwiML (`<Play>` + next `<Gather>`).
- Outbound: Twilio REST `calls.create(url=/voice/outbound/{type}?user=...)`.
- Simple, turn-based, ~1–2 s latency per turn. Good enough for a 3-minute senior call.
- **Verify:** speech-recognition language support for `ms-MY`, `cmn-CN`, `ta-IN` in Twilio Gather; if a language is weak, use `<Record>` → our own STT (Gemini/Google) → reply.

**Tier 2 — natural conversation (P1/pitch):** Twilio Media Streams websocket → **Ankit's Gemini Live agent** (real-time audio in/out, barge-in) → same tool registry over function calling. Also enables his background-sound detection (fall/thud) idea for future.

**Numbers:** a Singapore number may need regulatory documents and time. For the demo: use any available Twilio number (calls from SG phones are fine for judging), or Exotel/Plivo for an Indian number. **Check on 11 Nov.**

**Cost note:** calls are the most expensive channel — default users to WhatsApp; use outbound calls only for `channel_pref=call` and escalations.

### 3.5 Call prompt files
```
channels/voice/prompts/
  system.md                # shared rules (§1)
  inbound_welcome.{en,ms,zh,ta}.txt
  checkin.{lang}.txt  reminder.{lang}.txt  are_you_ok.{lang}.txt
  sos_helper.{lang}.txt  family_alert.{lang}.txt  goodbye.{lang}.txt
```
Pre-generate TTS audio for all fixed prompts (faster, better quality); only dynamic parts (names, event titles) use live TTS.

## 4. Testing

| Test | Pass criteria |
|---|---|
| 20 utterances × 4 languages for each P0 intent | ≥ 85% correct tool + args |
| Distress phrases ("help", "I fell", "tolong", "救命", "உதவி") | 100% trigger SOS |
| Senior call test (5 people) | Completes check-in + join walk in < 2 min without help |
| Outbound escalation dry run | Check-in → reminder → call → family alert fires in order (use 1-minute test timings) |
| Noise test | Works with TV/background noise at moderate level |

## 5. Build by phase and iteration (Person C — voice)

Iteration dates: `07_PROJECT_WORKFLOW.md`. Design of Buddy's screens: `02b_SCREEN_DESIGNS.md` S36–S37.

### Phase 0 — Foundations
**Iteration 0.1 — Accounts and hello world**
- Twilio account + number (check Singapore number requirements; fallback to any available number). ngrok tunnel.
- Inbound call that greets in all 4 languages (pre-recorded TTS).
**Iteration 0.2 — Contracts**
- System prompt (§1) and tool schemas agreed with Person B; distress-phrase list in 4 languages.

### Phase 1 — Language and scripts (app builds on mocks)
**Iteration 1.1 — Translations wave 1**
- Translate Home + Kampung strings (en → ms, zh, ta); native-speaker check via Santusht/Ken.
**Iteration 1.2 — Translations wave 2 + call scripts**
- Translate Thrive + SOS strings; write all call prompt files (§3.5) in 4 languages.
**Iteration 1.3 — Translations wave 3 + inbound loop**
- Translate onboarding + Pass It On strings; mock Buddy keyword lists per language for Person A.
- Inbound call loop Tier 1 in English: "What's on today?", "Remind me…", "Help".

### Phase 2 — Live voice
**Iteration 2.1 — Real assistant turn**
- `/assistant/turn`: STT → Gemini tool-calling → TTS, with Person B. Confirmation pattern; `ui_actions` for the app.
**Iteration 2.2 — Calls in four languages + outbound**
- Inbound loop in ms / zh / ta (verify Twilio speech language support; fallback `<Record>` → our STT).
- Outbound: morning check-in, reminder, event reminder, Are you OK?, SOS helper call, family alert.
- Caller-ID identity + PIN for sensitive actions. Pre-generated TTS library for fixed prompts.
**Iteration 2.3 — Test and harden**
- Test suite (§4): 20 utterances × 4 languages × P0 intents; distress phrases 100%; escalation dry run with 1-minute timings; noise test.

### Phase 3 — Hackathon
**Iteration 3.1** — Venue tests: call quality, latency; stage call script rehearsed.
**Iteration 3.2** — Tier 2 natural calls: Twilio Media Streams → Gemini Live (Ankit's agent), barge-in. Only if Tier 1 is solid.
**Iteration 3.3** — Voice quality tuning in ms / zh / ta; backup recording of a full live call; code freeze H30.
**Iteration 3.4** — Rehearse the on-stage call; prepare the channel-architecture Q&A slide.

| ID | Task | Iteration | Est. |
|---|---|---|---|
| C0.1 | Twilio + number + 4-language hello call | 0.1 | 1.5 h |
| C0.2 | System prompt, tool schemas, distress list | 0.2 | 2 h |
| C1.1–1.3 | Translations (3 waves) + call prompt files + mock Buddy keywords | 1.1–1.3 | 6 h |
| C1.3b | Inbound call loop Tier 1 (English) | 1.3 | 3 h |
| C2.1 | `/assistant/turn` with B | 2.1 | 4 h |
| C2.2 | Calls in 4 languages, outbound calls, identity, TTS library | 2.2 | 6 h |
| C2.3 | Test suite | 2.3 | 2 h |
| C3.2 | Tier 2 Gemini Live (stretch) | 3.2 | 6 h |
| C3.3 | Voice tuning + backup recording | 3.3 | 2 h |
