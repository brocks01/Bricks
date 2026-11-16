# Safety and security

Root: `../01-philosophy/philosophy.md` (principles 9 and 10: safe by design, honest about what we are). This page says what "safe" means in Wisdom, what is enforced where, and what is still missing before a large pilot.

## What safe means here
- **The other side always decides.** Introductions, families, delegations and check-in consents are the person's own yes, re-checked on the server on every request, never trusted from a body field.
- **A phone number alone unlocks nothing risky.** A chat or call can read a person's own day and change their own things; anything that tells other people needs a confirmed yes (the `confirm` risk on skills).
- **Consent with a date.** Privacy and terms are required; memory, family sharing and insights are separate yeses, stored with the day they were given.
- **Nobody reads another person's data.** Every id the client sends is re-checked against the caller's own access (family membership, live delegation, community membership). A stranger is refused without learning whether the thing exists (403 or 404, never 200).
- **Reach out with consent, never at night, never nagging.** Quiet hours, dedupe keys and reply limits on every channel (`agent-and-channels.md`).
- **We never hold money, never sell data, never diagnose.** Insights are counts only, never names, and no group under five is shown.

## Status
**Task 1 (security tests) done, 16 Nov 2026.** `backend/tests/test_security_auth.py`, `test_security_access.py` and `test_security_webhooks.py` (59 tests) cover, for every module not owned by another area (identity, onboarding, channels, the skills router, insights, family, calendar, voice, media, translation):
- 401 without a token on every signed-in route; forged, expired, wrong-type (agent) and unknown-person tokens refused;
- admin-only endpoints (`/v1/insights/pilot`, `/v1/insights/interests`, the voice calling endpoints) refuse non-admins;
- cross-person access refused: family invisible to outsiders, calendar and its items private, notifications readable and markable only by their person, onboarding sections that do not apply refused;
- the acting-for-someone-else header (`X-Bricks-On-Behalf`) needs a live delegation;
- webhook secrets and signatures enforced: the Telegram webhook answers only with `TELEGRAM_WEBHOOK_SECRET` in the path, the Twilio chat and voice webhooks only with a valid `X-Twilio-Signature`;
- input and body limits: bounded onboarding answers, a 50-item translation batch, 4000-character draft texts, a 5 MB image upload checked from its bytes, not its name;
- no secrets in responses: upload answers carry no Cloudinary keys, the voice overview carries no call tokens.

**Holes found and fixed (16 Nov 2026):**
1. `family/service.py`: a malformed family, delegation or person id reached a UUID column and answered a 500 database error (`GET /v1/families/not-a-uuid`, delegation change and revoke, a malformed `X-Bricks-On-Behalf` header, `POST /v1/delegations` with a bad helper id, claim-code requests). Now every malformed id answers a clean 404 (or 422 where the API already speaks of validation), never a crash.

**Choices made:**
- The Twilio chat and voice webhooks check the signature only when `VOICE_PROVIDER=twilio`; the mock provider (a local test stand-in) accepts unsigned requests so tests can fake the phone network. Production must set `VOICE_PROVIDER=twilio`; noted as a deployment rule below.
- The calendar answers 403 for another person's item rather than 404: it refuses without confirming the item exists. Tests accept both.

**Rules for a live pilot** (must all be true): `VOICE_PROVIDER=twilio`, `TELEGRAM_WEBHOOK_SECRET` set, `VOICE_ADMIN_KEY` set, `WISDOM_OPEN_SIGNUP` closed except through an invited contact, `JWT_SECRET` set and private, `.env` never committed.

**Not built yet (open tasks, in order):** reports, blocks and admin review (task 2); the same enforcement hooked into `wisdom.library`, `browse_offers`, `open_requests`, the introduction opener and member lists once the other areas report done (task 3).

## Where the rules live
- Every rule is a service function (`backend/app/modules/<area>/service.py`), never a router: the app, the chat and the phone call all go through the same check.
- The skills registry is the only doer: a chat command, a phone call and an HTTP POST run the same skill, with the same confirm gate, for the person it was run for.
- People messages go through the outbox (quiet hours, dedupe, retries); strangers are held back by the guard (`channels/guard.py`: blocklist, bursts, hourly limits).
