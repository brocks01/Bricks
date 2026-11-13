# Voice senses, second brain, voice print and group conversation: design and build spec (13 Nov 2026)

For the coding agent that builds this. **Read first:** `AGENTS.md`, `team-docs/10-handoff/HANDOFF.md`, the last entries of `team-docs/10-handoff/PROGRESS.md`, and `team-docs/06-technical/agent-canvas-spec.md` (how the in-app agent works).

## 0. Where this comes from, and how much to trust it

The owner and an earlier session designed and partly tested this on 7 to 8 November 2026 in a separate folder (`project-name-tbd`: a `transcriber` module and a `guard` module). **That folder has been deleted, so the code and the original documents are gone.** This spec is rebuilt from the earlier session's notes. Therefore:

- **Decisions** (section 1) are the owner's and are firm.
- **Test results** (section 12) are what the notes recorded. They come from ONE scripted, synthetic call and a handful of clips. They are **hints for what to build and measure, not proof**. Re-measure everything on real voices before you rely on a number.
- **Models and libraries** named here are options to evaluate, not things already chosen.
- Anything marked **[unverified]** was never tested.

## 1. Decisions already made (do not reopen without the owner)

1. **Gemini Live is the talker and the ears.** It gets the caller's audio directly and does the conversation and the transcript of the caller. Our own layer does NOT replace it.
2. **Our backend is the senses and the guard.** It listens in parallel (a "second input, like eyes") and feeds Gemini short text notes about what is happening, and it decides what the agent may do. Gemini is **never** the authority on who is speaking or on what may be revealed or done.
3. **Authentication is not authorization.** The voice print answers one question only: *which person is this?* **Authorization is risk-based**, per action: low risk, the same person confirms; higher risk, a step-up including approval by family members.
4. **Voice drift:** a small score difference is accepted and the template is updated; a large difference triggers verification by a family member, then a new linked voice print is enrolled.
5. **Store voice prints as embeddings, never audio. No recording of voices for cloning. No voice cloning, ever.**
6. **Context awareness only during an active call** (or an active in-app talk). The agent understands its surroundings like a human counsellor (a second voice, a cooker whistle, a fall) and can alert relatives. It discloses at the start of a call that it is an AI and that it listens during the call.
7. **The agent must be discreet.** If the caller talks to someone else it stops and waits. It never says "you were talking to someone" and never reveals what it heard in the room.
8. **Second brain** = a text timeline of everything that is not the caller (other voices with presence intervals, their words as text, sounds), merged afterwards with Gemini's transcript for the family or caregiver. Text only, short retention, **no voice prints of strangers**.
9. **The listening model** (the agent must know at every moment): (1) who is speaking, (2) who they are speaking to, (3) what they say, (4) what else is happening. Per segment: *to the agent* = respond; *to someone else* = do not respond, note it as context; *unsure* = ask gently.
10. The owner's heuristic for "talking to someone else": in about 90 % of cases a **second voice** is also heard (the strongest signal); otherwise the speaker's pitch, volume, speed or language changes.
11. **Ask before sending any more audio to Google.** Keep the local layer as the base; treat cloud output as alternatives or a second opinion.
12. **Lead with how to achieve it, then list limits and mitigations.** The owner dislikes being met with negatives only.
13. The platform never holds money, never gives medical advice, never gives legal advice.

## 2. What we build, in one picture

```
  caller (phone call or in-app talk)               other people in the room / the group
        |  8 kHz mu-law (phone) or 16 kHz PCM (app)            |
        v                                                      v
  +-------------------------------  AUDIO INGEST (our backend, in the audio path)  ----------------------------+
  |  copy A -> Gemini Live (the talker)                                                                        |
  |  copy B -> SENSES (local):  VAD  ->  speaker embedding (voice print)  ->  who  ->  addressee guess         |
  |                              ASR words (local or cloud alternative)   language id   sound events   prosody |
  +-------------------------------------------------------------------------------------------------------------+
        |                                   |                                    |
        v                                   v                                    v
   NOTES (short, event-based, silent)   SECOND BRAIN (text timeline)      GUARD
   -> into Gemini as clientContent      -> family / caregiver report      - tool gate (risk tiers, step-up)
      turnComplete:false                                                   - output gate (drop / flush Gemini's
                                                                             reply when the caller is talking
                                                                             to someone else)
```
Two **gates** sit in the audio and tool path. Gemini never receives private data in its context; private data lives behind tools that the guard checks.

