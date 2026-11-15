"""The rules of the node index, as pure functions (no database). Ported from the JambaGrad nodes module.

A node is a CARD: where it hangs, what it points at, and a few small figures (the badge). Progress of a card: a closed card is 1; a card in
`rollup` mode that has counted nodes below it is the weighted mean of them; otherwise it is `own`. A piece of work holds just below done (0.99)
until it is closed. Ids are a type letter plus a number counted per person and type ("G12"), never reused.
"""
import re
from datetime import datetime

# code: the letter in the id. leaf: cannot have children. counted: counts toward the totals above it (the work). shape: completion (0..1), rate, or state.
NODE_TYPES = {
    "root":   {"code": "R", "leaf": False, "counted": False, "shape": "completion", "rollup": True},
    "area":   {"code": "A", "leaf": False, "counted": False, "shape": "state",      "rollup": False},
    "goal":   {"code": "G", "leaf": False, "counted": True,  "shape": "completion", "rollup": True},
    "task":   {"code": "T", "leaf": False, "counted": True,  "shape": "completion", "rollup": True},
    "habit":  {"code": "H", "leaf": False, "counted": True,  "shape": "rate",       "rollup": False},
    "event":  {"code": "E", "leaf": False, "counted": True,  "shape": "state",      "rollup": False},
    "metric": {"code": "M", "leaf": True,  "counted": False, "shape": "state",      "rollup": False},
}
TYPE_OF_CODE = {v["code"]: k for k, v in NODE_TYPES.items()}
ID_PATTERN = re.compile(r"^[A-Z][0-9]{1,12}$")
BADGE_STATUSES = ("open", "active", "paused", "closed", "skipped")
SATISFIED = ("closed", "skipped", "archived")
SHAPES = ("completion", "rate", "state")
COUNT_KEYS = ("open", "active", "blocked", "paused", "closed")
LIMITS = {"MAX_DEPTH": 16, "MAX_REQUIRES": 8, "TITLE": 200, "DESCRIPTION": 1000, "KIND": 40, "LABEL": 120, "PAGE_DEFAULT": 50, "PAGE_MAX": 200}
HOLD_BELOW_DONE = 0.99
EPS = 1e-9


class NodeError(Exception):
    def __init__(self, code: str, status: int = 400, message: str = ""):
        super().__init__(code)
        self.code, self.status, self.message = code, status, message


def id_for(type_: str, n: int) -> str:
    return f"{NODE_TYPES[type_]['code']}{n}"


def type_of_id(nid) -> str:
    s = "" if nid is None else str(nid)
    return TYPE_OF_CODE.get(s[0], "") if ID_PATTERN.match(s) else ""


def can_hold(parent_type: str, child_type: str) -> bool:
    """Where each kind may hang. A leaf holds nothing; an area sits at the top (under the root) or under an area; everything else may hang anywhere that can hold."""
    if parent_type not in NODE_TYPES or child_type not in NODE_TYPES or child_type == "root" or NODE_TYPES[parent_type]["leaf"]:
        return False
    if child_type == "area":
        return parent_type in ("root", "area")
    return True


def clip(v, n: int) -> str:
    return v.strip()[:n] if isinstance(v, str) else ""


def _num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f == f and f not in (float("inf"), float("-inf")) else None


def clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def clean_requires(raw) -> list[str]:
    if raw is None:
        return []
    if not isinstance(raw, list):
        raise NodeError("validation", 400, "requires must be a list of node ids")
    out: list[str] = []
    for x in raw:
        i = str(x or "").strip()
        if not type_of_id(i):
            raise NodeError("validation", 400, f'"{i[:20]}" is not a node id')
        if i not in out:
            out.append(i)
    if len(out) > LIMITS["MAX_REQUIRES"]:
        raise NodeError("validation", 400, f"a node can require at most {LIMITS['MAX_REQUIRES']} others")
    return out


def clean_badge(raw) -> dict:
    """Only the given and valid fields come back; a bad value is an error, not a silent change."""
    i = raw if isinstance(raw, dict) else {}
    out: dict = {}
    if "status" in i:
        if i["status"] not in BADGE_STATUSES:
            raise NodeError("validation", 400, f"status must be one of {', '.join(BADGE_STATUSES)} (blocked and archived are set by the tree)")
        out["status"] = i["status"]
    for k, hi in (("own", 1), ("supports", 1), ("weight", 1000)):
        if k in i:
            n = _num(i[k])
            if n is None or i[k] is None or n < 0 or n > hi:
                raise NodeError("validation", 400, f"{k} must be a number from 0 to {hi}")
            out[k] = n
    if "shape" in i:
        if i["shape"] not in SHAPES:
            raise NodeError("validation", 400, f"shape must be one of {', '.join(SHAPES)}")
        out["shape"] = i["shape"]
    if "value" in i:
        if i["value"] is not None and _num(i["value"]) is None:
            raise NodeError("validation", 400, "value must be a number or null")
        out["value"] = None if i["value"] is None else _num(i["value"])
    if "label" in i:
        out["label"] = clip(i["label"], LIMITS["LABEL"])
    if "due" in i:
        if i["due"] is None:
            out["due"] = None
        else:
            try:
                out["due"] = datetime.fromisoformat(str(i["due"]).replace("Z", "+00:00")).isoformat()
            except ValueError:
                raise NodeError("validation", 400, "due is not a date")
    if "mode" in i:
        if i["mode"] not in ("rollup", "own"):
            raise NodeError("validation", 400, "mode must be rollup or own")
        out["mode"] = i["mode"]
    return out


