"""Family: create a family, invite people (they join as themselves), and set up a profile for a family
member who cannot onboard themselves (an assisted profile, restricted until they claim it).

Plain functions over one database connection, like the identity module. Every rule of the agreed design
lives here:
  * joining is always the person's own act (an invitation code they accept from their own account);
  * assisted profiles exist only inside a family and cannot invite, join or create anything;
  * every step is written to permission_events, and nothing deletes it."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import Connection, text

from ...core import mail, security
from ...core.config import get_settings

MAX_INVITES_PER_HOUR = 10
INVITE_MINUTES = 60 * 24  # an invitation stays valid for a day
CLAIM_MINUTES = 15
ROLES = ("owner", "helper", "member")
ASSIGNABLE = ("helper", "member")  # the owner role is only ever taken by creating the family

LANGUAGES = ("en", "hi", "bn", "ta", "zh", "ms")


class FamilyError(Exception):
    """A refusal with a machine code the app turns into words in the person's language."""

    def __init__(self, code: str, status: int = 400, **extra):
        super().__init__(code)
        self.code, self.status, self.extra = code, status, extra


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _member(conn: Connection, family_id: str, user_id: str):
    return conn.execute(
        text("select role from family_members where family_id = :f and user_id = :u and status = 'active'"),
        {"f": family_id, "u": user_id},
    ).first()


def _require_member(conn: Connection, family_id: str, user_id: str) -> str:
    row = _member(conn, family_id, user_id)
    if row is None:
        raise FamilyError("not_a_member", 403)
    return str(row.role)


def _require_owner(conn: Connection, family_id: str, user_id: str) -> None:
    if _require_member(conn, family_id, user_id) != "owner":
        raise FamilyError("owner_only", 403)


def _event(conn: Connection, action: str, *, user_id: str | None = None, helper_id: str | None = None,
           actor: str | None = None, **detail) -> None:
    conn.execute(
        text("insert into permission_events (user_id, helper_id, actor_user_id, action, detail) values (:u, :h, :a, :ac, cast(:d as jsonb))"),
        {"u": user_id, "h": helper_id, "a": actor, "ac": action, "d": _json(detail)},
    )


def _json(d: dict) -> str:
    import json

    return json.dumps(d, default=str)


def _clean_name(name: str) -> str:
    name = (name or "").strip()
    if not 2 <= len(name) <= 60:
        raise FamilyError("validation", 422, field="name")
    return name


# ---------------------------------------------------------------- the family itself


def create_family(conn: Connection, user_id: str, name: str) -> dict:
    name = _clean_name(name)
    if conn.execute(text("select login_kind from users where id = :u and status = 'active'"), {"u": user_id}).scalar() != "own":
        raise FamilyError("assisted_readonly", 403)  # an assisted profile can do nothing until it is claimed
    row = conn.execute(
        text("insert into families (name, created_by) values (:n, :u) returning id, name, created_at"), {"n": name, "u": user_id}
    ).one()
    conn.execute(
        text("insert into family_members (family_id, user_id, role) values (:f, :u, 'owner')"), {"f": row.id, "u": user_id}
    )
    _event(conn, "family_created", user_id=user_id, actor=user_id, family_id=str(row.id), name=name)
    return family_dict(conn, str(row.id), user_id)


def family_dict(conn: Connection, family_id: str, viewer_id: str) -> dict:
    f = conn.execute(text("select id, name, created_by, created_at from families where id = :f"), {"f": family_id}).first()
    if f is None:
        raise FamilyError("not_found", 404)
    members = conn.execute(
        text("""select m.user_id, m.role, m.joined_at, u.display_name, u.language, u.age_band, u.phone, u.login_kind
                from family_members m join users u on u.id = m.user_id
                where m.family_id = :f and m.status = 'active' order by m.joined_at"""),
        {"f": family_id},
    ).all()
    return {
        "id": str(f.id),
        "name": f.name,
        "created_by": str(f.created_by),
        "my_role": _require_member(conn, family_id, viewer_id),
        "members": [
            {
                "user_id": str(m.user_id),
                "display_name": m.display_name,
                "language": m.language,
                "age_band": m.age_band,
                "phone": m.phone,
                "role": m.role,
                "login_kind": m.login_kind,
                "is_me": str(m.user_id) == viewer_id,
            }
            for m in members
        ],
    }


