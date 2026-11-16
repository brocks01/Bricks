-- Wisdom: trust and a first conversation (see team-docs/02-product/wisdom.md, "Trust and limits").
--   proof on an offer   the field they worked in, the years, where; topics (life stage and subject tags such as pregnancy, first job) and the languages they can talk in
--   endorsements        one thank-you per learner per offer, only after a logged session: counts and sessions, no star ratings
--   messages            the first conversation after an introduction is accepted: short text, through the outbox to the other's preferred channel.
--                       Phone numbers and emails are never put in a message and never shared.

alter table wisdom_offers add column proof_field text check (proof_field is null or char_length(proof_field) <= 120);
alter table wisdom_offers add column proof_years int check (proof_years is null or proof_years between 0 and 70);
alter table wisdom_offers add column proof_where text check (proof_where is null or char_length(proof_where) <= 200);
alter table wisdom_offers add column topics text[] not null default '{}';
alter table wisdom_offers add column languages text[] not null default '{}';

create table wisdom_endorsements (
  id         uuid primary key default gen_random_uuid(),
  offer_id   uuid not null references wisdom_offers(id) on delete cascade,
  learner_id uuid not null references users(id) on delete cascade,
  note       text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (offer_id, learner_id)
);
create index wisdom_endorsements_offer on wisdom_endorsements (offer_id, created_at desc);

create table wisdom_messages (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references wisdom_connections(id) on delete cascade,
  sender_id     uuid not null references users(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 500),
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index wisdom_messages_thread on wisdom_messages (connection_id, created_at);
