-- Communities (revamp v2, A1): the community's WhatsApp group (an invite link the leader saves; shown to members only), what it is about
-- (the same eight interest keys a person picks in onboarding, so communities can be ranked for them), and its own events page (for example a Luma calendar).
alter table communities add column if not exists whatsapp_url text
  check (whatsapp_url is null or whatsapp_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]{10,40}$');
alter table communities add column if not exists interests text[] not null default '{}'
  check (interests <@ array['walking','taichi','cooking','chess','music','gardening','teaching','tech']::text[]);
alter table communities add column if not exists events_url text
  check (events_url is null or (events_url ~ '^https://' and char_length(events_url) <= 300));
