"""The structure of a person's tree: create, move, rename, archive, badge, prerequisites. Every function takes the person id and touches only that person's cards.

  attach        the ONLY way a node is created. Allocates the id, path, depth and order; checks the parent, the depth cap and the prerequisites; adds the
                node's counts and its figure to every node above it.
  move          re-parent a card and rewrite the paths below it in one statement; the sums above move with it.
  archive       take a card and what hangs below it out of the live tree; a closed goal or task first folds into its parent's ledger.
  set_badge     the figures the book of a node reports (status, own figure, weight ...). Idempotent and ordered by the book's version.
  set_requires  prerequisites: a card that waits for something not yet closed or skipped is blocked.

The roll-up is kept incrementally: each card holds the sums of what is below it, so a change adds its DIFFERENCE up the chain of ancestors, one atomic
increment per level, and nothing is rescanned. `reconcile` repairs drift. There is no cap on how many nodes hang below a goal; depth is capped (16).
"""
import json
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import Connection, text

from . import rules
from .rules import NodeError

COLS = ("nid, type, kind, title, description, parent_id, path, depth, ord, child_seq, archived, requires, blocked, waiting_on, ref, key, badge, "
        "agg_w, agg_s, agg_v, ledger_w, ledger_s, ledger_n, c_open, c_active, c_blocked, c_paused, c_closed, version, created_at, updated_at")


def _card(r) -> dict:
    return {
        "nid": r.nid, "type": r.type, "kind": r.kind, "title": r.title, "description": r.description, "parent_id": r.parent_id, "path": list(r.path or []),
        "depth": r.depth, "order": r.ord, "child_seq": r.child_seq, "archived": r.archived, "requires": list(r.requires or []), "blocked": r.blocked,
        "waiting_on": r.waiting_on, "ref": r.ref, "key": r.key, "badge": dict(r.badge or {}),
        "agg": {"w": r.agg_w, "s": r.agg_s, "v": r.agg_v}, "ledger": {"w": r.ledger_w, "s": r.ledger_s, "n": r.ledger_n},
        "counts": {"open": r.c_open, "active": r.c_active, "blocked": r.c_blocked, "paused": r.c_paused, "closed": r.c_closed},
        "version": r.version, "created_at": r.created_at, "updated_at": r.updated_at,
    }


def _get(conn: Connection, me: str, nid: str, lock: bool = False) -> dict | None:
    r = conn.execute(text(f"select {COLS} from nodes where user_id = :u and nid = :n{' for update' if lock else ''}"), {"u": me, "n": nid}).first()
    return _card(r) if r else None


def _need(conn: Connection, me: str, nid: str, lock: bool = False) -> dict:
    c = _get(conn, me, nid, lock)
    if not c:
        raise NodeError("not_found", 404)
    return c


def _event(conn: Connection, me: str, nid: str, type_: str, actor: str, data: dict | None = None) -> None:
    conn.execute(text("insert into node_events (user_id, node_id, type, actor, data) values (:u, :n, :t, :a, cast(:d as jsonb))"),
                 {"u": me, "n": nid, "t": type_, "a": actor, "d": json.dumps(data or {}, default=str)})


# ---------- ids and the root ----------
def next_nid(conn: Connection, me: str, type_: str) -> str:
    seq = conn.execute(text("insert into node_counters (user_id, type, seq) values (:u, :t, 1) on conflict (user_id, type) do update set seq = node_counters.seq + 1 returning seq"),
                       {"u": me, "t": type_}).scalar_one()
    return rules.id_for(type_, seq)


def ensure_root(conn: Connection, me: str) -> dict:
    have = conn.execute(text(f"select {COLS} from nodes where user_id = :u and type = 'root'"), {"u": me}).first()
    if have:
        return _card(have)
    conn.execute(text("insert into node_counters (user_id, type, seq) values (:u, 'root', 1) on conflict (user_id, type) do update set seq = greatest(node_counters.seq, 1)"), {"u": me})
    conn.execute(text("insert into nodes (user_id, nid, type, title, badge) values (:u, 'R1', 'root', 'Me', cast(:b as jsonb)) on conflict do nothing"),
                 {"u": me, "b": json.dumps(rules.default_badge("root"))})
    return _card(conn.execute(text(f"select {COLS} from nodes where user_id = :u and type = 'root'"), {"u": me}).one())


