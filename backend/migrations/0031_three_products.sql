-- Three products, three pains (see team-docs/01-philosophy):
--   Communities: belonging by emotion. A circle has a feeling (origin, faith, place, life, interest), an audience (all, men, women) and can be imported from a host.
--   Wisdom: to be heard and valued. Three domains of experience (cultural, social, professional), free or paid with a price note, and support requests (an elder asks for a hand).
--   Marketplace: the physical world nearby. Opportunities hosted by Active Ageing Centres, malls and third parties, with what a person can do there (earn, contribute, volunteer, enjoy).
-- We are not the event provider or a community creator: we bring people to what exists.

-- hosts: who runs things (an Active Ageing Centre, a mall, a community centre, an organisation)
create table hosts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 2 and 120),
  kind       text not null default 'organisation' check (kind in ('aac', 'mall', 'community_centre', 'organisation', 'other')),
  area_name  text,
  address    text,
  website    text,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Wisdom: three domains instead of five kinds (community and life lessons fold into social)
update wisdom_capsules set kind = case kind when 'culture' then 'cultural' when 'community' then 'social' when 'life' then 'social' else kind end;
alter table wisdom_capsules drop constraint if exists wisdom_capsules_kind_check;
alter table wisdom_capsules add constraint wisdom_capsules_kind_check check (kind in ('cultural', 'social', 'professional'));
alter table wisdom_capsules alter column kind set default 'social';
alter table wisdom_offers add column domain text check (domain in ('cultural', 'social', 'professional'));
alter table wisdom_offers add column price_note text check (price_note is null or char_length(price_note) <= 120);
alter table wisdom_requests add column kind text not null default 'learn' check (kind in ('learn', 'support'));

-- Communities: the feeling, the audience, the host
alter table communities add column circle text not null default 'life' check (circle in ('origin', 'faith', 'place', 'life', 'interest'));
update communities set circle = case kind when 'club' then 'interest' else 'place' end;
alter table communities add column audience text not null default 'all' check (audience in ('all', 'men', 'women'));
alter table communities add column host_id uuid references hosts(id) on delete set null;
alter table communities add column source text not null default 'people' check (source in ('people', 'imported'));
alter table communities add column external_ref text;
create unique index communities_import_ref on communities (host_id, external_ref) where external_ref is not null;

-- Marketplace: opportunities near a person
alter table market_events add column host_id uuid references hosts(id) on delete set null;
alter table market_events add column kind text not null default 'market_day' check (kind in ('market_day', 'volunteer', 'gig', 'show', 'activity'));
alter table market_events add column intents text[] not null default '{earn,enjoy}';
alter table market_events add column source text not null default 'ours' check (source in ('ours', 'partner', 'imported'));
alter table market_events add column external_url text;
alter table market_events add column external_ref text;
create unique index market_events_import_ref on market_events (host_id, external_ref) where external_ref is not null;
