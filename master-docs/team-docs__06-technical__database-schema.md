# Database schema (draft 1, 11 Nov 2026)

One database: **PostgreSQL with PostGIS**. One schema. IDs are UUIDs. Every table has `created_at`; most have `updated_at`. Authorization is done in the backend, not in the database. Money tables only **record**; the platform never holds money.

Status: **P0** tables are built first; **P1** later.

## Identity (P0)
| Table | Key columns |
|---|---|
| `users` | id, email (unique), phone, display_name, language, age_band, avatar_url, home_area (coarse point, optional), status |
| `login_codes` | id, email, code_hash, expires_at, used_at, attempts |
| `refresh_tokens` | id, user_id, token_hash, expires_at, revoked_at |
| `consents` | id, user_id, scope, audience (me / community), given_how, created_at |
| `push_tokens` | id, user_id, token, platform |

## Communities and roles (P0 unless marked)
| Table | Key columns |
|---|---|
| `communities` | id, name, slug (unique), kind (apartment / block / centre / club), description, area_name, **location geography(Point,4326)**, privacy (open / invite), invite_code, ring (community / zone / city), parent_id, whatsapp_link, status |
| `memberships` | id, community_id, user_id, status (active / left / removed), joined_at, left_at — unique (community, user) |
| `role_definitions` | id, community_id (null = platform default), key, name, description, permissions text[], weight, seats, term_months (12), max_terms (2) |
| `role_terms` | id, community_id, role_definition_id, user_id, term_number, starts_on, ends_on, status (nominated / endorsed / approved / active / ended / rejected), handover_notes, approved_by |
| `nominations` (P1) | id, community_id, role_definition_id, nominee_id, nominated_by, reason |
| `endorsements` (P1) | nomination_id, user_id — unique |
| `announcements` | id, community_id, author_id, title, body, pinned |

## Seasons, goals and activities (P0)
| Table | Key columns |
|---|---|
| `seasons` | id, community_id, name, starts_on, ends_on, status |
| `objectives` | id, community_id, season_id, title, kind (make / teach / move / care / other), unit, target, status |
| `events` | id, community_id, season_id, objective_id, host_id, title, kind, description, starts_at, ends_at, place_name, **location geography**, capacity, recurrence_rule, status, sponsorship_id (null) |
| `event_rsvps` | event_id, user_id, status (going / cancelled), checked_in_at — unique (event, user) |
| `contributions` | id, community_id, user_id, event_id, objective_id, what, units, points, confirmed_by, visibility |
| `goals` | id, user_id, community_id (null = personal), text, kind, target, unit, progress, due_on, visibility |
| `health_entries` | id, user_id, kind (walk / jog / steps / mood / water / sleep / other), value, unit, recorded_at, source (manual / device), visibility (default private) |
| `season_scores` | season_id, community_id, points, participants, updated_at (rebuilt from contributions and check-ins) |

## Money (P1, records only)
| Table | Key columns |
|---|---|
| `sponsors` | id, name, contact_email, category, status, approved_by |
| `sponsorships` | id, sponsor_id, community_id, event_id, amount, currency, terms, status (offered / accepted / declined / paid), community_approved_at |
| `fund_ledger` | id, community_id, entry_type (sponsor_income / prize / expense / payout / adjustment), amount, currency, ref_type, ref_id, note, created_by — **append-only** |
| `share_formulas` | id, community_id, season_id, role_weight_pct, contribution_weight_pct, bonus_pct, cap_pct_per_person, status |
| `share_votes` | formula_id, user_id, vote — unique |
| `payouts` | id, community_id, season_id, user_id, amount, basis (json), status |
| `services` | id, community_id, title, kind (childcare / tuition / training / class / other), description, schedule_text, legal_note, licence_ref, status |

## System (P0)
| Table | Key columns |
|---|---|
| `notifications` | id, user_id, kind, title, body, payload (json), channel, read_at, sent_at |
| `audit_log` | id, actor_id, action, entity, entity_id, details (json), at |
| `reports` (P1) | id, reporter_id, entity, entity_id, reason, status |

## Indexes and PostGIS
- GiST index on `communities.location` and `events.location` for "near me" searches (`ST_DWithin`).
- B-tree on `(community_id, starts_at)` for events, `(user_id, recorded_at)` for health entries, `(community_id, created_at)` for contributions.
- Unique constraints as listed above. Partial index on active `role_terms`.
- Privacy: queries always filter by membership; `visibility` is checked before returning a row to someone else.

## Capacity note (2 to 3 thousand people at once)
- A light FastAPI service with connection pooling and indexed, paginated queries should handle this on a small server. This is an estimate, not a measurement; we will load-test it.
- Read-heavy pages (community home) are cached for a few seconds.
- Free database tiers have limits (storage, connections, pausing). Check the provider's current limits before choosing.

## Migrations
One tool (Alembic). Every change is a migration file; no manual edits to the database.