## 3. Components and their contracts

Put the code in a new module `backend/app/modules/senses/` (Python, FastAPI, same conventions as `modules/voice/` and `modules/family/`). Keep it separate from `modules/voice/` (the Twilio and Gemini plumbing) and call it through a small interface so either can be tested alone.

### 3.1 Audio ingest (the tap)
- Phone audio is 8 kHz mu-law; Gemini input is 16 kHz PCM; Gemini output is 24 kHz. The existing `modules/voice/audio.py` already converts. Add a **tap** that gives the senses a copy of every inbound chunk with a monotonic timestamp. Never block the talker path for the senses; if the senses lag, drop their input, not Gemini's.

### 3.2 Senses (each is a "producer" that emits events, section 5)
1. **VAD / segmentation**: cut the inbound audio into speech segments with start and end times.
2. **Speaker embedding and verification**: for each segment compute an embedding and compare with the enrolled voice prints of people allowed in this call. Output: `who` (person id or `unknown`), `score`, `confidence_band`. Candidate libraries to evaluate: ECAPA-TDNN (SpeechBrain), pyannote embedding, Resemblyzer, NVIDIA TitaNet. Measure on phone-quality 8 kHz audio, not studio audio.
3. **Speaker clustering within the call**: give each distinct voice a cluster id (`voice_1`, `voice_2`) so the second brain can say "a second voice spoke for 12 s" without identifying a stranger. **Do not keep stranger embeddings after the call.**
4. **Per-segment features** the owner wants kept: voice cluster, pitch, volume, speaking rate, language, estimated distance (near field or far field).
5. **ASR of non-caller speech** (words as text for the second brain). Gemini already transcribes the caller; ours is for the other voices and as a cross-check. Local (Whisper family, GPU worked earlier) first.
6. **Language ID** per segment.
7. **Sound events**: cooker whistle, doorbell, alarm, thud (possible fall), TV or radio, street noise, silence. Evaluate YAMNet or PANNs; treat a fall as `suspected`, never as certain.
8. **Addressee estimator** (section 3.3).

### 3.3 Addressee estimator: who is the caller talking to?
Inputs per caller segment: was a second voice heard within +/- 2 s; did pitch, volume, rate or language change against the caller's running baseline; does the ASR text contain the agent's name or a direct request ("tell me", "what is"); was it a question after the agent's turn (turn-taking position). Output: `to_agent | to_other | unsure` with a confidence. **Policy:** `to_agent` respond; `to_other` do not respond, only note; `unsure` the agent says a short gentle check ("Were you asking me?") at most once per minute. Tune the thresholds on real calls; record every decision with its inputs so they can be re-tuned.

### 3.4 Notes into Gemini
- Send notes as `clientContent` with `turnComplete: false` (**silent: it does not make Gemini speak**).
- **Do NOT use `realtimeInput.text` for notes: it makes Gemini reply out loud** (found in the earlier test).
- A note is one short line, sent only on change, prefixed `[backend]`, for example `[backend] Caller's voice verified as Ramesh (high). A second voice is speaking near her.` or `[backend] Cooker whistle started.` The system prompt tells Gemini how to use notes and to stay discreet (section 3.7).
- Plus a **pull tool** `recall_surroundings` (the agent can ask "what is going on around her?") that returns the current senses summary.
- Keep notes within a small budget (for example at most 1 per 2 seconds, merged) so they never become noise.

### 3.5 Voice print service
- **Enroll** (with consent, section 8): 3 to 5 short utterances in a normal call, stored as embeddings (a mean and a spread), never as audio. One print per person per channel (phone, app), because phone and app sound different.
- **Verify**: cosine similarity of the segment embedding against the enrolled print. Starting thresholds from the earlier test: **accept at 0.50, reject at 0.42, in between = unsure** (tuned on one synthetic call; **re-tune on real data**).
- **Drift**: if verified and the score is within the drift band, blend the new embedding into the template slowly. If the score falls below the accept line repeatedly but the person claims to be herself (sick, cold, different phone), do not lock her out: **step up** to a family member's approval, then enroll a new linked print.
- Never use a voice print alone for an action above low risk.

