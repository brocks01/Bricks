-- Explore (Grow): a small, reviewed library of things to discover. Not courses: guides, videos, stories, activities, step-by-step experiences.
-- Spec: team-docs/02-product/grow-and-explore.md. Content is data (seeded or later contributed), never hard-coded in the app.

create table explore_categories (
  id         text primary key check (id ~ '^[a-z_]{3,30}$'),   -- digital_skills, health_awareness, everyday_life, hobbies, culture, knowledge
  icon       text not null default 'compass-outline',           -- an Ionicons name
  sort       int  not null default 0
);

create table explore_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  text not null references explore_categories(id),
  format       text not null check (format in ('guide', 'video', 'interactive', 'story', 'audio', 'activity')),
  level        text not null default 'easy' check (level in ('easy', 'medium')),
  title        text not null check (char_length(title) between 2 and 120),
  summary      text not null,
  steps        jsonb not null default '[]',        -- what you will learn / the steps, a list of short strings
  body         text,                               -- the guide or story text
  media_url    text,                               -- a video or audio link, when the format has one
  image_url    text,
  minutes      int  not null default 5 check (minutes between 1 and 240),
  language     text not null default 'en',
  source       text not null,                      -- who made it or where it comes from (credit)
  reviewed_by  text,                               -- who checked it; null means not yet reviewed (not shown)
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index explore_items_category on explore_items (category_id);

create table explore_saved (
  user_id    uuid not null references users(id) on delete cascade,
  item_id    uuid not null references explore_items(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- One row per person and item once they start it. percent 0-100; completed_at set at 100.
create table explore_progress (
  user_id      uuid not null references users(id) on delete cascade,
  item_id      uuid not null references explore_items(id) on delete cascade,
  percent      int  not null default 0 check (percent between 0 and 100),
  started_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, item_id)
);

-- The categories a person chose on My Interests.
create table explore_interests (
  user_id      uuid not null references users(id) on delete cascade,
  category_id  text not null references explore_categories(id),
  primary key (user_id, category_id)
);

insert into explore_categories (id, icon, sort) values
  ('digital_skills', 'phone-portrait-outline', 1),
  ('health_awareness', 'heart-outline', 2),
  ('everyday_life', 'compass-outline', 3),
  ('hobbies', 'color-palette-outline', 4),
  ('culture', 'business-outline', 5),
  ('knowledge', 'bulb-outline', 6);
