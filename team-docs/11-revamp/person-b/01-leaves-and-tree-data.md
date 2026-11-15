# B1: the leaf rule and the tree's data (server only)

Branch: `b/leaves-and-tree-data` (from the latest `main`).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (ownership table, contract point 3), then this file.

## Goal
The Tree of Wisdom grows **one leaf for every event the person shows up to**. This iteration makes the server keep that count and hand
the app what it needs to draw the tree and list the events behind the leaves. No screen changes here.

## What exists today
- `backend/app/modules/nodes/`: every person has a tree of nodes. `feed.py` is how other modules report what a person did:
  `going` (said "I'm going": plants an **open** event node, no leaf yet), `attended` (checked in: the node is closed, the leaf is earned),
  `sync_events`, `care` (a reminder ticked), `moved_on`, `walked`, `helped`, `aspired`.
- Showing up at a community gathering already exists: `POST /v1/communities/activities/{id}/checkin` ("I'm here" inside the time window
  around the start, or the Community Lead checks the person in). It calls `feed.attended`. That route and its caller are Person A's.
- `GET /v1/nodes/tree` returns all nodes plus `leaves` (every closed piece of work: goals, habits, reminders, events), `level`, `habits`,
  `roots`. The Progress page and Home use it today.
- Marketplace (yours): `market/events.py` (market events, `set_going`) and `market/service.py` (bookings; `complete` calls `feed.helped`).

## The rule (the owner's, 15 Nov 2026)
- An **event** is: a community gathering, a marketplace event, or a marketplace booking (a session the person gives or takes).
- Saying **Yes** ("I'm going") earns nothing yet. The person earns **one leaf when they show up**:
  - community gathering: when they are checked in ("I'm here", or by their Community Lead);
  - marketplace event: when they check in to it, with the same time window as a gathering;
  - booking: when the session is marked complete; the provider and the taker each get one leaf.
- One event, one leaf, however many times it is reported. A leaf that was earned is never taken away.
- Showing up without having said yes first still earns the leaf.
- Other things the old tree counted (goals, habits, reminders ticked, walks) do **not** give Tree of Wisdom leaves. Their nodes and
  endpoints stay as they are; they are simply not counted here.

## Build
1. In `feed.py`: confirm `going` earns nothing and `attended` earns exactly one leaf per person and event (a repeat changes nothing).
   Make sure `sync_events` never turns a yes that was not attended into a leaf.
2. Marketplace, in your own modules: a check-in for a market event (`POST /v1/market/events/{eid}/checkin`, allowed from a little before
   the start until the end, once), and a leaf for both people when a booking is completed. Each uses a stable key (source plus id) so a
   repeat can never make a second leaf. Decide what happens to the old `feed.helped` leaf so a completed booking does not count twice.
3. A new read in the nodes router, `GET /v1/nodes/wisdom?limit=&before=`:
   ```
   { "leaves": 12,
     "events": [ { "id": "...", "title": "Morning walk", "at": "2026-11-14T23:00:00+00:00",
                   "source": "community" | "marketplace", "source_name": "Bishan Walkers", "leaves": 1 } ],
     "next_before": "..." | null }
   ```
   `leaves` is the total number of leaves earned from events. `events` is newest first, paged (`limit` at most 50), and holds only events
   the person showed up to. `source_name` is the community's name. For the marketplace send `null`: the app supplies the word
   "Marketplace" in the person's language.
4. Leave `GET /v1/nodes/tree` working exactly as before (other pages still call it).
5. Tests in `backend/tests/test_nodes.py`, `test_mall_events.py`, `test_market.py`: yes alone gives no leaf; check-in gives one; check-in
   twice still one; check-in with no earlier yes gives one; changing yes to no after a check-in keeps the leaf; a market event check-in
   gives one and is refused outside its window; a completed booking gives each of the two people one; a reminder ticked done gives none;
   paging returns everything once and in order; another person's events never appear.

## Files you may touch
`backend/app/modules/nodes/**`, `backend/app/modules/market/**`, `backend/tests/test_nodes.py`, `test_market.py`, `test_mall_events.py`,
and a migration with an even number (`0022_...sql`) only if a column or index is truly needed (then B4's migration takes the next even number).

## Requests to write for Person A (do not edit their files)
The app would like the answer of `POST /v1/communities/activities/{id}/checkin` to say whether a leaf was earned
(`"leaf_earned": true|false`). That route is A's. Write the request in your `LOG.md` and tell A; your Home (B4) must work without it by
reading the new total from `/v1/nodes/wisdom` after a check-in.

## Done when
- `cd backend && python -m pytest tests -q` passes (run the whole suite. If a test in a file A owns fails because of your change, do not
  edit it: list it in `LOG.md` under "Requests" with the exact test name and what it should now expect, and tell A).
- `LOG.md` entry with the final shape of `/v1/nodes/wisdom` and of the market event check-in.
