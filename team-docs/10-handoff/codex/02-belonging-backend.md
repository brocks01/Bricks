# Task 2: The belonging layer of Communities (backend)

Work straight on `main`. Area: a new backend module `backend/app/modules/belonging/` plus agent skills. Migrations `0050-0059`. Strongest model, high effort.

## Context
Belonging is a feeling built on identity and shared life (`team-docs/02-product/communities.md`, `01-philosophy/philosophy.md`). The owner's own story: from Bihar, in Singapore, missing his family and community celebrating Chhath; he wants to be **part of it from far away**, not at a fancy hotel. Build the backend for four things. **Identity (region, faith) is the person's opt-in choice and is never inferred or shown outside the circle.**

## Build
1. **Our days (a festival and ritual calendar).** Tables: `festivals` (id, name, tradition text, region_tags text[], starts_on date, ends_on date, notes) maintained by platform admins; `circle_days` (community_id, festival_id or a custom day with name and date, kept by the circle). **Do not invent festival dates.** Provide admin endpoints to add and edit festivals and a clear note in the progress file that dates must be entered and verified by the owner. Endpoints: a circle's coming days with a countdown (`days_to_go`), add or remove a day (leaders only), the platform's festival list.
2. **Presence ("away").** `circle_presence` (community_id, user_id, status `here|away`, place text, since date, share boolean default false). A person may mark themself away and **choose whether the circle sees it**. Endpoints: set mine, list a circle's people with presence (only those who share). The people list shows warm wording fields (`away_in`, `since`), never coordinates.
3. **Taking part from afar.** `circle_contributions` (id, community_id, user_id, day_id nullable, kind `blessing|recipe|story|message`, body text up to 1000, audio_url nullable, created_at, status). Members post a **blessing or message to the circle for a day**; members read them. When posted, members are told through the outbox (`channels/core.notify`, kind `circle`), once per person per day maximum. A leader can hide one.
4. **The circle's stories.** Allow a Wisdom capsule to be shared into a circle: add nullable `community_id` to `wisdom_capsules` (new migration, never edit old ones), `POST /v1/wisdom/capsules/{id}/share-to-circle`. Members of that circle see it in the circle's story list.
5. **Countdown nudges.** A daily background job (add one tick function and call it from `channels/outbox.loop`, same pattern as `nudges.run_once`): three days and one day before a kept day, tell each member once through the outbox ("Chhath is in 3 days. Would you like to send a blessing?"). Respect quiet hours and the outbox's dedupe key.
6. **Agent skills** in `skills/belonging.py` (register one line in `registry.py`): `our_days` (read), `send_blessing` (safe; text only; the agent confirms wording first), `i_am_away` (safe, with consent to share), `circle_stories` (read). Describe each in plain language for the model.

## Acceptance
New module with service, router and tests (`backend/tests/test_belonging.py`): countdown arithmetic; only leaders add days; presence only visible when shared; a non-member cannot read or post; one notification per person per day; capsule share-to-circle visible to members only; nudge sent once. Full backend suite passes. Migrations apply on a fresh run. Progress file explains the festival data the owner must supply.

## Out of scope
The app screens (task 3), audio upload (leave `audio_url` nullable and documented for later), the Communities app form (task 1).
