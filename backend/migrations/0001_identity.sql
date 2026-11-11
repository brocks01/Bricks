-- Identity module: people, one-time login codes, and sessions. (Draft 1, 13 Nov 2026)
-- Email is stored in lower case. No passwords: a person signs in with a code sent to their email.

create table users (
  id           uuid primary key default gen_random_uuid(),
  email        text not null unique,
  display_name text,
  language     text not null default 'en' check (language in ('en','hi','bn','ta','zh','ms')),
  age_band     text check (age_band in ('under40','40to59','60plus')),
  phone        text,
  area_name    text,
  status       text not null default 'active' check (status in ('active','deleted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- The code itself is never stored, only a keyed hash of it.
create table login_codes (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  code_hash  text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  attempts   int not null default 0,
  created_at timestamptz not null default now()
);
create index login_codes_email_created on login_codes (email, created_at desc);

-- Long-lived sign-in. The token itself is never stored, only its hash. Each use rotates it.
create table refresh_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now()
);
create index refresh_tokens_user on refresh_tokens (user_id);
