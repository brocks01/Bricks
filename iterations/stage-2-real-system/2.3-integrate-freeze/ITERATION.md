# Iteration 2.3 — Integrate & Freeze

Stage 2 (Real system) · **Fri 13 Nov 2026, evening (SGT)** · must close **before India teammates fly that night**

## 1. At a glance

| | |
|---|---|
| **Goal** | Turn "works once" into "works every time": cross-channel consistency, demo reset, empty and error states, hosted seeded demo environment, test suites, builds for both platforms |
| **Exit** | Golden path passes **3× in a row** (with a demo reset between runs) → `main` tagged **`v0.9-demo`** |
| **Owners** | A cross-channel checks + demo reset + S39 states + builds · B demo env + logging + load test · C voice + WA test suites + judge route decision · D final visual pass · E slide deck v1 |
| **Est.** | A2.3 3 h · B2.3 3 h · C2.3 2 h · W2.3 2 h |
| **No new features.** | Only fixes, states, tests and builds. Anything new waits for 3.2 |

## 2. Entry criteria

- [ ] 2.2 exit: golden path passed once on real phones; sit-to-stand counts reps (or posture Plan B decided).
- [ ] The bug list from 2.2 is triaged: **P0-blocking** (fix now) / **demo-visible** (fix if time) / **later** (3.1+).

## 3. Scope

| In | Out |
|---|---|
| Cross-channel checks (WA RSVP → app; call reminder → S26; WA check-in → app streak) | New features, P1 items |
| Demo reset (hidden in Settings) + seeded demo accounts | Walk history, cheers, Simple Mode (3.2) |
| Empty / loading / error states (S39) everywhere | Gemini Live (3.2) |
| Android preview APK + EAS Update `demo` channel for Expo Go | |
| Hosted, seeded `demo` env; logging; golden-path load test | |
| Voice + WA test suites (`05` §4, `06` §7); STOP / START; idempotency | |
| Judge WhatsApp route decision | |
| Final visual pass vs Mobbin board | |

## 4. Lane tasks

### Lane A — App (Sarath) · A2.3 · 3 h

| Task | Detail |
|---|---|
| **Cross-channel checks** | (1) RSVP made on WhatsApp → shows as "going" in S15 / S16 and on the Home card. (2) Reminder set by phone call → shows in S26 with the right time. (3) WA check-in answer → Home / Thrive cards cleared, streak updated. (4) SOS from WA → senior's app (if open) shows S28 status. Make sure React Query refetches on focus / app foreground |
| **Demo reset** | Settings → hidden row (e.g. tap the version label 5×) → `POST /admin/demo/reset` (B) → clears local storage, signs into the seeded demo account, refetches. Takes < 10 s |
| **Seeded demo accounts** | Quick account switcher in the dev menu: Raj (senior, app), Priya (family), Ahmad (helper), Lim (circle member), Judge |
| **S39 states everywhere** | Empty: "No events near you yet. Start one?" · Loading: "Saving your walk…" · Error: "That didn't work. Let's try again." [Try again]. Offline banner in plain words. Never a blank screen or a raw error |
| **Builds** | `eas build --profile preview --platform android` → APK + QR. `eas update --branch demo` → Expo Go QR for iPhone. Write both into the demo runbook |

### Lane B — Backend (Sayan) · B2.3 · 3 h