def my_families(conn: Connection, user_id: str) -> list[dict]:
    """The families the person belongs to - the third tab shows nothing when this is empty."""
    rows = conn.execute(
        text("""select f.id, f.name, m.role, (select count(*) from family_members x where x.family_id = f.id and x.status = 'active') as n
                from family_members m join families f on f.id = m.family_id
                where m.user_id = :u and m.status = 'active' order by m.joined_at"""),
        {"u": user_id},
    ).all()
    return [{"id": str(r.id), "name": r.name, "role": r.role, "member_count": r.n} for r in rows]


def rename_family(conn: Connection, family_id: str, user_id: str, name: str) -> dict:
    _require_owner(conn, family_id, user_id)
    name = _clean_name(name)
    conn.execute(text("update families set name = :n, updated_at = now() where id = :f"), {"n": name, "f": family_id})
    return family_dict(conn, family_id, user_id)


# ---------------------------------------------------------------- invitations (join yourself)


def send_invite(conn: Connection, family_id: str, user_id: str, contact: str, role: str = "member") -> dict:
    role = role if role in ASSIGNABLE else "member"
    my_role = _require_member(conn, family_id, user_id)
    if my_role not in ("owner", "helper"):
        raise FamilyError("helper_only", 403)
    if role == "helper" and my_role != "owner":
        raise FamilyError("owner_only", 403)  # only the owner hands out the helper role
    contact = (contact or "").strip()
    if not contact:
        raise FamilyError("validation", 422, field="contact")
    recent = conn.execute(
        text("select count(*) from family_invites where family_id = :f and created_at > now() - interval '1 hour'"), {"f": family_id}
    ).scalar_one()
    if recent >= MAX_INVITES_PER_HOUR:
        raise FamilyError("rate_limited", 429)
    code = security.new_code()
    row = conn.execute(
        text("""insert into family_invites (family_id, contact, role, code_hash, invited_by, expires_at)
                values (:f, :c, :r, :h, :u, :x) returning id, expires_at"""),
        {"f": family_id, "c": contact, "r": role, "h": security.hash_code("family-invite", code), "u": user_id, "x": _now() + timedelta(minutes=INVITE_MINUTES)},
    ).one()
    _event(conn, "invite_sent", actor=user_id, family_id=family_id, contact=contact, role=role, invite_id=str(row.id))
    if "@" in contact and mail.configured():
        try:
            family = conn.execute(text("select name from families where id = :f"), {"f": family_id}).one()
            mail.send_family_invite(contact, family.name, code, INVITE_MINUTES // 60)
        except mail.MailError as e:
            raise FamilyError("email_failed", 502, reason=e.code)
    return {"invite_id": str(row.id), "role": role, "expires_in": INVITE_MINUTES * 60,
            "dev_code": code if get_settings().is_dev else None}


def accept_invite(conn: Connection, user_id: str, code: str) -> dict:
    if conn.execute(text("select login_kind from users where id = :u and status = 'active'"), {"u": user_id}).scalar() != "own":
        raise FamilyError("assisted_readonly", 403)
    row = conn.execute(
        text("""select id, family_id, role, contact from family_invites
                where code_hash = :h and accepted_at is null and expires_at > now()
                order by created_at desc limit 1 for update"""),
        {"h": security.hash_code("family-invite", (code or "").strip())},
    ).first()
    if row is None:
        raise FamilyError("code_invalid")
    if conn.execute(
        text("select 1 from family_members where family_id = :f and user_id = :u and status = 'active'"), {"f": row.family_id, "u": user_id}
    ).first():
        raise FamilyError("already_member")
    conn.execute(text("update family_invites set accepted_at = now(), accepted_by = :u where id = :i"), {"u": user_id, "i": row.id})
    conn.execute(
        text("insert into family_members (family_id, user_id, role) values (:f, :u, :r)"), {"f": row.family_id, "u": user_id, "r": row.role}
    )
    _event(conn, "member_joined", user_id=user_id, actor=user_id, family_id=str(row.family_id), role=row.role, invite_id=str(row.id))
    return family_dict(conn, str(row.family_id), user_id)


# ---------------------------------------------------------------- the family list day to day


def change_role(conn: Connection, family_id: str, actor_id: str, member_id: str, role: str) -> dict:
    _require_owner(conn, family_id, actor_id)
    if role not in ROLES:
        raise FamilyError("validation", 422, field="role")
    if member_id == actor_id:
        raise FamilyError("validation", 422, field="role")  # the owner hands the family to someone else, not to themselves
    target = _require_member(conn, family_id, member_id)
    if target == "owner":
        raise FamilyError("owner_immutable", 403)
    conn.execute(text("update family_members set role = :r where family_id = :f and user_id = :u"), {"r": role, "f": family_id, "u": member_id})
    _event(conn, "role_changed", user_id=member_id, actor=actor_id, family_id=family_id, role=role)
    return family_dict(conn, family_id, actor_id)


def leave_or_remove(conn: Connection, family_id: str, actor_id: str, member_id: str | None = None) -> None:
    """A member leaves on their own (`member_id` "me" or omitted); an owner removes someone else."""
    if member_id in (None, "me"):
        member_id = actor_id
    if member_id != actor_id:
        _require_owner(conn, family_id, actor_id)
    target = _require_member(conn, family_id, member_id)
    if target == "owner":
        raise FamilyError("owner_immutable", 403)  # the family keeps its owner; the last owner cannot abandon it
    status = "left" if member_id == actor_id else "removed"
    kind = conn.execute(text("select login_kind from users where id = :u"), {"u": member_id}).scalar()
    conn.execute(
        text("update family_members set status = :s where family_id = :f and user_id = :u"),
        {"s": status if kind == "own" else "removed", "f": family_id, "u": member_id},
    )
    conn.execute(
        text("update delegations set status = 'revoked', revoked_at = now() where (user_id = :u or helper_id = :u) and status = 'active'"),
        {"u": member_id},
    )
    _event(conn, "member_removed", user_id=member_id, actor=actor_id, family_id=family_id, how=status)


# ---------------------------------------------------------------- assisted profiles (inside the family only)


def create_assisted(conn: Connection, family_id: str, helper_id: str, fields: dict) -> dict:
    """A profile for a family member who cannot set Wisdom up themselves. Born restricted: no email, no login,
    invisible outside this family, unable to invite or create - until they claim it with their own contact."""
    if _require_member(conn, family_id, helper_id) not in ("owner", "helper"):
        raise FamilyError("helper_only", 403)
    name = (fields.get("display_name") or "").strip()
    if not 2 <= len(name) <= 80:
        raise FamilyError("validation", 422, field="display_name")
    language = fields.get("language") or "en"
    if language not in LANGUAGES:
        raise FamilyError("validation", 422, field="language")
    age_band = fields.get("age_band")
    if age_band is not None and age_band not in ("under40", "40to59", "60plus"):
        raise FamilyError("validation", 422, field="age_band")
    phone = (fields.get("phone") or "").strip() or None
    relationship = (fields.get("relationship") or "").strip()[:40] or None
    if conn.execute(
        text("select count(*) from users where set_up_by = :h and login_kind = 'assisted' and status = 'active'"), {"h": helper_id}
    ).scalar_one() >= 5:
        raise FamilyError("assisted_limit", 403)  # one helper, at most five assisted profiles
    user = conn.execute(
        text("""insert into users (display_name, language, age_band, phone, login_kind, set_up_by)
                values (:n, :l, :a, :p, 'assisted', :h) returning id"""),
        {"n": name, "l": language, "a": age_band, "p": phone, "h": helper_id},
    ).one()
    conn.execute(text("insert into family_members (family_id, user_id, role) values (:f, :u, 'member')"), {"f": family_id, "u": user.id})
    conn.execute(
        text("insert into delegations (user_id, helper_id, level, granted_by) values (:u, :h, 'setup', 'setup')"), {"u": user.id, "h": helper_id}
    )
    _event(conn, "assisted_created", user_id=str(user.id), helper_id=helper_id, actor=helper_id,
           family_id=family_id, relationship=relationship)
    _event(conn, "delegation_granted", user_id=str(user.id), helper_id=helper_id, actor=helper_id, level="setup", granted_by="setup")
    return family_dict(conn, family_id, helper_id)


# ---------------------------------------------------------------- delegated access (who may act on whose account)

LEVELS = ("setup", "ongoing", "full")


def _delegation_dict(conn: Connection, delegation_id: str) -> dict:
    r = conn.execute(
        text("""select d.id, d.user_id, d.helper_id, d.level, d.status, d.granted_by, d.created_at,
                       hu.display_name as user_name, hu.login_kind as user_kind, hh.display_name as helper_name
                from delegations d
                join users hu on hu.id = d.user_id
                join users hh on hh.id = d.helper_id
                where d.id = :i"""),
        {"i": delegation_id},
    ).first()
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "helper_id": str(r.helper_id),
        "level": r.level,
        "status": r.status,
        "granted_by": r.granted_by,
        "since": str(r.created_at),
        "user_name": r.user_name,
        "user_kind": r.user_kind,
        "helper_name": r.helper_name,
    }


