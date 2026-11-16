"""Hosts list their own opportunities (Marketplace): who works on a host — an Active Ageing Centre, a mall, a community centre, an organisation.
A platform admin adds the first owner by email; an owner adds editors. Owners and editors list, make, edit and cancel ONLY their own host's
opportunities, and import their own host's communities. Wisdom is not the event provider or a community creator: it brings people to what hosts run.
Plain functions over one database connection; every rule lives here, not in the router."""
from sqlalchemy import Connection, text

from ..communities import rules as comm_rules
from ..market.events import EVENT_KINDS, INTENTS, _uuid, make_event

ROLES = ("owner", "editor")


class HostError(Exception):
    def __init__(self, code: str, status: int = 400):
        super().__init__(code)
        self.code, self.status = code, status


def _iso(d) -> str | None:
    return d.isoformat() if d else None


# ---------- who works on this host ----------
def role_of(conn: Connection, me: str, host_id: str) -> str | None:
    """The person's role at this host: owner, editor, admin (a platform admin may do everything), or None."""
    r = conn.execute(text("select role from host_members where host_id = :h and user_id = :u"), {"h": _uuid(host_id), "u": me}).scalar()
    if r:
        return r
    return "admin" if comm_rules.is_admin(conn, me) else None


def require_member(conn: Connection, me: str, host_id: str) -> str:
    """Raises no_such_host (404) or not_member (403). Returns the role."""
    hid = _uuid(host_id)
    if conn.execute(text("select 1 from hosts where id = :h"), {"h": hid}).first() is None:
        raise HostError("no_such_host", 404)
    role = role_of(conn, me, hid)
    if not role:
        raise HostError("not_member", 403)
    return role


def my_hosts(conn: Connection, me: str) -> list[dict]:
    """The hosts the person works for. A platform admin sees every host (role admin) so they can make an opportunity for any of them."""
    if comm_rules.is_admin(conn, me):
        rows = conn.execute(text("select id, name, kind, area_name from hosts order by name limit 200")).all()
        return [{"id": str(r.id), "name": r.name, "kind": r.kind, "area_name": r.area_name, "role": "admin"} for r in rows]
    rows = conn.execute(text(
        "select h.id, h.name, h.kind, h.area_name, m.role from host_members m join hosts h on h.id = m.host_id "
        "where m.user_id = :u order by h.name"), {"u": me}).all()
    return [{"id": str(r.id), "name": r.name, "kind": r.kind, "area_name": r.area_name, "role": r.role} for r in rows]


def list_members(conn: Connection, me: str, host_id: str) -> dict:
    """Who works on this host (members only). Names and roles only: no contact details are shared."""
    require_member(conn, me, host_id)
    rows = conn.execute(text(
        "select u.display_name, m.role from host_members m join users u on u.id = m.user_id where m.host_id = :h "
        "order by case m.role when 'owner' then 0 else 1 end, u.display_name"), {"h": _uuid(host_id)}).all()
    return {"members": [{"name": r.display_name or "Someone", "role": r.role} for r in rows]}


def add_member(conn: Connection, me: str, host_id: str, email: str, role: str) -> dict:
    """A platform admin adds the first owner (or an editor) by email; an owner adds editors. An editor may not add anyone."""
    who = require_member(conn, me, host_id)
    if role not in ROLES:
        raise HostError("validation", 422)
    if who == "editor":
        raise HostError("not_allowed", 403)
    if who == "owner" and role == "owner":
        raise HostError("only_admin_adds_owners", 403)  # an owner may never promote someone above themselves
    uid = conn.execute(text("select id, display_name from users where lower(email) = lower(:e)"), {"e": (email or "").strip()}).first()
    if uid is None:
        raise HostError("no_such_person", 404)
    hid = _uuid(host_id)
    if conn.execute(text("select 1 from host_members where host_id = :h and user_id = :u"), {"h": hid, "u": str(uid.id)}).first():
        raise HostError("already_member", 409)
    conn.execute(text("insert into host_members (host_id, user_id, role, added_by) values (:h, :u, :r, :a)"),
                 {"h": hid, "u": str(uid.id), "r": role, "a": me})
    return {"added": role, "name": uid.display_name or "Someone"}


