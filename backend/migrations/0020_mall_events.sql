-- Market events: the company hosts a market in a mall or a community centre. Older people sell what they make (or show a skill), the venue gets the footfall.
-- Communities go together: a Community Lead plans the community's visit, members say they are going, seniors take stalls.
create table market_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 120),
  description text check (description is null or char_length(description) <= 1000),
  venue_name  text not null check (char_length(venue_name) between 2 and 120),
  venue_kind  text not null default 'mall' check (venue_kind in ('mall', 'community_centre', 'other')),
  address     text check (address is null or char_length(address) <= 200),
  area_name   text check (area_name is null or char_length(area_name) <= 120),
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  stalls_total int not null default 12 check (stalls_total between 0 and 200),
  cover_url   text,
  status      text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at  timestamptz not null default now()
);
create index market_events_when on market_events (starts_at) where status = 'scheduled';

-- A community's planned visit: made by its Community Lead.
create table market_event_plans (
  event_id     uuid not null references market_events(id) on delete cascade,
  community_id uuid not null references communities(id) on delete cascade,
  planned_by   uuid references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (event_id, community_id)
);

-- Who is going. The community is the one they go with (when they belong to a community that planned the visit).
create table market_event_goers (
  event_id     uuid not null references market_events(id) on delete cascade,
  user_id      uuid not null references users(id) on delete cascade,
  community_id uuid references communities(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- A stall: the main seller is a senior, who can bring a helper; a half of the day or the whole.
create table market_event_stalls (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references market_events(id) on delete cascade,
  seller_id    uuid not null references users(id) on delete cascade,
  community_id uuid references communities(id) on delete set null,
  selling      text not null check (char_length(selling) between 2 and 200),
  kind         text not null default 'goods' check (kind in ('goods', 'skill')),
  helper_name  text check (helper_name is null or char_length(helper_name) <= 60),
  slot         text not null default 'whole' check (slot in ('first', 'second', 'whole')),
  status       text not null default 'reserved' check (status in ('reserved', 'cancelled')),
  created_at   timestamptz not null default now(),
  unique (event_id, seller_id)
);
