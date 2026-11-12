-- Migration v4 (iteration 3.2): organisations onboard their members by QR (docs/02b S11).

-- An Active Ageing Centre, a community club, a church: one staff member runs it.
create table orgs (
  id         text primary key,
  name       text not null,
  verified   boolean not null default false,
  admin_id   text not null references users(id) on delete cascade,
  -- What the QR code and the WhatsApp join link carry.
  join_code  text not null unique,
  created_at timestamptz not null default now()
);
create index orgs_admin_idx on orgs (admin_id);

-- Who the organisation invited (from a list) or who joined by scanning. Staff see a
-- name and a status only: never anyone's health card or Safe Circle.
create table org_members (
  id         text primary key,
  org_id     text not null references orgs(id) on delete cascade,
  user_id    text references users(id) on delete set null,
  name       text not null,
  phone      text,
  status     text not null default 'invited' check (status in ('invited','joined')),
  invited_at timestamptz not null default now(),
  joined_at  timestamptz
);
create unique index org_members_user on org_members (org_id, user_id) where user_id is not null;
create unique index org_members_phone on org_members (org_id, phone) where phone is not null;
