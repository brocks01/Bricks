-- The belonging layer of Communities (team-docs/02-product/communities.md): the days a circle keeps, who is here or away,
-- what people send for a day from wherever they are, and the circle's stories.
-- Nothing here infers who a person is: region and faith stay the person's own opt-in answer, and presence is only ever
-- shown to the circle when the person chose to share it.

-- festivals: the calendar a circle may keep a day from. Platform admins add them and give the REAL dates; nobody ever invents one.
create table festivals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 80),
  tradition  text check (char_length(tradition) <= 300),
  regions    text[] not null default '{}',
  starts_on  date not null,
  ends_on    date not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index festivals_coming on festivals (starts_on);

-- circle_days: a circle keeps a festival (its dates travel with it) or a day of its own.
create table circle_days (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  festival_id  uuid references festivals(id) on delete set null,
  name         text not null check (char_length(name) between 2 and 80),
  tradition    text check (char_length(tradition) <= 300),
  starts_on    date not null,
  ends_on      date not null,
  created_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create index circle_days_coming on circle_days (community_id, starts_on);
create unique index circle_days_one_festival on circle_days (community_id, festival_id) where festival_id is not null;

-- circle_presence: here or away. share is false by default: a person is never shown to the circle without having said so.
create table circle_presence (
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  status       text not null default 'here' check (status in ('here', 'away')),
  place        text check (char_length(place) <= 120),
  share        boolean not null default false,
  since        timestamptz not null default now(),
  primary key (community_id, user_id)
);

-- circle_contributions: a blessing, message, recipe or story sent for one of the circle's days from wherever the person is.
create table circle_contributions (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  day_id       uuid references circle_days(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  kind         text not null default 'message' check (kind in ('blessing', 'message', 'recipe', 'story')),
  body         text not null check (char_length(body) between 1 and 1000),
  audio_url    text,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index circle_contributions_day on circle_contributions (day_id, created_at);
create index circle_contributions_circle on circle_contributions (community_id, created_at desc);

-- The circle's stories: one small column on Wisdom's own table, so a story can be shared into a circle and read there.
alter table wisdom_capsules add column if not exists community_id uuid references communities(id) on delete set null;
create index if not exists wisdom_capsules_circle on wisdom_capsules (community_id, created_at desc) where community_id is not null;
