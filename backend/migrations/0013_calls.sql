-- Calendar phase 3: reminder calls. The consent is the person's own word (a helper may record it only
-- with the person present, and it is remembered who agreed). call_attempts is deliberately unique per
-- (item, time, attempt) so the reminder loop can be interrupted, redeployed or run twice and never
-- place the same call twice.
create table call_consents (
  person_id   uuid primary key references users(id) on delete cascade,
  phone_e164  text not null,
  language    text not null default 'en' check (language in ('en','hi','bn','ta','zh','ms')),
  window_from time not null default '08:00',     -- allowed hours, the person's own local time
  window_to   time not null default '20:00',
  agreed_at   timestamptz not null default now(),
  agreed_by   uuid references users(id),          -- the person themselves, or a helper with the person present
  revoked_at  timestamptz
);

create table call_attempts (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid references calendar_items(id) on delete set null,
  person_id     uuid not null references users(id) on delete cascade,
  occurs_at     timestamptz not null,
  attempt_no    int not null default 1,
  status        text not null check (status in ('queued','dialing','answered','acknowledged','no_answer','failed','blocked')),
  voice_call_id text,
  outcome       text,                             -- took_it | will_do_later | needs_help | null
  created_at    timestamptz not null default now(),
  unique (item_id, occurs_at, attempt_no)
);

create index call_attempts_item_idx on call_attempts (item_id, occurs_at);
