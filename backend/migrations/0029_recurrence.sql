-- Repeating events: a jogging group every morning, a commute group every weekday, a weekly kopi, a monthly market day at the Active Ageing Centre.
-- One rule (a "series") makes the real events ahead of time (about six weeks for community events, four months for market days), so every event still has its own going list,
-- check-ins and stalls. The series keeps the template; a background job keeps the calendar filled as time passes.
create table recurrences (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('activity', 'market')),
  repeat        text not null check (repeat in ('daily', 'weekdays', 'weekly', 'monthly')),
  repeat_days   int[],            -- weekly: days of the week, 0 = Monday ... 6 = Sunday (the first event's day when empty)
  week_of_month int check (week_of_month is null or week_of_month in (1, 2, 3, 4, -1)),  -- monthly: "the 1st Sunday"; empty means the same date each month
  first_date    date not null,    -- in the organiser's local time
  local_time    time not null,
  tz_offset_min int not null default 480,
  duration_min  int check (duration_min is null or duration_min between 5 and 1440),
  until_date    date,
  template      jsonb not null,   -- title, description, location, ... what each event copies
  rolled_until  date,
  status        text not null default 'active' check (status in ('active', 'ended')),
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index recurrences_active on recurrences (kind) where status = 'active';

alter table activities add column series_id uuid references recurrences(id) on delete set null;
alter table activities add column occurrence_date date;
create unique index activities_one_per_day on activities (series_id, occurrence_date) where series_id is not null;

alter table market_events add column series_id uuid references recurrences(id) on delete set null;
alter table market_events add column occurrence_date date;
create unique index market_events_one_per_day on market_events (series_id, occurrence_date) where series_id is not null;
