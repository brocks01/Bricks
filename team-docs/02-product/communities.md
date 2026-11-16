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

## Status (16 Nov 2026)
**Built:** communities (join, start, leave, invite codes, up to three), events and activities, check-ins, **repeating events**, **standing**, **nudges**, suggestions, initiatives, updates, the leader's tools, family sharing; agent skills `my_communities`, `gathering_going`, `im_here`, `whats_on`, `event_details`, `find_communities`, `join_community`, `leave_community`, `my_standing`, `suggest_for_me`.
**Built (backend, 16 Nov):** a circle's **feeling** (origin, faith, place, life, interest), its **audience (open, men only, women only)** enforced on joining from the person's own optional answer (`gender_needed` asks them; never inferred), **hosts**, and **import of an existing community from a host** (`POST /v1/communities/import`, platform admins, idempotent), with `source` and `circle` shown in explore and in the agent.
**Not yet in the app:** choosing the feeling or audience when starting a circle, the audience badge and the "gender needed" prompt when joining, hosts in the list. **Next:** our days (festival calendar), presence ("away"), taking part from afar, the circle's stories.
