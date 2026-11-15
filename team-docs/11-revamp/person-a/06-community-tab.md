# A6: the Community tab, the community page and its events

Branch: `a/community-tab` (from the latest `main`, after A5 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (screen rules for older people), then this file.
Pictures: `reference/12-community-page.png`, `13-community-events.png`, `14-community-events-more.png`.
Use them for the content and order of a community page and its event cards, and improve on them as described below.

## Goal
The left tab, **Community**, shows the person's communities. Opening one shows what it is, who leads it, and what is coming up, with one
obvious button per event: "I'm going".

## What exists today
- `features/connect/pages/index` (key `connect.index`, route `/communities`): the tab page. `features/connect/CommunityCards.tsx`.
- `features/community/pages/home` (key `community.home`, route `/community/[id]`) and `features/community/screens/` (Events, Event, and others).
- `api/communities.ts`: `getUpcoming`, `setGoing` (`POST /v1/communities/activities/{id}/going`). Person B's Home also calls `setGoing`: do
  not change its name or what it sends.
- `api/lead.ts`: `checkIn` (`POST /v1/communities/activities/{id}/checkin`, "I'm here"). Person B's Home also calls it: do not rename it.
- Leaves are Person B's, and a leaf is earned only by **showing up**, never by "I'm going". This iteration never counts leaf totals.

## Build
1. **Community tab** (`connect.index`): the heading "My communities", then one big card per community: the photo across the top, the name,
   "N members", and one line for the next gathering ("Next: Morning walk, tomorrow 7 am"). The whole card opens the community.
   At the end, one big plain button "Find more groups" (opens `connect.explore`). With no communities: one friendly line and the button
   "See groups we think you will like" (opens `connect.pick`). Remove the join-with-a-code and ask-to-start entries from this page's main
   flow; keep them reachable inside "Find more groups".
2. **Community page** (`community.home`), in this order: Back; the photo; the name; "N members"; the two-line description; a row with the
   leader's initials, a verified tick and "Community Lead: {name}" (our existing role word, not "Captain"); then the heading **Coming up**
   and the event cards. Lead tools, invites, initiatives and updates move under one "More about this group" button at the bottom.
3. **Event card**, one self-contained card per gathering (in the pictures the button floats outside the card and the floating agent button
   covers text: fix both):
   - the photo on the left, at least 96 wide; the host's initials and name; the title (may wrap to two lines, never cut);
   - a clock icon with the time in plain words in the person's language ("Tomorrow, 7 am", "Tuesday, 7:30 am");
   - a pin icon with the place (wraps, never cut);
   - "28 going";
   - inside the card, full width: **"I'm going"**. After a yes it becomes a green "You are going" with a tick, the line "Come along to
     earn 1 leaf", and a small "Change" beside it;
   - while the gathering is on (the existing check-in window), the button is **"I'm here"**. After it: "You came" with a tick and "+1 leaf".
   Leave enough bottom padding in the list that the last card clears the bottom bar and the agent button.
4. **No WhatsApp button**: Bricks has no WhatsApp link for a community. Leave it out rather than showing a dead button.
5. Time words ("Today", "Tomorrow", weekday names) come from one helper in the `community` feature with a check file
   (`features/community/when.check.ts`) covering today, tomorrow, this week, later dates, and the six languages.
6. Publish the page data (`usePageData`) so the agent can read the events and press "I'm going" by name.

## Files you may touch
`app/src/features/connect/**`, `app/src/features/community/**`, `app/src/features/lead/**`, `app/src/api/communities.ts` (add only; do not
change `setGoing` or `getUpcoming`), `app/src/app/community/**`, `app/src/app/(tabs)/communities.tsx`. Backend only if a field is missing
(`backend/app/modules/communities/**`, `backend/tests/test_communities.py`, `test_community_screens.py`).

## A request Person B will make
B would like the answer of `POST /v1/communities/activities/{id}/checkin` to carry `"leaf_earned": true|false` (true the first time the
person is checked in to that gathering). The route is yours (`lead_router.py`, `lead.py`): add the field here, with a test in `test_lead.py`.

## Done when
- At phone size: the tab lists the joined communities with photos; a community page reads top to bottom as above; "I'm going" turns green
  and survives a reload; "Change" takes it back; on a gathering that is on now, "I'm here" shows "+1 leaf".
- Largest text size: nothing is cut off or covered by the bottom bar or the agent button. All six languages.
- `npx tsx src/features/community/when.check.ts`, `tsc`, `expo lint`, `selftest.ts` pass; backend tests pass if the backend changed.
- `LOG.md` entry.
