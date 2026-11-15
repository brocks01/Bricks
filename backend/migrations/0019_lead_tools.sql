-- Leader tools, the shared signature product, a weekly rota, check-in at a gathering, stall time slots, and the new-community steps.

-- The one thing a community is known for (its "signature product"), chosen by a vote; and when it meets.
alter table communities add column signature_product text check (signature_product is null or char_length(signature_product) <= 80);
alter table communities add column signature_since date;
alter table communities add column meeting text check (meeting is null or char_length(meeting) <= 200);

-- A request to start a community also says what it would be known for and when it would meet.
alter table community_requests add column product text check (product is null or char_length(product) <= 80);
alter table community_requests add column meeting text check (meeting is null or char_length(meeting) <= 200);

-- A vote: the leader asks, members pick one, the leader closes it and the winner becomes the signature product.
create table community_votes (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 120),
  status       text not null default 'open' check (status in ('open', 'closed')),
  created_by   uuid references users(id) on delete set null,
  winner       text,
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create unique index community_one_open_vote on community_votes (community_id) where status = 'open';

create table community_vote_options (
  id      uuid primary key default gen_random_uuid(),
  vote_id uuid not null references community_votes(id) on delete cascade,
  name    text not null check (char_length(name) between 1 and 80),
  ord     int  not null default 0
);

create table community_vote_ballots (
  vote_id   uuid not null references community_votes(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  option_id uuid not null references community_vote_options(id) on delete cascade,
  primary key (vote_id, user_id)
);

-- The rota: a repeating shift (a Sunday garden shift) as one slot per date; members put their own name down, the leader fills the gaps.
create table community_rota_slots (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  on_date      date not null,
  label        text not null default '' check (char_length(label) <= 80),
  capacity     int  not null default 3 check (capacity between 1 and 20),
  unique (community_id, on_date, label)
);

create table community_rota_signups (
  slot_id uuid not null references community_rota_slots(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (slot_id, user_id)
);

-- Check-in at a gathering: who really came, and who marked it.
alter table activity_participants add column checked_in_at timestamptz;
alter table activity_participants add column checked_in_by uuid references users(id) on delete set null;

-- A stall takes a half of the day, or the whole of it.
alter table market_stalls add column slot text not null default 'whole' check (slot in ('first', 'second', 'whole'));