def _share_a_family(conn: Connection, a: str, b: str) -> bool:
    return conn.execute(
        text("""select 1 from family_members m1 join family_members m2 on m1.family_id = m2.family_id
                where m1.user_id = :a and m2.user_id = :b and m1.status = 'active' and m2.status = 'active' limit 1"""),
        {"a": a, "b": b},
    ).first() is not None


def grant(conn: Connection, user_id: str, helper_id: str, level: str) -> dict:
    """The person hands a helper access to THEIR OWN account. An assisted profile cannot grant: it has no say yet."""
    if user_id == helper_id:
        raise FamilyError("validation", 422, field="helper_id")
    if level not in LEVELS:
        raise FamilyError("validation", 422, field="level")
    if conn.execute(text("select login_kind from users where id = :u and status = 'active'"), {"u": user_id}).scalar() != "own":
        raise FamilyError("assisted_readonly", 403)
    if conn.execute(text("select status from users where id = :u and status = 'active'"), {"u": helper_id}).scalar() != "active":
        raise FamilyError("validation", 422, field="helper_id")
    if not _share_a_family(conn, user_id, helper_id):
        raise FamilyError("not_a_member", 403)  # delegated access only ever lives inside a family
    row = conn.execute(
        text("select * from delegations where user_id = :u and helper_id = :h for update"), {"u": user_id, "h": helper_id}
    ).first()
    if row is None:
        row = conn.execute(
            text("insert into delegations (user_id, helper_id, level, granted_by) values (:u, :h, :l, 'supported') returning *"),
            {"u": user_id, "h": helper_id, "l": level},
        ).one()
    elif row.status == "active":
        raise FamilyError("already_active", 409)
    else:
        row = conn.execute(
            text("""update delegations set level = :l, status = 'active', granted_by = 'supported',
                    revoked_at = null, updated_at = now() where id = :i returning *"""), {"l": level, "i": row.id}
        ).one()
    _event(conn, "delegation_granted", user_id=user_id, helper_id=helper_id, actor=user_id, level=level, granted_by="supported")
    return _delegation_dict(conn, str(row.id))


