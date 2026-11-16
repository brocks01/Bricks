-- A person can phone Wisdom: the number they call from is matched to the account it was linked to (never trusted for risky actions).
alter table channel_links drop constraint if exists channel_links_channel_check;
alter table channel_links add constraint channel_links_channel_check check (channel in ('telegram', 'whatsapp', 'sms', 'phone'));