| Task | Detail |
|---|---|
| **Demo environment** | Hosted on Railway / Render / Fly (HTTPS for webhooks), seeded; separate from `local`. Env vars documented in `.env.example`; secrets only in the host's secret store |
| **Demo reset endpoint** | `POST /admin/demo/reset` (admin token): truncate + reseed (5 users, 3 circles, 8 events, streaks, thank-yous, 3 weeks of Raj's walks, Bishan track); reset escalation state; cancel open SOS. Idempotent, < 15 s |
| **Logging + monitoring** | Structured JSON logs (request id, user id hash, route, latency, tool calls); no personal data or health card. Basic uptime check on `/health`; error alert to the team chat |
| **Golden-path load test** | Script (e.g. locust / k6 or a Python script) that runs the API calls of the golden path × 20 concurrent "judges". Check p95 latency and no 5xx. Watch the Gemini / TTS quotas |
| **Freeze** | Tag `main` → `v0.9-demo` once the exit passes. The deploy pipeline pins `demo` to the tag |

### Lane C — Voice (Ankit) · C2.3 · 2 h

Test suite (`05` §4):

| Test | Pass |
|---|---|
| 20 utterances × 4 languages × each P0 intent (navigate, today, find/join, check-in, reminder, progress, walks, emergency) | ≥ 85% correct tool + args |
| Distress phrases ("help", "I fell", "tolong", "救命", "உதவி", + variants) | **100%** trigger SOS |
| Senior call test (as many testers as available, up to 5) | Check-in + join walk in < 2 min without help |
| Outbound escalation dry run (1-min timings) | Check-in → reminder → call → family alert in order |
| Noise test | Works with TV / background noise at a moderate level |

Keep the utterance set in `channels/voice/tests/` so it can be re-run in 3.x after prompt changes.

### Lane C — WhatsApp (Ankit) · W2.3 · 2 h

| Test (`06` §7) | Pass |
|---|---|
| Onboarding in all 4 languages | Buttons only; no typing except the name |
| Check-in Yes / No / no-reply escalation (1-min timings) | Correct message sequence; call triggered; family alerted |
| HELP keywords × 4 languages + voice note "I fell" | SOS fan-out < 10 s |
| Event join | Link delivered; RSVP visible in the app |
| Duplicate webhook delivery | Single action |
| STOP / START | Messages pause / resume; recorded on the user |

**Decide the judge route** and write it into the runbook:
- (a) **Meta test number** with judges' numbers pre-registered on the day (real templates, buttons), or
- (b) **Twilio sandbox join QR** (anyone can join by sending the prefilled join code; fewer template features).
Recommendation: (a) for team and senior phones, plus (b) as the walk-up judge QR.

### Lane D — Design (Kavya)

- Final visual pass against the Mobbin board: spacing scale, radius (16 cards / 14 buttons / 999 avatars only), one accent colour, red only for SOS, no stray icons, no emojis, real photos.
- Spot-check 200% font + Tamil on the golden-path screens.

### Lane E — Business & research

- **Slide deck v1**, following the 2.2 storyline; backup slides list from `07` §6 (architecture, privacy / PDPA, child safety, SOS liability, cost per user, why not AACs / NANA, India rollout, design references / SGDS).
- Insert filming clips (30 s seniors' voices).

## 5. The demo runbook (produce this in 2.3; it is used in every Stage 3 iteration)

Store it as `docs/DEMO_RUNBOOK.md` or in the shared drive:
1. Phones and roles (who holds Raj / Priya / Ahmad / Mdm Tan's WA phone).
2. Pre-flight: reset, logins, volume, Do Not Disturb off, location on, battery > 60%, hotspot ready.
3. The 7 golden-path steps with exact taps / words / expected screens.
4. Recovery moves per step (e.g. walk GPS fails → "simulate walk"; WA slow → show the backup recording).
5. Build QRs (Android APK, iPhone Expo Go), WA QR, phone number.

## 6. Test plan (exit)

| Run | Steps | Pass condition |
|---|---|---|
| Run 1 | Reset → golden path 1–7 | All steps pass; time it |
| Run 2 | Reset → golden path 1–7 | Pass, no manual intervention |
| Run 3 | Reset → golden path 1–7 | Pass → **tag `v0.9-demo`** |

If any run fails, fix it and **restart the count from Run 1**.

Also: the load test passes; the voice and WA suites meet their thresholds; the iPhone Expo Go check is done by the Singapore team on the `demo` EAS Update.

## 7. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Run 3 fails late at night | Tag the last passing commit as `v0.9-demo`; carry the fix into 3.1 on a branch |
| Gemini / TTS quotas hit during the load test | Throttle the test; pre-generated TTS covers fixed prompts; request a quota bump |
| Hosting cold starts slow the first webhook | Keep-alive ping every 5 min; paid tier for the event weekend |
| India teammates offline while travelling | Runbook + tag + recorded walkthrough let the Singapore team run the demo alone |

## 8. Definition of Done

- [ ] Golden path 3× in a row, recorded
- [ ] `main` tagged `v0.9-demo`; `demo` env pinned to the tag
- [ ] Android preview APK QR + Expo Go `demo` QR both tested
- [ ] Demo reset < 15 s end-to-end
- [ ] Voice suite ≥ 85% per intent, distress 100%; WA suite passing; STOP / START works
- [ ] Every screen has empty / loading / error states in plain words
- [ ] Demo runbook written; judge WhatsApp route decided
- [ ] Slide deck v1 shared
