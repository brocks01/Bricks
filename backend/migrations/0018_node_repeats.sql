-- Repeating habits: one row for each day a habit was done. The habit's strength (how steady it is over the last four weeks) and its streak are worked out from these.
create table node_repeats (
  user_id uuid not null references users(id) on delete cascade,
  nid     text not null,
  day     date not null,
  primary key (user_id, nid, day)
);
create index node_repeats_recent on node_repeats (user_id, day desc);
