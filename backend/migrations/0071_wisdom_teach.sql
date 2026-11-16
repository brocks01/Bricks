-- Wisdom, Teach (revamp v2, A2): an elder's teaching profile, invitations from one person or a whole group, sessions with a time and a place,
-- and the learner's review after a session.
--   wisdom_teaching_profiles   what an elder teaches (expertise), a short bio, and when they are free (days, a start and an end time)
--   wisdom_connections         + group_name and learner_count (a group asks together; both null for one person), + topic (what they want to learn)
--   wisdom_meetings            a planned session of an accepted introduction: scheduled, then completed (which also logs a wisdom_sessions row,
--                              so the existing counts stay true) or cancelled. Completing grows one leaf for each of the two people.
--   wisdom_reviews             after a completed session, the learner's score from 1 to 5 and a short note; one per learner per session
create table if not exists wisdom_teaching_profiles (
  user_id    uuid primary key references users(id) on delete cascade,
  expertise  text check (expertise is null or char_length(expertise) <= 120),
  bio        text check (bio is null or char_length(bio) <= 1000),
  days       text check (days is null or char_length(days) <= 40),
  start_time time,
  end_time   time,
  updated_at timestamptz not null default now(),
  check (start_time is null or end_time is null or end_time > start_time)
);

alter table wisdom_connections add column if not exists group_name text check (group_name is null or char_length(group_name) between 2 and 80);
alter table wisdom_connections add column if not exists learner_count int check (learner_count is null or learner_count between 2 and 500);
alter table wisdom_connections add column if not exists topic text check (topic is null or char_length(topic) <= 120);

create table if not exists wisdom_meetings (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references wisdom_connections(id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 120),
  starts_at     timestamptz not null,
  minutes       int not null default 60 check (minutes between 10 and 600),
  place         text check (place is null or char_length(place) <= 200),   -- null means online
  status        text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  completed_at  timestamptz,
  session_id    uuid references wisdom_sessions(id) on delete set null,   -- the logged session it became
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists wisdom_meetings_connection on wisdom_meetings (connection_id, starts_at);
create index if not exists wisdom_meetings_upcoming on wisdom_meetings (status, starts_at);

create table if not exists wisdom_reviews (
  id         uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references wisdom_meetings(id) on delete cascade,
  learner_id uuid not null references users(id) on delete cascade,
  score      int not null check (score between 1 and 5),
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (meeting_id, learner_id)
);
