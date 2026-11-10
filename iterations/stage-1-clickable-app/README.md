# Stage 1 — Clickable P0 App on Mock Data

Phase 1 · Wed 11 Nov → Thu 12 Nov 12:00 SGT · Iterations 1.1, 1.2, 1.3

## Why this stage exists

On **Thursday 12 Nov afternoon** we film real seniors using the app (5 test tasks, testimonials). This gives us evidence of desirability (PRD G4, raiSE E1–E3). We can't wait for a real backend to do that. So in Stage 1 the app runs **entirely on mock data** that mirrors the backend seed (`app/mocks/`, exported by B in 0.2). In parallel, the backend builds the same APIs against the seeded database, and C produces translations and channel scripts.

**Rule of the stage:** the app never waits on the backend. If an API isn't ready, the mock hook stays, and the swap happens in 2.1.

## Iterations

| Iteration | When (SGT) | Theme | Exit criterion |
|---|---|---|---|
| [1.1 Home + Kampung](1.1-home-kampung/ITERATION.md) | Wed 11 Nov, day | Community core | Join a walk from Home in **1 tap**, from Happenings in **2 taps** |
| [1.2 Thrive + Safety](1.2-thrive-safety/ITERATION.md) | Wed 11 Nov, evening–night | Check-in, walks, SOS | Check-in **No → join walk**; simulated walk → summary; **SOS opens from every screen** |
| [1.3 Onboarding + Pass It On + speech](1.3-onboarding-passiton-speech/ITERATION.md) | Thu 12 Nov, until 12:00 | **Filming build** | A senior does the **5 test tasks** in any of 4 languages, on Android and iPhone (Expo Go) |

## Stage entry criteria (from Phase 0)

- [ ] Expo project on the **Expo-Go-supported SDK** (locked, no upgrades this week); Android dev build runs; app opens in Expo Go on a Singapore teammate's iPhone.
- [ ] `theme/tokens.ts`, i18n skeleton (`screen.element` keys), tab shell (Kampung default), fonts (Noto Sans / SC / Tamil).
- [ ] Core components and the `/dev/components` gallery are **signed off by Kavya** (100% and 200% font, English + Tamil placeholder).
- [ ] Supabase schema v1 migrated; FastAPI skeleton deployed with `/health`; API contract (`03` §4) and tool schemas (`03` §5) merged.
- [ ] Seed database live; same data exported as JSON to `app/mocks/`, including Raj's 3 weeks of walks and the Bishan Park GPS track.
- [ ] Posture module skeleton shows a camera preview on Android (not used until 2.2).
- [ ] Twilio number + hello-world call; Meta test number + Twilio sandbox; webhook echo bot.

## Stage exit (Thu 12 Nov 12:00)

A senior can do the 5 test tasks from `02_DESIGN_PRINCIPLES.md` §10 **without help**, in any of the 4 languages, on mock data, on **Android and on iPhone in Expo Go**:

1. Join a walk
2. Answer the check-in
3. Press Help and cancel
4. Set a reminder by voice (mock Buddy)
5. Start and finish a walk, and say what the summary shows

Plus: the EAS Update link is published so Santusht and Ken can load the build for filming.

## Hours by lane (from lane docs)

| Lane | 1.1 | 1.2 | 1.3 | Total |
|---|---|---|---|---|
| A App | A1.1 · 7 h | A1.2 · 7 h | A1.3 · 9 h | 23 h |
| B Backend | B1.1 · 4 h | B1.2 · 6 h | B1.3 · 5 h | 15 h |
| C Voice | C1.1 translations | C1.2 translations + call prompts | C1.3 translations + keywords · C1.3b inbound loop 3 h | ~9 h |
| C WhatsApp | W1.1 templates (en) | W1.2 translate + submit | W1.3 onboarding + invites · 3 h | ~6 h |

**Person A is the critical path** (23 h over ~30 clock-hours). Protect A from interruptions. D and E take over review and coordination, and B can pick up isolated components if A falls behind.

## What carries into Stage 2

- Mock hooks are swapped for `lib/api.ts` (2.1). Hook names and return shapes must therefore match the API contract **now**.
- Filming notes become a ranked fix list (D, 2.1).
- The `/assistant/turn` stub with canned replies becomes the real Gemini tool-calling turn (2.1).
- The English inbound call loop goes to 4 languages + outbound calls (2.2).
