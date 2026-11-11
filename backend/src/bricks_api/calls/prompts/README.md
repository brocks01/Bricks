# Call prompts

Everything a phone call says that isn't made up on the spot by Buddy. There's one file per
prompt per language: `<name>.<en|ms|zh|ta>.txt`. Read by `bricks_api.calls.prompts`, and
checked by `tests/test_call_prompts.py`.

```
# checkin: what it is for
[ask]
Did you move yesterday? Say yes or no.

[no]
There's a walk at {time} near {place}, with {count} going. Want to join?
```

## Rules
- Every language has the same sections and the same `{slots}`.
- A section has at most 2 short sentences (choices included).
- No symbols, short forms or emojis, because a speech engine reads them badly.
- Slot values arrive already in the caller's language. Times are said the way people say
  them, never "07:00".
- Phone numbers are written digit by digit ("9 9 5"), never "995".
- Gender: say the name, never "him" or "her" (the old `call him` became `Say call`).

## Fixed or live
A section **without** slots is fixed. `python -m bricks_api.calls.gen_audio` turns it into an
MP3 once (voice 2.2), and every call plays the same recording. A section **with** slots is
spoken live (Twilio `<Say>` now, live TTS later). Prompts are split so that as much as
possible is fixed.

| Prompt | Fixed | Live (slots) |
|---|---|---|
| hello | say | |
| inbound_welcome_known | ask | greet (name) |
| inbound_welcome_unknown | welcome, option | |
| checkin | ask, yes | greet (name), no (time, place, count) |
| reminder | ask | say (name, text) |
| event_reminder | bye | say (title, time, place) |
| are_you_ok | ask | say (name) |
| sos_helper | ask | say (name, place) |
| family_alert | ask | say (family_name, member_name) |
| sos_confirm | say | offer (family_name) |
| still_there | ask | |
| goodbye | later | event (title, time) |
| dtmf_hint | say | |

`inbound_welcome_unknown`: we don't know the caller's language yet. Play `[welcome]` once,
then each language's `[option]` in that language's own voice ("For English, press 1…
中文请按 3…").

## What callers are told to say (for the keyword lists, voice 1.3)

| Meaning | en | ms | zh | ta |
|---|---|---|---|---|
| yes | yes | ya | 有 (check-in), 是 | ஆம் |
| no | no | tidak | 没有 (check-in) | இல்லை |
| I'm okay | yes | ya | 没事 | ஆம் |
| help | help | tolong | 帮忙 | உதவி |
| done | done | sudah | 好了 | முடிந்தது |
| coming (helper) | coming | datang | 我去 | வருகிறேன் |
| call family | call | telefon | 打电话 | அழை |
| connect | connect | sambung | 接通 | இணை |
| any yes | press 1 | tekan 1 | 按 1 | 1-ஐ அழுத்துங்கள் |

Keyword lists should also accept everyday variants (ms "okey", "boleh"; zh "好", "对";
ta "சரி").

## Buddy's own words
Buddy's system prompt is in `bricks_api/assistant/prompt.py` (voice 0.2), with a
phone-channel note. It isn't copied here, so there's only one copy to keep right.

See [PRONUNCIATION.md](PRONUNCIATION.md) for local names.
