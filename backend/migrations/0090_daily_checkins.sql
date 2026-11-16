-- The daily check-in (the "noticed" rule): once a day, at the hour the person chose in their own
-- time, Wisdom speaks first with one gentle question that remembers what they said yesterday.
-- A reply on any channel resets the count; each day without a reply adds one; after three days
-- and ONLY if the person agreed, their family is told, gently, once per quiet spell.
-- local_time is in the person's local time; last_sent is the local date the check-in went out.
create table if not exists daily_checkins (
  user_id        uuid primary key references users(id) on delete cascade,
  enabled        boolean not null default true,
  local_time     time not null default '09:00',
  last_sent      date,
  last_reply     timestamptz,
  silent_days    int not null default 0,
  family_notify  boolean not null default false,
  family_told_on date,
  updated_at     timestamptz not null default now()
);
