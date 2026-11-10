# Iteration 3.1 — Stabilise at the Venue

Stage 3 (Hackathon) · **H0–H8** (≈ Sat 14 Nov 17:00 → Sun 01:00 SGT) · SMU

## 1. At a glance

| | |
|---|---|
| **Goal** | Make `v0.9-demo` work **in the venue's conditions**, on **judges' phones** |
| **Exit** | The **judge QR path works**: a judge with no setup can (a) install / open the app on Android or iPhone and land in a seeded account, (b) scan the WhatsApp QR → onboarding → check-in, (c) call the number and be greeted. Golden path still green at the venue |
| **Owners** | A venue network + QR path + permissions · B judge accounts + fallbacks · C judge WA path + call quality · D hallway tests · E pitch refinement with mentors |
| **Est.** | A3.1 3 h; others ~2–3 h each |

## 2. Entry criteria

- [ ] `v0.9-demo` deployed and pinned; demo reset works.
- [ ] Runbook printed or on a shared screen.
- [ ] Hotspot SIMs with data; chargers and power banks; at least 2 Android + 2 iPhones from the team.

## 3. Lane tasks

### Lane A — App (Sarath) · A3.1 · 3 h

| Task | Detail |
|---|---|
| **Network tests** | Run the golden path on (1) venue Wi-Fi, (2) phone hotspot. Note latency on `/assistant/turn` and walk upload. If the venue Wi-Fi blocks websockets or has a captive portal, make the hotspot the default for demo phones |
| **Crash sweep** | Open every P0 screen on each team phone; fix crashes only (no polish) |
| **Permissions on judges' phone types** | Android: location (while using → background prompt on the first walk), camera (first warm-up), notifications (Android 13+ runtime permission). Check that the wording on each prompt has a one-line reason. iPhone Expo Go: location while using, notifications (local) |
| **Two judge QR codes on the slide** | **Android** → APK download link (EAS preview build). **iPhone** → "Install Expo Go, then scan" → EAS Update `demo` → auto-signs into the seeded **Judge** account. Plus the **WhatsApp QR** and the **phone number** for judges who don't want to install anything |
| **Judge account UX** | On first open via the judge QR: skip onboarding, land on Home with a pending check-in and a walk tomorrow, so the judge does "No → join walk" immediately |

### Lane B — Backend (Sayan)

- **Judge accounts:** create N (e.g. 10) seeded judge users ("Judge 1…10") with circles, events, a streak and walk history; each one resettable on its own (`POST /admin/demo/reset?user=judge_3`).
- **Fallbacks:** hosting keep-alive; check quota headroom for Gemini / TTS / Twilio; a feature flag to switch Buddy to the keyword matcher if the LLM is slow at the venue.
- Watch logs during the first judge-path trials; fix 5xx only.

### Lane C — Voice & WhatsApp (Ankit)

- **Judge WhatsApp path:** QR → WhatsApp opens with the prefilled message (Meta test number with pre-registration, or the sandbox `join <code>`, per the 2.3 decision) → onboarding → immediate check-in (send `daily_checkin` right after onboarding for judges).
- **Call quality at the venue:** call the number from the venue on 2 networks; measure turn latency; check speech recognition with background noise; adjust `speechTimeout` / prompt length.
- Rehearse the **stage call script** once: "Remind me to take my medicine at 8" → confirm → reminder visible in the app on the projector.

### Lane D — Design (Kavya)

- **Hallway tests** with any willing attendee / mentor: 5-second test on Home, plus "join a walk" and "press Help and cancel". Note the top hesitation points for 3.3.

### Lane E — Business & research (Santusht + Ken)

- Get **mentor feedback** on the pitch storyline and business model; refine the problem / insight opening.
- Prepare the judge-facing one-pager / slide with the 3 QR codes + phone number.

## 4. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | Golden path on venue Wi-Fi | Passes, or the failing step is identified → switch to hotspot |
| T2 | Golden path on hotspot | Passes |
| T3 | A fresh Android phone (not a team build) scans the APK QR | Installs; lands in the Judge account; check-in No → join walk works |
| T4 | A fresh iPhone: install Expo Go → scan | Loads the `demo` update; lands in the Judge account |
| T5 | A fresh phone scans the WhatsApp QR | Onboarding → check-in arrives → No → join → group link |
| T6 | A fresh phone calls the number | Unknown-caller language menu → greeting; a known judge number gets the member greeting |
| T7 | Location / camera / notification permission prompts | Appear only when needed, with a reason |
| T8 | Hallway test (2–3 people) | Notes captured |

## 5. Exit demo (5-minute check-in at ~H8)

Run each judge path once on a phone that has never had our app. Report golden path green / red.

## 6. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Venue Wi-Fi blocks or slows things | Team hotspot for all demo phones; judges use their own data |
| Judges unwilling to install the APK | iPhone Expo Go path, WhatsApp QR, phone call: three ways without the APK |
| GPS bad indoors | "Simulate walk" replay of the Bishan Park track (already in the build) |
| Twilio call quality poor on venue networks | Use a team phone on mobile data for the stage call; backup recording |
| WhatsApp pre-registration limit reached | Sandbox join QR |

## 7. Definition of Done

- [ ] All 4 judge paths (Android APK, iPhone Expo Go, WhatsApp QR, phone call) verified on fresh phones
- [ ] Golden path green at the venue (on the chosen network)
- [ ] Judge accounts seeded and individually resettable
- [ ] QR slide / one-pager ready
- [ ] No open crash on any P0 screen