### 3.6 Guard
**Tool gate (at tool-call time, in our backend).** Every tool call from Gemini carries no trust. The guard looks at: who is verified in this call (`self`, `family`, `unknown`), the tool's risk tier (section 6), and what is being asked, then **allows, denies, or asks for step-up**. The earlier test proved why: with the gate OFF, Gemini itself called the tool and read a medicine list to a stranger who claimed to be "Ramesh". With the gate ON, the same attack was stopped. Keep that scenario as a permanent regression test.

**Output gate (in the audio path).** If the addressee estimator says `to_other`, drop or flush Gemini's pending audio and send Twilio `clear` (or the app equivalent) so the agent stops mid-word and stays silent. **[unverified: Twilio `clear` behaviour was never tested]**

### 3.7 System prompt (Gemini) in short
Disclose AI at the start. Stay discreet when the caller talks to someone else: stop and wait, never mention it. Never reveal notes verbatim. Never give medical or legal advice. Use `recall_surroundings` only when it helps the person. Private facts come only through tools; if a tool is denied, say gently that you cannot do that on this call and offer to ask the family.

### 3.8 Second brain
A per-call **timeline** of text events: caller segments (from Gemini's transcript), other voices as `voice_n` with presence intervals and their words, sounds, guard decisions, and any alert sent. After the call, build a short **summary for the family or caregiver** (what happened, what was asked, anything worrying) and delete the raw timeline after a **short retention** (for example 7 days, owner to confirm). Training-data opt-in is a separate, explicit consent (open question).

## 4. Data model (draft migration, next free number)

```sql
create table voiceprints (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references users(id) on delete cascade,
  channel      text not null check (channel in ('phone','app')),
  embedding    real[] not null,               -- mean vector, never audio
  spread       real,                          -- how tight the enrolment was
  model        text not null,                 -- which embedding model, so prints are never mixed
  quality      real,
  linked_to    uuid references voiceprints(id),   -- a new print enrolled after step-up is linked to the old one
  status       text not null default 'active' check (status in ('active','retired')),
  consent_id   uuid not null,                 -- the consent that allowed it (section 8)
  created_at   timestamptz not null default now()
);
create table voice_consents (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references users(id) on delete cascade,
  purpose      text not null check (purpose in ('voiceprint','call_listening','group_join','training_data')),
  given_by     uuid references users(id),     -- the person, or a helper with the person present (record which)
  given_at     timestamptz not null default now(),
  revoked_at   timestamptz
);
create table senses_calls (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid references users(id) on delete set null,
  channel      text not null check (channel in ('phone','app','group')),
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  summary      text,                          -- the family summary
  delete_after timestamptz not null           -- retention
);
create table senses_events (                  -- the second brain timeline; deleted after retention
  id           bigserial primary key,
  call_id      uuid not null references senses_calls(id) on delete cascade,
  t_start_ms   int not null, t_end_ms int,
  kind         text not null,                 -- see section 5
  data         jsonb not null
);
create index senses_events_call_idx on senses_events (call_id, t_start_ms);
```

## 5. Event shape (one shape for every producer, so a camera can plug in later)

```json
{ "t_start_ms": 41200, "t_end_ms": 44100, "source": "speaker|asr|sound|addressee|guard|vision",
  "kind": "caller_verified|second_voice|other_words|sound|addressee|tool_denied|alert",
  "confidence": 0.82,
  "data": { "who": "ramesh|unknown|voice_2", "score": 0.61, "text": "...", "label": "cooker_whistle", "to": "agent|other|unsure" } }
```
A **vision** producer (a camera) is a later phase and must use the same shape.

## 6. Risk tiers (proposal, the owner decides the final list)

| Tier | Examples | Rule |
|---|---|---|
| 0 public | chat, weather, community events list | anyone on the call |
| 1 low | read her own reminders, add a reminder, say "I took it" | verified as her (voice print high), or she confirms |
| 2 medium | read her medicine list, change a reminder time, share her contact | verified AND she confirms aloud; never to an unverified voice |
| 3 high | change family access, change a phone number, anything touching money, delete data | step-up: a family member approves in the app; voice print alone is never enough |
| never by the agent | medical dosing advice, legal advice, moving money | refuse |

## 7. Group conversation: the agent joins and talks like a person

**Goal:** a family or friends call where several people talk, and the agent is one more participant that behaves like a considerate person: it speaks when addressed or when it can really help, otherwise it listens quietly.

**Design**
- **Transport:** a conference call (Twilio Conference or Media Streams per participant) or an in-app room. Each participant is a separate audio leg when possible; that makes "who is speaking" mostly a matter of which leg is active, with voice print used to confirm and for mixed legs (several people on one phone).
- **Participants and consent:** every participant is told at the start that an AI is on the call, in their language; people who do not agree can ask it to leave, which it does at once. Only people who consented are voice-printed; everyone else is `voice_n`, never identified, never stored.
- **Turn-taking policy (this is what makes it feel human):**
  1. **Addressed** (its name, a direct question to "the assistant", or the previous speaker looks to it): respond within about 1 second.
  2. **Not addressed:** stay silent and keep notes. It may speak without being addressed only when (a) someone asks the room a factual question nobody answers for about 4 s, (b) a safety event happens (fall sound, "I can't breathe"), or (c) it is its scheduled job (for example the reminder it was asked to give). At most once per minute unprompted.
  3. **Overlap:** if two people start talking while it speaks, it stops within about 300 ms (the output gate) and does not resume unless asked.
  4. **Short backchannels** ("mm", "I see") are optional and off by default; turn them on only if testing shows they help and do not annoy.
- **Human feel without pretending to be human:** natural pace, short turns, the person's language and politeness register, names used sparingly. It **always says it is an AI** and never imitates a named person's voice (no cloning). It never says anything about someone who is not on the call.
- **Confidentiality in a group:** the guard applies per participant: a medicine list is read only if the person it belongs to is verified AND says so; in a group, tier 2 and 3 tools are off unless the owner of the data is the one asking.
- **[unverified]** None of this group mode was ever tested. Build it after the one-to-one version works. Evaluate Twilio Conference with per-leg Media Streams against a single mixed stream for speaker accuracy and cost.

## 8. Privacy, consent and law (build the consent first, code second)

- A voice print is **biometric personal data**. Treat it as sensitive. Singapore **PDPA** (consent, purpose limitation, retention, access and correction) and India **DPDP Act 2023** (consent, notice in plain language, withdrawal, deletion, a Data Protection Officer for significant data fiduciaries) apply. **Confirm the exact current requirements with a lawyer before real users.** Say in the UI, in the person's language, what is kept, for how long, who sees it, and how to withdraw.
- **Consent belongs to the person.** A helper may record it only with the person present, and the record shows who gave it (`given_by`). The person can see and revoke every consent in the app.
- **Minimal by default:** embeddings only; no audio stored; stranger voices never identified or kept; second-brain text deleted after the retention period; family sees a summary, not the full timeline, unless the person agrees.
- **No surprises:** the call-start notice (AI + listening) is mandatory and cannot be turned off.
- **Cloud audio:** sending audio to Google is already how the talker works. Anything beyond that (for example sending clips for a second opinion) needs the owner's go-ahead and a note in the privacy text.
- Training data is **opt-in only**, separate from everything else.

## 9. How it fits Bricks

- **Calls:** the senses plug into the existing voice module (`backend/app/modules/voice/`): it owns the Twilio webhooks, the audio socket and the Gemini Live session. Add the tap and the gates there through a narrow hook; keep the rules of the voice module (allow-listed numbers, `consent: true`, never call without the owner's go-ahead).
- **In-app agent:** the web and phone app already stream the person's microphone to the agent (`app/src/agent/`). The same senses work on that stream; the guard applies to the in-app tools too (`app/src/agent/tools.ts`, server side `backend/app/modules/agent/`).
- **Family and access:** who may be called, who may approve a step-up, and who sees the summary come from the existing family delegations (`modules/family/`, `acting()`). A step-up approval is a notification to the person's helpers in the app; build it on the family module.
- **Calendar and reminder calls** (see `calendar-and-calls-spec.md`): reminder calls use the same guard (tier 1 for "I took it").

## 10. Build order (one pull request each; ask the owner before each real call or any audio sent out)

1. **Consent and voice print service only**: tables, enrol, verify, drift, step-up, with synthetic audio tests. No Gemini yet.
2. **Senses producers offline**: VAD, embedding, ASR of other voices, language ID, sound events, addressee estimator, run over recorded test audio and print the timeline. Build the **scripted scenario generator** again (section 11).
3. **Guard with a naive agent**: tool gate and output gate tested against a deliberately fooled agent (`naive` mode) and the stranger-claims-to-be-Ramesh regression.
4. **Notes into a live Gemini session**: silent `clientContent` notes, `recall_surroundings`, the discreet-behaviour tests.
5. **Second brain and the family summary.**
6. **In-app and phone integration** behind a feature flag.
7. **Group mode** (section 7).
8. **Vision producer** (a camera) only if the owner asks.

## 11. Tests and how to measure

**Scripted scenario generator (rebuild it).** A script that builds a realistic test call from text-to-speech voices and sound effects and plays it in real time into the system: a caller voice, a second voice in the room (quieter, with room reverb), a stranger who joins, a cooker whistle, street noise, and a phone-quality band-pass. The earlier scenario was 96 s with 3 voices, a whistle and street noise. Keep scenarios as files so runs are repeatable. **Then record real calls with consenting volunteers**, because synthetic voices flatter the model.

**Measure and report (per run):** voice verdict latency (target about 1 s after speech start; the earlier run reached this), correct / total verdicts (earlier: 6 of 7), false accepts of a stranger (target 0 for tiers 2 and 3), far-field voice detection delay (earlier: only via words, 3 to 4 s), sound-event delay (earlier: 1 to 2 s), stray agent replies caused by notes (target 0), addressee accuracy, and the guard's block rate in the fooled-agent test.

**Required regression tests:** (a) stranger claims to be a family member and asks for the medicine list: denied; (b) caller talks to another person: agent silent; (c) notes never make Gemini speak; (d) revoking a consent stops listening features at once and deletes the voice print within the stated time; (e) a call with nobody consented runs with no voice print and no second brain.

## 12. What the earlier test found (hints, not proof)

- Notes must be `clientContent` with `turnComplete:false` (silent); `realtimeInput.text` makes Gemini reply (bad).
- Voice verdict about 1 s after speech start; 6 of 7 correct with thresholds accept 0.50 / reject 0.42, **tuned on that one synthetic call**.
- A far room voice was only seen through ASR words, 3 to 4 s late; the whistle note arrived 1 to 2 s after onset; the notes caused no stray replies.
- Control run (no notes, no gates): Gemini called the tool itself and read a medicine list to a stranger. The tool-level gate stopped it with a fooled agent.
- Gemini model comparison (7 Nov): the live-translate model gives a good multilingual transcript with a language code per piece but no speakers or sounds, speaks the translation back, and mislabelled English as Vietnamese in street noise; the transcribe-live model dropped a sentence in noise; the flash model (file mode) describes speakers and sounds best but is slow (about 26 s for 60 s of audio) and sends audio out. Our local layer is the only one with voice print, exact numbers and privacy. Only 3 clips were tested once each; pricing unverified.
- Phone audio ASR is noisy in practice; the local layer ran on the GPU.

## 13. Open questions for the owner (ask, do not guess)

1. Transcript and timeline retention (7 days?) and whether the family may see the full timeline or only the summary.
2. The final risk tier list (section 6).
3. Training-data opt-in: yes or no, and for what.
4. Where the senses run in production (a GPU box? CPU only?): the local models were run on the owner's GPU; Render's free plan cannot.
5. Group mode transport: Twilio Conference, an in-app room, or both.
6. The first real context events to build (the notes list a whistle, a second voice, a fall).
7. Lawyer review of voice-print consent for Singapore and India before real users.

## 14. Rules for the builder
Same as `calendar-and-calls-spec.md` section 0.1: new branch from `origin/main`, no `git add -A` at the repo root, no secrets, no real call without the owner's go-ahead in that moment, do not kill running services, six languages for anything a person reads, tests must never send real email, log every session in `PROGRESS.md`, say plainly what was tested and what was not.