# ---------- this host's opportunities ----------
def host_events(conn: Connection, me: str, host_id: str) -> list[dict]:
    """What is coming up at this host, soonest first, with how many are going and who took a stall (names the members already see)."""
    require_member(conn, me, host_id)
    rows = conn.execute(text(
        "select e.*, r.repeat, r.week_of_month from market_events e left join recurrences r on r.id = e.series_id "
        "where e.host_id = :h and e.status = 'scheduled' and coalesce(e.ends_at, e.starts_at + interval '4 hours') >= now() "
        "order by e.starts_at limit 30"), {"h": _uuid(host_id)}).all()
    out = []
    for r in rows:
        taken = conn.execute(text("select count(*) from market_event_stalls where event_id = :e and status = 'reserved'"), {"e": r.id}).scalar_one()
        going = conn.execute(text("select count(*) from market_event_goers where event_id = :e"), {"e": r.id}).scalar_one()
        stalls = conn.execute(text(
            "select s.selling, s.slot, coalesce(u.display_name, 'Someone') as seller from market_event_stalls s join users u on u.id = s.seller_id "
            "where s.event_id = :e and s.status = 'reserved' order by s.created_at"), {"e": r.id}).all()
        out.append({"id": str(r.id), "title": r.title, "kind": r.kind, "intents": list(r.intents or []), "venue_name": r.venue_name,
                    "address": r.address, "area_name": r.area_name, "starts_at": _iso(r.starts_at), "ends_at": _iso(r.ends_at),
                    "repeat": r.repeat, "week_of_month": r.week_of_month, "stalls_total": r.stalls_total, "stalls_taken": taken,
                    "stalls_left": max(0, r.stalls_total - taken), "going_count": going, "external_url": r.external_url,
                    "stalls": [{"seller": s.seller, "selling": s.selling, "slot": s.slot} for s in stalls]})
    return out


def create_event(conn: Connection, me: str, host_id: str, data: dict) -> dict:
    """Make an opportunity at THIS host (owners and editors; platform admins too). Same fields and validation as the platform admin's form."""
    require_member(conn, me, host_id)
    return make_event(conn, me, {**data, "host_id": _uuid(host_id)})


def _one(conn: Connection, host_id: str, event_id: str):
    """One scheduled event of THIS host: 404 when it does not exist or belongs to another host (a host never sees another host's events)."""
    r = conn.execute(text("select * from market_events where id = :e and status = 'scheduled'"), {"e": _uuid(event_id)}).first()
    if r is None or str(r.host_id) != _uuid(host_id):
        raise HostError("not_found", 404)
    return r


def edit_event(conn: Connection, me: str, host_id: str, event_id: str, data: dict) -> dict:
    """Edit the given fields of one of this host's opportunities. Only the fields sent are changed."""
    require_member(conn, me, host_id)
    r = _one(conn, host_id, event_id)
    kind = data.get("kind", r.kind)
    intents = data.get("intents", list(r.intents or []))
    if kind not in EVENT_KINDS or not intents or any(i not in INTENTS for i in intents):
        raise HostError("validation", 422)
    cols = {"kind": kind, "intents": intents}
    for key in ("title", "description", "venue_name", "venue_kind", "address", "area_name", "starts_at", "ends_at", "stalls_total", "cover_url", "external_url"):
        if key in data:
            cols[key] = data[key]
    sets = ", ".join(f"{k} = :{k}" for k in cols)
    conn.execute(text(f"update market_events set {sets} where id = :id"), {**cols, "id": r.id})
    return {"updated": True, "id": str(r.id)}


def cancel_event(conn: Connection, me: str, host_id: str, event_id: str) -> dict:
    """Cancel one of this host's opportunities: it stops being shown to people."""
    require_member(conn, me, host_id)
    _one(conn, host_id, event_id)
    conn.execute(text("update market_events set status = 'cancelled' where id = :e"), {"e": _uuid(event_id)})
    return {"cancelled": True}


def end_series(conn: Connection, me: str, host_id: str, event_id: str) -> dict:
    """Stop a repeating opportunity of this host for good: no more are made and the coming ones are cancelled."""
    require_member(conn, me, host_id)
    _one(conn, host_id, event_id)
    from ..market.events import end_series_for

    return end_series_for(conn, event_id)


# ---------- bringing in what the host already runs ----------
def import_community(conn: Connection, me: str, host_id: str, data: dict) -> dict:
    """Bring in a community the host already runs (for example a group at an Active Ageing Centre), under this host.
    Safe to run again: the same host and reference update the same community. Host members and platform admins only."""
    require_member(conn, me, host_id)
    hid = _uuid(host_id)
    ref = (data.get("external_ref") or "").strip()
    if not ref:
        raise HostError("host_and_ref_needed", 422)
    if not (data.get("name") or "").strip():
        raise HostError("validation", 422)
    row = conn.execute(text("select id from communities where host_id = :h and external_ref = :r"), {"h": hid, "r": ref}).first()
    if row:
        conn.execute(text("update communities set name = :n, description = :d, area_name = :a, circle = :c, audience = :u, updated_at = now() where id = :i"),
                     {"n": data["name"].strip(), "d": data.get("description"), "a": data.get("area_name"), "c": data.get("circle") or "place", "u": data.get("audience") or "all", "i": row.id})
        return {"id": str(row.id), "created": False}
    from ..communities.service import create as make

    out = make(conn, me, {**data, "privacy": data.get("privacy") or "open", "source": "imported", "kind": data.get("kind") or "neighbourhood",
                          "host_id": hid, "external_ref": ref, "circle": data.get("circle") or "place"})
    return {"id": out["id"], "created": True}
