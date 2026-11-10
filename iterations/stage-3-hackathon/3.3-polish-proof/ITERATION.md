# Iteration 3.3 — Polish & Proof

Stage 3 (Hackathon) · **H20–H30** (≈ Sun 13:00 → 23:00 SGT) · **code freeze at H30**

## 1. At a glance

| | |
|---|---|
| **Goal** | Fix what real users trip on, make it look finished, and **collect proof**: usability evidence, impact metrics, and backup recordings of everything we'll show live |
| **Exit** | **Code freeze at H30** on a tag (e.g. `v1.0-hackathon`); backup recordings complete; impact metrics ready for the pitch |
| **Owners** | A usability fixes + visual pass + backup videos · B impact metrics endpoint + backups · C voice tuning + backup call recording · D usability check · E impact KPI story |
| **Est.** | A3.3 5 h · B ~3 h · C3.3 2 h |

## 2. Entry criteria

- [ ] 3.2 exit: chosen P1 features merged; golden path green.
- [ ] List of features going into the live pitch agreed (max 2–3 P1s).

## 3. Lane tasks

### Lane A — App (Sarath) · A3.3 · 5 h

| Task | Detail |
|---|---|
| **Usability check → top 3 fixes** | With any seniors available at or near the venue (or the best proxies: older mentors, staff). Tasks: join a walk; answer the check-in; press Help and cancel; set a reminder by voice; start and finish a walk. Fix **only the top 3 issues** |
| **Visual pass** vs the Mobbin board | Spacing (4·8·16·20·24·32·48, screen padding 20), radius (16 / 14 / 999 only), flat 1px borders (no shadows), one accent colour, red only for SOS, no stray icons, no icon-only buttons, real photos everywhere, Tamil + 200% font on the golden-path screens |
| **Backup screen videos** | Record **every demo step** on a real phone (screen recording + voice): each golden-path step, each P1 feature shown in the pitch, Move Along on Android. Name them `NN_step_name.mp4`, store them in the shared drive and on a laptop (offline) |

### Lane B — Backend (Sayan)

| Task | Detail |
|---|---|
| **Impact metrics endpoint** | `GET /admin/impact`: **output KPIs** from data: weekly active users by channel (app / WA / call), check-in response rate + streak lengths, events created / attended + % created by seniors, sessions taught, endorsements, % male users, % onboarded via family / admin, SOS response time (alert → first "on my way"). **Outcome KPIs:** survey instrument scores (UCLA-3, Ryff purpose, WHO-5) where present, weekly walking distance / active minutes, % of walks done with others |
| **Impact screen / slide** | A simple page (or a JSON → slide chart) for the pitch. Clearly label seeded / demo data vs real tester data |
| **Backups** | DB snapshot of the demo state; the deploy pinned; a rollback command written into the runbook |

### Lane C — Voice & WhatsApp (Ankit)

- **Voice quality tuning** in ms / zh / ta: TTS voice choice and speaking rate, prompt length, `speechTimeout`. Re-run the 20-utterance suite after changes (≥ 85% / distress 100%).
- **Backup recording of a full live call** (inbound: today → join walk → reminder → goodbye) and of the **WhatsApp flow** (check-in No → join → link; HELP → fan-out).
- **Code freeze H30** for `channels/`.

### Lane D — Design (Kavya)

- Run the usability check with A; rank the issues; sign off the visual pass.
- Capture 1–2 short quotes or clips from the usability check for the pitch.

### Lane E — Business & research (Santusht + Ken)

- Build the **impact KPI story**: output vs outcome KPIs, measurement at onboarding / 4 weeks / 12 weeks, and the evidence link (Lancet 2024 modifiable risk factors; purpose in life ~28% lower risk of cognitive impairment, **association, not causation**).
- Finalise the business-model slide (free core, family Peace of Mind tier, employers, centres).

## 4. Backup recording checklist

| # | Recording | Owner | Done |
|---|---|---|---|
| 1 | Family onboarding (Priya → Raj) + WA accept | A + C | [ ] |
| 2 | Check-in No → join walk → WhatsApp group link | A | [ ] |
| 3 | Record walk → summary → share → cheer | A | [ ] |
| 4 | Mdm Tan missed check-in → call → family alert (demo timings) | C | [ ] |
| 5 | Phone call "Remind me to take my medicine at 8" → shows in app | C + A | [ ] |
| 6 | Help → 995 offer → fan-out → "on my way" | A | [ ] |
| 7 | Android sit-to-stand 10 reps | A + B | [ ] |
| 8 | Each P1 feature shown in the pitch | A / B | [ ] |
| 9 | Full live call (Tier 1; Tier 2 if used) | C | [ ] |
| 10 | WhatsApp check-in + HELP flow | C | [ ] |

## 5. Code freeze at H30

- After H30, **no merges to `main`** except fixes for demo-breaking bugs, approved by two people, with the golden path run after.
- Tag the freeze commit (e.g. `v1.0-hackathon`); pin `demo` hosting and the EAS Update `demo` branch to it.
- Final Android preview APK built from the tag; QR on the slide updated.

## 6. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | Golden path after the top-3 usability fixes | Green |
| T2 | `/admin/impact` | Numbers plausible and consistent with the seed + tester data |
| T3 | Voice suite after tuning | ≥ 85% per intent; distress 100% |
| T4 | Every backup video plays offline on the presenting laptop | Yes |
| T5 | APK from the frozen tag installs on a fresh phone | Yes |

## 7. Risks and fallbacks

| Risk | Fallback |
|---|---|
| No seniors available at the venue | Older mentors / staff as proxies; reuse the 12 Nov filming evidence |
| A late fix breaks something | Revert to the tag; the two-person approval rule after H30 |
| Recordings missing on the day | Two copies: shared drive + presenting laptop |

## 8. Definition of Done

- [ ] Top 3 usability issues fixed and verified
- [ ] Visual pass signed off by Kavya
- [ ] All 10 backup recordings done and stored in two places
- [ ] Impact metrics ready and labelled honestly (demo vs real data)
- [ ] Code frozen and tagged at H30; demo env + EAS Update + APK pinned to the tag
