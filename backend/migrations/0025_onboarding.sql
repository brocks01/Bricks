-- Onboarding: one row per person. The steps, the questions and the rules live in the backend (app/modules/onboarding), so the app, a phone call and a chat all fill in the same thing.
-- answers: {section: {field: value}}; consents: {which: date}. The name, language, age band, area, phone and vision stay on users (everything else already reads them there).
create table profiles (
  user_id      uuid primary key references users(id) on delete cascade,
  roles        text[] not null default '{}',
  answers      jsonb not null default '{}',
  consents     jsonb not null default '{}',
  completed_at timestamptz,
  updated_at   timestamptz not null default now()
);
