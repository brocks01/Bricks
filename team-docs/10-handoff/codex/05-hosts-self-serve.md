# Task 5: Hosts list their own opportunities (backend and app)

Work straight on `main`. Area: `backend/app/modules/hosts`, `backend/app/modules/market/events.py` and router, a small app area. Migrations `0060-0069`. Wait for row 1 to be done. Strongest model, high effort.

## Context
The Marketplace is the physical world nearby, **hosted by others** (Active Ageing Centres, malls, community centres, organisations): we are **not** the event provider (`team-docs/02-product/marketplace.md`). Today only platform admins create hosts, opportunities and imported communities (`POST /v1/hosts`, `POST /v1/market/events`, `POST /v1/communities/import`). Let a host manage its own.

## Build
1. **Host members:** `host_members` (host_id, user_id, role `owner|editor`). A platform admin adds the first owner (by email); an owner can add editors. A person can belong to several hosts.
2. **Host-scoped actions:** an owner or editor can create, edit and cancel **their own host's** opportunities (`/v1/hosts/{id}/events` POST, PATCH `/{event_id}`, cancel) with the same fields and validation as `market.events.create_event` (kind, intents earn/contribute/volunteer/enjoy, repeat weekly or monthly, stalls, external link, external_ref for imports). They can also import their communities (`/v1/hosts/{id}/communities`). They can **never** touch another host's items. Reuse the existing service code; do not duplicate rules.
3. **See who is coming:** a host sees the going count and, for stalls, who took them (names as already visible to members); not a person's other data.
4. **Agent skill** (`skills/hosts.py`, one line in `registry.py`): `my_host_events` (read).
5. **App:** for a person who is a host member, the profile page shows a "My host" row opening a small area: list my host's opportunities (upcoming first), a form to add one (title, kind, what a person can do there, venue, address, when, repeat, stalls, link), cancel one. Words in six languages. Hidden entirely for everyone else.

## Acceptance
Tests (`backend/tests/test_hosts.py`): only members manage their host; an editor cannot add members; cross-host access is refused; import by `host_id` + `external_ref` is idempotent; repeating opportunities are created through the existing recurrence code. Full backend suite passes; app `tsc`, self-test and lint clean.

## Out of scope
Payments, ticketing, public host pages.
