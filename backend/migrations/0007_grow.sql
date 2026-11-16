-- Grow: a person's own wellbeing, activity and aspirations (private to them). Spec: team-docs/02-product/grow-and-explore.md.
-- No scores and no medical claims: Wisdom records what the person enters and shows it back, nothing more.

create table aspirations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 120),
  category    text not null default 'own' check (category in ('travel', 'hobby', 'health', 'family', 'own')),
  note        text,
  done_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index aspirations_user on aspirations (user_id, created_at desc);

-- One row per measurement the person types in (or a device adds later). bp uses value (top) and value2 (bottom).
create table health_readings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null check (kind in ('heart_rate', 'sleep_hours', 'weight_kg', 'blood_pressure')),
  value       numeric(7, 2) not null check (value > 0),
  value2      numeric(7, 2) check (value2 > 0),
  recorded_at timestamptz not null default now()
);
create index health_readings_user on health_readings (user_id, kind, recorded_at desc);

create table activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null default 'walk' check (kind in ('walk', 'jog', 'yoga', 'exercise', 'other')),
  minutes     int not null check (minutes between 1 and 600),
  logged_on   date not null default current_date,
  created_at  timestamptz not null default now()
);
create index activity_logs_user on activity_logs (user_id, logged_on desc);
