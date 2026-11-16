-- Measures the pitch promises:
--   wellbeing_checks  a three-question loneliness check at the start and again at 3 and 6 months (UCLA 3-item scale: each answer 1 to 3, total 3 to 9, higher is lonelier)
--   wisdom_sessions   a mentor and a learner talked: "3 calls, 2 people helped this month"
create table wellbeing_checks (
  id       bigserial primary key,
  user_id  uuid not null references users(id) on delete cascade,
  kind     text not null check (kind in ('baseline', '3m', '6m')),
  score    int not null check (score between 3 and 9),
  answers  jsonb not null,
  taken_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table wisdom_sessions (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references wisdom_connections(id) on delete cascade,
  logged_by     uuid not null references users(id) on delete cascade,
  minutes       int not null check (minutes between 1 and 600),
  occurred_at   timestamptz not null default now()
);
create index wisdom_sessions_connection on wisdom_sessions (connection_id, occurred_at desc);
