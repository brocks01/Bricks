-- Weekly steps before a market day ("four weeks of herbs, one market day"): the circle that plans a visit to an event
-- sets small steps toward its stall, its members see them and tick them off together, and one gentle nudge goes
-- through the outbox when a step comes due (once per person per step, at most two a day, never at night).
create table market_event_milestones (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references market_events(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 200),
  due_on       date,
  done         boolean not null default false,
  done_by      uuid references users(id) on delete set null,
  done_at      timestamptz,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (event_id, community_id, title)
);
create index market_event_milestones_event on market_event_milestones (event_id);
