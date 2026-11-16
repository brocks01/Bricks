-- The Marketplace in the revamp: what an event is about (the same eight interest keys a person picks), and whether a person who said they
-- were going really went. "I went" / "I didn't go" is the person's own answer after the day; it is counted for the hosts, never shown with names.
alter table market_events add column if not exists interests text[] not null default '{}'
  check (interests <@ array['walking','taichi','cooking','chess','music','gardening','teaching','tech']::text[]);

create table if not exists market_event_attendance (
  event_id  uuid not null references market_events(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  attended  boolean not null,
  marked_at timestamptz not null default now(),
  source    text not null default 'app' check (source in ('app', 'agent')),
  primary key (event_id, user_id)
);
create index if not exists market_event_attendance_person on market_event_attendance (user_id, marked_at desc);
