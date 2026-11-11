-- Communities: the people and what they do together (draft 1, 11 Nov 2026). A subset of team-docs/06-technical/database-schema.md.
-- Clubs and groups are NOT modelled (they already run on WhatsApp). Events, competitions, workshops and training are all rows of ONE table: activities.

create table communities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 80),
  slug         text not null unique,
  kind         text not null default 'apartment' check (kind in ('apartment', 'block', 'neighbourhood', 'club', 'other')),
  description  text,
  area_name    text,
  privacy      text not null default 'invite' check (privacy in ('open', 'invite')),
  invite_code  text not null unique,
  logo_url     text,
  cover_url    text,
  is_demo      boolean not null default false,        -- seeded sample data: safe to delete
  created_by   uuid references users(id) on delete set null,
  status       text not null default 'active' check (status in ('active', 'archived')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table memberships (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  status       text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at    timestamptz not null default now(),
  left_at      timestamptz,
  unique (community_id, user_id)
);
create index memberships_user_idx on memberships (user_id) where status = 'active';

-- Roles have terms (one year, at most two), as in a college society.
create table role_definitions (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  key          text not null,
  name         text not null,
  description  text,
  can_manage   boolean not null default false,        -- may edit the community, post announcements, create activities
  term_months  int not null default 12,
  max_terms    int not null default 2,
  unique (community_id, key)
);

create table role_terms (
  id                 uuid primary key default gen_random_uuid(),
  community_id       uuid not null references communities(id) on delete cascade,
  role_definition_id uuid not null references role_definitions(id) on delete cascade,
  user_id            uuid not null references users(id) on delete cascade,
  term_number        int not null default 1,
  starts_on          date not null,
  ends_on            date not null,
  status             text not null default 'active' check (status in ('active', 'ended')),
  created_at         timestamptz not null default now()
);
create index role_terms_community_idx on role_terms (community_id, status);

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  author_id    uuid references users(id) on delete set null,
  title        text not null,
  body         text not null default '',
  pinned       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index announcements_community_idx on announcements (community_id, created_at desc);

-- One flexible activity system: an event, a competition, a workshop, a health camp, a drive. `category` is free text the community chooses.
create table activities (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  organiser_id uuid references users(id) on delete set null,
  title        text not null,
  description  text,
  category     text,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  location     text,
  capacity     int check (capacity is null or capacity > 0),
  image_url    text,
  status       text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'done')),
  created_at   timestamptz not null default now()
);
create index activities_community_idx on activities (community_id, starts_at);

create table activity_participants (
  activity_id  uuid not null references activities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  status       text not null default 'going' check (status in ('going', 'cancelled', 'attended')),
  created_at   timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create table contributions (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  activity_id  uuid references activities(id) on delete set null,
  kind         text not null default 'time' check (kind in ('time', 'skill', 'goods', 'money')),
  description  text not null,
  hours        numeric(6, 2),
  verified_by  uuid references users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index contributions_community_idx on contributions (community_id, created_at desc);

-- Opportunities live inside a community (not a separate job portal).
create table opportunities (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  posted_by    uuid references users(id) on delete set null,
  kind         text not null check (kind in ('job', 'service', 'referral')),
  title        text not null,
  description  text,
  contact      text,
  status       text not null default 'open' check (status in ('open', 'closed')),
  created_at   timestamptz not null default now()
);
create index opportunities_community_idx on opportunities (community_id, status, created_at desc);

-- Pictures (and later files). The bytes live at the media provider (Cloudinary); we keep who owns it and where it is.
create table media_assets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references users(id) on delete set null,
  kind         text not null check (kind in ('avatar', 'community_logo', 'community_cover', 'activity_image', 'announcement_image', 'other')),
  provider     text not null default 'cloudinary',
  public_id    text not null,
  url          text not null,
  bytes        int,
  width        int,
  height       int,
  created_at   timestamptz not null default now()
);
create index media_assets_owner_idx on media_assets (owner_id, created_at desc);
