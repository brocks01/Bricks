-- Hosts list their own opportunities (Marketplace): who works on a host — an Active Ageing Centre, a mall, a community centre, an organisation.
-- A platform admin adds the first owner by email; an owner adds editors. Owners and editors make, edit and cancel ONLY their own host's
-- opportunities and import their own host's communities. Wisdom is not the event provider: it brings people to what hosts run.
create table host_members (
  host_id    uuid not null references hosts(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  role       text not null check (role in ('owner', 'editor')),
  added_by   uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (host_id, user_id)
);
create index host_members_person on host_members (user_id);
