# Wisdom (the centre tab): to be heard and valued

Root: `../01-philosophy/philosophy.md`. Map of the three products: `tabs-requirements.md`.

## The pain and what it gives
**The pain: I am not heard; I feel I am worth nothing.** A person who has spent 30 to 50 years in a field, a culture or a way of life holds what no search engine has: how it was really done. Wisdom gives them **a place where they are heard and valued**, and gives anyone who needs that experience a person who has lived it.

## Three domains of experience
Everything a person shares falls in one of three domains, always in their own words, in their own language, first person:
1. **Cultural**: food, festivals, language, crafts, rituals, songs, the way things were done in a place (the culture that is vanishing).
2. **Social**: family, friendship, how neighbours lived and organised, how to live a life: marriage, pregnancy and parenting, caring for parents, getting through hard years.
3. **Professional**: the profession or trade and the hard cases: a mechanic's thirty years at a car company, a career in technology, a kitchen, a classroom.

## Who gives, who learns, who supports
- **Gives:** anyone who has lived it, often someone retiring or retired.
- **Learns:** **anyone 15 or older** who wants that experience: an expecting couple, a graduate entering an industry, someone starting a business, someone caring for a parent.
- **Supports in return:** the next generation gives the elderly a hand: setting up a phone, a video call to grandchildren, company on a walk, an errand. Wisdom runs both ways.

## What a person does
- **Keep an experience** (a "capsule") in a domain: typed, or spoken to the agent, which writes it down as told. Private until shared; others see the first name only.
- **Offer guidance, free or paid**, per offer, with the domain, when they are free and a price note. Recommended: a **free first conversation**, then the person's own rate. Payment is direct between the two people; we never hold money.
- **Ask to learn** ("I'm expecting, who can talk to me?") and **ask for a hand** (an elder asks for support); the other side can offer.
- **Introductions:** the other side decides; nobody is forced into a conversation. The first contact goes through the agent so numbers are not shared early.
- **Sessions:** after an accepted introduction either side notes that they talked.

## Trust and limits
Trust comes from the person's proof (field, years, where), **endorsements and counted conversations**. **Experience is not professional advice:** the system never gives medical, legal or financial advice, and on sensitive topics (pregnancy, health, money, law) it tells the learner to see a qualified person. Learners under 40 confirm they are 15 or older. Stories are private until shared.

## Status (16 Nov 2026)
**Built:** capsules (private, then shared, filter), free guidance offers, requests to learn, introductions with accept or not now, sessions and monthly numbers, the 15+ check, Wisdom parts per person, agent skills (`capture_wisdom`, `share_wisdom`, `unshare_wisdom`, `my_wisdom`, `browse_wisdom`, `offer_to_teach`, `pause_offer`, `find_a_mentor`, `ask_for_guidance`, `ask_to_learn`, `who_wants_to_learn`, `offer_help_with`, `my_introductions`, `reply_to_introduction`, `log_wisdom_session`).
**Built (backend and app, 16 Nov):** the **three domains** (cultural, social, professional), offers that are **free, paid or either with a price note and a domain**, searchable by domain and mode, and **support requests** (an elder asks for a hand with `Ask for a hand`; the next generation answers after confirming they are 15 or older; the elder decides). Agent skills `ask_for_help`, `who_needs_help`.
**services moved (16 Nov 2026):** the paid services listing (hourly-rate listings, bookings, thank-yous, the pay guide) now lives here as the **Paid sessions** part of the Wisdom tab — `paid` in `wisdom_parts` (learners and both-role people browse and book; elders who share also see **My services**), pages `wisdom.service`, `wisdom.serviceOffer`, `wisdom.myServices`, words in `features/wisdom/words.ts` (`SERVICES`), the listings and bookings calls in `api/wisdom.ts`. The old routes `/market/offer`, `/market/mine` and `/market/listing/[id]` forward to the new pages. The Marketplace tab now shows only opportunities near the person (its search, filters and offer button are gone). The backend endpoints did not change (`/v1/market/listings…`) and services data is not merged with Wisdom offers; a calm "experience, not professional advice" note shows on Paid sessions, on the offer form and on a service. **Needs from Onboarding and profile:** `showsWisdom` in `features/onboarding/state.ts` should also return true when the person's `wisdom.parts` include `paid`, so someone who came only to connect can still reach paid sessions (today they have no Wisdom tab). **Also edited outside the area's file list:** the one link in `features/home/screens/HomeIndex.tsx` (nobody's area) that opened `market.mine` now opens `wisdom.myServices`.
**Next:** proof and endorsements on an offer; discovery by domain, industry, life stage, language and city; the first conversation through the agent; reporting a story; helper verification before any in-person meeting.
