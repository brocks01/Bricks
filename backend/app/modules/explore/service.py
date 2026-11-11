"""Explore: a small reviewed library of things to discover, plus what one person saved, started and chose as interests.
Plain functions over one database connection. An item is shown only once someone has reviewed it (reviewed_by is set)."""
import uuid

from sqlalchemy import Connection, text

CATEGORIES = ("digital_skills", "health_awareness", "everyday_life", "hobbies", "culture", "knowledge")

_COLS = (
    "i.id, i.category_id, i.format, i.level, i.title, i.summary, i.image_url, i.minutes, i.language, i.source, "
    "s.item_id is not null as saved, coalesce(p.percent, 0) as percent, p.completed_at is not null as completed"
)
_JOIN = "from explore_items i left join explore_saved s on s.item_id = i.id and s.user_id = :u left join explore_progress p on p.item_id = i.id and p.user_id = :u"


class ExploreError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _rows(conn: Connection, where: str, params: dict, order: str = "i.created_at desc", limit: int = 50) -> list[dict]:
    rows = conn.execute(text(f"select {_COLS} {_JOIN} where i.reviewed_by is not null {where} order by {order} limit :lim"), {**params, "lim": limit}).mappings().all()
    return [dict(r) for r in rows]


def categories(conn: Connection, user_id: str) -> list[dict]:
    rows = conn.execute(
        text(
            "select c.id, c.icon, (select count(*) from explore_items i where i.category_id = c.id and i.reviewed_by is not null) as items, "
            "(select image_url from explore_items i where i.category_id = c.id and i.reviewed_by is not null and i.image_url is not null order by i.created_at limit 1) as image_url, "
            "e.user_id is not null as chosen from explore_categories c left join explore_interests e on e.category_id = c.id and e.user_id = :u order by c.sort"
        ),
        {"u": user_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def items(conn: Connection, user_id: str, category: str | None = None, q: str | None = None, limit: int = 50) -> list[dict]:
    where, params = "", {"u": user_id}
    if category:
        if category not in CATEGORIES:
            raise ExploreError("unknown_category", 404)
        where += " and i.category_id = :cat"
        params["cat"] = category
    if q and q.strip():
        where += " and (i.title ilike :q or i.summary ilike :q)"
        params["q"] = f"%{q.strip()[:60]}%"
    return _rows(conn, where, params, order="i.created_at, i.title", limit=max(1, min(limit, 100)))


def item(conn: Connection, user_id: str, item_id: str) -> dict:
    cols = _COLS + ", i.steps, i.body, i.media_url"
    try:
        uuid.UUID(item_id)
    except ValueError:
        raise ExploreError("not_found", 404)
    r = conn.execute(text(f"select {cols} {_JOIN} where i.id = :id and i.reviewed_by is not null"), {"u": user_id, "id": item_id}).mappings().first()
    if r is None:
        raise ExploreError("not_found", 404)
    return dict(r)


def home(conn: Connection, user_id: str) -> dict:
    """What the Explore home shows: the categories, items picked for the person's interests (everything when none are chosen), and what they started or saved."""
    chosen = [r[0] for r in conn.execute(text("select category_id from explore_interests where user_id = :u"), {"u": user_id})]
    if chosen:
        picked = _rows(conn, "and i.category_id = any(:cats) and coalesce(p.percent, 0) < 100", {"u": user_id, "cats": chosen}, order="i.created_at, i.title", limit=6)
    else:
        picked = _rows(conn, "and coalesce(p.percent, 0) < 100", {"u": user_id}, order="i.created_at, i.title", limit=6)
    cont = _rows(conn, "and (s.item_id is not null or (p.percent > 0 and p.percent < 100))", {"u": user_id}, order="coalesce(p.updated_at, s.saved_at) desc", limit=6)
    return {"categories": categories(conn, user_id), "picked": picked, "continue": cont, "has_interests": bool(chosen)}


def mine(conn: Connection, user_id: str) -> dict:
    count = "select count(*) from explore_progress where user_id = :u"
    return {
        "in_progress": _rows(conn, "and p.percent > 0 and p.percent < 100", {"u": user_id}, order="p.updated_at desc"),
        "completed": _rows(conn, "and p.completed_at is not null", {"u": user_id}, order="p.completed_at desc"),
        "saved": _rows(conn, "and s.item_id is not null", {"u": user_id}, order="s.saved_at desc"),
        "milestones": {
            "explored": conn.execute(text(count), {"u": user_id}).scalar_one(),
            "completed": conn.execute(text(count + " and completed_at is not null"), {"u": user_id}).scalar_one(),
            "interests": conn.execute(text("select count(*) from explore_interests where user_id = :u"), {"u": user_id}).scalar_one(),
        },
    }


def set_saved(conn: Connection, user_id: str, item_id: str, saved: bool) -> dict:
    item(conn, user_id, item_id)  # 404 when it does not exist or is not reviewed
    if saved:
        conn.execute(text("insert into explore_saved (user_id, item_id) values (:u, :i) on conflict do nothing"), {"u": user_id, "i": item_id})
    else:
        conn.execute(text("delete from explore_saved where user_id = :u and item_id = :i"), {"u": user_id, "i": item_id})
    return {"saved": saved}


def set_progress(conn: Connection, user_id: str, item_id: str, percent: int) -> dict:
    item(conn, user_id, item_id)
    percent = max(0, min(100, percent))
    conn.execute(
        text(
            "insert into explore_progress (user_id, item_id, percent, completed_at) values (:u, :i, :p, case when :p = 100 then now() end) "
            "on conflict (user_id, item_id) do update set percent = greatest(explore_progress.percent, :p), updated_at = now(), "
            "completed_at = case when greatest(explore_progress.percent, :p) = 100 then coalesce(explore_progress.completed_at, now()) else null end"
        ),
        {"u": user_id, "i": item_id, "p": percent},
    )
    r = conn.execute(text("select percent, completed_at is not null as completed from explore_progress where user_id = :u and item_id = :i"), {"u": user_id, "i": item_id}).one()
    return {"percent": r.percent, "completed": r.completed}


def get_interests(conn: Connection, user_id: str) -> list[str]:
    return [r[0] for r in conn.execute(text("select category_id from explore_interests where user_id = :u order by category_id"), {"u": user_id})]


def set_interests(conn: Connection, user_id: str, ids: list[str]) -> list[str]:
    ids = sorted({i for i in ids if i in CATEGORIES})
    conn.execute(text("delete from explore_interests where user_id = :u"), {"u": user_id})
    for i in ids:
        conn.execute(text("insert into explore_interests (user_id, category_id) values (:u, :c)"), {"u": user_id, "c": i})
    return ids
