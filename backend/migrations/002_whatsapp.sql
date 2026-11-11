-- Migration v2: the WhatsApp channel (docs/06 §6, iterations/whatsapp 0.2–2.3).

-- One row per WhatsApp number we've talked to. The route is the provider they
-- last wrote to us on; replies go back the same way.
create table wa_contacts (
  phone           text primary key,                -- E.164, "+6591234567"
  user_id         text references users(id) on delete set null,
  route           text not null default 'meta' check (route in ('meta','twilio')),
  profile_name    text,                            -- their WhatsApp display name
  last_inbound_at timestamptz,                     -- the 24-hour window starts here
  opted_in_at     timestamptz,                     -- consent: "You're in" or an invite Yes
  opt_out         boolean not null default false,  -- STOP / START
  -- Twilio has no buttons: the numbered choices we last offered ("1" -> payload).
  choices         jsonb not null default '[]',
  created_at      timestamptz not null default now()
);
create index wa_contacts_user_idx on wa_contacts (user_id);

-- The conversation step someone is in (onboarding, confirmations). 30-minute expiry.
create table wa_sessions (
  phone      text primary key,
  flow       text not null,
  step       text not null,
  data       jsonb not null default '{}',
  expires_at timestamptz not null
);

-- Webhooks are retried: each message id is handled once.
create table wa_seen (
  message_id text primary key,
  at         timestamptz not null default now()
);

-- What was sent and received, without message text (no personal free text in logs).
create table messages_log (
  id          bigserial primary key,
  phone       text not null,
  user_id     text,
  direction   text not null check (direction in ('in','out')),
  route       text not null,
  kind        text not null,                       -- text, buttons, list, template:<name>, audio…
  ok          boolean not null default true,
  provider_id text,
  error       text,
  at          timestamptz not null default now()
);
create index messages_log_phone_idx on messages_log (phone, at desc);

-- The daily check-in ladder (docs/06 §3.2): asked -> nudge -> call -> family.
create table checkin_runs (
  user_id    text not null references users(id) on delete cascade,
  date       date not null,
  asked_at   timestamptz not null,
  nudged_at  timestamptz,
  called_at  timestamptz,
  family_at  timestamptz,
  stopped_at timestamptz,                           -- answered, "I'm OK" or SOS
  primary key (user_id, date)
);

-- "Starts in an hour" reminders for events, sent once per person.
create table event_reminder_sends (
  event_id text not null references events(id) on delete cascade,
  user_id  text not null references users(id) on delete cascade,
  sent_at  timestamptz not null,
  primary key (event_id, user_id)
);

-- Reminders sent on WhatsApp, so each rings once a day (and again after a snooze).
create table reminder_sends (
  reminder_id  text not null references reminders(id) on delete cascade,
  date         date not null,
  sent_at      timestamptz not null,
  snooze_until timestamptz,
  primary key (reminder_id, date)
);
