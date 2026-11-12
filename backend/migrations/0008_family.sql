-- Family: the family space (third tab), the one safe way for someone to join with help, and
-- the permission history that keeps every such step honest.
--
-- The rule agreed with the owner (12 Nov 2026): the FIRST journey is always "join yourself" (an invitation
-- the person accepts with their own verified contact). Creating a profile FOR someone else is allowed only
-- inside a family, and that profile is born RESTRICTED (login_kind='assisted'): invisible outside the family,
-- unable to invite or create anything, until the person claims it with their own contact. Nobody else can
-- mint an identity that reaches the outside world.

-- An assisted profile has no email yet, so the email column must allow null for exactly those rows.
alter table users alter column email drop not null;
alter table users add column login_kind text not null default 'own' check (login_kind in ('own', 'assisted'));
alter table users add column set_up_by uuid references users (id);

create table families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 2 and 60),
  created_by uuid not null references users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table family_members (
  family_id uuid not null references families (id) on delete cascade,
  user_id   uuid not null references users (id),
  role      text not null default 'member' check (role in ('owner', 'helper', 'member')),
  status    text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- An invitation holds a single-use code (kept only as a keyed hash, like the sign-in code) for the contact it
-- was sent to. The person accepts it from their own account, so the family never holds their keys.
create table family_invites (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families (id) on delete cascade,
  contact     text not null,            -- the phone or email the code was given/sent to
  role        text not null default 'member' check (role in ('helper', 'member')),
  code_hash   text not null,
  invited_by  uuid not null references users (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references users (id)
);
create index family_invites_hash on family_invites (code_hash) where accepted_at is null;

-- Who may act on whose account, and at what level. Levels (agreed): 'setup' = only helped with the initial
-- set-up, 'ongoing' = day-to-day help, 'full' = delegated management. Never wider than the family, never
-- auto-raised to full, and the supported person can revoke at any time.
create table delegations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id),   -- the supported person
  helper_id  uuid not null references users (id),   -- who may act
  level      text not null check (level in ('setup', 'ongoing', 'full')),
  status     text not null default 'active' check (status in ('active', 'revoked')),
  granted_by text not null check (granted_by in ('setup', 'supported', 'representative')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, helper_id)
);

-- The honest record: every step that touches who can do what to whom is written here, and nothing deletes it.
create table permission_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users (id),          -- the person the event is about
  helper_id     uuid references users (id),
  actor_user_id uuid references users (id),          -- who did it (may be the person, the helper or the system)
  action        text not null,                       -- family_created | invite_sent | member_joined | member_removed
                                                     -- | role_changed | assisted_created | delegation_granted
                                                     -- | delegation_changed | delegation_revoked
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index permission_events_user on permission_events (user_id, created_at);
