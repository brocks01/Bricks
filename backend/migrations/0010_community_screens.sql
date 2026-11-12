-- Community screens 2-10: initiatives (a long-running effort with a current plan), comments and likes on updates.
create table initiatives (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references communities(id) on delete cascade,
  created_by   uuid references users(id) on delete set null,
  title        text not null check (char_length(title) between 2 and 80),
  summary      text,
  description  text,
  icon         text not null default 'leaf-outline',
  image_url    text,
  current_plan text,
  status       text not null default 'ongoing' check (status in ('ongoing', 'done')),
  created_at   timestamptz not null default now()
);
create index initiatives_community_idx on initiatives (community_id, created_at);

create table initiative_members (
  initiative_id uuid not null references initiatives(id) on delete cascade,
  user_id       uuid not null references users(id) on delete cascade,
  joined_at     timestamptz not null default now(),
  primary key (initiative_id, user_id)
);

create table announcement_comments (
  id              uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 500),
  created_at      timestamptz not null default now()
);
create index announcement_comments_idx on announcement_comments (announcement_id, created_at);

create table announcement_likes (
  announcement_id uuid not null references announcements(id) on delete cascade,
  user_id         uuid not null references users(id) on delete cascade,
  primary key (announcement_id, user_id)
);
