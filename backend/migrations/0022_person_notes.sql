-- What Wisdom has learned about a person from talking with them on any channel (a call, Telegram, WhatsApp): short facts they said themselves.
-- The agent saves them with the remember_about_me skill and gets the latest ones back at the start of every conversation, on every channel.
create table person_notes (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  note       text not null check (char_length(note) between 2 and 300),
  created_at timestamptz not null default now()
);
create index person_notes_recent on person_notes (user_id, id desc);
