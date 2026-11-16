"""Insights: what Wisdom tells the people who run centres, and what the pilot measures. Counts and averages only, never names or one person's answers.
- Only people who said yes to the 'insights' consent are counted in the interest report.
- A group smaller than MIN_GROUP (5) is never shown, so nobody can be picked out of a small number.
- The loneliness average needs at least MIN_GROUP people with a baseline and a later check."""
from sqlalchemy import Connection, text

MIN_GROUP = 5
SUGGEST_MIN_NEARBY = 4

_INTERESTS = ("select p.user_id, lower(trim(i)) as interest from profiles p join users u on u.id = p.user_id, jsonb_array_elements_text(coalesce(p.answers -> 'rhythm' -> 'interests', '[]'::jsonb)) as i "
              "where u.status = 'active'")


def interest_report(conn: Connection, area: str | None = None) -> dict:
    """What the retirees near a centre chose, against what that area ran in the last three months. This is the page an Active Ageing Centre would pay for."""
    a = f"%{(area or '').strip().lower()}%"
    has_area = bool((area or "").strip())
    people = conn.execute(text(
        "select count(*) from profiles p join users u on u.id = p.user_id where p.consents ? 'insights' and u.status = 'active' and (not :h or lower(coalesce(u.area_name, '')) like :a)"), {"h": has_area, "a": a}).scalar_one()
    rows = conn.execute(text(
        f"select s.interest, count(distinct s.user_id) as n from ({_INTERESTS}) s join profiles p on p.user_id = s.user_id join users u on u.id = s.user_id "
        "where p.consents ? 'insights' and (not :h or lower(coalesce(u.area_name, '')) like :a) group by s.interest having count(distinct s.user_id) >= :m order by n desc, s.interest limit 20"),
        {"h": has_area, "a": a, "m": MIN_GROUP}).all()
    out = []
    for r in rows:
        ran = conn.execute(text(
            "select count(*) from activities x join communities c on c.id = x.community_id where x.starts_at > now() - interval '90 days' and x.status <> 'cancelled' "
            "and (lower(x.title) like :i or lower(coalesce(x.category, '')) like :i) and (not :h or lower(coalesce(c.area_name, '')) like :a)"), {"i": f"%{r.interest}%", "h": has_area, "a": a}).scalar_one()
        pct = round(100 * r.n / people) if people else 0
        line = f"{pct}% of retirees {'near you ' if has_area else ''}picked {r.interest}. You ran {ran} {r.interest} event{'s' if ran != 1 else ''} in the last three months."
        if ran == 0:
            line += f" Consider a weekly {r.interest} session: about {r.n} people are likely to come."
        out.append({"interest": r.interest, "people": r.n, "percent": pct, "events_last_quarter": ran, "suggestion": line})
    men = conn.execute(text(
        "select count(*) filter (where p.answers -> 'basics' ->> 'gender' = 'man') as men, count(*) filter (where p.answers -> 'basics' ->> 'gender' in ('man', 'woman')) as known "
        "from profiles p join users u on u.id = p.user_id where p.consents ? 'insights' and (not :h or lower(coalesce(u.area_name, '')) like :a)"), {"h": has_area, "a": a}).one()
    return {"area": area or None, "people_counted": people, "men_percent": round(100 * men.men / men.known) if men.known >= MIN_GROUP else None, "interests": out,
            "note": f"Only people who agreed are counted, and a group under {MIN_GROUP} is never shown."}


def pilot_report(conn: Connection) -> dict:
    """The numbers the pitch promises to track: who joined (and through whom), men's share, mentor matches and calls, and whether people feel less lonely."""
    joined = conn.execute(text("select count(*) from profiles where completed_at is not null")).scalar_one()
    via = conn.execute(text("select lower(trim(answers -> 'basics' ->> 'referral')) as who, count(*) as n from profiles where completed_at is not null and coalesce(trim(answers -> 'basics' ->> 'referral'), '') <> '' group by 1 order by n desc limit 20")).all()
    g = conn.execute(text("select count(*) filter (where answers -> 'basics' ->> 'gender' = 'man') as men, count(*) filter (where answers -> 'basics' ->> 'gender' in ('man', 'woman')) as known from profiles where completed_at is not null")).one()
    conns = conn.execute(text("select count(*) filter (where status = 'accepted') as accepted, count(*) as asked from wisdom_connections")).one()
    month = conn.execute(text("select count(*) as calls, count(distinct connection_id) as pairs from wisdom_sessions where occurred_at >= date_trunc('month', now())")).one()
    lonely = conn.execute(text(
        "select count(*) as n, avg(b.score) as start, avg(l.score) as latest from wellbeing_checks b join lateral (select score from wellbeing_checks where user_id = b.user_id and kind <> 'baseline' order by taken_at desc limit 1) l on true where b.kind = 'baseline'")).one()
    return {"onboarded": joined, "joined_through": [{"who": r.who, "people": r.n} for r in via], "men_percent": round(100 * g.men / g.known) if g.known >= MIN_GROUP else None,
            "mentor_matches": {"asked": conns.asked, "accepted": conns.accepted}, "this_month": {"calls": month.calls, "pairs": month.pairs},
            "loneliness": ({"people": lonely.n, "start_average": round(float(lonely.start), 2), "latest_average": round(float(lonely.latest), 2), "scale": "3 to 9, lower is less lonely"} if lonely.n >= MIN_GROUP else
                           {"people": lonely.n, "note": f"Shown once {MIN_GROUP} people have a second check."})}


def suggest_communities(conn: Connection, me: str) -> dict:
    """For one person: groups that match what they enjoy, and, when several people nearby like the same thing and no group exists, a suggestion to start one. Counts only, never names."""
    from ..communities import rules as comm_rules

    mine = conn.execute(text("select coalesce(p.answers -> 'rhythm' -> 'interests', '[]'::jsonb) as i, u.area_name from users u left join profiles p on p.user_id = u.id where u.id = :u"), {"u": me}).one()
    area = (mine.area_name or "").strip().lower()
    out = []
    for interest in [str(x).strip().lower() for x in (mine.i or []) if str(x).strip()][:6]:
        nearby = conn.execute(text(f"select count(distinct s.user_id) from ({_INTERESTS}) s join users u on u.id = s.user_id where s.interest = :i and s.user_id <> :me and (:a = '' or lower(coalesce(u.area_name, '')) = :a)"),
                              {"i": interest, "me": me, "a": area}).scalar_one()
        groups = [c for c in comm_rules.explore(conn, me, interest, 5)["communities"]]
        out.append({"interest": interest, "nearby_people": nearby, "groups": [{"id": c["id"], "name": c["name"], "members": c["member_count"], "joined": c["joined"], "can_join": c["can_join"]} for c in groups],
                    "start_one": not groups and nearby >= SUGGEST_MIN_NEARBY})
    return {"area": mine.area_name, "suggestions": out}
