# Iteration 3.4 — Rehearse

Stage 3 (Hackathon) · **H30–H36** (≈ Sun 23:00 → Mon 05:00 SGT) · code is frozen

## 1. At a glance

| | |
|---|---|
| **Goal** | Deliver a tight 5-minute pitch with a **live demo across app + WhatsApp + call**, and handle Q&A with confidence |
| **Exit** | **5 clean full run-throughs** with a demo reset between each; Q&A backup slides ready; everyone knows their role and recovery moves |
| **Owners** | E leads the pitch and timing · A drives the app on stage · C drives WhatsApp + the live call · B on the backend console (reset, logs) · D slide visuals |
| **Est.** | A3.4 2 h; whole team ~4–6 h |

## 2. Entry criteria

- [ ] Code frozen and tagged at H30.
- [ ] Backup recordings complete (3.3 checklist).
- [ ] Deck v1 updated with the impact metrics, business model and P1 features chosen.

## 3. Pitch (5 minutes)

| Segment | Time | Content | Who |
|---|---|---|---|
| Problem & insight | 45 s | Super-aged Singapore (21.4% 65+); connected but disengaged; men stay away; safety worries. **Insight:** the community that gives purpose is the one that keeps you safe, and the best time to build it is before retirement | E |
| Seniors' voices | 30 s | Filming clip (12 Nov) + usability-check quote | E (video) |
| **Live demo** | 2 min | See the demo script below: app + WhatsApp + call | A, C (E narrates) |
| Business model | 45 s | Free core for seniors; family Peace of Mind tier; employer retirement-transition programme; centres / RCs. No ads, no donations | E |
| Impact KPIs & raiSE | 45 s | Output + outcome KPIs (UCLA-3, Ryff, WHO-5, activity); mapping to the raiSE framework (intentionality, additionality, proportionality, desirability, feasibility, viability) | E |
| Close | 15 s | One line + the 3 QR codes + phone number | E |

### Live demo script (2 min). Pick a subset of the golden path that fits

1. **Check-in → community (app):** Raj answers **No** → walk near him → **Join walk** (2 taps) → WhatsApp group link. *(~25 s)*
2. **Walk (app):** open the recorded walk summary → route, 2.4 km, 32 min, steps → read aloud → **Share to my Circle** → Lim's cheer. *(~20 s)*
3. **Phone call on stage:** call the number on speaker → "Remind me to take my medicine at 8" → Buddy confirms → the reminder appears in the app on the projector. *(~35 s)*
4. **Safety net:** Raj presses **Help** → 995 offered → countdown → Priya and Ahmad's phones alert → "Ahmad (300 m away) — on his way" on Raj's screen. *(~25 s)*
5. **Mdm Tan (WhatsApp only), optional if time allows:** show the escalation sequence from a backup recording (check-in → nudge → call → family alert). *(~15 s)*

Move Along (Android sit-to-stand) is a **Q&A / booth demo** unless the pitch has spare time.

**Wording rules on stage:** never "AI app". Say "an app you can use with your voice", "Buddy, your helper", "Safe Circle — get help fast" (never "monitoring"). No medical claims.

## 4. Roles on stage

| Role | Person | Holds |
|---|---|---|
| Narrator | Santusht / Ken | Clicker, timing |
| App driver | Sarath | Raj's Android phone (mirrored to the projector) |
| Channels driver | Ankit | Phone for the stage call; Mdm Tan's WhatsApp phone |
| Family / helper phones | Kavya / Sayan | Priya's and Ahmad's phones (alerts) |
| Backstage console | Sayan | Laptop: demo reset, logs, backup videos ready to play |

## 5. Rehearsal plan

| Run | Focus | After the run |
|---|---|---|
| 1 | Full pitch, no stopping | Time each segment; list stumbles |
| 2 | Fix transitions; trim to 5:00 | Demo reset |
| 3 | **Failure drill:** backstage deliberately breaks one step (e.g. WA delay) → presenter switches to the backup video smoothly | Demo reset |
| 4 | Full pitch at speed, with Q&A practice (5 questions) | Demo reset |
| 5 | Final clean run, exactly as on stage | Lock the deck |

**Demo reset between every run** (`POST /admin/demo/reset` + app reset; < 15 s). Phones: charged, DND off, volume up, hotspot on.

## 6. Q&A backup slides

| Topic | Key points (sources) |
|---|---|
| **Architecture** | Three doors, one brain: one FastAPI backend, one Supabase DB, one user memory, one fixed tool registry (`03` §1, §5) |
| **Privacy / PDPA (and DPDP for India)** | Consent before activation; RLS; health card encrypted and never sent to the LLM; camera frames stay on the phone; call / WA audio deleted after transcription; admins see attendance only (`03` §8) |
| **Child safety** | Little Ones: group sessions only, public places, parent present / sign-in, Singpass-verified hosts, endorsements (`01` §12) |
| **SOS liability** | Always offer 995 first; countdown + cancel; wording "alerts", never "monitoring"; community helpers complement emergency services |
| **Cost per user** | WhatsApp default (cheap); calls only for `channel_pref=call` and escalations; on-device TTS for Read It Out; template-based messages |
| **Why not AACs / NANA?** | Partners, not competitors: we bring pre-retirees in before they need centres, run peer-led with low manpower, and give centres an admin dashboard |
| **India rollout** | Same model; Tamil already in; Hindi next; Exotel / Plivo for Indian numbers; 112 instead of 995 |
| **Design references** | Luma restraint + large type; SGDS accessibility; per-screen references (`02b`) |
| **LLM risks** | Fixed tools only; confirmation on every change; deterministic SOS keyword check; no medical advice, no money |
| **Roadmap** | Posture on iPhone (Kotlin Multiplatform + MediaPipe iOS); SEA-LION / MERaLiON; real Singpass; fall detection; paid skill sessions (survey-driven) |
| **Channel architecture** | How existing WhatsApp communities come over: we link to group invite links, with zero migration (`06` §5.3) |

## 7. Risks and fallbacks

| Risk | Fallback |
|---|---|
| Live step fails on stage | Narrator: "Here's what that looks like" → backup video for that step; continue |
| Call doesn't connect | Second phone / network; backup call recording |
| Projector mirroring fails | Backup recordings on the laptop; hold the phone to the camera if available |
| Over time | Drop demo step 5 first, then shorten business model to 30 s |

## 8. Definition of Done

- [ ] 5 full run-throughs completed, the last one clean and ≤ 5:00
- [ ] Failure drill practised once
- [ ] Q&A backup slides in the deck appendix
- [ ] Every presenter knows their phone, their lines and their recovery move
- [ ] Phones charged; demo reset done right before going on stage
