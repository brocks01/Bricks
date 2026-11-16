-- The five kinds of experience a person can pass on: work and career, culture and traditions, community, social life, life lessons.
-- Older drafts map across: story and advice become life lessons, skill becomes work, recipe becomes culture.
update wisdom_capsules set kind = case kind when 'story' then 'life' when 'advice' then 'life' when 'skill' then 'professional' when 'recipe' then 'culture' else kind end;
alter table wisdom_capsules drop constraint if exists wisdom_capsules_kind_check;
alter table wisdom_capsules add constraint wisdom_capsules_kind_check check (kind in ('professional', 'culture', 'community', 'social', 'life'));
alter table wisdom_capsules alter column kind set default 'life';
