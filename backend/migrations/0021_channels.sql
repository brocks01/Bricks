-- Channels: the person can talk to Wisdom outside the app (Telegram now, phone calls already; WhatsApp and SMS later).
-- A person's vision sentence (shown under their tree).
alter table users add column vision text check (vision is null or char_length(vision) <= 500);

-- Which chat belongs to which person. The link is made by the person: the app gives a one-time code, they send it to the bot.
create table channel_links (
  channel     text not null check (channel in ('telegram', 'whatsapp', 'sms')),
  external_id text not null,                                  -- the chat id (Telegram) or the phone number (WhatsApp, SMS)
  user_id     uuid not null references users(id) on delete cascade,
  linked_at   timestamptz not null default now(),
  primary key (channel, external_id)
);
create index channel_links_user on channel_links (user_id, channel);

create table channel_link_codes (
  code       text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  channel    text not null,
  expires_at timestamptz not null
);

-- What was said in a chat, kept short: the last turns give the agent its memory, and it is an audit trail.
create table channel_messages (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  channel    text not null,
  role       text not null check (role in ('person', 'agent')),
  body       text not null check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);
create index channel_messages_recent on channel_messages (user_id, channel, id desc);
