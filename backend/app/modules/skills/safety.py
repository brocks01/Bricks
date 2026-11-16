"""Safety skills: the agent can take a report and block a person on any channel, with the same rules the app follows."""
from sqlalchemy import text

from .. import safety
from .registry import B, S, SkillError, skill


@skill("report_something", "Report something", "Report a story, an offer, a request, a circle, an event or a person as unsafe, unkind, spam or a false experience. The agent needs the thing's id (it is in the conversation's context) and may add the person's own note.",
       {"kind": S("What is being reported: capsule, offer, request, message, community, event or person"),
        "target": S("The id of the thing being reported"),
        "reason": S("unsafe, unkind, spam, false_experience or other"), "note": S("What is wrong, in the person's words (optional)")},
       ["kind", "target", "reason"], risk="safe")
def report_something(conn, me, args):
    r = safety.report(conn, me, str(args.get("kind") or ""), str(args.get("target") or ""), str(args.get("reason") or ""), args.get("note"))
    return {"reported": True, "status": r["status"]}


def _person_by_name(conn, me: str, words: str):
    """The person the words name, among the people this person shares a circle or family with (never a stranger
    matched by a first name alone). One match answers; two or more are an answer, never a guess."""
    rows = conn.execute(
        text("""select distinct u.id, u.display_name from users u
                where u.id <> :me and u.display_name is not null and lower(u.display_name) = lower(:n)
                  and (exists (select 1 from memberships m where m.user_id = :me and m.status = 'active' and m.community_id in
                        (select community_id from memberships where user_id = u.id and status = 'active'))
                    or exists (select 1 from family_members f1 join family_members f2 on f1.family_id = f2.family_id
                        where f1.user_id = :me and f1.status = 'active' and f2.user_id = u.id and f2.status = 'active'))"""),
        {"me": me, "n": words.strip()},
    ).all()
    if not rows:
        raise SkillError("not_found", "I could not find that person among your circles and family.")
    if len(rows) > 1:
        raise SkillError("which_one", "More than one person has that name.", [str(r.display_name) for r in rows][:6])
    return str(rows[0].id)


@skill("block_person", "Block a person", "The person does not want to meet, hear from or see a certain person any more. This keeps the two apart everywhere (no introductions, no messages, none of each other's offers, requests or stories). It tells nobody, and it can be undone. FIRST make sure the person means it, then call with confirmed true.",
       {"person": S("The person's id, or their name"), "confirmed": B("true only after the person said yes")}, ["person"], risk="confirm")
def block_person(conn, me, args):
    who = str(args.get("person") or "")
    pid = who if _is_uuid(who) else _person_by_name(conn, me, who)
    r = safety.block(conn, me, pid)
    return {"blocked": r["blocked"], "status": r["status"]}


def _is_uuid(value: str) -> bool:
    from uuid import UUID

    try:
        UUID(value)
        return True
    except ValueError:
        return False
