# Task 7: Safety and moderation (backend and app)

Work straight on `main`. Area: a new module `backend/app/modules/safety/`, small hooks, a small app area. Migrations `0080-0089`. Strongest model, high effort. **Must exist before any large pilot.**

## Context
Strangers meeting, older people, young people (15+), stories, offers: safety is part of the product (`team-docs/02-product/impact-and-business.md`). Nothing exists yet for reporting, blocking or review.

## Build
1. **Reports:** `reports` (id, reporter_id, target_kind `capsule|offer|request|message|community|event|person`, target_id, reason `unsafe|unkind|spam|false_experience|other`, note up to 500, status `open|reviewed|actioned|dismissed`, handled_by, created_at). `POST /v1/reports` (any signed-in person), `GET /v1/reports/mine`. Platform admins: `GET /v1/admin/reports` (open first, with the target summarised), `POST /v1/admin/reports/{id}/resolve` with an action: `dismiss`, `hide` (hide the target everywhere), or `suspend` (the person cannot use Wisdom or Communities until reinstated).
2. **Auto-hide:** a target with reports from three different people is hidden pending review (and an admin is notified through the outbox).
3. **Blocks:** `blocks` (blocker_id, blocked_id). A blocked person cannot be introduced to, messaged by, or see the blocker's offers, requests or stories; introductions between blocked pairs are refused. Endpoints to block and unblock; skill `block_person` (confirm).
4. **Hooks:** enforce hidden items and blocks in the existing services with minimal edits: `wisdom.library`, `browse_offers`, `open_requests`, `_open` (introductions), and communities member lists. Keep each edit small and tested.
5. **Agent skill:** `report_something` (safe) so a person can say "I want to report this" on a call or chat.
6. **App:** a "Report" action on a story, an offer, a request and a community, with reasons in plain words and a calm confirmation ("Thank you. We will look at it."); "Block this person" on an introduction; a simple admin screen (profile row, admins only) listing open reports with the three actions. Words in six languages.

## Acceptance
Tests (`backend/tests/test_safety.py`): reports are stored once per person per target; three reporters auto-hide; hidden items disappear from lists for everyone but admins; blocks prevent introductions and hide content both ways; suspension blocks use; non-admins cannot see or resolve reports. Full backend suite passes; app `tsc`, self-test and lint clean.

## Out of scope
Helper identity verification and in-person meeting rules (a later, separate brief).