def default_badge(type_: str) -> dict:
    t = NODE_TYPES[type_]
    return {"status": "active" if type_ == "root" else "open", "own": 0, "progress": 0, "weight": 1, "supports": 0, "shape": t["shape"],
            "value": None, "label": "", "due": None, "mode": "rollup" if t["rollup"] else "own", "v": 0}


def is_satisfied_status(status: str) -> bool:
    return status in SATISFIED


def effective_status(card: dict | None) -> str:
    """What a person sees: archived, else blocked (only while there is work left to do), else the status the badge holds."""
    if not card:
        return ""
    if card.get("archived"):
        return "archived"
    status = (card.get("badge") or {}).get("status") or "open"
    if card.get("blocked") and not is_satisfied_status(status):
        return "blocked"
    return status


def is_satisfied_card(card: dict) -> bool:
    return is_satisfied_status(effective_status(card))


def progress_of(card: dict) -> float:
    b = card.get("badge") or {}
    if b.get("status") == "closed":
        return 1.0
    own = _num(b.get("own"))
    p = clamp01(own if own is not None else 0.0)
    if b.get("mode") == "rollup":
        agg, led = card.get("agg") or {}, card.get("ledger") or {}
        w = (agg.get("w") or 0) + (led.get("w") or 0)
        if w > 0:
            p = max(p, clamp01(((agg.get("s") or 0) + (led.get("s") or 0)) / w))
    return min(HOLD_BELOW_DONE, p) if b.get("shape") == "completion" else p


def contribution_of(card: dict | None) -> tuple[float, float]:
    """What a card adds to its parent's sums: (weight, weight x progress). Skipped and archived add nothing; a state has no figure; a rate adds its value at the weight it supports."""
    if not card or card.get("archived"):
        return 0.0, 0.0
    b = card.get("badge") or {}
    if b.get("status") == "skipped" or b.get("shape") == "state":
        return 0.0, 0.0
    if b.get("shape") == "rate":
        sup, val = _num(b.get("supports")), _num(b.get("value"))
        if not sup or sup <= 0 or val is None:
            return 0.0, 0.0
        return sup, sup * min(1.0, val)
    w = _num(b.get("weight"))
    w = w if w is not None and w >= 0 else 1.0
    return w, w * progress_of(card)


def count_key_of(card: dict | None) -> str:
    if not card or card.get("archived") or not NODE_TYPES.get(card.get("type"), {}).get("counted"):
        return ""
    s = effective_status(card)
    return s if s in COUNT_KEYS else ""


def counts_delta(before: dict | None, after: dict | None) -> list[tuple[str, int]]:
    a, b = count_key_of(before), count_key_of(after)
    if a == b:
        return []
    out = []
    if a:
        out.append((a, -1))
    if b:
        out.append((b, 1))
    return out


def view_of(card: dict | None) -> dict | None:
    """What a screen sees of a card."""
    if not card:
        return None
    b = card.get("badge") or {}
    return {
        "nid": card["nid"], "type": card["type"], "kind": card.get("kind") or "", "title": card["title"], "description": card.get("description") or "",
        "parent_id": card.get("parent_id") or "", "path": card.get("path") or [], "depth": card.get("depth") or 0, "order": card.get("order") or 0,
        "status": effective_status(card), "archived": bool(card.get("archived")), "blocked": bool(card.get("blocked")), "waiting_on": card.get("waiting_on") or 0,
        "requires": card.get("requires") or [], "key": card.get("key") or "", "ref": card.get("ref"),
        "badge": {"status": b.get("status"), "progress": progress_of(card), "weight": b.get("weight"), "shape": b.get("shape"), "value": b.get("value"),
                  "label": b.get("label") or "", "due": b.get("due"), "mode": b.get("mode"), "v": b.get("v") or 0},
        "progress": progress_of(card), "counts": card.get("counts") or {}, "version": card.get("version") or 1,
    }
