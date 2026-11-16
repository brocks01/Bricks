"""Safety: reports, blocks, hiding and admin review (team-docs/02-product/safety.md).

The rules this module keeps:
  * a report is the person's own word, one per person per thing; nobody reports their own thing;
  * three different reporters hide a thing by themselves and an admin is told through the outbox;
  * only a platform admin decides the outcome: dismiss it, hide the thing, or suspend the person behind it;
  * a block is one-sided and quiet: a blocked pair must not be introduced, must not message, and must not
    see each other's offers, requests or stories. `blocked()` is the one check every other module calls
    (the hooks land with each area); nothing here edits another area's files.
Plain functions over one database connection, like every other module."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import Connection, text

from ..channels import outbox
from ..communities.rules import is_admin

KINDS = ("capsule", "offer", "request", "message", "community", "event", "person")
REASONS = ("unsafe", "unkind", "spam", "false_experience", "other")
ACTIONS = ("dismiss", "hide", "suspend")
AUTO_HIDE_REPORTERS = 3

# the thing a report points at: (table, its author column). A message has no table yet (in-app
# conversations are not built), so a message report is kept but cannot be hidden or traced to an author.
TARGETS = {
    "capsule": ("wisdom_capsules", "author_id"),
    "offer": ("wisdom_offers", "user_id"),
    "request": ("wisdom_requests", "user_id"),
    "community": ("communities", "created_by"),
    "event": ("market_events", "created_by"),
}
# Hiding sets the row's own `hidden_at` AND its status word, using each table's existing vocabulary, so the
# thing leaves every public list at once through the filter each area already has (`published`, `active`,
# `open`, `scheduled`). The other areas add `hidden_at is null` to their remaining lists in task 3.
HIDDEN_STATUS = {"capsule": "removed", "offer": "closed", "request": "closed", "community": "archived", "event": "cancelled"}
VISIBLE_STATUS = {"capsule": "published", "offer": "active", "request": "open", "community": "active", "event": "scheduled"}


class SafetyError(Exception):
    """A refusal with a machine code the app turns into words in the person's language."""

    def __init__(self, code: str, status: int = 400, **extra):
        super().__init__(code)
        self.code, self.status, self.extra = code, status, extra


def _uuid_or_refuse(value: str) -> UUID:
    try:
        return UUID(str(value))
    except (ValueError, AttributeError, TypeError) as e:
        raise SafetyError("not_found", 404) from e


def _iso(d: datetime | None) -> str | None:
    return d.isoformat() if d else None


# ---------------------------------------------------------------- reports
def _target_row(conn: Connection, kind: str, target_id: str):
    """The reported thing, or None when there is no such thing (a message has no table yet)."""
    if kind == "person":
        return conn.execute(text("select id, id as author_id from users where id = :i"), {"i": target_id}).first()
    if kind in TARGETS:
        table, author = TARGETS[kind]
        return conn.execute(text(f"select id, {author} as author_id from {table} where id = :i"), {"i": target_id}).first()
    return None


def report(conn: Connection, me: str, target_kind: str, target_id: str, reason: str, note: str | None = None) -> dict:
    if target_kind not in KINDS:
        raise SafetyError("bad_kind", 422, kinds=list(KINDS))
    if reason not in REASONS:
        raise SafetyError("bad_reason", 422, reasons=list(REASONS))
    target_id = str(_uuid_or_refuse(target_id))
    note = (note or "").strip()[:500] or None
    row = _target_row(conn, target_kind, target_id)
    if row is None and target_kind != "message":
        raise SafetyError("not_found", 404)
    if row is not None and str(row.author_id) == str(me):
        raise SafetyError("your_own_thing", 400)  # a person never reports their own thing
    made = conn.execute(
        text("insert into reports (reporter_id, target_kind, target_id, reason, note) values (:r, :k, :i, :w, :n) on conflict do nothing returning id"),
        {"r": me, "k": target_kind, "i": target_id, "w": reason, "n": note},
    ).first()
    if made is None:
        return {"id": None, "status": "already_reported"}
    hidden = _maybe_auto_hide(conn, target_kind, target_id)
    return {"id": str(made.id), "status": "hidden_after_reports" if hidden else "reported"}


