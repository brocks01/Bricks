# Task 4: Move the paid services listing from the Marketplace into Wisdom (app)

Work straight on `main`. Area: `app/src/features/market`, `app/src/features/wisdom`, navigation. No backend change. Strong model, medium effort.

## Context
Decision of 16 Nov (`team-docs/02-product/tabs-requirements.md`): **Wisdom** is knowledge and care between people, free or paid; the **Marketplace** is the physical world nearby (market days, volunteering, gigs, shows). The app team's **services listing** (listings with an hourly rate, bookings, thank-yous, a pay guide, in `features/market`: `MarketIndex` services part, `OfferScreen`, `ListingScreen`, `MineScreen`, `api/market.ts` listings and bookings) is paid Wisdom. It still sits in the Marketplace tab. Move it, **without losing a single capability**.

## Build
1. Add a part to the Wisdom tab for people who may use it: **"Paid sessions"** (the services list with search and filters, "offer a service", "my services and bookings"). It appears in `profile.wisdom.parts` only where it makes sense: add `paid` to `rules.wisdom_parts` in `backend/app/modules/onboarding/rules.py` (one small backend change, with its test in `test_recurrence.py` expectations updated). Learners and both-role people see it; elders who share see "My services" in their own part.
2. **Move the screens** (and their page keys, routes and words) so their module is `wisdom`: for example `market.listing` becomes `wisdom.service`. Keep old routes working by redirecting (a tiny route file that forwards) so no link breaks. Update `src/navigation/selftest.ts` counts and any check that names the old keys.
3. The Marketplace tab (`market.index`) now shows **only** "Happening near you" (opportunities) and "my market days and stalls"; remove the services search, filters and offer button from it.
4. Add a calm note on the services screens: "Experience is not professional advice: for health, money or law, please see a qualified person." (six languages.)
5. Keep the backend endpoints as they are (`/v1/market/listings`, `/bookings`). **Do not merge the services data with Wisdom offers** in this task; note it in the progress file as a follow-up.

## Acceptance
`tsc`, self-test and lint clean; every old capability still reachable (list, search, offer, book, accept or decline, cancel, complete, endorse, my services); old routes redirect; the Marketplace tab has no services UI; words in six languages; no behaviour change to bookings.

## Out of scope
Unifying services and Wisdom offers into one model; payment features.
