-- Migration v1: the tables in docs/03_ARCHITECTURE.md §3 that the app uses today.
-- Runs inside the schema named by DB_SCHEMA (search_path is set by the runner),
-- which Supabase's Data API does not expose: only this backend can read it.

create table users (
  id               text primary key,
  auth_id          uuid unique,                 -- Supabase Auth user (null for seed/invited members)
  name             text not null,
  preferred_name   text,
  phone            text unique,
  language         text not null default 'en' check (language in ('en','ms','zh','ta')),
  languages        text[] not null default '{en}',
  channel_pref     text not null default 'app' check (channel_pref in ('app','whatsapp','call')),
  birth_year       int,
  area_name        text,
  home_lat         double precision,
  home_lng         double precision,
  singpass_verified boolean not null default false,
  simple_mode      boolean not null default false,
  onboarded_by     text not null default 'self' check (onboarded_by in ('self','family','admin')),
  status           text not null default 'active' check (status in ('invited','active')),
  interests        text[] not null default '{}',
  photo_url        text,
  push_token       text,
  intro_audio_url  text,
  intro_duration_s double precision,
  intro_transcript text,
  created_at       timestamptz not null default now()
);

create table circles (
  id            text primary key,
  name          text not null,
  type          text not null check (type in ('neighbourhood','interest','org')),
  description   text not null default '',
  captain_id    text not null references users(id),
  whatsapp_link text,
  area_name     text,
  lat           double precision,
  lng           double precision,
  language      text not null default 'en',
  photo_url     text,
  -- Members who aren't individual accounts yet (WhatsApp-only), so counts stay honest.
  extra_members int not null default 0
);

create table circle_members (
  circle_id text not null references circles(id) on delete cascade,
  user_id   text not null references users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table events (
  id            text primary key,
  circle_id     text references circles(id) on delete set null,
  host_id       text not null references users(id),
  title         text not null,
  category      text not null,
  description   text not null default '',
  start_at      timestamptz not null,
  end_at        timestamptz,
  place_name    text not null,
  lat           double precision not null,
  lng           double precision not null,
  language      text not null default 'en',
  whatsapp_link text,
  photo_url     text,
  extra_going   int not null default 0,
  status        text not null default 'active' check (status in ('active','cancelled'))
);
create index events_start_idx on events (start_at);

create table rsvps (
  event_id   text not null references events(id) on delete cascade,
  user_id    text not null references users(id) on delete cascade,
  status     text not null default 'going' check (status in ('going','cancelled')),
  attended   boolean,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table checkins (
  user_id      text not null references users(id) on delete cascade,
  date         date not null,
  question_key text not null default 'moved_yesterday',
  answer       text not null check (answer in ('yes','no')),
  channel      text not null default 'app',
  answered_at  timestamptz not null default now(),
  primary key (user_id, date)
);

create table reminders (
  id              text primary key,
  user_id         text not null references users(id) on delete cascade,
  kind            text not null check (kind in ('medicine','doctor','event','other')),
  text            text not null,
  time            text not null,                -- local "HH:MM" (Asia/Singapore)
  repeat          text not null check (repeat in ('once','daily','weekdays')),
  date            date,
  created_by      text not null default 'self' check (created_by in ('self','family','call','whatsapp')),
  created_by_user text references users(id) on delete set null,
  done_on         date,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);
create index reminders_user_idx on reminders (user_id);

create table safe_circle (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  helper_id  text references users(id) on delete set null,  -- when the helper is a member
  name       text not null,
  phone      text,
  is_family  boolean not null default false,
  order_no   int not null
);
create index safe_circle_user_idx on safe_circle (user_id, order_no);

create table sos_events (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  trigger     text not null,
  lat         double precision,
  lng         double precision,
  status      text not null default 'open' check (status in ('open','helper_coming','resolved','cancelled')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

-- Who was told about an SOS: a snapshot of the Safe Circle at that moment.
create table sos_responses (
  sos_id     text not null references sos_events(id) on delete cascade,
  helper_key text not null,                    -- safe_circle.id
  name       text not null,
  is_family  boolean not null,
  distance_m int,
  order_no   int not null,
  status     text not null default 'notified' check (status in ('notified','on_way','arrived')),
  at         timestamptz not null default now(),
  primary key (sos_id, helper_key)
);

create table walks (
  id                    text primary key,
  user_id               text not null references users(id) on delete cascade,
  event_id              text references events(id) on delete set null,
  time_of_day           text not null,
  start_place_name      text not null,
  started_at            timestamptz not null,
  ended_at              timestamptz not null,
  distance_m            int not null,
  duration_s            int not null,
  moving_s              int not null,
  steps                 int not null,
  avg_pace_s_per_km     int not null,
  splits                jsonb not null,
  route_polyline        text not null,
  route_public_polyline text not null,
  walked_with           text[] not null default '{}',
  praise                jsonb not null,
  visibility            text not null default 'circle' check (visibility in ('private','circle')),
  created_at            timestamptz not null default now()
);
create index walks_user_idx on walks (user_id, started_at);

create table skill_offers (
  id         text primary key,
  user_id    text not null references users(id) on delete cascade,
  title      text not null,
  tags       text[] not null default '{}',
  start_at   timestamptz,
  place_name text,
  is_paid    boolean not null default false,
  event_id   text references events(id) on delete set null,
  created_at timestamptz not null default now()
);

create table endorsements (
  id             text primary key,
  from_user      text not null references users(id) on delete cascade,
  to_user        text not null references users(id) on delete cascade,
  event_id       text references events(id) on delete set null,
  skill_offer_id text references skill_offers(id) on delete set null,
  kind           text not null check (kind in ('thumb','voice')),
  audio_url      text,
  duration_s     double precision,
  transcript     text,
  language       text,
  created_at     timestamptz not null default now()
);
create index endorsements_to_idx on endorsements (to_user, created_at desc);
-- One thank-you per person per event.
create unique index endorsements_once_idx on endorsements (from_user, event_id) where event_id is not null;

-- "Not now" on a thank-you prompt.
create table thanks_skips (
  user_id  text not null references users(id) on delete cascade,
  event_id text not null references events(id) on delete cascade,
  primary key (user_id, event_id)
);

create table user_badges (
  user_id   text not null references users(id) on delete cascade,
  key       text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, key)
);

create table family_invites (
  id                    text primary key,
  family_id             text not null references users(id) on delete cascade,
  senior_name           text not null,
  senior_phone          text not null,
  relation              text not null,
  language              text not null,
  interests             text[] not null default '{}',
  add_me_to_safe_circle boolean not null,
  status                text not null default 'invited' check (status in ('invited','accepted')),
  senior_id             text references users(id) on delete set null,
  created_at            timestamptz not null default now()
);

create table family_links (
  senior_id         text not null references users(id) on delete cascade,
  family_id         text not null references users(id) on delete cascade,
  relation          text not null,
  can_view_report   boolean not null default true,
  can_set_reminders boolean not null default true,
  status            text not null default 'accepted' check (status in ('invited','accepted')),
  primary key (senior_id, family_id)
);
