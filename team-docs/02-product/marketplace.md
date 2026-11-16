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
Stalls are for the 60+ band; one stall per person per event; limited by the venue's count. Platform admins create and import opportunities for now; hosts will list their own later.

## Status (16 Nov 2026)
**Built:** market days (list, one, going, stalls, community plans, repeats weekly or monthly; admin create and stop); in the app the market day page and the list at the top of the tab; agent skills `market_events`, `market_going`, `take_stall`, `whats_on`, `event_details`.
**Built (backend and app, 16 Nov):** **hosts** (`/v1/hosts`), opportunity **kind** (market day, volunteer, gig, show, activity), **intents** (earn, contribute, volunteer, enjoy), source (ours, partner, imported) and an external link, **import from a host** (`POST /v1/market/events` with `host_id` and `external_ref`, idempotent), and filters by intent, area and kind. The Market tab shows "Happening near you" with intent chips and a host on each event; the agent's `market_events` skill takes an intent.
**Today this tab also holds the services listing** (hourly-rate listings, bookings, thank-yous, built by the app team). That is **paid Wisdom** and moves to the Wisdom tab; this tab becomes physical opportunities only.
**Next:** hosts list their own opportunities; weekly milestones before a market day; a form to make one from the app.
