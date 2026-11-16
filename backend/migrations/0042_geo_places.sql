-- Maps and distance (revamp v2, A1). One cache row per address the server has looked up with Google Geocoding,
-- so the same place is never looked up twice; a place that was not found is kept too and tried again after 7 days.
create table if not exists geo_places (
  key          text primary key,               -- the address, lower-cased, spaces collapsed
  lat          double precision,
  lng          double precision,
  found        boolean not null,
  geocoded_at  timestamptz not null default now()
);

-- Where a community usually meets: shown on its page with a map, and used to rank communities by distance.
alter table communities add column if not exists address text check (address is null or char_length(address) <= 200);
