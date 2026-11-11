# 09. Decisions and open questions (11 Nov 2026)

## Decided (by Ankit)
- Working name **Bricks** (English; domain, app-store and business-name availability **not checked**).
- The product is the **club system for a neighbourhood**; Bricks is the "faculty coordinator" (tools, verification and final approval of leads, sponsors).
- Communities decide their own activities and services; **legal duties for regulated services (for example childcare) belong to the community**.
- Roles have terms of one year, at most two, re-evaluated yearly; leaders are nominated and endorsed by members and approved by Bricks.
- The **community** earns (sponsors); shares by role plus contribution plus bonus under a formula the community votes on; participants do not pay entry fees in most events; **Bricks never holds money**.
- Competitions can be any activity; scoring by community participation; broadcast and tickets later.
- The missing-member check is done by people themselves; Bricks provides motivation (recognition, ranks), not monitoring.
- Features live only in the **Expo app**; the website is documentation only. The Expo app also runs in a browser inside a phone-sized middle column.
- Stack: Python FastAPI (modular monolith), **PostgreSQL 16 with PostGIS 3.6 (local)**, one database, one email service; goal of 2 to 3 thousand people at once on mostly free services (an estimate, not measured).
- Repo folders: `platform-docs` (public), `team-docs` (internal), `backend`, `frontend`, `app`, `shared`, plus this `master-docs` snapshot.
- Do not reuse Jambagrad code or databases; secrets live only in `.env` files that the owner fills in.

## Open
1. **How Bricks earns:** a fee for bringing sponsors, a share of tickets, or a subscription?
2. **Legal form** of a community that earns money (society, cooperative, company) and tax treatment.
3. **Reserved seats for seniors** in leadership roles?
4. **Sponsors:** who we approach first (local shops, companies, grants) and what they get; blocked categories.
5. **First pilot:** an apartment community in India (Delhi) or a Singapore group; first event type.
6. **Share formula** limits and the appeal process.
7. **Product name** availability and the domain for docs (docs.bricks.com is the intended address).
8. **Email provider** (one, free tier) and **hosting** (free tiers; PostGIS required).
9. Disclosure that voice agents are AI (recommended yes).
10. Which existing solutions to scan for the raiSE requirement.

## Known risks
Sponsor revenue and live audiences are unproven; evidence on intergenerational programmes is mixed; childcare and public events carry licensing and safety duties; money sharing carries bias and legal risk; voice-only control is weak for finance tasks; capacity numbers are estimates.
