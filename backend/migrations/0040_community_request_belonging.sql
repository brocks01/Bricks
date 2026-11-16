alter table community_requests
    add column if not exists circle text not null default 'life'
        check (circle in ('origin', 'faith', 'place', 'life', 'interest')),
    add column if not exists audience text not null default 'all'
        check (audience in ('all', 'men', 'women'));
