-- Calendar: items a person (or a family helper with the right access) schedules, and the done/skipped marks.
-- Occurrences are calculated from the item on the fly, never stored; only the marks live here.
create table calendar_items (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references users(id) on delete cascade,   -- whose calendar
  created_by     uuid references users(id) on delete set null,
  updated_by     uuid references users(id) on delete set null,
  kind           text not null check (kind in ('medicine','appointment','exercise','event','call','other')),
  title          text not null check (char_length(title) between 1 and 120),
  note           text check (note is null or char_length(note) <= 500),
  first_date     date not null,                    -- the first day, in the person's own local time
  local_time     time not null,                    -- the wall-clock time, in the person's own local time
  tz_offset_min  int  not null default 480,        -- minutes EAST of UTC at creation (Singapore 480, India 330). Fixed offset: SG and IN have no daylight saving.
  duration_min   int  check (duration_min is null or duration_min between 1 and 1440),
  repeat         text not null default 'none' check (repeat in ('none','daily','weekdays','weekly')),
  repeat_days    smallint[],                       -- for 'weekly': 0=Mon .. 6=Sun; null = the weekday of first_date
  until_date     date,                             -- last day (inclusive), null = forever
  remind_before_min int not null default 0 check (remind_before_min between 0 and 1440),
  channel        text not null default 'app' check (channel in ('app','call','both')),   -- 'call' and 'both' only take effect in phase 3 and only with consent
  notify_family  boolean not null default true,    -- tell the helpers if it is missed (phase 2)
  status         text not null default 'active' check (status in ('active','cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index calendar_items_person_idx on calendar_items (person_id, status, first_date);

create table calendar_marks (
  item_id     uuid not null references calendar_items(id) on delete cascade,
  occurs_at   timestamptz not null,               -- the occurrence this mark is for (UTC, as expanded)
  status      text not null check (status in ('done','skipped')),
  marked_by   uuid references users(id) on delete set null,
  marked_at   timestamptz not null default now(),
  primary key (item_id, occurs_at)
);
