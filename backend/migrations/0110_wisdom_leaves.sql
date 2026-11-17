-- The leaves of the Tree of Wisdom: one row for every event a person SHOWED UP to (a community gathering they were checked in at, a market
-- event they said "I went" to, a Wisdom session that was completed). One event, one leaf: the unique key makes a repeat a no-op.
-- `self_reported` marks a leaf that rests on the person's own answer (the Marketplace's "I went"): only those can be withdrawn again.
create table wisdom_leaves (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  source        text not null check (source in ('community', 'market', 'wisdom')),
  ref_id        text not null,                 -- the id of the gathering, market event or session in its own module
  title         text not null,
  at            timestamptz not null,          -- when the event was
  source_name   text,                          -- the community's name, the host's name, or the other person's name
  self_reported boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (user_id, source, ref_id)
);
create index wisdom_leaves_person on wisdom_leaves (user_id, at desc, id desc);
