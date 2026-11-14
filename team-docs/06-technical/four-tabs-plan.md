# Four tabs: Home, Community, Marketplace, Health (15 Nov 2026)

The app has four tabs. Everything else (family, calendar, aspirations, progress, contributions, activity, the Explore library) is reached from Home or from the profile's "More" list, and by the agent.

Branch: `four-tabs` (not merged into `main`). Backend tests 178 pass; app type-check, lint, `npx tsx src/navigation/selftest.ts` and `npx tsx src/features/home/day.check.ts` pass. Walked through in the browser at phone size: Home, Community (explore, join three, leave, share with family, ask to start), Marketplace (browse, listing, booking), stalls, Health (check-in, practice walk, history, card, help).

## The idea: the calendar is the spine
Every commitment becomes one calendar item: an event the person said "I'm going" to, an accepted booking (both people get one), a medicine reminder, an exercise slot. Home shows that one timeline. The other tabs feed it. This removes the duplicate systems.

## Home (`features/home`, backend `GET /v1/home/summary`)
- Greeting, then **Next up** (highlighted amber): the next pending thing, how long until it, and **how much free time there is before it**; Done and Skip.
- **Your day**: booked items and the free windows between them (only inside 07:00 to 21:00, gaps of 30 minutes or more).
- **Check-in** card, **your week** (active minutes, steps), places used in communities (n of 3), bookings waiting for an answer, an amber banner when a family member asked for help.
- **Reminder pop-ups** (`ReminderPopups`, mounted in the root layout): two hours before, one hour before, fifteen minutes before and when it starts; each shown once per browser tab. The pure logic is `features/home/day.ts`, tested by `day.check.ts`. This is the in-app reminder; the phone call is the calendar's own server loop.

## Community (module `connect`, `app/modules/communities/rules.py`)
- **Three communities at most** (`MAX_COMMUNITIES = 3`). Joining by code or from Explore returns `community_limit` (409) for a fourth. Exploring is free. Leaving frees a place at once. The only leader of a community with people in it cannot leave (`last_lead`).
- **Explore** (`/v1/communities/explore`): search, member counts, which of my family are here, Join for open ones.
- **Family here, opt-in**: a member can let their family see they are in a community (`memberships.share_with_family`, off by default, withdrawn on leaving). Friends are not built: a trusted-friends list does not exist yet.
- **New communities are requests**: `POST /v1/communities` is for platform admins only (`users.is_platform_admin`). Everyone else sends a request (`/v1/communities/requests`). Experience needed to ask (constants in `rules.py`, owner to confirm): in a community 14 days **and** 3 events, or already a leader. The Bricks team approves or declines (`/requests/review`, `/requests/{id}/decide`), then the requester creates it (`/requests/{id}/create`) and becomes its Community Lead. To make someone a platform admin: `update users set is_platform_admin = true where email = '...'`.
- Tests and local demos can open creation with `COMMUNITY_CREATION=open` (the test suite sets it; its own request-flow test turns it off).

## Marketplace (module `market`, `app/modules/market`)
- A senior lists a **service**: kind, how complex (basic, skilled, expert), years of experience, **proof of work** in their words, price per hour or free, area. People aged 40 and over may list (`OFFER_BANDS`); anyone can book.
- **Draft pay guide** by complexity only (`GUIDE` in `service.py`: S$10-18, 18-35, 35-80 per hour). It is a placeholder, not market data, and has no gender or age dimension (equal pay: Singapore's Workplace Fairness Act is expected at the end of 2027). Country scaling is later.
- **Bookings**: request, the provider accepts or declines, an accepted booking appears in both calendars, either can cancel, the provider marks it done after it happened. A community's **leader** can book for the community (`community_id`).
- **Thank-you (endorsements)**: only someone who really had the service (a done booking) can endorse, once.
- **Market-day stalls** (`/v1/market/stalls/{activity_id}`): an event with category `Market`; the main seller must be a senior (`age_band = 60plus`) and can name a helper or volunteer.
- **Money rule**: the platform never holds or moves money; the screens say so. Verified proof (a document checked by an admin) is a flag (`verified`) with no screen yet.

## Health (module `health`, `app/modules/health`)
- **Wellness only.** Nothing diagnoses, scores or interprets a reading. HSA treats software meant only to encourage a healthy lifestyle as not a medical device; any medical function would change that (check the current HSA guidance before adding one).
- Daily **check-in** ("did you move today?", feeling 1 to 5), a streak that never scolds, week bars, **walks** recorded with the engine ported from the teammates' app (`features/health/walk/engine.ts`: distance, active time, automatic pause, steps) from device location or a **practice walk** without location, history with this week against last, the private **health card**, **Help** (call 995 or 112 yourself; "tell my family" records an alert the family sees on Home and on Help; the app never places an emergency call).
- The **live exercise coach** is a "coming soon" card (the owner's teammate Sayan Ghosh is building it); it will run on the phone only. The older readings page is still there ("My readings").

## Shared design
Colour and size tokens are in `app/src/theme/tokens.ts` (added `tints` and `size`); the new screens share `components/blocks.tsx`. Not done: the teammates' lint rule that forbids typed-in sizes and colours (the new screens still type some font sizes).

## Words
Every new word is in all six languages (`i18n/words.ts` writes six translations per line, so a missing language cannot compile). All are first drafts by an AI assistant and need native-speaker review for hi, bn, ta, zh, ms.

## Not built yet
Guest RSVP to a public event without joining, trusted-friends view, verified proof screens, platform-admin tooling beyond the request review, push notifications for the pop-ups, a real exercise coach, WhatsApp, the teammates' Pass It On / Thank-You Wall / Life Stories, and merging the teammates' app (`origin/sayan`, a separate lineage; reference copy in `../bricks-team-ref`).

## Demo data (local or any database)
`python backend/run.py seed-demo <email>`: four open demo communities (a real account is put in the first three), seven demo services with proof, and a "Sunday Market Day" event.
