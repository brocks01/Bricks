-- Four tabs: Home, Community, Marketplace, Health. (15 Nov 2026)
-- Community: a person may be in three communities at most; a new community is a REQUEST the platform approves; a member may let their family see they are there.
-- Marketplace: services seniors offer, bookings (one person or a community hires one), endorsements from people who really booked them, stalls at a gathering market.
-- Health: the daily check-in, walks, the private health card, and a Help alert to the family. Wellness only: nothing here diagnoses or interprets a reading.

-- ---------- community ----------
alter table users add column is_platform_admin boolean not null default false;
alter table memberships add column share_with_family boolean not null default false;   -- opt-in: family may see that this person is in this community

create table community_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 80),
  kind         text not null default 'neighbourhood' check (kind in ('apartment', 'block', 'neighbourhood', 'club', 'other')),
  area_name    text,
  description  text,
  why          text check (why is null or char_length(why) <= 1000),   -- why this community would thrive, who would come
  status       text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'used')),   -- used = the community was created from it
  decided_by   uuid references users(id) on delete set null,
  decided_at   timestamptz,
  note         text,                                                   -- the platform's reply
  community_id uuid references communities(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index community_requests_user on community_requests (user_id, status);
create index community_requests_status on community_requests (status, created_at);

-- ---------- marketplace ----------
create table service_listings (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references users(id) on delete cascade,
  title            text not null check (char_length(title) between 3 and 80),
  category         text not null check (category in ('crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other')),
  description      text check (description is null or char_length(description) <= 1500),
  tier             text not null default 'skilled' check (tier in ('basic', 'skilled', 'expert')),   -- how complex the work is
  experience_years int not null default 0 check (experience_years between 0 and 70),
  proof_text       text check (proof_text is null or char_length(proof_text) <= 1000),             -- proof of work in the person's own words (a place they worked, what they made)
  proof_links      text[] not null default '{}',
  verified         boolean not null default false,                                                     -- an admin saw the proof
  rate_per_hour    numeric(8, 2) check (rate_per_hour is null or rate_per_hour >= 0),                  -- null or 0 = free
  currency         text not null default 'SGD',
  area_name        text,
  status           text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index service_listings_owner on service_listings (owner_id, status);
create index service_listings_browse on service_listings (status, category, created_at desc);

create table service_bookings (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid not null references service_listings(id) on delete cascade,
  requester_id  uuid not null references users(id) on delete cascade,
  provider_id   uuid not null references users(id) on delete cascade,      -- copied from the listing, so history survives a changed listing
  community_id  uuid references communities(id) on delete set null,        -- set when a community hires for its event
  activity_id   uuid references activities(id) on delete set null,
  starts_at     timestamptz not null,
  hours         numeric(4, 1) not null default 1 check (hours > 0 and hours <= 24),
  agreed_rate   numeric(8, 2),                                              -- per hour, as agreed; payment is made directly between the two, never through us
  note          text check (note is null or char_length(note) <= 500),
  status        text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'cancelled', 'done')),
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index service_bookings_provider on service_bookings (provider_id, status, starts_at);
create index service_bookings_requester on service_bookings (requester_id, status, starts_at);

create table service_endorsements (
  listing_id  uuid not null references service_listings(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  booking_id  uuid not null references service_bookings(id) on delete cascade,   -- only people who really booked can endorse
  note        text check (note is null or char_length(note) <= 200),
  created_at  timestamptz not null default now(),
  primary key (listing_id, user_id)
);

create table market_stalls (
  id           uuid primary key default gen_random_uuid(),
  activity_id  uuid not null references activities(id) on delete cascade,
  seller_id    uuid not null references users(id) on delete cascade,        -- must be a senior (60plus)
  helper_name  text check (helper_name is null or char_length(helper_name) <= 60),   -- a volunteer who helps the seller on the day
  helper_id    uuid references users(id) on delete set null,
  selling      text not null check (char_length(selling) between 2 and 200),
  status       text not null default 'reserved' check (status in ('reserved', 'cancelled')),
  created_at   timestamptz not null default now(),
  unique (activity_id, seller_id)
);

-- ---------- health ----------
create table health_checkins (
  user_id    uuid not null references users(id) on delete cascade,
  day        date not null,
  moved      boolean not null,                                -- "Did you move today?" yes / no
  feeling    smallint check (feeling is null or feeling between 1 and 5),   -- how are you feeling, 1 low .. 5 good; a diary, never scored or interpreted
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table health_walks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  started_at    timestamptz not null,
  duration_s    int not null check (duration_s between 10 and 86400),
  moving_s      int not null check (moving_s between 0 and 86400),
  distance_m    int not null check (distance_m between 0 and 200000),
  steps         int not null check (steps between 0 and 200000),
  avg_pace_s_km int check (avg_pace_s_km is null or avg_pace_s_km > 0),
  created_at    timestamptz not null default now()
);
create index health_walks_user on health_walks (user_id, started_at desc);

create table health_cards (
  user_id    uuid primary key references users(id) on delete cascade,
  blood_group text check (blood_group is null or blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  conditions text check (conditions is null or char_length(conditions) <= 600),
  medicines  text check (medicines is null or char_length(medicines) <= 600),
  allergies  text check (allergies is null or char_length(allergies) <= 300),
  contact_name  text check (contact_name is null or char_length(contact_name) <= 80),
  contact_phone text check (contact_phone is null or char_length(contact_phone) <= 30),
  updated_at timestamptz not null default now()
);

create table health_help_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  message     text check (message is null or char_length(message) <= 300),
  status      text not null default 'open' check (status in ('open', 'seen', 'closed')),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index health_help_alerts_user on health_help_alerts (user_id, created_at desc);
