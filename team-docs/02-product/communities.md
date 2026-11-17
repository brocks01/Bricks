# Communities (left tab): belonging

Root: `../01-philosophy/philosophy.md`. Map of the three products: `tabs-requirements.md`.

## The pain and what it gives
**The pain: I do not belong.** Communities gives **belonging, driven by emotion, not by interest or skill.** An elderly person does not want to meet someone with a certain background or hobby; they want to feel they are among their own, counted, expected. Retirement is exactly this loss: the colleagues, the office, the daily "good morning" were a community, and they vanish overnight. The owner, from Bihar, in a five-star hotel in Singapore while his family celebrates Chhath, misses his people, not an activity.

Communities is the **heart** of the system. Wisdom and the Marketplace feed it and are fed by it.

## What a circle is
A circle is a group of people who feel they belong together.
- **Its feeling (the "circle")**, chosen by whoever starts it:
  - *origin*: where we are from (a state, a city, a village, a language);
  - *faith or festival*: what we keep (Chhath, Diwali, Eid, Pongal, Chinese New Year, a temple, mosque or church);
  - *place*: where we live (a building, a street, a neighbourhood);
  - *life*: who we were or are (family, old friends, former colleagues, a trade);
  - *interest*: a hobby or activity (the lightest layer).
- **Its audience:** **open to all, men only, or women only.** Men-only and women-only circles let people be at ease, and help bring in men, who are the hardest to reach. Joining a gendered circle needs the person's own declaration of gender (optional in onboarding, never inferred, never shown outside the circle).
- **Its source:** started by people, or **imported from a host** such as an Active Ageing Centre (the centre's existing groups, with the centre as host). **We do not need to build every community; we welcome the ones that exist.**
- Privacy: open (anyone can join) or private (an invite code).

## What is inside a circle
1. **Our days.** The festivals and rituals the circle keeps, with a countdown. *(Planned.)*
2. **Our people**, including who is **away** right now, shown with warmth. *(Planned.)*
3. **Take part from where you are:** a voice blessing, a live join by call, a recipe, a contribution. *(Planned.)*
4. **Gather:** real gatherings, and **events that repeat** (every day, weekdays, every week, every month).
5. **Our stories:** the circle's memory, linked to Wisdom's cultural domain. *(Planned.)*
6. **A rhythm:** check-ins ("I'm here"), streaks, a standing (newcomer, regular, stalwart), and a gentle nudge before a gathering with who is going. Only showing up counts.

## How it reaches someone with no app
The agent says on a call or in WhatsApp: "Chhath starts Thursday. Your community in Patna is gathering at the ghat. Would you like to send a blessing? Your cousin asked about you."

## Rules
Only a member can read a circle. Gender and identity are the person's declared, opt-in choice. A leader can create events and stop a series. Showing family a person's attendance is the person's choice. A group chat can never read a person's day.

## Status (17 Nov 2026)
**Built (revamp v2, A1, 17 Nov):** **geo ready.** Maps and distance (`modules/geo`): `locate` (Google Geocoding, cached in `geo_places`, misses kept 7 days, never raises, nothing without `GOOGLE_MAPS_API_KEY`), `distance_km`, and map pictures of a STORED address only (`/v1/geo/map/community/{id}.png`, `/v1/geo/map/event/{id}.png`, cached 30 days under `backend/.cache/maps`); the app's `MapCard` (address, picture, Open in Google Maps). Communities gained `address`, `whatsapp_url` (members only), `interests` (the eight onboarding keys) and `events_url` (migrations `0042`, `0043`); a Community Lead or platform admin sets them (`PATCH /v1/communities/{id}/details`, "Group details" on the community page). One card shape (`/recommended`, `/cards/mine`, `/{id}/about`): members, faces (members only), leader, next gathering, distance, reasons. Ranking: +2 per shared interest, distance (2/5/15 km) or the same area name without a key, then size; open communities only; men-only and women-only left out when the declared gender does not match. First run (`connect.pick`): the 10 best, choose up to the room left of 3, then Home. The Communities tab: search, "Your communities n of 3", "Picked for you", cards with Join WhatsApp group / Add WhatsApp link / Join and See events. The community page: picture, who it is for, description, members, Community Lead, WhatsApp, More (share invite, report, leave with a bottom sheet), Where we meet, Upcoming/Past with date headings and I'm going / I'm here (+1 leaf shown after a check-in; the leaf itself is counted by `nodes`), and the older sections under "More about this group". A non-member sees the basics, what is coming up and Join. Ten demo communities (`seed-demo`) with addresses and interests; no WhatsApp links are seeded (leaders add real ones).
**Needs from Person B:** the shared floating Back button (A2 switches these pages to it), and `refreshWisdom()` so the header tree gains its leaf right after "I'm here".

**Built:** communities (join, start, leave, invite codes, up to three), events and activities, check-ins, **repeating events**, **standing**, **nudges**, suggestions, initiatives, updates, the leader's tools, family sharing; agent skills `my_communities`, `gathering_going`, `im_here`, `whats_on`, `event_details`, `find_communities`, `join_community`, `leave_community`, `my_standing`, `suggest_for_me`.
**Built (backend):** a circle's **feeling** (origin, faith, place, life, interest), its **audience (open, men only, women only)** enforced on joining from the person's own optional answer (`gender_needed` asks them; never inferred), **hosts**, and **import of an existing community from a host** (`POST /v1/communities/import`, platform admins, idempotent), with `source` and `circle` shown in explore, in the agent and on the circle's home.
**Built (app):** choosing the feeling and the audience when asking to start a circle (a six-step wizard, each with a short example), the audience badge, the feeling in words and "brought in from {host}" on the explore cards and the circle's home, and the "gender needed" prompt when joining a men-only or women-only circle (asked once, saved as the person's own answer, then tried again; the other cases are handled respectfully, never blaming).
**Built (backend, belonging layer):** `festivals` (platform admins enter the real dates; never invented) and `circle_days` (a circle keeps a festival or a day of its own, with a countdown); `circle_presence` (here or away, with where and since, shared only when the person chose to); `circle_contributions` (a blessing, message, recipe or story sent for one of the circle's days from wherever the person is, read by the circle, the circle told through `channels/core.notify` at most once per person per day, and a leader may hide one); `community_id` on `wisdom_capsules` and `POST /v1/wisdom/capsules/{id}/share-to-circle`; a daily countdown nudge three days and one day before a kept day, once per person, through the outbox. Skills `our_days`, `send_blessing`, `i_am_away`, `circle_stories`.
**Built (app, belonging layer):** inside the circle's home: Our days (countdown; leaders add and remove), Our people (who is away, shown with warmth and only when shared; mark yourself away with a place and choose to share), Take part from where you are (send a blessing or a message for a day; read what the circle sent), Our stories (the stories members shared into the circle; share one of your own Wisdom stories into it).
**Not yet:** taking part from afar by voice (audio_url is reserved and nullable), the festivals' region tags surfaced in the app (the calendar is read through the API), and the agent's wording for the new skills.
**Needs from other areas:** none.
