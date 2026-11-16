-- Safety: reports, blocks, hiding and admin review (team-docs/02-product/safety.md).
-- A person reports something unsafe, unkind, spam or a false experience; an admin reviews it and may
-- dismiss, hide the thing, or suspend the person behind it. Three different reporters hide a thing by
-- themselves and an admin is told.

create table reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references users(id) on delete cascade,
  target_kind  text not null check (target_kind in ('capsule', 'offer', 'request', 'message', 'community', 'event', 'person')),
  target_id    uuid not null,
  reason       text not null check (reason in ('unsafe', 'unkind', 'spam', 'false_experience', 'other')),
  note         text check (char_length(note) <= 500),
  status       text not null default 'open' check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  decided_by   uuid references users(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (reporter_id, target_kind, target_id)
);
create index reports_open on reports (status, created_at);
create index reports_target on reports (target_kind, target_id);

-- blocks: a pair who must not meet. The checks live in this module (`safety.blocked`); the introduction,
-- messaging and list queries call it when each area hooks safety in.
create table blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references users(id) on delete cascade,
  blocked_id  uuid not null references users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on blocks (blocked_id);

-- hiding: an admin (or three different reporters) takes a thing out of every list. Each area's list query
-- later adds `and hidden_at is null` - the smallest edit that respects the block.
alter table users drop constraint if exists users_status_check;
alter table users add constraint users_status_check check (status in ('active', 'deleted', 'suspended'));

alter table wisdom_capsules add column hidden_at timestamptz;
alter table wisdom_offers add column hidden_at timestamptz;
alter table wisdom_requests add column hidden_at timestamptz;
alter table communities add column hidden_at timestamptz;
alter table market_events add column hidden_at timestamptz;
