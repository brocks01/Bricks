# B6: the Marketplace tab

Branch: `b/marketplace` (from the latest `main`, after B5 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (contract point 1: `interests`; screen rules), then this file.

## Goal
The right tab, **Marketplace**, from top to bottom:
1. a **search bar**;
2. a **filter** row made of the onboarding keywords (what people enjoy);
3. **two big buttons** side by side: left "Offer a service or sell a product", right "My services and bookings";
4. **all the listings**.

## What exists today
- `features/market/screens/MarketIndex.tsx` (key `market.index`, route `/market`): a search field, a category chip row (crafts, cooking,
  teaching, repair, music, wellness, advice, storytelling, other), the offer and mine actions, and a list of listings.
- `market.offer` (the form), `market.mine` (my services and bookings), `market.listing` (one listing). `api/market.ts`, `modules/market`.
- The person's interests arrive on the signed-in user as `interests` once Person A's iteration A3 is merged. Until then the field is
  missing: read it as `(user as { interests?: string[] } | null)?.interests ?? []` and never edit `session/store.ts`.

## Build
### Backend (`modules/market`)
1. Migration `0024_listing_interests.sql`: `service_listings.interests text[] not null default '{}'`, holding only the eight onboarding keys: `walking`, `taichi`, `cooking`, `chess`, `music`, `gardening`, `teaching`,
   `tech`. Fill it for existing listings from their category where the match is obvious (cooking, teaching, music) and leave the rest empty.
2. `GET /v1/market/listings` takes `interest=` (one key) beside `q` and `category`. Creating and updating a listing accept `interests`.
3. Tests in `test_market.py`: the filter returns only tagged listings, an unknown key is refused, search and filter combine, the fill rule.

### App (`features/market`)
1. **Search bar** at the very top: tall (at least 56), a search icon, the hint "Search services and products", a clear button when there
   is text. It searches as the person types (after a short pause) and on the keyboard's Search key.
2. **Filter**: a row of big chips that scrolls sideways, each with its icon and word: "All" first, then the eight keywords with **the
   person's own interests first**. One choice at a time; "All" is chosen at the start. Chips are at least 48 high. Because sideways
   scrolling is easy to miss, let the last visible chip be cut at the edge so it is clear there are more.
3. **Two big buttons** side by side, equal width and height, an icon above the words, words may wrap to two lines:
   left "Offer a service or sell a product" (opens `market.offer`), right "My services and bookings" (opens `market.mine`).
   If something is waiting for the person's answer, the right button shows a count badge (the existing market summary has the number).
4. **Listings**: one big card each: an icon for its kind, the title (wraps), who offers it with a verified tick when verified, the price
   per hour or "Free", the area. The whole card opens `market.listing`. While loading, skeleton cards; when nothing matches, one line
   and a "Show all" button that clears the search and the filter.
5. In the offer form (`market.offer`) add one question, "What is it about?", with the eight keywords as tiles (many may be chosen), saved
   as the listing's `interests`.
6. Move anything else that is on this page today (for example a Market Day or events block) off it: events now live on Home.
   Update the page's `definePage` elements (`search`, the filter, `offer`, `mine`) and its page data so the agent can search, filter and open a listing.

## Files you may touch
`app/src/features/market/**`, `app/src/api/market.ts`, `app/src/app/(tabs)/market.tsx`, `app/src/app/market/**`,
`backend/app/modules/market/**`, `backend/migrations/0024_listing_interests.sql`, `backend/tests/test_market.py`,
`backend/app/showcase.py` (only to tag demo listings). In `selftest.ts` only existing lines about `market`.

## Done when
- At phone size the page reads search, filter, two buttons, listings. Typing narrows the list; a chip narrows it; both together work;
  the two buttons open the right pages; a card opens its listing.
- A person whose interests are Cooking and Music sees those two chips straight after "All". A person with no interests sees all eight.
- Largest text size: the two buttons stay side by side with wrapped words and nothing cut. All six languages.
- Backend tests, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
