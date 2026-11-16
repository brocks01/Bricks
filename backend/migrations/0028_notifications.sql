-- Notifications: everything Wisdom tells a person outside a conversation (an introduction request, a nudge, a reminder). One row per message.
-- It is also the in-app inbox: whatever channel it went out on, the app can list it. status:
--   queued  waiting (a polite hour, or a retry)
--   sent    delivered on a chat channel (channel_used says which)
--   inbox   no chat channel could take it, so it lives in the app inbox only
--   read    the person has seen it
create table notifications (
  id            bigserial primary key,
  user_id       uuid not null references users(id) on delete cascade,
  kind          text not null default 'info',
  body          text not null check (char_length(body) between 1 and 1000),
  urgent        boolean not null default false,
  status        text not null default 'queued' check (status in ('queued', 'sent', 'inbox', 'read')),
  channel_used  text,
  tries         int not null default 0,
  deliver_after timestamptz not null default now(),
  dedupe_key    text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  read_at       timestamptz
);
create index notifications_due on notifications (deliver_after) where status = 'queued';
create index notifications_person on notifications (user_id, id desc);
create unique index notifications_dedupe on notifications (user_id, dedupe_key) where dedupe_key is not null;
