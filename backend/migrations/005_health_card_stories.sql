-- Migration v5 (iteration 3.2, feature 6): Health Card (S27), Life Stories (S35).

-- Medical ID (S27). Only the member and their accepted family read or change it
-- (the API checks family_links; organisation staff never see it). Emergency
-- contacts are the Safe Circle, so they aren't stored twice.
create table health_cards (
  user_id     text primary key references users(id) on delete cascade,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  conditions  text not null default '',
  medicines   text not null default '',
  updated_by  text references users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- Life stories (S35): voice recordings the member keeps, for their family.
create table stories (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  title       text not null,
  audio_url   text not null,
  duration_s  double precision not null,
  transcript  text,
  language    text not null default 'en',
  -- The question it answers (a suggestion, or one their family asked).
  prompt_text text,
  asked_by    text references users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index stories_user_idx on stories (user_id, created_at desc);

-- "Ask Grandpa": questions family send, waiting for a story.
create table story_questions (
  id         text primary key,
  senior_id  text not null references users(id) on delete cascade,
  asked_by   text not null references users(id) on delete cascade,
  text       text not null,
  story_id   text references stories(id) on delete set null,
  created_at timestamptz not null default now()
);
create index story_questions_senior_idx on story_questions (senior_id, created_at);
