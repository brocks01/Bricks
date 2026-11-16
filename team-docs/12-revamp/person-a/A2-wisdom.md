# A2: Wisdom, Teach and Learn (round 2, in parallel with B2)

Branch: `a/wisdom` (from the latest `main`, after A1 and **B1** are merged: you need `BackButton` and `feed.showed_up`).
Read first: `AGENTS.md`, `team-docs/12-revamp/README.md` (contract points 4, 5, 6), `team-docs/02-product/wisdom.md`, then this file.
Pictures: `reference/luma/luma-287` to `289` (a search bar and its results), for layout only.

Three parts. Do them in order and commit after each.

## Goal
The Wisdom tab gets a **LEARN | TEACH** switch at the top.
- **Teach**: five connected screens where an elder sees who wants to learn from them, accepts or declines, edits their teaching profile,
  runs a session with a chat, and sees past sessions with their reviews.
- **Learn**: a person searches for an elder who can teach them something, filters by a few clear topics, and sends a request.
- And, since B1 is merged now: every A sub-screen uses the shared floating **Back button**.

## What exists today
- App: `features/wisdom` (`wisdom.index` at `/wisdom`, `WisdomIndex.tsx`, `WisdomHome.tsx`, `Conversation.tsx`, `Forms.tsx`, the paid
  services pages `wisdom.service`, `wisdom.serviceOffer`, `wisdom.myServices`). `api/wisdom.ts`.
- Backend `modules/wisdom`: stories (`capsules`), **offers** (what an elder offers to teach; filters by domain, mode, topic, language,
  city), **requests**, **connections** (an introduction: `decide` accept or decline, `close`, `messages`, `sessions`), asking an elder
  (`POST /v1/wisdom/offers/{id}/ask`), endorsements, `stats`.
- From B1: `components/BackButton.tsx` and `nodes.feed.showed_up(...)` (contract point 4).

---

## Part 1: Teach

### Backend (`modules/wisdom`, migrations `0071`-`0079`)
Map every screen onto what exists; add only what is missing:
1. **Teaching profile**: `expertise` (short text, for example "AI, OS, Business"), `bio`, availability as `days` (for example "Mon-Fri"),
   `start_time`, `end_time`. `GET` and `PATCH /v1/wisdom/teaching-profile`.
2. **Pending invitations** = connections waiting for this elder's decision. A connection can come from **one person** or from **a group**:
   add `group_name` and `learner_count` (both null for one person). Each item carries the learner's name and avatar (or the group's name
   and count) and what they want to learn ("AI, OS"). Accept and decline use the existing `decide`.
3. **Sessions**: a scheduled time (`starts_at`, `place` or "online"), a status (`scheduled`, `completed`, `cancelled`), **reschedule**
   (a new time; both people told through the existing notify path) and **complete**. Completing calls
   `nodes.feed.showed_up(conn, user_id, 'wisdom', session_id, title, at, source_name=<the other person's name>)` for **both** people.
4. **Reviews**: after a completed session the learner gives a **score from 1 to 5** and a short feedback note (at most 500). One review per
   learner per session.
5. `upcoming_sessions(conn, user_id, until)` in `wisdom/service.py` for Person B's Home (contract point 5): `id`, `title`, `starts_at`,
   `place`, `with_name`, `role` (`teacher` or `learner`).
6. Tests in `test_wisdom*.py`: only the elder decides an invitation; a group invitation shows its count; reschedule tells both; complete gives
   each person one leaf once; only the learner reviews, once, 1 to 5; `upcoming_sessions` shape; another person's sessions never appear.

### App (`features/wisdom`)
1. **The switch**: a segmented control at the top of `wisdom.index`, `LEARN` and `TEACH`, the active one filled, the other outlined, at least
   56 high, with words.
2. **Teach hub**:
   - "Your Teaching Profile" card: expertise, availability, and an **Edit** button on the right (opens screen 3).
   - "Pending Invitations": one card per invitation. A person: avatar, name, "Wants to learn {topics} from you". A group: a group icon, the
     group's name, "{n} learners", "Want to learn {topic} from you". On the right of each, two buttons with icon **and** word:
     **Decline** (cross) and **Accept** (tick). After a tap the card shows the result for a moment and leaves the list.
   - "Your mentorships": active mentorships, then "Coming up" (scheduled sessions, opening screen 4), then "Completed" as an expandable list
     (the first three, then "Show all"). Active, upcoming and completed look clearly different (a heading and a status word on each). Each
     list has a friendly empty state.
