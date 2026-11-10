# WhatsApp Channel Track — Iterations

Source: `docs/06_WHATSAPP_PLAN.md`

> Most seniors already live on WhatsApp. They should be able to do **everything important** here with **buttons and voice notes**: no typing commands, no app download.

| Iteration | File | When (SGT) | Est. | Exit |
|---|---|---|---|---|
| 0.1 | [Access](0.1-access.md) | Tue 10 Nov night | 1.5 h | Meta test number sends to team phones; Twilio sandbox ready; verification started |
| 0.2 | [Webhook + router](0.2-webhook-router.md) | Wed 11 Nov morning | 2 h | Signature-verified webhook; router skeleton; echo bot works |
| 1.1 | [Templates in English](1.1-templates-english.md) | Wed 11 Nov day | ~1.5 h | All 12 templates drafted; tone reviewed |
| 1.2 | [Translate + submit templates](1.2-templates-translate-submit.md) | Wed 11 Nov evening | ~1.5 h | 48 templates (12 × 4 languages) submitted for approval |
| 1.3 | [Onboarding + invite acceptance](1.3-onboarding-invites.md) | Thu 12 Nov until 12:00 | 3 h | "Hi" → onboarding writes the same users; family / admin invite Yes activates the senior |
| 2.1 | [Daily check-in + events](2.1-checkin-events.md) | Thu 12 Nov pm–night | 3 h | Check-in Yes / No → walk → join → group link; event invites; RSVPs visible in the app |
| 2.2 | [Reminders, SOS, family, escalation, voice notes](2.2-reminders-sos-family-voice.md) | Fri 13 Nov day | 5 h | HELP → fan-out < 10 s; escalation hooks; voice notes in / out |
| 2.3 | [Tests, STOP/START, idempotency, judge route](2.3-tests-stop-idempotency.md) | Fri 13 Nov evening | 2 h | `06` §7 suite passes in 4 languages; judge route decided |
| 3.1 | [Judge path live](3.1-judge-path.md) | H0–H8 | ~1.5 h | QR → WhatsApp → onboarding → check-in works for a fresh judge |
| 3.2 | [Progress cards, menu, location](3.2-cards-menu-location.md) | H8–H20 | ~2.5 h | Weekly progress + walk summary cards; Menu list; SOS location request |
| 3.3 | [Rehearse + backup recording](3.3-rehearse-backup.md) | H20–H30 | ~1 h | Backup recording of the WhatsApp flows; freeze H30 |
| 3.4 | [Q&A slide: WhatsApp communities](3.4-qa-slide.md) | H30–H36 | ~0.5 h | Slide: existing communities come over with no migration |

## Principles (`06` §1)
- **Buttons first**: every question has reply buttons (max 3) or a short list. Never ask people to type commands.
- **Voice notes both ways.**
- **One message, one idea.** Short, warm, plain text. **No emojis.** Bold first words.
- **Respect the 24-hour rule**: anything we send first is an approved template.
- **A front door, not a dead end**: gently offer the app, never require it.

## Files owned
```
channels/whatsapp/
  webhook.py        # GET verify token; POST receive → verify signature → route
  router.py         # text, button_reply, list_reply, audio, location
  flows/onboarding.py checkin.py events.py reminders.py sos.py family.py menu.py
  templates.py      # name → per-language params builder
  sender.py         # send_text, send_buttons, send_list, send_template, send_audio, send_location_request, send_image
  media.py          # download audio, upload TTS audio
  provider/meta.py twilio.py   # same interface, two routes
```
