# Person A: log

Append one entry per iteration: the date, who (tool and model), the iteration, what was done, what was tested and how, what is NOT done or
NOT tested, and the next step. Then two lists, kept up to date:

### 17 Nov 2026 · A1 Communities and maps · Claude Code (Opus 5.5)
**Done**, on branch `a/communities-maps`, one commit per part:
1. `geo` module, migration `0042` (`geo_places`, `communities.address`), map routes, `MapCard`, `api/geo.ts`, `GOOGLE_MAPS_API_KEY` in `.env.example`, `.cache/` in `.gitignore`, the router registered in `main.py` (an import line and an include line: two lines, not one).
2. Migration `0043` (WhatsApp link, interests, events page), `communities/discover.py` (cards, ranking, about, leader details), routes in `rules_router.py`, `can_manage` and `i_attended` added, ten demo communities in `seed_demo.py` with hand-picked checked photos; the picker `connect.pick`.
3. The Communities tab (`connect.index`): search (an agent field), your communities, picked for you, one `CommunityCard`.
4. The community page and See events (`EventList`, `EventCard`), leave and report sheets, the leader's Group details; `features/community/when.ts` and `when.check.ts`.
**Tested:** backend `test_geo.py` (5) and `test_community_discover.py` (8) pass; the whole suite: 416 passed, 16 failed, and all 16 fail the same way on `main` (checkins, wisdom conversation, hosts milestones, tunnels, recurrence, safety agent, the belonging nudge). App: `tsc` clean; `when.check.ts` passes; `selftest.ts` fails only the two lines that already fail on `main` ("Singpass is person-only", "english default": A3's); `expo lint` reports nothing in my files (the errors left are in market and wisdom screens, and one old warning in `connect/pages/index/Screen.tsx`). In the browser (headless Edge, 390 wide, as Uncle Tan): the tab, search area, the picker ("Choose up to 2", he is in one), a member's community page, a visitor's page with Join, and See events, all rendered with no page errors.
**Not tested:** a real Google Maps key (the pasted key is an Android key; without a key the map picture hides and the address and button show, as designed); "I'm here" on a gathering that is on now in the browser (the server test covers it); the six languages on screen (only English was looked at; the words are first drafts that need a native speaker); a real phone; the largest text size.
**Choices:** no WhatsApp links are seeded (made-up links would lead nowhere); someone not in an open community sees its upcoming titles, times and places, never its members; the old first "next event" block on the tab is gone (Home will show upcoming events, B2).
**Next:** A2 (Wisdom) once B1 is merged.

### 17 Nov 2026 · A2 Wisdom LEARN | TEACH · Claude Code (Opus 5.5)
**Done**, straight on `revamp-iterations-v2` (no new branches, as the owner asked); parts 1 and 2 in one commit, part 3 in its own:
1-2. Migration `0071` (teaching profiles, group asks, meetings, reviews), `wisdom/teach.py` (profile, schedule, reschedule, complete with one leaf each through `feed.showed_up`, cancel, the learner's one review 1-5, `upcoming_sessions` for B's Home), new routes; the Wisdom tab as LEARN | TEACH (`TeachHub`, `LearnHub`), Mentor Profile Editing, Session Details, Session History; `seed_wisdom_teach.py` (Uncle Tan's profile, Sarath Kumar, the SMU Students group of 31, four completed sessions with scores, four elders under Learn) called from `seed_uncle_tan.py`.
3. B1's floating `BackScreen` on every A sub-screen (28 screens, the community Gate, family, WisdomIndex; `BackHero` for the two hero screens).
**Tested:** backend `test_wisdom_teach.py` (7) passes; the whole suite 428 passed, the same 16 failures as before. App: `tsc` clean, the Wisdom files lint clean; `selftest.ts` fails only "Singpass is person-only" (old, A3's). In the browser (headless Edge, 390 wide, as Uncle Tan): Teach, Learn, Session Details, Mentor Profile Editing and Session History all render with their data and no page errors. The browser check found and fixed three things: the Edit, Session and History screens fetched before the saved sign-in had loaded (401 on a direct visit; they now wait for it), the invitation buttons squeezed the name into one letter a line (now under the text), and languages showed lowercase.
**Not tested:** pressing Accept, Decline, Ask to learn, Reschedule, We had this session and Send review in the browser (they change the demo data; the server tests cover them); the six languages on screen (English only; the words are first drafts); a real phone; the largest text size.
**Choices:** no separate offer page (a Learn card opens in place); Start Video Call says "Coming soon"; all four completed sessions are with Sarath so there is one active mentorship, as the design shows.
**Next:** A3 (onboarding, profile, close-out; also the old Singpass selftest line).

## Requests for the other person
- **B1:** `BackButton` and `feed.showed_up` as in the contract; please also export `refreshWisdom()` so A's "I'm here" can call it.

## Later