def _report_dict(r) -> dict:
    return {
        "id": str(r.id), "target_kind": r.target_kind, "target_id": str(r.target_id), "reason": r.reason,
        "note": r.note, "status": r.status, "created_at": _iso(r.created_at),
        "reporter": str(r.reporter_id),
        **({"reporter_name": r.reporter_name} if getattr(r, "reporter_name", None) else {}),
        **({"target_title": r.target_title} if getattr(r, "target_title", None) else {}),
        **({"decided_by": str(r.decided_by)} if r.decided_by else {}),
        "decided_at": _iso(r.decided_at),
    }


def my_reports(conn: Connection, me: str) -> list[dict]:
    rows = conn.execute(
        text("select * from reports where reporter_id = :r order by created_at desc limit 50"), {"r": me}
    ).all()
    return [_report_dict(r) for r in rows]


def admin_reports(conn: Connection, me: str, status: str | None = None) -> list[dict]:
    if not is_admin(conn, me):
        raise SafetyError("admin_only", 403)
    where, args = "", {"m": me}
    if status:
        if status not in ("open", "reviewed", "actioned", "dismissed"):
            raise SafetyError("bad_status", 422)
        where = "where r.status = :s"
        args["s"] = status
    rows = conn.execute(
        text(f"""select r.*, u.display_name as reporter_name,
                    coalesce(c.name, o.title, cap.title, q.topic, e.title, p.display_name) as target_title
                from reports r
                left join users u on u.id = r.reporter_id
                left join users p on r.target_kind = 'person' and p.id = r.target_id
                left join communities c on r.target_kind = 'community' and c.id = r.target_id
                left join wisdom_offers o on r.target_kind = 'offer' and o.id = r.target_id
                left join wisdom_capsules cap on r.target_kind = 'capsule' and cap.id = r.target_id
                left join wisdom_requests q on r.target_kind = 'request' and q.id = r.target_id
                left join market_events e on r.target_kind = 'event' and e.id = r.target_id
                {where} order by r.created_at desc limit 200"""),
        args,
    ).all()
    return [_report_dict(r) for r in rows]


def _hide(conn: Connection, kind: str, target_id: str) -> bool:
    """Take the thing out of every list. Returns False for a kind with no table (a message).
    A thing that is already out of a list (a draft, a closed offer) only gets the `hidden_at` mark."""
    table = TARGETS.get(kind, (None,))[0]
    if not table:
        return False
    conn.execute(
        text(f"update {table} set hidden_at = now(), status = case when status = :v then :h else status end where id = :i and hidden_at is null"),
        {"v": VISIBLE_STATUS[kind], "h": HIDDEN_STATUS[kind], "i": target_id},
    )
    return True


def _restore(conn: Connection, kind: str, target_id: str) -> bool:
    """Put a hidden thing back into the lists. Only things this module hid are touched."""
    table = TARGETS.get(kind, (None,))[0]
    if not table:
        return False
    row = conn.execute(
        text(f"update {table} set hidden_at = null, status = case when status = :h then :v else status end where id = :i and hidden_at is not null returning id"),
        {"v": VISIBLE_STATUS[kind], "h": HIDDEN_STATUS[kind], "i": target_id},
    ).first()
    return row is not None


def _maybe_auto_hide(conn: Connection, kind: str, target_id: str) -> bool:
    """Three different reporters: the thing hides itself and every admin is told, so it is still reviewed."""
    people = conn.execute(
        text("select count(distinct reporter_id) from reports where target_kind = :k and target_id = :i"), {"k": kind, "i": target_id}
    ).scalar_one()
    if int(people) < AUTO_HIDE_REPORTERS:
        return False
    hidden = _hide(conn, kind, target_id)
    conn.execute(
        text("update reports set status = 'actioned', decided_at = now() where target_kind = :k and target_id = :i and status = 'open'"),
        {"k": kind, "i": target_id},
    )
    admins = [str(r.id) for r in conn.execute(text("select id from users where is_platform_admin and status = 'active'")).all()]
    what = {"capsule": "story", "offer": "offer", "request": "request", "community": "circle", "event": "event", "person": "person"}.get(kind, "message")
    for a in admins:
        if a != target_id:
            outbox.send(a, f"Safety: a {what} was hidden after reports from three people ({kind} {target_id}). Please review it.", kind="safety")
    return hidden