def delegations_held(conn: Connection, helper_id: str) -> list[dict]:
    """The people this helper may act for, with the level for each."""
    rows = conn.execute(
        text("select id from delegations d where d.helper_id = :h and d.status = 'active' order by d.created_at"),
        {"h": helper_id},
    ).all()
    return [_delegation_dict(conn, str(r.id)) for r in rows]


def delegations_about_me(conn: Connection, user_id: str) -> list[dict]:
    """Who may act on my account, and at what level (the supported person's own view)."""
    rows = conn.execute(
        text("select id from delegations d where d.user_id = :u and d.status = 'active' order by d.created_at"),
        {"u": user_id},
    ).all()
    return [_delegation_dict(conn, str(r.id)) for r in rows]


def history(conn: Connection, user_id: str) -> list[dict]:
    """The permission history about a person: granted, changed, revoked, joined, removed - nothing deleted."""
    rows = conn.execute(
        text("""select action, detail, created_at, actor_user_id, helper_id from permission_events
                where user_id = :u order by created_at desc limit 100"""),
        {"u": user_id},
    ).all()
    return [{"action": r.action, "detail": r.detail, "at": str(r.created_at),
             "actor": str(r.actor_user_id) if r.actor_user_id else None,
             "helper": str(r.helper_id) if r.helper_id else None} for r in rows]


