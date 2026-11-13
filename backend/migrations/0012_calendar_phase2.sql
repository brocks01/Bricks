-- Calendar phase 2: the app's reachability hint and the person's own time, both on the user.
-- app_seen_at is the heartbeat: when the app is open it pings, and the reminder loop reads this
-- as a HINT ("the app was open recently"), never as a promise. tz_offset_min is minutes east of
-- UTC, so the agent and later the calls can speak in the person's own wall-clock time.
alter table users add column if not exists tz_offset_min int;
alter table users add column if not exists app_seen_at timestamptz;
