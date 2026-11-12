-- The claim flow: a family member who was set up by someone else (an assisted profile) takes their own
-- account. The helper shows a single-use 6-digit code on their screen; the person enters it together with
-- their own contact on their own phone. Only a keyed hash of the code is kept, like every other code.
create table claim_invites (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id),   -- the assisted profile being claimed
  code_hash  text not null,
  created_by uuid not null references users (id),   -- the helper who showed the code
  attempts   int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);
create index claim_invites_hash on claim_invites (code_hash) where used_at is null;
