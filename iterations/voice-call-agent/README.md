# Voice Helper & Phone Calling Agent Track — Iterations

Source: `docs/05_VOICE_CALL_AGENT_PLAN.md`

Two products, one brain:
1. **Buddy**: the in-app voice helper (tap Tell me).
2. **Phone agent**: seniors call a number, or the system calls them. No internet needed.

Both use the **Conversation Orchestrator** and the **Agent Tool Registry** (`docs/03` §5). Never market either as "AI": it's "Buddy, your helper" and "just call us".

This track also owns **app translations** (en → ms, zh, ta) in Phase 1 (`05` §5).

| Iteration | File | When (SGT) | Est. | Exit |
|---|---|---|---|---|
| 0.1 | [Accounts + hello-world call](0.1-accounts-hello-world.md) | Tue 10 Nov night | 1.5 h | Inbound call greets in 4 languages |
| 0.2 | [Contracts: prompt, tools, distress list](0.2-contracts.md) | Wed 11 Nov morning | 2 h | System prompt + tool schemas merged with B; distress list in 4 languages |
| 1.1 | [Translations wave 1](1.1-translations-wave-1.md) | Wed 11 Nov day | ~2 h | Home + Kampung strings in ms / zh / ta, reviewed |
| 1.2 | [Translations wave 2 + call scripts](1.2-translations-wave-2-call-scripts.md) | Wed 11 Nov evening | ~2 h | Thrive + SOS strings; all call prompt files × 4 languages |
| 1.3 | [Translations wave 3 + inbound loop](1.3-translations-wave-3-inbound-loop.md) | Thu 12 Nov until 12:00 | 2 h + 3 h | Mock Buddy keywords; English inbound loop: today / remind / help |
| 2.1 | [Real assistant turn](2.1-real-assistant-turn.md) | Thu 12 Nov pm–night | 4 h | `/assistant/turn`: STT → Gemini tools → TTS, confirmation, `ui_actions` |
| 2.2 | [Calls in 4 languages + outbound](2.2-calls-four-languages-outbound.md) | Fri 13 Nov day | 6 h | Inbound ms / zh / ta; 6 outbound call types; identity + PIN; TTS library |
| 2.3 | [Test and harden](2.3-test-harden.md) | Fri 13 Nov evening | 2 h | ≥ 85% intents, 100% distress, escalation dry run, noise test |
| 3.1 | [Venue tests](3.1-venue-tests.md) | H0–H8 | ~2 h | Call quality + latency OK at the venue; stage script rehearsed |
| 3.2 | [Tier 2: Gemini Live](3.2-tier2-gemini-live.md) | H8–H20 | 6 h (stretch) | Natural calls with barge-in, only if Tier 1 is solid |
| 3.3 | [Voice tuning + backup recording](3.3-voice-tuning-backup.md) | H20–H30 | 2 h | ms / zh / ta tuned; full live call recorded; freeze H30 |
| 3.4 | [Rehearse the stage call](3.4-rehearse-stage-call.md) | H30–H36 | ~1 h | On-stage call clean; channel-architecture Q&A slide |

## Two tiers for calls (`05` §3.4)

| Tier | Tech | Priority | Built |
|---|---|---|---|
| **1 Reliable** | Twilio Programmable Voice + TwiML `<Gather>` / `<Play>`, turn-based, ~1–2 s per turn | **P0, demo-safe** | 1.3 (English) → 2.2 (4 languages + outbound) |
| **2 Natural** | Twilio Media Streams websocket → Gemini Live (real-time audio, barge-in) → same tools | P1 / pitch | 3.2, only if Tier 1 is rock-solid |

## Files owned
```
channels/voice/
  prompts/system.md
  prompts/{inbound_welcome,checkin,reminder,are_you_ok,sos_helper,family_alert,goodbye}.{en,ms,zh,ta}.txt
  handlers.py          # /voice/incoming, /voice/turn, /voice/outbound/{type}, /voice/status
  calls.py             # outbound calls.create + retry policy
  tts_library.py       # pre-generated fixed prompts
  tests/utterances/    # 20 × 4 languages × P0 intents
backend/agent/          # orchestrator (with B): prompt, tool schemas, distress pre-check
shared/i18n/{ms,zh,ta}.json   # translations
shared/voice/keywords.{lang}.json   # mock Buddy / fallback intents
```
