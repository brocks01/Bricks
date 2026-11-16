# Marketplace (right tab): the physical world nearby

Root: `../01-philosophy/philosophy.md`. Map of the three products: `tabs-requirements.md`.

## The pain and what it gives
**The pain: there is nothing near me to go to, and nowhere to be useful.** The Marketplace shows **what is happening near a person, in the physical world, where they can earn, contribute, volunteer, or simply enjoy and be there.**

## We are not the event provider
Events and opportunities are **hosted by others**: Active Ageing Centres, malls, community centres, third-party organisations. **We do not organise them. We bring our users to them**, so a person arrives already noticed, welcomed and expected. Our own market days are one kind of opportunity among others.

## What an opportunity is
- **Hosted by** a host (an Active Ageing Centre, a mall, a community centre, an organisation), at a place, at a time, once or repeating (weekly or monthly).
- **A kind:** a market day, a volunteering slot, a paid gig, a show or performance, an activity.
- **What a person can do there (intents):** **earn** (a stall, a wage), **contribute** (help, teach, give), **volunteer**, **enjoy** (come, watch, take part).
- **Source:** made by us (our own market days), brought by a **partner** host, or **imported** from a host's own listing (with an external link).

## What a person does
- See what is happening **near them**, filtered by what they want (earn, contribute, volunteer, enjoy).
- Say **"I'm going"**; take a **stall** at a market day (people aged 60 and over; a morning half, an afternoon half, or the whole day, with an optional helper); give it up.
- Circles go together to an event.
- Payment is always direct between people (a stall fee, a wage); the platform never holds or moves money.

## Rules
Stalls are for the 60+ band; one stall per person per event; limited by the venue's count. Platform admins create and import opportunities; a host's own **owners and editors** now list their own (below). Hosts will list their own from their own screens later.

## Status (16 Nov 2026)
**Built:** market days (list, one, going, stalls, community plans, repeats weekly or monthly; admin create and stop); in the app the market day page and the list at the top of the tab; agent skills `market_events`, `market_going`, `take_stall`, `whats_on`, `event_details`.
**Built (backend and app):** **hosts** (`/v1/hosts`), opportunity **kind** (market day, volunteer, gig, show, activity), **intents** (earn, contribute, volunteer, enjoy), source (ours, partner, imported) and an external link, **import from a host** (`POST /v1/market/events` with `host_id` and `external_ref`, idempotent), and filters by intent, area and kind. The Market tab shows "Happening near you" with intent chips and a host on each event; the agent's `market_events` skill takes an intent. The services listing moved to the Wisdom tab ("services moved" in `wisdom.md`), so this tab is physical opportunities only.
**Built (Marketplace, 16 Nov): hosts list their own opportunities.** `host_members` (`owner|editor`, migration `0060`): a platform admin adds the first owner by email, an owner adds editors, an editor may not add anyone, only an admin adds owners. Endpoints: `GET/POST /v1/hosts/{id}/events` (the same fields and validation as the admin form, once or weekly/monthly), `PATCH` (edit the fields sent), `POST .../cancel`, `POST .../end-series`, `GET/POST /v1/hosts/{id}/communities` (import, idempotent), `GET /v1/hosts/{id}/members` (names and roles only), `GET /v1/hosts/mine`. Members only, never another host's: another host's event is a 404, a non-member 403. Skill `my_host_events` (read). App: a new **My host** module (`host.home`, `/host`) — list upcoming with going counts and stall takers, add an opportunity (title, kind, what a person can do there, venue, address, when, repeat, stalls, link) and cancel one; the same form serves platform admins (`mine` returns every host for them). A **"My host" row on the Marketplace tab's list**, hidden for everyone else. Tests: `backend/tests/test_hosts.py`.
**Built (Marketplace, 16 Nov): weekly steps before a market day.** `market_event_milestones` (migration `0061`): a circle that **planned the visit** sets small steps toward its stall — only its Community Lead adds or removes, every member sees and ticks them off, one step per title per circle. `GET/POST /v1/market/events/{id}/milestones`, `POST .../tick`, `DELETE ...`. When a step is due within three days (or overdue) each member gets **one gentle nudge through the outbox** — once per person per step, at most two a day, never at night — from `milestones.run_once`, called by one line in the shared `recurrence.run_once` (the background tick; `channels/outbox.loop` belongs to the Doors area). The market day page shows "Steps toward our stall" with the add form for leads. Tests in the same file.
**Needs from Onboarding and profile:** the same "My host" row on the profile's More list (`app/src/features/me/pages/index/Screen.tsx`, one `Row` opening `host.home`, shown only to host members and platform admins) — that file belongs to that area, so it was not touched here; the Marketplace tab's row makes the area reachable meanwhile.
**Tested / not tested:** all seven tests in `test_hosts.py` passed (16 Nov, before other areas' in-progress work); the last rerun was blocked by another area's pending migration `0100_profile_interests_voice.sql` (`users.interests` not yet in the local database), which fails sign-in for every area — unrelated to this one. App: `tsc --noEmit` clean with these changes; `selftest.ts` passed with them (module count 18); `expo lint` reports only errors in `components/SplashIntro.tsx`, another area's new file. The Marketplace area touched only `MarketDays.tsx`, `dayWords.ts`, `screens/MarketDay.tsx`, `api/hosts.ts`, `api/marketSteps.ts`, `features/host/**`, `app/host/**`, `market/events.py`, `market/events_router.py`, `market/milestones.py`, `hosts/**`, migrations `0060-0061` and one-line shared edits (`skills/registry.py` import, `recurrence.run_once` tick, `features/index.ts` import, the selftest module count).