def change_level(conn: Connection, delegation_id: str, actor_id: str, level: str) -> dict:
    """The supported person may change it either way; the helper may only LOWER their own access."""
    if level not in LEVELS:
        raise FamilyError("validation", 422, field="level")
    row = conn.execute(text("select * from delegations where id = :i for update"), {"i": delegation_id}).first()
    if row is None or row.status != "active":
        raise FamilyError("not_found", 404)
    supported, helper = str(row.user_id) == actor_id, str(row.helper_id) == actor_id
    if not (supported or helper):
        raise FamilyError("not_involved", 403)
    if helper and not supported and LEVELS.index(level) > LEVELS.index(row.level):
        raise FamilyError("supported_only", 403)  # a helper may step back, never step up by themselves
    row = conn.execute(
        text("update delegations set level = :l, updated_at = now() where id = :i returning *"), {"l": level, "i": delegation_id}
    ).one()
    _event(conn, "delegation_changed", user_id=str(row.user_id), helper_id=str(row.helper_id), actor=actor_id,
           old=row.level, new=level)
    return _delegation_dict(conn, delegation_id)


def revoke(conn: Connection, delegation_id: str, actor_id: str) -> None:
    """The supported person takes access away; the helper may also give it up themselves."""
    row = conn.execute(text("select * from delegations where id = :i for update"), {"i": delegation_id}).first()
    if row is None or row.status != "active":
        raise FamilyError("not_found", 404)
    if actor_id not in (str(row.user_id), str(row.helper_id)):
        raise FamilyError("not_involved", 403)
    conn.execute(text("update delegations set status = 'revoked', revoked_at = now(), updated_at = now() where id = :i"), {"i": delegation_id})
    _event(conn, "delegation_revoked", user_id=str(row.user_id), helper_id=str(row.helper_id), actor=actor_id)


def acting(conn: Connection, helper_id: str, person_id: str) -> str:
    """May this helper act on this person's account right now, and at what level?
    Re-checked on every acting request, so a change or a removal takes hold at once."""
    if helper_id == person_id:
        return "self"
    row = conn.execute(
        text("select level from delegations where user_id = :u and helper_id = :h and status = 'active'"),
        {"u": person_id, "h": helper_id},
    ).first()
    if row is None:
        raise FamilyError("no_access", 403)
    if not _share_a_family(conn, helper_id, person_id):
        raise FamilyError("no_access", 403)  # the access lives inside the family
    kind = conn.execute(text("select login_kind from users where id = :u and status = 'active'"), {"u": person_id}).scalar()
    if kind is None:
        raise FamilyError("no_access", 403)  # the person is gone or deleted
    if kind == "own" and row.level == "setup":
        raise FamilyError("setup_expired", 403)  # one-time help: it does not follow a claimed account
    return row.level


