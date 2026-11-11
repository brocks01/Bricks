-- Translation of member-written content (draft 1, 12 Nov 2026).
-- The ORIGINAL is always the content: a translation is a derived cache entry, never the content itself.
-- Cache key: (content type, content id, content version, source language, target language).

-- Per person: auto-translate on read (on by default), and the language they want it in.
-- `translate_target` is null = follow the person's UI language (`users.language`).
alter table users add column if not exists translate_auto boolean not null default true;
alter table users add column if not exists translate_target text check (translate_target is null or translate_target in ('en','hi','bn','ta','zh','ms','te','mr'));

-- The cache. A row is only served while its `content_version` matches the original's current version;
-- older rows are marked 'stale' when the original is edited and are re-translated on the next request.
create table if not exists translations (
  id             uuid primary key default gen_random_uuid(),
  content_type   text not null,
  content_id     uuid not null,
  content_version int not null default 1,
  source_lang    text not null,
  target_lang    text not null,
  text           text not null,
  provider       text not null,
  status         text not null default 'ok' check (status in ('ok','stale')),
  created_at     timestamptz not null default now(),
  unique (content_type, content_id, content_version, source_lang, target_lang)
);
create index if not exists translations_content_idx on translations (content_type, content_id, content_version);

-- Daily counters: how many characters went out to each provider and to each person, today.
-- NOTE: this is a UNIQUE index, not a primary key. PostgreSQL makes every primary-key column NOT NULL,
-- and the spec wants `user_id` nullable (null = a count that is not charged to a person).
create table if not exists translation_usage (
  day         date not null,
  provider    text not null,
  user_id     uuid,
  chars       int not null default 0,
  created_at  timestamptz not null default now(),
  unique (day, provider, user_id) nulls not distinct
);
create index if not exists translation_usage_day_idx on translation_usage (day, provider);

-- Terms to keep or force: community and festival names, and the names of people.
-- `keep = true` means the term must survive the translation untouched.
create table if not exists translation_glossary (
  id          uuid primary key default gen_random_uuid(),
  term        text not null,
  language    text not null check (language in ('en','hi','bn','ta','zh','ms','te','mr')),
  keep        boolean not null default true,
  replacement text,
  created_at  timestamptz not null default now(),
  unique (term, language)
);

-- Versioned, language-aware content. Every editable piece of member-written text gets a `version`
-- (bumped when it is edited, which invalidates its old translations) and a `source_lang`
-- (set by the author, or detected and stored the first time it is translated).
alter table announcements  add column if not exists version int not null default 1;
alter table announcements  add column if not exists source_lang text;
alter table activities     add column if not exists version int not null default 1;
alter table activities     add column if not exists source_lang text;
alter table opportunities  add column if not exists version int not null default 1;
alter table opportunities  add column if not exists source_lang text;
alter table contributions  add column if not exists version int not null default 1;
alter table contributions  add column if not exists source_lang text;
alter table communities    add column if not exists version int not null default 1;
alter table communities    add column if not exists source_lang text;