# ---------- the incremental roll-up ----------
def bump(conn: Connection, me: str, ancestors: list[str], deltas: list[tuple[str, int]]) -> None:
    if not ancestors or not deltas:
        return
    sets = ", ".join(f"c_{k} = c_{k} + {int(d)}" for k, d in deltas if k in rules.COUNT_KEYS)
    if sets:
        conn.execute(text(f"update nodes set {sets}, last_at = now() where user_id = :u and nid = any(:a)"), {"u": me, "a": ancestors})


def subtree_counts(card: dict) -> list[tuple[str, int]]:
    out = {k: v for k, v in (card.get("counts") or {}).items() if v}
    own = rules.count_key_of(card)
    if own:
        out[own] = out.get(own, 0) + 1
    return list(out.items())


def negate(deltas: list[tuple[str, int]]) -> list[tuple[str, int]]:
    return [(k, -d) for k, d in deltas]


def settle(conn: Connection, me: str, nid: str) -> None:
    c = _get(conn, me, nid)
    if not c:
        return
    p = rules.progress_of(c)
    if abs(p - (c["badge"].get("progress") or 0)) > rules.EPS:
        conn.execute(text("update nodes set badge = jsonb_set(badge, '{progress}', to_jsonb(cast(:p as float8))) where user_id = :u and nid = :n"), {"u": me, "n": nid, "p": p})


def bubble(conn: Connection, me: str, start: str, dw: float, ds: float) -> list[str]:
    """Add (dw, ds) (a change in what a child contributes) to `start` and walk up while the figure keeps moving. Returns the nids whose progress changed."""
    changed: list[str] = []
    nid, hops = start, 0
    while nid and (abs(dw) > rules.EPS or abs(ds) > rules.EPS) and hops < rules.LIMITS["MAX_DEPTH"] + 2:
        hops += 1
        r = conn.execute(text(f"update nodes set agg_w = agg_w + :w, agg_s = agg_s + :s, agg_v = agg_v + 1 where user_id = :u and nid = :n and not archived returning {COLS}"),
                         {"u": me, "n": nid, "w": dw, "s": ds}).first()
        if not r:
            break
        after = _card(r)
        before = {**after, "agg": {"w": after["agg"]["w"] - dw, "s": after["agg"]["s"] - ds, "v": after["agg"]["v"] - 1}}
        p_after = rules.progress_of(after)
        conn.execute(text("update nodes set badge = jsonb_set(badge, '{progress}', to_jsonb(cast(:p as float8))) where user_id = :u and nid = :n"), {"u": me, "n": nid, "p": p_after})
        if abs(rules.progress_of(before) - p_after) > rules.EPS:
            changed.append(nid)
        wb, sb = rules.contribution_of(before)
        wa, sa = rules.contribution_of({**after, "badge": {**after["badge"], "progress": p_after}})
        dw, ds = wa - wb, sa - sb
        nid = after["parent_id"]
    return changed


def reconcile(conn: Connection, me: str, nid: str) -> dict | None:
    """Rescan one card's children and rewrite its sums and figure. Returns how far the incremental sums had drifted. Repair and test tool."""
    card = _get(conn, me, nid, lock=True)
    if not card:
        return None
    w = s = 0.0
    for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and parent_id = :n and not archived"), {"u": me, "n": nid}):
        cw, cs = rules.contribution_of(_card(r))
        w, s = w + cw, s + cs
    drift = {"w": abs(w - card["agg"]["w"]), "s": abs(s - card["agg"]["s"])}
    nxt = {**card, "agg": {"w": w, "s": s, "v": card["agg"]["v"] + 1}}
    conn.execute(text("update nodes set agg_w = :w, agg_s = :s, agg_v = agg_v + 1, badge = jsonb_set(badge, '{progress}', to_jsonb(cast(:p as float8))) where user_id = :u and nid = :n"),
                 {"u": me, "n": nid, "w": w, "s": s, "p": rules.progress_of(nxt)})
    return {"drift": drift, "progress": rules.progress_of(nxt)}


