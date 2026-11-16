-- Onboarding and profile (area 4), migration 0100.
-- The interests step: the eight fixed interest keys, kept on the account so GET /v1/me and GET /v1/profile can offer them
-- to the circles and the marketplace. The older rhythm.interests question is untouched.
alter table users add column if not exists interests text[] not null default '{}';

-- The ten-second voice intro ("tell people a little about you"): just the address of the clip on the media provider.
alter table users add column if not exists voice_intro_url text;

-- The media table learns the one new kind the voice intro needs (the rows themselves still live at Cloudinary).
alter table media_assets drop constraint if exists media_assets_kind_check;
alter table media_assets add constraint media_assets_kind_check
  check (kind in ('avatar', 'community_logo', 'community_cover', 'activity_image', 'announcement_image', 'voice_intro', 'other'));
