-- Nodes: the index of a person's tree (ported from the JambaGrad nodes module). One small card per node: where it hangs, what it points at, a few figures
-- (the badge), and the sums of what is below it so a change adds only its difference up the chain. It holds no content: the book it points at (ref) does.
create table nodes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  nid         text not null,                       -- "G12": a type letter and a number counted per person and type, never reused
  type        text not null,
  kind        text not null default '',
  title       text not null,
  description text not null default '',
  parent_id   text not null default '',
  path        text[] not null default '{}',        -- ancestors from the root down, not including this node
  depth       int  not null default 0,
  ord         int  not null default 0,
  child_seq   int  not null default 0,             -- how many children it has ever had: the next child's position
  archived    boolean not null default false,
  archived_at timestamptz,
  requires    text[] not null default '{}',        -- node ids it waits for (at most 8)
  blocked     boolean not null default false,
  waiting_on  int not null default 0,
  ref         jsonb,                               -- {module, model, id}: where the book is
  key         text,                                -- the stable key of a built-in node (an area): at most one per person
  badge       jsonb not null default '{}'::jsonb,  -- status, own, progress, weight, supports, shape, value, label, due, mode, v
  agg_w       double precision not null default 0, -- sums of what is below: weight, and weight times progress
  agg_s       double precision not null default 0,
  agg_v       int not null default 0,
  ledger_w    double precision not null default 0, -- closed work archived out of the live tree folds in here, so the parent keeps its figure
  ledger_s    double precision not null default 0,
  ledger_n    int not null default 0,
  c_open      int not null default 0,              -- everything below, by status (descendants, not only children)
  c_active    int not null default 0,
  c_blocked   int not null default 0,
  c_paused    int not null default 0,
  c_closed    int not null default 0,
  last_at     timestamptz,
  version     int not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, nid)
);
create unique index nodes_one_root on nodes (user_id) where type = 'root';
create unique index nodes_key on nodes (user_id, key) where key is not null;
create index nodes_children on nodes (user_id, parent_id, ord);
create index nodes_path on nodes using gin (path);
create index nodes_requires on nodes using gin (requires);

create table node_counters (
  user_id uuid not null references users(id) on delete cascade,
  type    text not null,
  seq     int  not null default 0,
  primary key (user_id, type)
);

-- A small audit trail of what changed, so a person (and the team) can see why a figure moved.
create table node_events (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  node_id    text not null,
  type       text not null,                        -- created, renamed, moved, archived, badge, requires, blocked, unblocked
  actor      text not null default 'person',
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index node_events_node on node_events (user_id, node_id, created_at desc);
