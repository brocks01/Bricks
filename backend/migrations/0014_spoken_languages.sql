-- Languages a person speaks, and the one they prefer to TALK in (the app's own language is `users.language`, a separate thing).
-- The voice agent only guesses among these, and asks to repeat when it is not sure.
alter table users add column if not exists spoken_languages text[] not null default '{}';
alter table users add column if not exists comm_language text;