3. **Mentor Profile Editing** (new page): title "Mentor Profile Editing", a central avatar, fields **Expertise**, **Bio** (a large text area),
   **Availability** as three inputs (Days, Start time, End time, with simple pickers), and a full-width **Save Changes** at the bottom.
4. **Session Details** (new page): title "Session Details"; a card with the learner's name and the topic, and two side-by-side buttons
   **Start Video Call** (shows "Coming soon": there is no video calling) and **Reschedule Session** (picks a new day and time); below,
   "Chat with {name}": the existing connection messages as alternating bubbles, large text, a big send button.
5. **Session History and Completed Reviews** (new page, from "Completed"): a list of cards, each with the session title, "Score: {n}/5" and
   the feedback note. Sessions not yet reviewed say so.

### Demo content (A's seeds, for Uncle Tan; idempotent)
Exactly these: his teaching profile with Expertise "AI, OS, Business" and availability Mon-Fri, 9 AM to 5 PM; a pending invitation from
**Sarath** ("AI, OS"); a group invitation from **SMU Students** (31 learners, "Business"); an active mentorship with Sarath, topic
"AI & OS Mentoring", with a short chat about preparing the session and one scheduled session; completed sessions **AI Mentoring**,
**OS Project Review**, **Career Guidance**, **Business Strategy Workshop**, each with a score and a short, constructive feedback note.
Sarath and the SMU group are seeded as real accounts or groups, never as text in the app.

---

## Part 2: Learn
1. **Search**: a tall search bar at the top (at least 56), placeholder "Search", a clear button; it searches as the person types (after a
   short pause) over the elder's name, skills and bio. Server side if the offers list cannot do it already (with a test).
2. **Chips** under it, scrolling sideways, one at a time or none: **Career**, **Technology**, **Language**, **Hobbies**. Map each to the
   offers' existing topics or domains in one table in `features/wisdom` (and on the server if a filter is missing). The last visible chip
   is cut at the edge, so it is clear there are more.
3. **Mentor cards**: text on the left (name, skills as words, years or field when known, languages), the person's photo on the **right**
   only when there is a real one (else initials), and a full-width **Ask to learn** button that sends the existing ask with a short optional
   note. After sending: "Request sent" with a tick, and the button becomes "Asked" (disabled). Tapping the card opens the elder's offer page.
4. Empty result: one friendly line and a "Show all" button that clears the search and the chip.
5. The experience is not professional advice: keep the existing note where `wisdom.md` requires it.

### Demo content (A's seeds; idempotent)
Elders with real offers: **Michael S.** (Interview Prep), **Sarah L.** (Excel/Python), **Ken T.** (Japanese), **Maria P.**
(Gardening/Painting), each with a short bio, languages and availability, mapped so each chip finds at least one.

---

## Part 3: the floating Back button on A's pages
Replace the back header on every A sub-screen (the new Wisdom pages, the community pages from A1, `connect.pick` when opened from the tab,
and any other A page that is not one of the four tabs or an onboarding step) with B1's `BackButton`, so it sits in exactly the same place
as on B's pages. Sub-screens show no bottom bar (B1 handles the bar).

---

## Files you may touch
`app/src/features/wisdom/**`, `app/src/api/wisdom.ts`, `app/src/app/wisdom/**`, `app/src/app/(tabs)/wisdom.tsx`,
`backend/app/modules/wisdom/**`, `backend/tests/test_wisdom*.py`, migrations `0071`-`0079`, A's seed files; for Part 3 the screens of A's
features (`connect`, `community`, `lead`, `explore`, `family`, `me`). In `selftest.ts` only existing lines about A's modules.
Update the Status section of `team-docs/02-product/wisdom.md` (including that reviews now show a score out of 5).

## Done when
- **Teach** (as Uncle Tan, phone size): the profile, both invitations, the mentorship, coming up and completed; Accept and Decline work and
  survive a reload; Edit saves; Session Details shows the chat and sends a message; Reschedule moves the session; Start Video Call says
  "Coming soon"; History shows the four sessions with scores; completing a session adds a leaf to the header tree.
- **Learn**: the four elders show; typing "japan" finds Ken T.; the Language chip finds him too; Ask to learn sends a request that then appears
  in that elder's Teach hub (sign in as a seeded elder, or check through the API).
- **Back**: the Back button is in the identical place on an A page and a B page (screenshots side by side in the pull request).
- All six languages; the largest text size fits.
- Backend tests, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
