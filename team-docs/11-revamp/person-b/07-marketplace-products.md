# B7: selling a product in the Marketplace

Branch: `b/marketplace-products` (from the latest `main`, after B6 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md`, then this file.

## What exists today
The Marketplace only knows **services**: a price per hour, and a booking for a day and a time (`service_listings`, `service_bookings`).
The owner has decided that selling a product is part of the Marketplace too. The platform never holds money: this stays true.

## Goal
A person can list a **product** (kueh, a knitted scarf, potted herbs) as well as a service, and someone else can ask to buy it.

## The shape
1. A listing has a `kind`: `service` (as today) or `product`. A product has a **price per item** instead of a price per hour, and may
   have one photo (through the existing media upload; without Cloudinary settings the photo step says it is not available and is skipped).
2. The offer form starts with one question, two big cards: "A service (I do something for people)" and "A product (I sell something I
   made)". The questions after it fit the choice (a product is not asked for hours, complexity or years of experience).
3. A product's page shows the price and one button, **"Ask to buy"**: how many, and a note. This sends a request to the seller, who
   answers Yes or No in "My services and bookings", exactly like a booking request. When the seller says yes, both people see each
   other's name and the agreed number and price; they arrange payment and hand-over themselves. Bricks takes no payment.
4. In the Marketplace list, a product card shows "per item" and a small "Product" tag; a service card shows "per hour" and "Service".
   The search and the interest filter cover both.
5. Buying or selling a product does **not** give a Tree of Wisdom leaf (leaves are for events a person shows up to).

## Build
- Backend (`modules/market`): migration `0026_listing_kind.sql` (`kind`, `price_per_item`, `photo_url`; a request row that can be an
  order with a quantity and no time); the create, update, list and detail routes; a buy-request route and the seller's decision, reusing
  the booking rules for who may do what. Tests in `test_market.py`: a product cannot be booked by the hour, a service cannot be ordered
  by quantity, only the seller decides, the seller cannot order from themselves, the lists show the right kind.
- App (`features/market`): the first question in the offer form, the product page with "Ask to buy", the tags on the cards, and the
  requests in "My services and bookings". Six languages.

## Files you may touch
`app/src/features/market/**`, `app/src/api/market.ts`, `app/src/app/market/**`, `backend/app/modules/market/**`,
`backend/migrations/0026_listing_kind.sql`, `backend/tests/test_market.py`, `backend/app/showcase.py`.

## Done when
- One account lists a product; a second account asks to buy two; the first says yes; both see the agreed request. Shown at phone size.
- Existing services and bookings behave exactly as before.
- Backend tests, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
