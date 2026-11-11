-- A community picks a symbol (an Ionicons name) shown when it has no cover picture yet.
alter table communities add column if not exists icon text not null default 'people' check (icon ~ '^[a-z0-9-]{1,40}$');
