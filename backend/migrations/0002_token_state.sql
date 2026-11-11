-- Stateless access tokens: a session id that survives refresh (so one sign-out ends the whole session),
-- and a per-person "changed at" time (a token issued before it is answered "refresh", so a ban or role change takes effect within seconds).
alter table refresh_tokens add column if not exists session_id uuid not null default gen_random_uuid();
create index if not exists refresh_tokens_session_idx on refresh_tokens (session_id);
alter table users add column if not exists auth_changed_at timestamptz not null default now();
