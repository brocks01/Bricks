# Iteration 1.1 — Home + Kampung

Stage 1 (Clickable app on mock data) · **Wed 11 Nov 2026, day (SGT)**

## 1. At a glance

| | |
|---|---|
| **Goal** | Build the community core first: the Home screen and the whole Kampung tab, on mock data |
| **Exit** | Join a walk **from Home in 1 tap**, **from Happenings in 2 taps** (Happenings → Event details → I'm going) |
| **Why first** | Kampung is the centre tab and the heart of the insight: community gives purpose *and* safety. Every later flow (check-in "No", Teach & Learn, group walks) ends in a Kampung event |
| **Owners** | A builds screens · B builds matching APIs · C translates + writes WA templates · D reviews · E preps interviews |
| **Est.** | A1.1 7 h · B1.1 4 h · C (translations wave 1, W1.1 templates) ~3 h |

## 2. Entry criteria

- [ ] Phase 0 exits met (see [stage README](../README.md)).
- [ ] Components ready: `BigButton`, `YesNo`, `EventCard`, `ClubCard`, `Tile`, `ScreenHeader`, `TellMeButton`, `UndoBar`, `StepProgress`, `EmptyState`.
- [ ] `app/mocks/` contains: 5 users (Raj, Mdm Tan, Priya, Ahmad, Lim), 3 circles, 8 events around Bishan / Toa Payoh with real photos and WhatsApp links.
- [ ] i18n key convention agreed: `screen.element` (e.g. `home.greeting.morning`, `event.button.going`).

## 3. Scope

### In

| PRD ID | Feature | Pri | Screen(s) |
|---|---|---|---|
| HM-1 | Greeting + Today card | P0 | S12 |
| HM-2 | Persistent controls (Read it out top-left, Help top-right red, Tell me bottom-centre, 3 tabs) | P0 | S12 + all |
| KP-1 | Happenings feed → details → I'm going | P0 | S14, S15, S16 |
| KP-2 | My Circles + Join WhatsApp group | P0 | S18, S19 |
| KP-3 | Start Something (what / when / where) | P0 | S17 |
| EV-5 | Undo after every action | P0 | S16 UndoBar |

S19 is **header, upcoming events and Join WhatsApp group only**. The group walk feed and Cheers are P1 → 3.2.

### Out (later iterations)
- Check-in logic on the Home card is UI-only here (Yes/No buttons render; behaviour lands in 1.2).
- Real Help/SOS (only a placeholder S28 route here; full UI in 1.2).
- Read It Out *engine* (1.3), but **write each screen's read-out script now** and register it with `useReadOut`.
- Voice "say it" in Start Something (mock Buddy arrives in 1.3; show the button, route to a "coming soon" sheet or leave it disabled with a label).
- Simple Mode S13 (3.2), Kampung Captains KP-4, Thinking of You KP-5 (P1).

## 4. Lane tasks

### Lane A — App (Sarath) · A1.1 · 7 h

**Files** (from `04` §1 folder structure):

```
app/app/home.tsx                               S12
app/app/(tabs)/kampung/index.tsx               S14 Happenings
app/app/(tabs)/kampung/event/[id].tsx          S15 Event details
app/app/(tabs)/kampung/going/[id].tsx          S16 You're going
app/app/(tabs)/kampung/create.tsx              S17 Start Something (stepper)
app/app/(tabs)/kampung/circles.tsx             S18 My Circles
app/app/(tabs)/kampung/circle/[id].tsx         S19 Circle page
app/app/sos.tsx                                S28 placeholder (title + Back only)
app/lib/mockApi.ts  (or hooks/)                React Query hooks over mocks/
```

**Mock hooks.** Names and return shapes mirror the B endpoints below, so 2.1 is a one-line swap per hook:

| Hook | Mirrors | Notes |
|---|---|---|
| `useMe()` | `GET /me` | name, language, area |
| `useToday()` | `GET /home/today` | check-in pending?, next event, next reminder |
| `useEvents({category, when})` | `GET /events` | filter chips map to params |
| `useEvent(id)` | `GET /events/{id}` | includes going count, host, whatsapp_link |
| `useRsvp(id)` / `useCancelRsvp(id)` | `POST/DELETE /events/{id}/rsvp` | optimistic update, kept in a zustand store so the state survives navigation |
| `useCreateEvent()` | `POST /events` | appends to the in-memory list |
| `useCircles()` / `useCircle(id)` / `useJoinCircle(id)` | `/circles` | |

**Per screen**

| Screen | Build | Acceptance |
|---|---|---|
| **S12 Home** | `display` greeting by time of day ("Good morning, Raj"); up to **3 cards**: check-in (only if unanswered) · next event `EventCard` with **I'm going** · next reminder with Done; then **4 Tiles**: Start walk · Happenings · Share a skill · My Circles; `TellMeButton`; tabs | **I'm going** on the Home card → S16 directly (**1 tap**). Start walk / Share a skill tiles go to their tab roots (screens arrive in 1.2/1.3) |
| **S14 Happenings** | Title, ≤ 5 filter BigButtons (Today · This week · Walking · Classes · Kids), vertical list of `EventCard` (16:9 photo, title 24pt, "Tomorrow, 7 am · Bishan Park", "12 going", I'm going), bottom BigButton **Start something** | No horizontal carousels. Card tap → S15; card button → S16 |
| **S15 Event details** | Cover photo, title, when (icon: calendar), where (icon: map-pin) + **Open in Maps** (deep link `geo:` / Apple Maps URL), host row → profile (stub route), going avatars + count, Language + **Translate** (stub), About ≤ 3 lines, bottom **I'm going**; after joining, the button becomes **Join WhatsApp group** | Tap path Happenings → S15 → S16 = **2 taps** |
| **S16 You're going** | (icon: check-circle, success) "You're going." · "We'll remind you at 6 am." (1 h before start) · BigButton **Join WhatsApp group** (`Linking.openURL(whatsapp_link)`) · outline **Done** · `UndoBar` 8 s | Undo restores the previous state and S15 button label. Haptic tick on success |
| **S17 Start Something** | `StepProgress` "Step 1 of 4". What? (category photo chips + "Say it" button) → When? (Today / Tomorrow / This weekend / Pick; time chips) → Where? (Near me / Community centre / Park / Pick on map) → WhatsApp link (optional) → **Preview** rendered with the real `EventCard` → **Publish** | One question per screen, Next fixed at the bottom, Back on every step. Published event appears in S14 |
| **S18 My Circles** | Title, `ClubCard`s (photo, name, members, next activity) with **Join WhatsApp group** + **See events**; section "Circles near you" with **Join** | No leaderboards / rankings |
| **S19 Circle page** | Header photo + name + "48 members", captain row with badge, **Join WhatsApp group**, Upcoming (`EventCard`s), Members (avatars). Leave a placeholder section for the "Recent group walks" feed (3.2) | — |
| **Help everywhere** | `ScreenHeader` Help (red, top-right) → `router.push('/sos')` placeholder | Present on every screen built this iteration |

**Read-out scripts** (register via `useReadOut`, using the text from `02b`):
- S12: "Good morning Raj. You have a check-in, a walk tomorrow at 7 am, and medicine at 8 am."
- S14: "Happenings. 3 events today. First: Morning walk, 7 am, Bishan Park. Tap 'I'm going' to join."
- S15: "Morning walk. Tomorrow, 7 to 8 am, Bishan Park Gate 2. Hosted by Raj. 12 people going. Tap 'I'm going' to join."
- Write S16–S19 in the same pattern: **where you are → main content → what you can do**.

**i18n:** every string goes through `t()`, with English only for now. Export the new keys to C **by mid-afternoon** so translations wave 1 lands the same day.

**Empty states (S39):** "No events near you yet. Start one?" [Start something] · "You haven't joined a Circle yet." [See Circles near you].

### Lane B — Backend (Sayan) · B1.1 · 4 h

Build against the seeded DB. Use the shapes below unless the 0.1 contract says otherwise, in which case **the contract wins**:

| Endpoint | Behaviour |
|---|---|
| `GET /me` · `PATCH /me` | Profile: `id, name, language, channel_pref, area_name, simple_mode, status`. PATCH accepts `language, channel_pref, simple_mode, area_name, name` |
| `GET /home/today` | `{ checkin: {pending: bool, question_key}, next_event: Event \| null, next_reminder: Reminder \| null }`, limited to 3 cards |
| `GET /events?near=lat,lng&category=&when=` | Up to 20, ordered by `start_at`, then distance (PostGIS `ST_DWithin` 3 km default). Each item: `id, title, category, start_at, end_at, place_name, lat, lng, photo_url, going_count, host {id,name,avatar}, language, whatsapp_link, my_rsvp` |
| `GET /events/{id}` | Event + `attendees` (first 8 avatars) + `description` |
| `POST /events` | `title, category, start_at, place_name, lat?, lng?, whatsapp_link?, circle_id?` → created event; `host_id = me` |
| `POST /events/{id}/rsvp` · `DELETE …/rsvp` | Idempotent. POST sets `status='going'` and returns `{status, whatsapp_link, reminder_at}`; DELETE sets `cancelled` (the Undo path) |
| `GET /circles` · `GET /circles/{id}` · `POST /circles/{id}/join` | List has `my` and `near_me` sections; detail has captain, member count, upcoming events, members |

- Validate with Pydantic; log each request (no personal data in logs).
- Add curl examples to the PR (PR template requirement).
- Seed must include at least one walk event **tomorrow 7 am at Bishan Park** with ~12 going, so the read-out examples match.

### Lane C — Voice & WhatsApp (Ankit)

| Task | Detail |
|---|---|
| **Translations wave 1** (C1.1) | Home + Kampung keys from A, en → ms, zh, ta. Everyday words. Send to native-speaker reviewers via Santusht / Ken. Dates as "Tomorrow, 7 am" equivalents. Tamil strings are the longest, so flag any that are > 1.5× English to A |
| **WhatsApp templates in English** (W1.1) | Draft all 12 templates from `06` §4 (`welcome_invite_family`, `welcome_invite_org`, `daily_checkin`, `checkin_nudge`, `event_invite`, `event_reminder`, `reminder`, `thank_you_prompt`, `sos_alert`, `family_missed_checkin`, `weekly_joy_report`, `weekly_progress_card`). Utility tone, no emojis, first words say what it is, footer "Reply STOP to pause messages." Santusht reviews tone |

### Lane D — Design (Kavya)

- Review S12–S19 against the board: **Luma** (S14, S15, S17), **Grab** (S12 tiles), **Strava Clubs** (S18, S19), **Monzo** (S16).
- Run **5-second tests** with family members: show S12 for 5 s and ask "What would you tap to join the walk?" Do the same for S14 and S15. Any hesitation goes on a redesign card.
- Check against the UX DoD: body ≥ 20pt, buttons ≥ 64dp, contrast ≥ 7:1, 200% font, no icon-only buttons, red only on Help.

### Lane E — Business & research (Santusht + Ken)

- Interview prep for **senior men** (why they don't join centre activities, what they would teach, what role they miss after work). This feeds raiSE A8 and the pitch.
- Confirm filming participants for Thu 12 Nov afternoon (3–5 seniors, ≥ 2 men) and consent forms.
- Check the Expo Go build on iPhone at the end of the iteration (10-minute check of new screens).

## 5. Integration points

| From → To | What | By |
|---|---|---|
| A → C | Home + Kampung i18n keys (`en.json` diff) | Mid-afternoon Wed |
| C → A | `ms.json`, `zh.json`, `ta.json` for those keys | Wed evening (can slip into 1.2) |
| B → A | Confirm hook shapes match endpoint JSON | During 1.1 (Slack note if anything changes) |
| C → Santusht | 12 English templates for tone review | End of 1.1 |

## 6. Test plan

| # | Case | Expected |
|---|---|---|
| T1 | Open app → Home → tap **I'm going** on the walk card | S16 shows; tap count = 1 |
| T2 | Kampung tab → Happenings → tap card → **I'm going** | S16 shows; tap count = 2 |
| T3 | On S16 tap **Undo** within 8 s | RSVP removed; S15 shows **I'm going** again; going count back to the original |
| T4 | S16 → **Join WhatsApp group** | WhatsApp opens the circle link (or browser if WhatsApp isn't installed) |
| T5 | Start Something → all 4 steps → Publish | New event visible at the right position in S14; Preview looked identical to the card |
| T6 | Filter "Walking" | Only walking events; empty state wording if none |
| T7 | My Circles → circle → **Join WhatsApp group** | Link opens |
| T8 | Help on every built screen | Opens S28 placeholder |
| T9 | System font 200% | No clipped buttons or overlapping text on S12, S14, S15 |
| T10 | Expo Go on iPhone | All above screens open and work |

## 7. Exit demo (15 min)

1. Open Home on Android → 1 tap to join → show S16 and Undo.
2. Happenings → details → join (2 taps) → Join WhatsApp group.
3. Create "Chess at the CC, Saturday 10 am" via Start Something → show it in the feed.
4. Same flow on an iPhone in Expo Go (Singapore teammate on video).
5. Kavya shares 5-second-test results; the team decides cuts.

## 8. Risks and fallbacks

| Risk | Fallback |
|---|---|
| A runs late on S17 (multi-step) | Ship S17 with What / When / Where + Publish; add the WhatsApp link step and Preview in 1.3 |
| Real photos not ready | Category icon on a `bg-subtle` square (never clip-art) |
| `react-native-maps` "Open in Maps" differs by platform | Use `Linking` with a Google Maps URL; works on both |
| Tamil overflow on tiles | Allow 2-line labels; no fixed widths; re-check at 200% |

## 9. Definition of Done

- [ ] All screens pass the UX DoD (`02` §11), screenshot at 200% font and in Tamil (placeholder OK until translations land)
- [ ] All strings in i18n; keys handed to C
- [ ] Read-out scripts registered for S12, S14–S19
- [ ] Help present on every screen; Back + Home; no dead ends
- [ ] Empty / loading / error states in plain words
- [ ] B endpoints documented with curl output in the PR
- [ ] Works on Android dev build **and** iPhone Expo Go
- [ ] No emojis, no gradients, one accent colour, red only on Help
