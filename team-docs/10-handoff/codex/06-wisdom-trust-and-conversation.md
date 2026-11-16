# Task 6: Wisdom trust and the first conversation (backend and app)

Work straight on `main`. Area: `backend/app/modules/wisdom`, `backend/app/modules/skills/wisdom.py`, `app/src/features/wisdom`. Migrations `0070-0079`. Wait for **task 4** (it moves screens in the same feature). Strongest model, high effort.

## Context
Wisdom is experience given to anyone who needs it, free or paid (`team-docs/02-product/wisdom.md`). Two gaps stop it feeling real: **trust** (why believe "40 years at a car company"?) and **an accepted introduction leads nowhere** (two people cannot yet talk). Both are specified below.

## Build
1. **Proof on an offer:** add to `wisdom_offers`: `proof_field` (the field or employer), `proof_years` (int), `proof_where` (text), `topics text[]` (life stage and subject tags such as pregnancy, first job, starting a business), `languages text[]`. Offers show a one-line proof. Discovery (`browse_offers`, the skill `find_a_mentor`, the app) filters by domain, mode, topic, language, and the learner's city where known.
2. **Endorsements:** `wisdom_endorsements` (offer_id, learner_id, note, created_at, unique per learner and offer). A learner can endorse **only after a logged session** with that mentor. Show counts and sessions on the offer. No star ratings.
3. **Limits on advice:** a `sensitive` flag derived from topics (pregnancy, health, money, law). On sensitive offers and in the agent's replies, always show "This is experience, not professional advice. For health, money or law, please also see a qualified person." (six languages in the app).
4. **A first conversation:** after an introduction is **accepted**, either person can send short text messages through Wisdom: `wisdom_messages` (connection_id, sender_id, body up to 500, created_at). Delivery goes to the other person through the outbox (`channels/core.notify`, kind `wisdom`, their preferred channel, quiet hours), and appears in an in-app thread. The agent can read and send them with skills `my_conversations` (read) and `send_wisdom_message` (safe, the agent confirms wording first). **Phone numbers and emails are never shared.** Either side can close a conversation.
5. **App:** show proof, endorsements and sessions on offers; add filters; add the conversation thread opened from an accepted introduction; the "endorse" action after a session; the advice note. Words in six languages.

## Acceptance
Tests (`backend/tests/test_wisdom_trust.py`): endorsements only after a session and only once; filters work; messages only inside an accepted connection and only between its two people; delivery goes through the outbox and respects quiet hours; no contact details leak; closing stops messages. Full backend suite passes; app `tsc`, self-test and lint clean; update the Wisdom skills list in `02-product/wisdom.md`.

## Out of scope
Phone-call bridging, payments, ratings, moderation (task 7).
