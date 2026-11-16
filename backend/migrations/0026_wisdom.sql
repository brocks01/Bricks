-- Wisdom: what a lifetime of experience is turned into, and how it reaches the next generation.
--   capsules      a story, skill, advice, recipe or professional lesson in a person's own words (often spoken on a call and written down by the agent)
--   offers        what an experienced person offers to teach or do: mentoring, a workshop, or paid freelance work
--   requests      what someone wants to learn or get help with
--   connections   an introduction between a mentor and a learner; the other side decides (accept or decline)
create table wisdom_capsules (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references users(id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 120),
  body         text not null check (char_length(body) between 10 and 6000),
  kind         text not null default 'story' check (kind in ('story', 'skill', 'advice', 'recipe', 'culture', 'professional')),
  tags         text[] not null default '{}',
  source       text not null default 'app' check (source in ('app', 'call', 'telegram', 'whatsapp', 'sms')),
  status       text not null default 'draft' check (status in ('draft', 'published', 'removed')),
  created_at   timestamptz not null default now(),
  published_at timestamptz
);
create index wisdom_capsules_public on wisdom_capsules (status, published_at desc);
create index wisdom_capsules_author on wisdom_capsules (author_id, created_at desc);

create table wisdom_offers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  title        text not null check (char_length(title) between 2 and 120),
  about        text check (char_length(about) <= 1000),
  kind         text not null default 'mentoring' check (kind in ('mentoring', 'workshop', 'freelance')),
  mode         text not null default 'volunteer' check (mode in ('volunteer', 'paid', 'either')),
  availability text check (char_length(availability) <= 200),
  status       text not null default 'active' check (status in ('active', 'paused', 'closed')),
  created_at   timestamptz not null default now()
);
create index wisdom_offers_open on wisdom_offers (status, created_at desc);

create table wisdom_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  topic      text not null check (char_length(topic) between 2 and 120),
  about      text check (char_length(about) <= 1000),
  status     text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index wisdom_requests_open on wisdom_requests (status, created_at desc);

create table wisdom_connections (
  id           uuid primary key default gen_random_uuid(),
  mentor_id    uuid not null references users(id) on delete cascade,
  learner_id   uuid not null references users(id) on delete cascade,
  initiated_by uuid not null references users(id) on delete cascade,
  offer_id     uuid references wisdom_offers(id) on delete set null,
  request_id   uuid references wisdom_requests(id) on delete set null,
  message      text check (char_length(message) <= 500),
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'closed')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  check (mentor_id <> learner_id),
  check (initiated_by in (mentor_id, learner_id))
);
create index wisdom_connections_mentor on wisdom_connections (mentor_id, status);
create index wisdom_connections_learner on wisdom_connections (learner_id, status);
