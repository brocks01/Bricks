-- Profile (revamp v2, A3), migration 0101.
-- How a session was started (email code, Google, the mock Singpass, a demo account), so the profile can say truthfully how the person signed in.
-- A refreshed session keeps the method of the session it continues. Older sessions have none, and the profile then says nothing about it.
alter table refresh_tokens add column if not exists method text;
alter table refresh_tokens drop constraint if exists refresh_tokens_method_check;
alter table refresh_tokens add constraint refresh_tokens_method_check check (method is null or method in ('email', 'google', 'singpass', 'demo'));
