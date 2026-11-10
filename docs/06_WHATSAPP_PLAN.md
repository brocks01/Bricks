# WhatsApp Channel Plan

Version 2.0 · 10 Nov 2026 · Owner: **Person C (Voice & WhatsApp)** · Account/business setup: Santusht · Backend: Person B

> Most seniors already live on WhatsApp. They should be able to do **everything important** here with **buttons and voice notes** — no typing commands, no app download.

---

## 1. Principles for WhatsApp

- **Buttons first.** Every message that asks something has reply buttons (max 3) or a short list. Never ask users to type commands.
- **Voice notes both ways.** Members can send a voice note for anything; we reply with text + a short voice note in their language.
- **One message, one idea.** Short, warm, plain text. **No emojis** — clarity comes from short lines, bold first words and buttons.
- **Respect the 24-hour rule** (see §5) — use approved templates for anything we send first.
- **WhatsApp is a front door, not a dead end.** Gently offer the app for photos, profile, Thank-You Wall — but never require it.

## 2. What members can do on WhatsApp

| Priority | Capability | How |
|---|---|---|
| P0 | **Onboard** | Message "Hi" (or scan QR / tap link from family/admin) → language buttons → name → area → interests (list) → "You're in!" |
| P0 | **Accept family/admin invite** | Template: "Priya set up Kampung Connect for you. Join?" [Yes] [No] |
| P0 | **Good Morning Check-in** | Template with [Yes] [No]; No → walk suggestion [Join walk] [Maybe later] |
| P0 | **Join events** | Invite template [I'm going] [Not this time] → confirmation + **group invite link** |
| P0 | **Reminders** | Template text + voice note; [Done] [Snooze 10 min] |
| P0 | **SOS** | Send "HELP" / "TOLONG" / "救命" / "உதவி", or a voice note with distress words → Safe Circle fan-out + "Call 995 if you can" |
| P0 | **Ask anything simple by voice** | Voice note → transcribed → same orchestrator → reply (e.g. "Any walks tomorrow?") |
| P1 | **Weekly progress card** | Clean image card (Strava-style): walking distance, walks, streak, thank-yous, mini route of best walk — shareable to family groups |
| P1 | **Walk summary after a walk** | If recorded in the app: "Morning walk, 2.4 km in 32 min. Well done, Raj." + summary image |
| P1 | **Family summaries** | Weekly Joy Report and missed-check-in alerts to family's WhatsApp |
| P1 | **Thank-you after event** | [(thumbs-up icon) Thank Raj] or send a voice note → endorsement |
| P1 | **Share location for SOS / nearby events** | Interactive location request |
| P1 | **Menu** | Sending "Menu" shows list: Today · Find events · Reminders · My progress · Help · Language |
| P2 | **Create an event** | Guided 3-question flow for captains |

## 3. Conversation flows

### 3.1 First contact / onboarding
```
Member: "Hi"
Bot: "Welcome to Kampung Connect! Which language?"
     [English] [Bahasa Melayu] [More…] → list: 中文 · தமிழ்
Bot: "Lovely! What should we call you? You can type or send a voice note (mic icon)"
Member: (mic icon) "Lim Ah Kow, call me Uncle Lim"
Bot: "Nice to meet you, Uncle Lim! Which area do you live in?"
Member: "Toa Payoh"
Bot: "What do you enjoy? Pick one, you can add more later." [list: Walking · Tai Chi · Cooking · Chess · Music · Gardening · Teaching · Other]
Bot: "You're in! Every morning at 8 I'll ask how you are. Want to see walks near you now?" [Yes please] [Later]
```

### 3.2 Daily check-in (template `daily_checkin`)
```
08:00  "Good morning Uncle Lim! Did you move yesterday?" [Yes] [No]
Yes → "Wonderful! 4 days in a row. See you tomorrow!"
No  → "No worries! Walk with 3 neighbours today, 6 pm, Toa Payoh Town Park. Join?" [Join walk] [Maybe later]
      Join → "You're going! Here's the group to say hi: https://chat.whatsapp.com/xxxx  I'll remind you at 5 pm."
No reply by 10:00 → template `checkin_nudge`: "Just checking in, Uncle Lim Are you okay?" [I'm OK] [Need help]
No reply by 11:00 → outbound call (voice plan §3.2)
No reply by 12:00 → family template `family_missed_checkin` to Safe Circle family
```

### 3.3 Event invite (template `event_invite`)
```
"Morning walk with Bishan Walkers
 Tomorrow, 7 am · Bishan Park Gate 2 · 12 going
 Hosted by Raj"
[I'm going] [Not this time] [Tell me more]
```

### 3.4 Reminder (template `reminder`)
```
"8:00 am — Take your medicine, Mdm Tan." + (speaker icon) voice note
[Done ] [Snooze 10 min]
```

### 3.5 SOS
```
Member: "HELP"  (or (mic icon) voice note with distress words, or [Need help] button)
Bot (immediately): "(alert icon) Help is coming. If you can, call 995 now. I'm telling Priya and your neighbours."
     [I'm OK now] [Call my daughter]
Bot: "Please share your location " (location request) — uses home address if none
Fan-out to Safe Circle: template `sos_alert`:
     "(alert icon) Raj needs help. Location: <map link>. Sent 08:42." [I'm on my way] [Call Raj]
Bot to member: "Priya is on her way . Ahmad (300 m) is on his way."
```

### 3.6 Family flows
- `family_invite_status`: "Dad joined Kampung Connect "
- `weekly_joy_report` (Sunday): "This week Dad joined 3 walks, taught chess once and got 4 thank-yous " [See more in app]
- `family_missed_checkin`: "Dad hasn't checked in today. [Call Dad] [I'll check]"

### 3.7 Voice notes
```
Incoming audio (ogg/opus) → download via media API → STT in user language →
orchestrator (same tools as Buddy, minus navigate) → reply text + optional TTS voice note (ogg/opus) →
if a change is needed → confirmation buttons [Yes] [No]
```

## 4. Template list (submit for approval early — Utility category)

| Name | Variables | Buttons |
|---|---|---|
| `welcome_invite_family` | senior_name, family_name | Yes / No |
| `welcome_invite_org` | org_name | Yes / No |
| `daily_checkin` | name | Yes / No |
| `checkin_nudge` | name | I'm OK / Need help |
| `event_invite` | title, when, place, going_count, host | I'm going / Not this time / Tell me more |
| `event_reminder` | title, time, place | On my way / Can't make it |
| `reminder` | time, text, name | Done / Snooze 10 min |
| `thank_you_prompt` | host_name, event_title | (thumbs-up icon) Thank / Skip |
| `sos_alert` | name, map_link, time | I'm on my way / Call {name} |
| `family_missed_checkin` | senior_name | Call / I'll check |
| `weekly_joy_report` | senior_name, walks, taught, thanks | See more |
| `weekly_progress_card` | name, km, walks, streak (+ image header) | See my walks |

Each template in **4 languages** (en, ms, zh_CN, ta). Keep wording neutral and helpful (utility), not promotional, to pass review.

## 5. Setup & platform rules

### 5.1 Two routes — do both in parallel
| Route | Use | Steps | Watch-outs |
|---|---|---|---|
| **Meta WhatsApp Cloud API** (production) | Real number, templates, buttons, lists, media | Meta developer app → WhatsApp product → test number works immediately for **a few pre-registered recipient numbers** → for a real number: Meta Business verification + display name approval | Business verification can take days; templates need approval (often quick for utility); business-initiated messages outside 24 h must be templates; pricing per template message — check current rates |
| **Twilio WhatsApp Sandbox** (demo fallback) | Anyone can join by sending a join code; good for judges | Twilio console → Messaging → WhatsApp sandbox → set webhook | Users must send "join <code>" first; sandbox has limits on templates/branding |

**Demo plan:** pre-register team + senior testers + (on the day) judges' numbers on the Meta test number, *or* show a QR that opens WhatsApp with the sandbox join code prefilled. Decide by 12 Nov.

### 5.2 The 24-hour customer-service window
- When a member messages us, we can reply freely (any message type, buttons, lists) for 24 h.
- Outside that, we must use an **approved template**. All scheduled messages (check-in, reminders, invites, SOS alerts to helpers) are templates.
- Tip: the daily check-in reply opens a new 24 h window each day for free-form follow-ups.

### 5.3 Groups
- The API path we're using **does not add people to groups for us**. We send the circle's **invite link** (pasted by the captain). This also means existing WhatsApp communities come over with zero migration.

### 5.4 Consent
- Opt-in is recorded at onboarding (member's "Yes"). Every template footer: "Reply STOP to pause messages." Handle STOP / START.

## 6. Backend implementation

```
channels/whatsapp/
  webhook.py        # GET verify token; POST receive → verify signature → route
  router.py         # message types: text, button_reply, list_reply, audio, location
  flows/onboarding.py checkin.py events.py reminders.py sos.py family.py
  templates.py      # name → per-language params builder
  sender.py         # send_text, send_buttons, send_list, send_template, send_audio, send_location_request
  media.py          # download audio, upload TTS audio
```
- State per user: small `wa_session` (current flow + step) in Postgres/Redis, expires after 30 min.
- Button payload IDs encode action: `checkin:yes:2026-11-15`, `join:e_12`, `sos:onway:s_7`.
- Free-text or voice that doesn't match a flow → orchestrator (tools) → reply.
- Idempotency: store incoming `message.id`; ignore duplicates (webhooks can retry).
- Rate limiting and retries on send failures; log everything to `messages_log`.

## 7. Testing

| Test | Pass |
|---|---|
| Onboarding in all 4 languages | Completed with buttons only, no typing except name |
| Check-in Yes / No / no-reply escalation (1-min test timings) | Correct message sequence; call triggered; family alerted |
| HELP keywords in 4 languages + voice note "I fell" | SOS fan-out in < 10 s |
| Event join | Link delivered; RSVP visible in app |
| Duplicate webhook delivery | Single action |
| STOP / START | Messages pause/resume |

## 8. Build by phase and iteration (Person C — WhatsApp; Santusht — accounts)

Iteration dates: `07_PROJECT_WORKFLOW.md`. Message style follows `02_DESIGN_PRINCIPLES.md`: plain text, no emojis, first words say what it is, buttons for every question.

### Phase 0 — Foundations
**Iteration 0.1 — Access** (C + Santusht)
- Meta developer app + WhatsApp test number; add team and tester numbers as recipients.
- Twilio WhatsApp Sandbox as backup. Start Meta Business verification in parallel.
**Iteration 0.2 — Webhook**
- Webhook verify token + signature check + message router skeleton; echo bot works.

### Phase 1 — Templates and onboarding
**Iteration 1.1** — Write all 12 templates in English; Santusht reviews tone.
**Iteration 1.2** — Translate templates to ms / zh / ta; submit for approval (utility category).
**Iteration 1.3** — Onboarding flow (language → name → area → interests) and invite acceptance (family / admin), writing to the same backend users.

### Phase 2 — Live flows
**Iteration 2.1** — Daily check-in (Yes / No → walk suggestion → join → group link); event invites and joins.
**Iteration 2.2** — Reminders (Done / Snooze); SOS keyword + voice-note distress → Safe Circle fan-out; family templates (missed check-in, invite status); escalation hooks with Person B's scheduler; voice notes in/out (STT/TTS).
**Iteration 2.3** — Tests (§7) in all 4 languages; STOP / START; duplicate-webhook idempotency; decide the judge demo route (Meta test number with pre-registered numbers vs sandbox join QR).

### Phase 3 — Hackathon
**Iteration 3.1** — Judge path live: QR → WhatsApp → onboarding → check-in.
**Iteration 3.2** — Weekly progress image card and walk summary card (with Person B); Menu list; location request for SOS.
**Iteration 3.3** — Rehearse; backup screen recording of the WhatsApp flow; code freeze H30.
**Iteration 3.4** — Q&A slide: how existing WhatsApp communities come over (group links, no migration).

| ID | Task | Owner | Iteration | Est. |
|---|---|---|---|---|
| W0.1 | Meta app, test number, sandbox, start verification | C + Santusht | 0.1 | 1.5 h |
| W0.2 | Webhook + signature + router | C | 0.2 | 2 h |
| W1.1–1.2 | 12 templates × 4 languages, submit | C (+ Santusht) | 1.1–1.2 | 3 h |
| W1.3 | Onboarding + invite acceptance | C | 1.3 | 3 h |
| W2.1 | Check-in + events | C | 2.1 | 3 h |
| W2.2 | Reminders, SOS, family templates, escalation, voice notes | C + B | 2.2 | 5 h |
| W2.3 | Tests, STOP/START, idempotency, judge route decision | C | 2.3 | 2 h |
| W3.x | Judge path, progress/walk cards, menu, location request | C + B | 3.1–3.2 | 4 h |
