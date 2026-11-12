-- Migration v3 (iteration 3.2): the group walk feed and Cheers (docs/02b S19, S23).

-- A walk stays with its walker until they tap "Share with my Circle" (S23). Walks
-- saved before this were never shared on purpose, so they go back to private.
alter table walks alter column visibility set default 'private';
update walks set visibility = 'private';

-- Cheers on a shared walk (Strava's kudos, kinder): a tap, or a voice note up to 10 s.
create table walk_cheers (
  id         text primary key,
  walk_id    text not null references walks(id) on delete cascade,
  from_user  text not null references users(id) on delete cascade,
  kind       text not null check (kind in ('thumb','voice')),
  audio_url  text,
  duration_s double precision,
  created_at timestamptz not null default now()
);
create index walk_cheers_walk_idx on walk_cheers (walk_id, created_at);
-- One tap cheer per person per walk (voice cheers can be several).
create unique index walk_cheers_tap_once on walk_cheers (walk_id, from_user) where kind = 'thumb';