# ---------- prerequisites ----------
def check_requires(conn: Connection, me: str, self_nid: str, ancestors: list[str], requires: list[str]) -> list[dict]:
    """The cards a card must wait for. Refused when one is missing, archived, the card itself, above it, below it, or when they would form a loop."""
    found = {c["nid"]: c for c in (_card(r) for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and nid = any(:ids)"), {"u": me, "ids": requires}))}
    for i in requires:
        n = found.get(i)
        if not n:
            raise NodeError("requires_not_found", 404)
        if i == self_nid:
            raise NodeError("requires_self", 409)
        if n["archived"]:
            raise NodeError("requires_archived", 409)
        if i in (ancestors or []):
            raise NodeError("requires_ancestor", 409)
        if self_nid and self_nid in n["path"]:
            raise NodeError("requires_descendant", 409)
    if self_nid:
        seen, frontier = set(requires), list(requires)
        while frontier:
            nxt = []
            for r in conn.execute(text("select nid, requires from nodes where user_id = :u and nid = any(:ids) and cardinality(requires) > 0"), {"u": me, "ids": frontier}):
                for q in r.requires or []:
                    if q == self_nid:
                        raise NodeError("requires_cycle", 409)
                    if q not in seen:
                        seen.add(q)
                        nxt.append(q)
            frontier = nxt
            if len(seen) > 2000:
                raise NodeError("requires_too_complex", 409)
    return [found[i] for i in requires]


def _unsatisfied(cards: list[dict]) -> list[dict]:
    return [c for c in cards if not rules.is_satisfied_card(c)]


def refresh_blocked_for(conn: Connection, me: str, changed: list[str], actor: str = "system") -> dict:
    """Re-evaluate every card that waits on any of `changed` (a card was closed, skipped, archived or reopened)."""
    out = {"unblocked": [], "blocked": []}
    deps = [_card(r) for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and requires && cast(:ids as text[]) and not archived"), {"u": me, "ids": list(set(changed))})]
    for d in deps:
        req = [_card(r) for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and nid = any(:ids)"), {"u": me, "ids": d["requires"]})]
        waiting = len(_unsatisfied(req))
        blocked = waiting > 0 and not rules.is_satisfied_status(d["badge"].get("status"))
        if blocked == d["blocked"] and waiting == d["waiting_on"]:
            continue
        after = {**d, "blocked": blocked, "waiting_on": waiting}
        conn.execute(text("update nodes set blocked = :b, waiting_on = :w, version = version + 1, updated_at = now() where user_id = :u and nid = :n"), {"u": me, "n": d["nid"], "b": blocked, "w": waiting})
        bump(conn, me, d["path"], rules.counts_delta(d, after))
        if blocked != d["blocked"]:
            t = "blocked" if blocked else "unblocked"
            _event(conn, me, d["nid"], t, actor, {"waiting_on": waiting})
            out[t].append(d["nid"])
    return out


def _refuse_requires_deadlock(conn: Connection, me: str, node: dict, new_path: list[str]) -> None:
    sub = [(r.nid, list(r.path), list(r.requires or [])) for r in conn.execute(text("select nid, path, requires from nodes where user_id = :u and :n = any(path)"), {"u": me, "n": node["nid"]})]
    all_ = [(node["nid"], node["requires"], new_path)] + [(n, rq, new_path + p[p.index(node["nid"]):]) for n, p, rq in sub]
    for n, rq, above in all_:
        hit = next((r for r in rq if r in above), None)
        if hit:
            raise NodeError("requires_ancestor", 409, f"{n} requires {hit}, which would then contain it")
    above_of = {n: above for n, _, above in all_}
    ids = list(above_of)
    for r in conn.execute(text("select nid, requires from nodes where user_id = :u and requires && cast(:ids as text[]) and not archived"), {"u": me, "ids": ids}):
        hit = next((x for x in (r.requires or []) if x in above_of and r.nid in above_of[x]), None)
        if hit:
            raise NodeError("requires_descendant", 409, f"{r.nid} requires {hit}, which would then be inside it")


def set_requires(conn: Connection, me: str, nid: str, requires: list, actor: str = "person") -> dict:
    node = _need(conn, me, nid, lock=True)
    if node["type"] == "root":
        raise NodeError("root", 409)
    if node["archived"]:
        raise NodeError("archived", 409)
    req = rules.clean_requires(requires)
    needs = check_requires(conn, me, node["nid"], node["path"], req) if req else []
    waiting = len(_unsatisfied(needs))
    blocked = waiting > 0 and not rules.is_satisfied_status(node["badge"].get("status"))
    after = {**node, "blocked": blocked, "waiting_on": waiting, "requires": req}
    conn.execute(text("update nodes set requires = :r, blocked = :b, waiting_on = :w, version = version + 1, updated_at = now() where user_id = :u and nid = :n"),
                 {"u": me, "n": nid, "r": req, "b": blocked, "w": waiting})
    bump(conn, me, node["path"], rules.counts_delta(node, after))
    _event(conn, me, nid, "requires", actor, {"requires": req, "blocked": blocked})
    return rules.view_of(_get(conn, me, nid))


# ---------- structure ----------
def attach(conn: Connection, me: str, type_: str, title: str, parent_id: str = "", kind: str = "", description: str = "", requires: list | None = None,
           badge: dict | None = None, key: str = "", ref: dict | None = None, actor: str = "person") -> dict:
    if type_ not in rules.NODE_TYPES or type_ == "root":
        raise NodeError("validation", 400, "type must be one of " + ", ".join(t for t in rules.NODE_TYPES if t != "root"))
    title = rules.clip(title, rules.LIMITS["TITLE"])
    if not title:
        raise NodeError("validation", 400, "title is required")
    if parent_id and not rules.type_of_id(parent_id):
        raise NodeError("validation", 400, "parent_id is not a node id")
    req = rules.clean_requires(requires)
    given = rules.clean_badge(badge)
    root = ensure_root(conn, me)
    parent = _get(conn, me, parent_id, lock=True) if parent_id else root
    if not parent:
        raise NodeError("parent_not_found", 404)
    if parent["archived"]:
        raise NodeError("parent_archived", 409)
    if rules.NODE_TYPES[parent["type"]]["leaf"]:
        raise NodeError("parent_is_leaf", 409)
    if not rules.can_hold(parent["type"], type_):
        raise NodeError("parent_cannot_hold", 409)
    path = parent["path"] + [parent["nid"]]
    if len(path) >= rules.LIMITS["MAX_DEPTH"]:
        raise NodeError("tree_too_deep", 409)
    needs = check_requires(conn, me, "", path, req) if req else []
    waiting = len(_unsatisfied(needs))
    nid = next_nid(conn, me, type_)
    slot = conn.execute(text("update nodes set child_seq = child_seq + 1 where user_id = :u and nid = :n returning child_seq"), {"u": me, "n": parent["nid"]}).scalar_one()
    bd = {**rules.default_badge(type_), **given, "v": 0}
    draft = {"type": type_, "badge": bd, "agg": {"w": 0, "s": 0}, "ledger": {"w": 0, "s": 0}}
    bd["progress"] = rules.progress_of(draft)
    blocked = waiting > 0 and not rules.is_satisfied_status(bd["status"])
    conn.execute(text("insert into nodes (user_id, nid, type, kind, title, description, parent_id, path, depth, ord, requires, blocked, waiting_on, ref, key, badge) "
                      "values (:u, :nid, :t, :k, :title, :d, :p, :path, :depth, :ord, :rq, :bl, :wo, cast(:ref as jsonb), :key, cast(:b as jsonb))"),
                 {"u": me, "nid": nid, "t": type_, "k": rules.clip(kind, rules.LIMITS["KIND"]), "title": title, "d": rules.clip(description, rules.LIMITS["DESCRIPTION"]),
                  "p": parent["nid"], "path": path, "depth": len(path), "ord": slot - 1, "rq": req, "bl": blocked, "wo": waiting,
                  "ref": json.dumps(ref) if ref else None, "key": key or None, "b": json.dumps(bd, default=str)})
    card = _get(conn, me, nid)
    _event(conn, me, nid, "created", actor, {"parent_id": parent["nid"]})
    bump(conn, me, path, rules.counts_delta(None, card))
    w, s = rules.contribution_of(card)
    if w or s:
        bubble(conn, me, parent["nid"], w, s)
    return rules.view_of(_get(conn, me, nid))


def rename(conn: Connection, me: str, nid: str, title: str | None = None, description: str | None = None, kind: str | None = None, actor: str = "person") -> dict:
    node = _need(conn, me, nid, lock=True)
    if node["archived"]:
        raise NodeError("archived", 409)
    t = node["title"] if title is None else rules.clip(title, rules.LIMITS["TITLE"])
    if not t:
        raise NodeError("validation", 400, "title is required")
    d = node["description"] if description is None else rules.clip(description, rules.LIMITS["DESCRIPTION"])
    k = node["kind"] if kind is None else rules.clip(kind, rules.LIMITS["KIND"])
    conn.execute(text("update nodes set title = :t, description = :d, kind = :k, version = version + 1, updated_at = now() where user_id = :u and nid = :n"), {"u": me, "n": nid, "t": t, "d": d, "k": k})
    _event(conn, me, nid, "renamed", actor, {"from": node["title"], "to": t})
    return rules.view_of(_get(conn, me, nid))


def move(conn: Connection, me: str, nid: str, new_parent: str, actor: str = "person") -> dict:
    node = _need(conn, me, nid, lock=True)
    parent = _need(conn, me, new_parent, lock=True)
    if node["type"] == "root":
        raise NodeError("root", 409)
    if node["archived"]:
        raise NodeError("archived", 409)
    if parent["nid"] == nid or nid in parent["path"]:
        raise NodeError("cycle", 409)
    if rules.NODE_TYPES[parent["type"]]["leaf"]:
        raise NodeError("parent_is_leaf", 409)
    if not rules.can_hold(parent["type"], node["type"]):
        raise NodeError("parent_cannot_hold", 409)
    if parent["archived"]:
        raise NodeError("parent_archived", 409)
    if parent["nid"] == node["parent_id"]:
        return {"node": rules.view_of(node), "moved": 0}
    new_path = parent["path"] + [parent["nid"]]
    deepest = conn.execute(text("select max(depth) from nodes where user_id = :u and :n = any(path) and not archived"), {"u": me, "n": nid}).scalar()
    if len(new_path) + ((deepest if deepest is not None else node["depth"]) - node["depth"]) >= rules.LIMITS["MAX_DEPTH"]:
        raise NodeError("tree_too_deep", 409)
    _refuse_requires_deadlock(conn, me, node, new_path)
    slot = conn.execute(text("update nodes set child_seq = child_seq + 1 where user_id = :u and nid = :n returning child_seq"), {"u": me, "n": parent["nid"]}).scalar_one()
    old_parent = node["parent_id"]
    conn.execute(text("update nodes set parent_id = :p, path = :np, depth = :d, ord = :o, version = version + 1, updated_at = now() where user_id = :u and nid = :n"),
                 {"u": me, "n": nid, "p": parent["nid"], "np": new_path, "d": len(new_path), "o": slot - 1})
    below = conn.execute(text("update nodes set path = cast(:np as text[]) || path[array_position(path, :n) : cardinality(path)] where user_id = :u and :n = any(path)"),
                         {"u": me, "n": nid, "np": new_path}).rowcount
    conn.execute(text("update nodes set depth = cardinality(path) where user_id = :u and :n = any(path)"), {"u": me, "n": nid})
    counts = subtree_counts(node)
    bump(conn, me, node["path"], negate(counts))
    bump(conn, me, new_path, counts)
    w, s = rules.contribution_of(node)
    if w or s:
        bubble(conn, me, old_parent, -w, -s)
        bubble(conn, me, parent["nid"], w, s)
    _event(conn, me, nid, "moved", actor, {"from": old_parent, "to": parent["nid"], "moved": below + 1})
    return {"node": rules.view_of(_get(conn, me, nid)), "moved": below + 1}


def archive(conn: Connection, me: str, nid: str, actor: str = "person") -> dict:
    node = _need(conn, me, nid, lock=True)
    if node["type"] == "root":
        raise NodeError("root", 409)
    if node["archived"]:
        return {"archived": 0, "folded": False}
    below = [r.nid for r in conn.execute(text("select nid from nodes where user_id = :u and :n = any(path) and not archived"), {"u": me, "n": nid})]
    w, s = rules.contribution_of(node)
    fold = node["badge"].get("status") == "closed" and node["type"] in ("goal", "task") and bool(node["parent_id"])
    if fold:
        conn.execute(text("update nodes set agg_w = agg_w - :w, agg_s = agg_s - :s, ledger_w = ledger_w + :w, ledger_s = ledger_s + :s, ledger_n = ledger_n + 1 where user_id = :u and nid = :p"),
                     {"u": me, "p": node["parent_id"], "w": w, "s": s})
    elif node["parent_id"] and (w or s):
        bubble(conn, me, node["parent_id"], -w, -s)
    bump(conn, me, node["path"], negate(subtree_counts(node)))
    conn.execute(text("update nodes set archived = true, archived_at = now(), version = version + 1, updated_at = now() where user_id = :u and (nid = :n or :n = any(path))"), {"u": me, "n": nid})
    _event(conn, me, nid, "archived", actor, {"below": len(below), "folded": fold})
    refresh_blocked_for(conn, me, [nid] + below, actor)
    return {"archived": len(below) + 1, "folded": fold}


def set_badge(conn: Connection, me: str, nid: str, badge: dict, v: int | None = None, actor: str = "person") -> dict:
    """The book reports its figures. `v` is the book's version: one that is not newer than the card's is ignored (a retry or a late push can never undo a newer figure).
    None means 'one more than now' (a caller that is its own book)."""
    clean = rules.clean_badge(badge)
    before = _need(conn, me, nid, lock=True)
    if before["archived"]:
        raise NodeError("archived", 409)
    have = before["badge"].get("v") or 0
    if v is not None and (not isinstance(v, int) or v < 1):
        raise NodeError("validation", 400, "v (the book's version) must be a whole number from 1")
    if v is not None and have >= v:
        return {"ignored": True, "reason": "stale", "node": rules.view_of(before), "changed": []}
    nv = have + 1 if v is None else v
    merged = {**before["badge"], **clean, "v": nv}
    conn.execute(text("update nodes set badge = cast(:b as jsonb), version = version + 1, updated_at = now() where user_id = :u and nid = :n"), {"u": me, "n": nid, "b": json.dumps(merged, default=str)})
    after = {**before, "badge": merged, "version": before["version"] + 1}
    changed = [nid]
    bump(conn, me, before["path"], rules.counts_delta(before, after))
    wb, sb = rules.contribution_of(before)
    wa, sa = rules.contribution_of(after)
    if before["parent_id"] and (abs(wa - wb) > rules.EPS or abs(sa - sb) > rules.EPS):
        changed += bubble(conn, me, before["parent_id"], wa - wb, sa - sb)
    settle(conn, me, nid)
    freed = refresh_blocked_for(conn, me, [nid], actor) if rules.is_satisfied_card(before) != rules.is_satisfied_card(after) else {"unblocked": [], "blocked": []}
    _event(conn, me, nid, "badge", actor, {"status": merged.get("status")})
    return {"ignored": False, "node": rules.view_of(_get(conn, me, nid)), "changed": changed, **freed}


# ---------- built-in nodes and earning ----------
def ensure_builtin(conn: Connection, me: str, key: str, type_: str, title: str, kind: str = "", parent_key: str = "") -> dict:
    """A node with a stable key (an area): made the first time it is asked for, never twice."""
    if not key or len(key) > 60:
        raise NodeError("validation", 400, "key is required")
    have = _get(conn, me, conn.execute(text("select nid from nodes where user_id = :u and key = :k"), {"u": me, "k": key}).scalar() or "")
    if have:
        return rules.view_of(have)
    parent = ""
    if parent_key:
        parent = conn.execute(text("select nid from nodes where user_id = :u and key = :k"), {"u": me, "k": parent_key}).scalar()
        if not parent:
            raise NodeError("parent_not_found", 404)
    return attach(conn, me, type_, title, parent_id=parent or "", kind=kind, key=key, actor="system")


def earn(conn: Connection, me: str, area_key: str, area_title: str, title: str, type_: str = "task", kind: str = "", weight: float = 1.0) -> dict:
    """Something the person really did: it hangs in its area, already closed. This is how the tree grows a green leaf."""
    area = ensure_builtin(conn, me, area_key, "area", area_title)
    return attach(conn, me, type_, title, parent_id=area["nid"], kind=kind, badge={"status": "closed", "own": 1, "weight": weight}, actor="system")


# ---------- reads ----------
def get(conn: Connection, me: str, nid: str) -> dict:
    return rules.view_of(_need(conn, me, nid))


def children(conn: Connection, me: str, nid: str, limit: int = 50, after: int = -1) -> dict:
    limit = max(1, min(int(limit), rules.LIMITS["PAGE_MAX"]))
    _need(conn, me, nid)
    rows = [_card(r) for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and parent_id = :n and not archived and ord > :a order by ord limit :l"),
                                           {"u": me, "n": nid, "a": after, "l": limit + 1})]
    more = len(rows) > limit
    rows = rows[:limit]
    return {"nodes": [rules.view_of(c) for c in rows], "next": rows[-1]["order"] if more else None}


def path_of(conn: Connection, me: str, nid: str) -> list[dict]:
    node = _need(conn, me, nid)
    ids = node["path"] + [nid]
    by = {c["nid"]: c for c in (_card(r) for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and nid = any(:i)"), {"u": me, "i": ids}))}
    return [rules.view_of(by[i]) for i in ids if i in by]


def tree(conn: Connection, me: str, limit: int = 600) -> dict:
    """The live tree for drawing: the root first, then level by level in reading order. Capped; `truncated` says so."""
    ensure_root(conn, me)
    from . import feed
    feed.sync_events(conn, me)  # gatherings that have passed turn green first
    rows = [_card(r) for r in conn.execute(text(f"select {COLS} from nodes where user_id = :u and not archived order by depth, ord, nid limit :l"), {"u": me, "l": limit + 1})]
    truncated = len(rows) > limit
    nodes = [rules.view_of(c) for c in rows[:limit]]
    root = nodes[0]
    c = root["counts"]
    today = _today(conn, me)
    habits = []
    for n in nodes:
        if n["type"] == "habit":
            st = habit_stats(_habit_days(conn, me, n["nid"], today), n["kind"] or "daily", today)
            habits.append({"nid": n["nid"], "title": n["title"], "kind": n["kind"] or "daily", **st})
    leaves = c.get("closed", 0)
    return {"nodes": nodes, "truncated": truncated, "leaves": leaves, "growing": c.get("open", 0) + c.get("active", 0) + c.get("blocked", 0) + c.get("paused", 0),
            "level": leaves // 10 + 1, "habits": habits, "roots": roots_of(conn, me, today)}


# ---------- the Tree of Wisdom ----------
def wisdom(conn: Connection, me: str, limit: int = 20, before: str | None = None) -> dict:
    """The leaves of the Tree of Wisdom: how many events the person showed up to, and those events newest first, a page at a time.
    `before` is the `next_before` of the page before; a cursor that cannot be read starts from the newest again."""
    limit = max(1, min(int(limit), 50))
    total = conn.execute(text("select count(*) from wisdom_leaves where user_id = :u"), {"u": me}).scalar_one()
    where, args = "", {"u": me, "l": limit + 1}
    if before:
        try:
            at, _, lid = before.partition("~")
            args.update({"at": datetime.fromisoformat(at), "id": str(uuid.UUID(lid))})
            where = " and (at, id) < (:at, cast(:id as uuid))"
        except ValueError:
            where = ""
    rows = conn.execute(text(f"select id, title, at, source, source_name from wisdom_leaves where user_id = :u{where} order by at desc, id desc limit :l"), args).all()
    more = len(rows) > limit
    rows = rows[:limit]
    return {
        "leaves": total,
        "events": [{"id": str(r.id), "title": r.title, "at": r.at.isoformat(), "source": r.source, "source_name": r.source_name} for r in rows],
        "next_before": f"{rows[-1].at.isoformat()}~{rows[-1].id}" if more and rows else None,
    }


# ---------- goals and repeating habits ----------
def add_goal(conn: Connection, me: str, title: str) -> dict:
    """A goal of the person's own, under their built-in "My goals" area."""
    area = ensure_builtin(conn, me, "goals", "area", "My goals")
    return attach(conn, me, "goal", title, parent_id=area["nid"], actor="person")


def add_habit(conn: Connection, me: str, title: str, kind: str = "daily") -> dict:
    area = ensure_builtin(conn, me, "habits", "area", "My habits")
    return attach(conn, me, "habit", title, parent_id=area["nid"], kind="weekly" if kind == "weekly" else "daily", badge={"supports": 1, "value": 0}, actor="person")


def ensure_habit(conn: Connection, me: str, key: str, title: str, kind: str, area_key: str, area_title: str) -> dict:
    """A habit the app itself keeps for the person (move every day, walk each week): made once, under its area."""
    have = conn.execute(text("select nid from nodes where user_id = :u and key = :k"), {"u": me, "k": key}).scalar()
    if have:
        return rules.view_of(_get(conn, me, have))
    area = ensure_builtin(conn, me, area_key, "area", area_title)
    return attach(conn, me, "habit", title, parent_id=area["nid"], kind=kind, key=key, badge={"supports": 1, "value": 0}, actor="system")


def _today(conn: Connection, me: str) -> date:
    off = conn.execute(text("select coalesce(tz_offset_min, 480) from users where id = :u"), {"u": me}).scalar_one()
    return (datetime.now(timezone.utc) + timedelta(minutes=off)).date()


def _week(d: date) -> tuple[int, int]:
    y, w, _ = d.isocalendar()
    return y, w


def habit_stats(days: set[date], kind: str, today: date) -> dict:
    """How steady a habit is. daily: days done out of the last 28. weekly: weeks (of the last 4) with at least one. Streak: days (or weeks) in a row, counted back from
    today (or from yesterday / last week when today / this week is still open). Never scolds: a gap just restarts the count."""
    if kind == "weekly":
        weeks = {_week(d) for d in days}
        last4 = {_week(today - timedelta(days=7 * i)) for i in range(4)}
        strength = len(weeks & last4) / 4
        streak, i = 0, 0 if _week(today) in weeks else 1
        while _week(today - timedelta(days=7 * i)) in weeks:
            streak += 1
            i += 1
        return {"strength": min(1.0, strength), "streak": streak, "done_today": _week(today) in weeks}
    window = {today - timedelta(days=i) for i in range(28)}
    strength = len(days & window) / 28
    streak, i = 0, 0 if today in days else 1
    while today - timedelta(days=i) in days:
        streak += 1
        i += 1
    return {"strength": min(1.0, strength), "streak": streak, "done_today": today in days}


def _habit_days(conn: Connection, me: str, nid: str, today: date) -> set[date]:
    return {r.day for r in conn.execute(text("select day from node_repeats where user_id = :u and nid = :n and day >= :d"), {"u": me, "n": nid, "d": today - timedelta(days=90)})}


def habit_log(conn: Connection, me: str, nid: str, undo: bool = False) -> dict:
    """The person did the habit today (or takes it back). The habit's figure moves, and so does everything above it."""
    node = _need(conn, me, nid, lock=True)
    if node["type"] != "habit":
        raise NodeError("not_a_habit", 409)
    if node["archived"]:
        raise NodeError("archived", 409)
    today = _today(conn, me)
    if undo:
        conn.execute(text("delete from node_repeats where user_id = :u and nid = :n and day = :d"), {"u": me, "n": nid, "d": today})
    else:
        conn.execute(text("insert into node_repeats (user_id, nid, day) values (:u, :n, :d) on conflict do nothing"), {"u": me, "n": nid, "d": today})
    st = habit_stats(_habit_days(conn, me, nid, today), node["kind"] or "daily", today)
    set_badge(conn, me, nid, {"value": st["strength"], "supports": 1, "label": str(st["streak"])}, actor="system" if node["key"] else "person")
    return {"nid": nid, **st}


def roots_of(conn: Connection, me: str, today: date) -> dict:
    """The roots of the tree are the person's health: days they said they moved and walks they recorded in the last four weeks. A wellness picture, never a score of the body."""
    since = today - timedelta(days=27)
    days = conn.execute(text("select count(*) from health_checkins where user_id = :u and moved and day >= :d"), {"u": me, "d": since}).scalar_one()
    walks = conn.execute(text("select count(*) from health_walks where user_id = :u and started_at >= :s"), {"u": me, "s": datetime.now(timezone.utc) - timedelta(days=28)}).scalar_one()
    strength = min(1.0, 0.6 * (days / 28) + 0.4 * min(1.0, walks / 12))
    return {"strength": round(strength, 3), "moved_days": days, "walks": walks}


def erase(conn: Connection, me: str) -> int:
    n = conn.execute(text("delete from nodes where user_id = :u"), {"u": me}).rowcount
    conn.execute(text("delete from node_events where user_id = :u"), {"u": me})
    conn.execute(text("delete from node_counters where user_id = :u"), {"u": me})
    return n
