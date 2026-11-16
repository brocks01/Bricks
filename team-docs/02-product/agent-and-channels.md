# The agent and its channels

## How the agent reaches people (design rules)
These come from the philosophy (`../01-philosophy/philosophy.md`) and apply to every channel.
1. **Reach out, with consent.** An isolated person will not open an app, so the agent takes the first step (a call, a message, a nudge) at a time and in a language the person chose, never at night, never nagging. Consent to calls and messages is explicit and can be withdrawn at any time.
2. **Serve the four feelings:** noticed (remember yesterday), needed (ask a small question whose answer matters), expected (the circle would notice), remembered (keep their story).
3. **Small asks, never pity.** "I wanted to ask you something", not "you must be lonely".
4. **A ring of people.** Introduce people to people, then step back; never replace human contact.
5. **Family in the loop only with consent**, except when something may be wrong (silence, a fall, distress).
6. **Patient and plain**: one easy question at a time, no scolding, no hurry.

## One companion, every door
One agent brain with **one persona, one memory per person and one set of skills**. Every channel is a thin adapter that only carries words in and out; nothing is decided in an adapter. A person can start on a call and finish in the app.

| Channel | In | Out | Notes |
|---|---|---|---|
| Phone call | inbound `POST /twilio/incoming`; the agent speaks and listens in real time (Twilio Media Streams with a Gemini Live relay) | outbound calls for reminders and scheduled sessions | caller ID only picks the account; risky actions still need a spoken yes |
| Telegram | long polling (`@lahyf_bot` while testing), private chats only | the same bot | link by one-time code, or a new chat gets an account |
| WhatsApp | Twilio webhook `/v1/channels/twilio/whatsapp` | Twilio Messages API (`TWILIO_WHATSAPP_FROM`) | sandbox while testing |
| SMS | `/v1/channels/twilio/sms` | Twilio Messages API (`TWILIO_FROM_NUMBER`) | trial: verified numbers only |
| App | the mic orb and screens | notifications screen and inbox | built by the app team |
| WeChat | not built | not built | planned adapter |

## What the agent can do (56 skills; every one acts only for the person it runs for)
- **Day and health:** `my_day`, `checkin_today`, `tick_reminder`, `habit_done`, `log_walk`, `add_reminder`, `my_reminders`, `cancel_reminder`.
- **Goals and tree:** `my_tree`, `add_goal`, `add_goal_step`, `close_step`, `set_vision`, `remember_about_me`.
- **Communities and events:** `my_communities`, `whats_on`, `event_details`, `gathering_going`, `im_here`, `find_communities`, `join_community`, `leave_community`, `my_standing`, `suggest_for_me`.
- **Marketplace:** `market_events`, `market_going`, `take_stall`.
- **Wisdom:** see `wisdom.md` (15 skills).
- **Onboarding and profile:** see `people-and-onboarding.md`.
- **Family:** `tell_family` (needs a yes; never calls an emergency number).
- **Calls and messages:** `allow_reminder_calls`, `stop_calls`, `schedule_call`, `my_scheduled_calls`, `cancel_scheduled_call`, `set_contact_preference`, `my_notifications`.
Skills are the **only doers**. Risk levels: `read`, `safe` (changes the person's own data), `confirm` (tells another person; needs `confirmed: true` after the person's yes). A skill never raises to the model: a refusal is an answer. An ambiguous name returns the options; the agent never guesses. The same skills run from the command line (`python backend/run.py skill <email> <name> [json]`) and over `/v1/skills`.

## Scheduled calls
Any calendar item can be a call from Wisdom that does what the person asked: "call me every day at 6:30 and teach me ten English words", "help me prepare for my college interview". It needs the person's consent to calls, respects allowed hours and quiet hours, and tries twice.

## Wisdom speaks first: the outbox
Everything Wisdom tells a person outside a conversation (an introduction request, a nudge, a reminder) goes through one sender: to the person's **preferred channel**, then their other connected chats; every message also lands in the **in-app inbox**. **Not at night** (quiet hours 21:00 to 08:00 in the person's time, unless urgent). A failed send retries three times and then stays in the inbox. The same message is never sent twice. What was sent is added to the agent's memory.

## Spam and abuse safety
In front of every channel, before the agent runs: a blocklist, a burst and an hourly limit per sender (a flood gets one polite line, then silence), a daily limit of agent replies per person (the quick commands `/today`, `/tree`, `/markets` still work), long messages clipped, an hourly limit of inbound calls per number, and a cap on new accounts per hour. All limits are environment settings with safe defaults.

## Persona rules (in `backend/app/modules/channels/persona.py`)
Warm, patient, plain words, one easy question at a time, the person's language, never scolding. It says it is an AI. No diagnosis or medicine advice. Emergencies: 995 or 112. Telling family needs a clear yes. It gently notices loneliness and connects the person to people rather than replacing them.

## Status (Doors area)
- **Voice notes, built (16 Nov 2026).** A Telegram voice note or audio file (private chats only, up to 120 s and 5 MB) and an audio media file on WhatsApp or SMS (Twilio webhook, the file fetched with Twilio basic auth, up to 5 MB) become text through `channels/transcribe.py` — Gemini `generateContent` with inline audio, the same key and model fallback chain as the text agent, prompted to transcribe exactly in the speaker's language with no commentary. The transcript then follows the normal path: the same spam guard, the same quick commands, the same agent, the same memory. On any failure the person gets one kind line: "I could not hear that clearly. Could you say it again, or type it?" A photo (or any non-audio media) with nothing typed gets the same line. Replies stay text. Tests: `backend/tests/test_voice_notes.py`, mocked HTTP only. **Not live-tested:** no real Telegram bot token or Twilio sandbox message was used; limits are enforced before download on Telegram (duration and size known from the message) but by size only on Twilio (no duration given).
- **Daily check-in:** next in order (table `daily_checkins`, migration `0090`, skills, one line in the outbox loop).
- **WeChat adapter:** after the check-in. Signature and XML tests only; never live-tested.
- Needs from other areas: none. One unrelated failure in the shared suite comes from the Communities area's in-progress migration `0040` (column `circle` not applied locally), not from Doors.