def resolve(conn: Connection, me: str, report_id: str, action: str) -> dict:
    """The admin's word: dismiss it, hide the thing, or suspend the person behind it."""
    if not is_admin(conn, me):
        raise SafetyError("admin_only", 403)
    if action not in ACTIONS:
        raise SafetyError("bad_action", 422, actions=list(ACTIONS))
    report_id = str(_uuid_or_refuse(report_id))
    r = conn.execute(text("select * from reports where id = :i"), {"i": report_id}).first()
    if r is None:
        raise SafetyError("not_found", 404)
    hidden, suspended, restored = False, None, False
    if action == "hide":
        hidden = _hide(conn, r.target_kind, str(r.target_id))
        if not hidden:
            raise SafetyError("hide_needs_a_thing", 422)  # a person is suspended, not hidden
    elif action == "suspend":
        suspended = _suspend_behind(conn, r.target_kind, str(r.target_id))
    status = "dismissed" if action == "dismiss" else "actioned"
    conn.execute(
        text("update reports set status = :s, decided_by = :m, decided_at = now() where id = :i"),
        {"s": status, "m": me, "i": report_id},
    )
    if action == "dismiss":
        # a dismissed report puts the thing back, but only when no other report about it stands
        others = conn.execute(
            text("select count(*) from reports where target_kind = :k and target_id = :i and id <> :r and status <> 'dismissed'"),
            {"k": r.target_kind, "i": str(r.target_id), "r": report_id},
        ).scalar_one()
        if int(others) == 0:
            restored = _restore(conn, r.target_kind, str(r.target_id))
    return {"id": report_id, "status": status, "action": action, "hidden": hidden, "restored": restored, "suspended": suspended}


def _suspend_behind(conn: Connection, kind: str, target_id: str) -> str | None:
    """The person behind the report: the reported person, or the author of the reported thing."""
    row = _target_row(conn, kind, target_id)
    if row is None:
        return None
    who = str(row.author_id)
    conn.execute(text("update users set status = 'suspended', auth_changed_at = now() where id = :u and status = 'active'"), {"u": who})
    from ...core import auth_state

    auth_state.forget(who)  # their signed-in doors close at once
    return who


# ---------------------------------------------------------------- blocks
def block(conn: Connection, me: str, person_id: str) -> dict:
    person_id = str(_uuid_or_refuse(person_id))
    if person_id == str(me):
        raise SafetyError("yourself", 400)
    row = conn.execute(text("select id from users where id = :u and status = 'active'"), {"u": person_id}).first()
    if row is None:
        raise SafetyError("not_found", 404)
    made = conn.execute(
        text("insert into blocks (blocker_id, blocked_id) values (:a, :b) on conflict do nothing returning id"),
        {"a": me, "b": person_id},
    ).first()
    return {"blocked": True, "status": "blocked" if made else "already_blocked"}


def unblock(conn: Connection, me: str, person_id: str) -> dict:
    person_id = str(_uuid_or_refuse(person_id))
    n = conn.execute(text("delete from blocks where blocker_id = :a and blocked_id = :b"), {"a": me, "b": person_id}).rowcount
    return {"blocked": False, "removed": n > 0}


def blocked(conn: Connection, a: str, b: str) -> bool:
    """True when either side has blocked the other: no introduction, no message, no shared lists."""
    if not a or not b or str(a) == str(b):
        return False
    row = conn.execute(
        text("select 1 from blocks where (blocker_id = :a and blocked_id = :b) or (blocker_id = :b and blocked_id = :a) limit 1"),
        {"a": str(a), "b": str(b)},
    ).first()
    return row is not None


def my_blocks(conn: Connection, me: str) -> list[dict]:
    rows = conn.execute(
        text("""select b.blocked_id, u.display_name, b.created_at
                from blocks b left join users u on u.id = b.blocked_id
                where b.blocker_id = :a order by b.created_at desc"""),
        {"a": me},
    ).all()
    return [{"person_id": str(r.blocked_id), "name": r.display_name or "", "at": _iso(r.created_at)} for r in rows]