# ---------------------------------------------------------------- the person claims their own account


def start_claim(conn: Connection, family_id: str, helper_id: str, person_id: str) -> dict:
    """The helper asks for a claim code to SHOW to the person (who is with them). The code lets the PERSON
    take over - it never gives the helper anything they do not already have."""
    if _require_member(conn, family_id, helper_id) not in ("owner", "helper"):
        raise FamilyError("helper_only", 403)
    if _require_member(conn, family_id, person_id) is None:
        raise FamilyError("not_found", 404)
    delegation = conn.execute(
        text("select id from delegations where user_id = :u and helper_id = :h and status = 'active'"),
        {"u": person_id, "h": helper_id},
    ).first()
    if delegation is None:
        raise FamilyError("no_access", 403)
    kind = conn.execute(text("select login_kind from users where id = :u and status = 'active'"), {"u": person_id}).scalar()
    if kind != "assisted":
        raise FamilyError("already_claimed", 409)
    recent = conn.execute(
        text("select count(*) from claim_invites where user_id = :u and created_at > now() - interval '1 hour'"), {"u": person_id}
    ).scalar_one()
    if recent >= 5:
        raise FamilyError("rate_limited", 429)
    code = security.new_code()
    row = conn.execute(
        text("insert into claim_invites (user_id, code_hash, created_by, expires_at) values (:u, :h, :b, :x) returning id"),
        {"u": person_id, "h": security.hash_code("claim", code), "b": helper_id, "x": _now() + timedelta(minutes=CLAIM_MINUTES)},
    ).one()
    _event(conn, "claim_invited", user_id=person_id, helper_id=helper_id, actor=helper_id, invite_id=str(row.id))
    return {"claim_id": str(row.id), "expires_in": CLAIM_MINUTES * 60, "code": code}


def claim(conn: Connection, code: str, email: str, user_agent: str = "") -> dict:
    """The person takes their own account with the code and their own contact, and is signed in at once.
    The one-time setup help ends here; anything further they grant themselves."""
    from ..identity import service as identity

    row = conn.execute(
        text("""select id, user_id, attempts from claim_invites
                where code_hash = :h and used_at is null and expires_at > now()
                order by created_at desc limit 1 for update"""),
        {"h": security.hash_code("claim", (code or "").strip())},
    ).first()
    if row is None:
        raise FamilyError("code_invalid")
    if row.attempts >= 5:
        raise FamilyError("too_many_attempts", 429)
    email = identity.clean_email(email)
    user = conn.execute(text("select id from users where email = :e"), {"e": email}).first()
    if user is not None:
        raise FamilyError("email_in_use", 409)
    conn.execute(text("update claim_invites set used_at = now() where id = :i"), {"i": row.id})
    person = conn.execute(
        text("update users set email = :e, login_kind = 'own', updated_at = now() where id = :u and login_kind = 'assisted' returning *"),
        {"e": email, "u": row.user_id},
    ).first()
    if person is None:
        raise FamilyError("already_claimed", 409)
    conn.execute(
        text("""update delegations set status = 'revoked', revoked_at = now(), updated_at = now()
                where user_id = :u and status = 'active' and level = 'setup'"""),
        {"u": row.user_id},
    )
    _event(conn, "claimed", user_id=str(person.id), actor=str(person.id), email=email)
    _event(conn, "delegation_revoked", user_id=str(person.id), detail={"reason": "claim"})
    access, refresh = identity._issue_session(conn, str(person.id), user_agent)
    return {"access_token": access, "refresh_token": refresh, "user": identity.user_dict(person), "is_new": False}
