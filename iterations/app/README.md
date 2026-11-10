# App Track — Iterations

Source: `docs/04_APP_PLAN.md`

React Native + Expo (TypeScript), expo-router. **Android** runs our EAS build (with the posture module). **iPhone** runs in **Expo Go**, so shared code may only use libraries included in Expo Go.

| Iteration | File | When (SGT) | Est. | Exit |
|---|---|---|---|---|
| 0.1 | [Project skeleton](0.1-project-skeleton.md) | Tue 10 Nov night | 3 h | Runs on Android dev build + iPhone Expo Go; tokens merged |
| 0.2 | [Core components](0.2-core-components.md) | Wed 11 Nov morning | 4 h | Design signs off the `/dev/components` gallery |
| 1.1 | [Home + Kampung](1.1-home-kampung.md) | Wed 11 Nov day | 7 h | Join a walk from Home in 1 tap, from Happenings in 2 |
| 1.2 | [Thrive + Safety](1.2-thrive-safety.md) | Wed 11 Nov evening–night | 7 h | Check-in No → walk; simulated walk → summary; SOS from every screen |
| 1.3 | [Onboarding + Pass It On + speech](1.3-onboarding-passiton-speech.md) | Thu 12 Nov until 12:00 | 9 h | 5 test tasks in any of 4 languages, Android + iPhone |
| 2.1 | [Wire to the backend](2.1-wire-to-backend.md) | Thu 12 Nov pm–night | 5 h | New app user appears in the DB and sees seeded events |
| 2.2 | [Real features + Move Along shell](2.2-real-features.md) | Fri 13 Nov day | 8 h + 3 h | Golden path on two real phones; sit-to-stand counts reps on Android |
| 2.3 | [Integration + freeze](2.3-integration-freeze.md) | Fri 13 Nov evening | 3 h | Golden path 3× in a row; `v0.9-demo` tag |
| 3.1 | [Stabilise at the venue](3.1-stabilise-venue.md) | H0–H8 | 3 h | Judge QR path works on fresh phones |
| 3.2 | [P1 features](3.2-p1-features.md) | H8–H20 | 8–10 h | P1 list merged in order; golden path still green |
| 3.3 | [Polish + proof](3.3-polish-proof.md) | H20–H30 | 5 h | Top 3 usability fixes; visual pass; backup videos; freeze H30 |
| 3.4 | [Rehearse](3.4-rehearse.md) | H30–H36 | 2 h | 5 clean live-demo runs |

**Critical path:** the app work is ~23 h across Phase 1 (1.1–1.3) before the filming deadline. Put the most people on it; split screens between builders (e.g. one on Kampung screens, one on Thrive, one on engines).

## Engines (built across iterations)

| Engine | File | Built | Made real |
|---|---|---|---|
| Read It Out | `lib/readout.ts` | Scripts written from 1.1; engine 1.3 | — |
| Voice helper (Buddy) | `lib/voice.ts` | Mock 1.3 | Real 2.2 |
| Walk tracking | `lib/walk.ts` | Simulated 1.2 | GPS 2.2 |
| Move Along (posture) | `thrive/move.tsx` + `modules/posture` | Shell 2.2 | Polish 3.2 |
| Notifications | `lib/notifications.ts` | Local 1.2 | Push 2.1–2.2 |

## Platform flags (`lib/platform.ts`)

`canUsePosture`, `canUseRemotePush`, `canRecordInBackground`. Screens read these flags and never check `Platform.OS` directly.
