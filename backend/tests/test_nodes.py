"""The node index (ported from the JambaGrad nodes module): the pure rules, then the structure and the incremental roll-up through the API and the service."""
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.db import engine
from app.main import app
from app.modules.nodes import rules, service
from app.modules.nodes.rules import NodeError

client = TestClient(app)
EMAILS: list[str] = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    with engine().begin() as conn:
        for e in EMAILS:
            conn.execute(text("delete from communities where created_by in (select id from users where email = :e)"), {"e": e})
        for e in EMAILS:
            conn.execute(text("delete from users where email = :e"), {"e": e})
            conn.execute(text("delete from login_codes where email = :e"), {"e": e})


def person() -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    EMAILS.append(email)
    code = client.post("/v1/auth/request-code", json={"email": email}).json()["dev_code"]
    s = client.post("/v1/auth/verify-code", json={"email": email, "code": code}).json()
    return {"h": {"Authorization": f"Bearer {s['access_token']}"}, "id": s["user"]["id"]}


def add(p, type_, title, parent="", **kw):
    r = client.post("/v1/nodes", json={"type": type_, "title": title, "parent_id": parent, **kw}, headers=p["h"])
    assert r.status_code == 200, r.text
    return r.json()


def node(p, nid):
    return client.get(f"/v1/nodes/{nid}", headers=p["h"]).json()


def close(p, nid):
    r = client.post(f"/v1/nodes/{nid}/badge", json={"badge": {"status": "closed"}}, headers=p["h"])
    assert r.status_code == 200, r.text
    return r.json()


# ---------- pure rules ----------
def test_ids_are_a_letter_and_a_number_and_unknown_ones_name_nothing():
    assert rules.id_for("goal", 12) == "G12" and rules.type_of_id("G12") == "goal" and rules.type_of_id("T3") == "task"
    assert rules.type_of_id("Q1") == "" and rules.type_of_id("g12") == "" and rules.type_of_id("G") == "" and rules.type_of_id(None) == ""


def test_who_may_hold_whom():
    assert rules.can_hold("root", "area") and rules.can_hold("area", "goal") and rules.can_hold("goal", "task")
    assert not rules.can_hold("goal", "area") and not rules.can_hold("metric", "task") and not rules.can_hold("area", "root")


def test_progress_of_a_card_closed_rollup_and_held_below_done():
    assert rules.progress_of({"badge": {"status": "closed", "shape": "completion"}}) == 1
    open_ = {"badge": {"status": "open", "own": 1, "shape": "completion", "mode": "own"}}
    assert rules.progress_of(open_) == rules.HOLD_BELOW_DONE  # reaches 1 only by closing
    rolled = {"badge": {"status": "active", "own": 0, "shape": "completion", "mode": "rollup"}, "agg": {"w": 4, "s": 1}, "ledger": {"w": 0, "s": 0}}
    assert rules.progress_of(rolled) == 0.25
    with_ledger = {**rolled, "ledger": {"w": 4, "s": 4}}
    assert rules.progress_of(with_ledger) == (1 + 4) / (4 + 4)


def test_what_a_card_adds_to_its_parent():
    assert rules.contribution_of({"badge": {"status": "closed", "shape": "completion", "weight": 3}}) == (3, 3)
    assert rules.contribution_of({"badge": {"status": "skipped", "shape": "completion", "weight": 3}}) == (0, 0)
    assert rules.contribution_of({"badge": {"status": "open", "shape": "state"}}) == (0, 0)
    assert rules.contribution_of({"archived": True, "badge": {"status": "closed", "shape": "completion"}}) == (0, 0)
    assert rules.contribution_of({"badge": {"status": "open", "shape": "rate", "supports": 0.5, "value": 0.4}}) == (0.5, 0.2)


def test_a_bad_badge_is_refused_and_blocked_cannot_be_set():
    for bad in ({"status": "blocked"}, {"own": 2}, {"weight": -1}, {"shape": "x"}, {"mode": "x"}, {"due": "not a date"}):
        with pytest.raises(NodeError):
            rules.clean_badge(bad)
    assert rules.clean_badge({"status": "closed", "own": 1})["status"] == "closed"


# ---------- structure through the API ----------
def test_the_first_node_makes_the_root_and_ids_count_per_type():
    p = person()
    area = add(p, "area", "Moving")
    g1, g2 = add(p, "goal", "Walk more", area["nid"]), add(p, "goal", "Cycle", area["nid"])
    assert area["nid"] == "A1" and g1["nid"] == "G1" and g2["nid"] == "G2" and g1["parent_id"] == "A1" and g1["path"] == ["R1", "A1"] and g1["depth"] == 2
    tr = client.get("/v1/nodes/tree", headers=p["h"]).json()
    assert [n["nid"] for n in tr["nodes"]][:2] == ["R1", "A1"] and tr["nodes"][0]["type"] == "root"
    assert tr["growing"] == 2 and tr["leaves"] == 0


def test_a_task_cannot_hold_an_area_and_a_leaf_holds_nothing():
    p = person()
    g = add(p, "goal", "Goal")
    assert client.post("/v1/nodes", json={"type": "area", "title": "x", "parent_id": g["nid"]}, headers=p["h"]).json()["detail"]["code"] == "parent_cannot_hold"
    m = add(p, "metric", "Steps", g["nid"])
    assert client.post("/v1/nodes", json={"type": "task", "title": "x", "parent_id": m["nid"]}, headers=p["h"]).json()["detail"]["code"] == "parent_is_leaf"
    assert client.post("/v1/nodes", json={"type": "task", "title": "x", "parent_id": "T99"}, headers=p["h"]).json()["detail"]["code"] == "parent_not_found"
    assert client.post("/v1/nodes", json={"type": "root", "title": "x"}, headers=p["h"]).json()["detail"]["code"] == "validation"


def test_closing_work_rolls_up_through_every_level_and_counts_close():
    p = person()
    area = add(p, "area", "Giving")
    goal = add(p, "goal", "Help the garden", area["nid"])
    t1, t2 = add(p, "task", "Water", goal["nid"]), add(p, "task", "Weed", goal["nid"])
    assert node(p, goal["nid"])["progress"] == 0 and node(p, "R1")["counts"]["open"] == 3
    r = close(p, t1["nid"])
    assert r["changed"][0] == t1["nid"] and goal["nid"] in r["changed"]
    assert node(p, goal["nid"])["progress"] == 0.5
    close(p, t2["nid"])
    g = node(p, goal["nid"])
    assert g["progress"] == rules.HOLD_BELOW_DONE and g["counts"]["closed"] == 2  # a goal reaches 1 only when it is closed itself
    root = node(p, "R1")
    assert root["counts"]["closed"] == 2 and root["counts"]["open"] == 1  # the goal is still open
    close(p, goal["nid"])
    assert client.get("/v1/nodes/tree", headers=p["h"]).json()["leaves"] == 3


def test_reopening_takes_the_figure_back_and_a_stale_push_is_ignored():
    p = person()
    goal = add(p, "goal", "G")
    t = add(p, "task", "T", goal["nid"])
    assert client.post(f"/v1/nodes/{t['nid']}/badge", json={"badge": {"status": "closed"}, "v": 5}, headers=p["h"]).json()["ignored"] is False
    assert client.post(f"/v1/nodes/{t['nid']}/badge", json={"badge": {"status": "open"}, "v": 5}, headers=p["h"]).json()["ignored"] is True  # same version: ignored
    assert client.post(f"/v1/nodes/{t['nid']}/badge", json={"badge": {"status": "open"}, "v": 3}, headers=p["h"]).json()["reason"] == "stale"
    assert node(p, goal["nid"])["progress"] == rules.HOLD_BELOW_DONE
    assert node(p, t["nid"])["status"] == "closed"
    client.post(f"/v1/nodes/{t['nid']}/badge", json={"badge": {"status": "open"}, "v": 6}, headers=p["h"])
    assert node(p, goal["nid"])["progress"] == 0 and node(p, "R1")["counts"]["closed"] == 0


def test_the_roll_up_matches_a_full_rescan():
    p = person()
    goal = add(p, "goal", "G")
    ids = [add(p, "task", f"T{i}", goal["nid"], badge={"weight": i + 1})["nid"] for i in range(4)]
    close(p, ids[0])
    close(p, ids[3])
    with engine().begin() as conn:
        d = service.reconcile(conn, p["id"], goal["nid"])
    assert d["drift"]["w"] < 1e-9 and d["drift"]["s"] < 1e-9 and abs(d["progress"] - (1 + 4) / (1 + 2 + 3 + 4)) < 1e-9


def test_move_carries_the_subtree_and_the_sums_with_it():
    p = person()
    a1, a2 = add(p, "area", "One"), add(p, "area", "Two")
    goal = add(p, "goal", "G", a1["nid"])
    t = add(p, "task", "T", goal["nid"])
    close(p, t["nid"])
    assert node(p, a1["nid"])["counts"]["closed"] == 1 and node(p, a2["nid"])["counts"]["closed"] == 0
    r = client.post(f"/v1/nodes/{goal['nid']}/move", json={"new_parent_id": a2["nid"]}, headers=p["h"]).json()
    assert r["moved"] == 2 and r["node"]["path"] == ["R1", a2["nid"]]
    moved_task = node(p, t["nid"])
    assert moved_task["path"] == ["R1", a2["nid"], goal["nid"]] and moved_task["depth"] == 3
    assert node(p, a1["nid"])["counts"]["closed"] == 0 and node(p, a2["nid"])["counts"]["closed"] == 1 and node(p, "R1")["counts"]["closed"] == 1
    assert client.post(f"/v1/nodes/{a2['nid']}/move", json={"new_parent_id": goal["nid"]}, headers=p["h"]).json()["detail"]["code"] in ("cycle", "parent_cannot_hold")
    assert client.post("/v1/nodes/R1/move", json={"new_parent_id": a1["nid"]}, headers=p["h"]).json()["detail"]["code"] == "root"


def test_archiving_a_closed_task_folds_into_the_ledger_and_the_parent_keeps_its_figure():
    p = person()
    goal = add(p, "goal", "G")
    t1, t2 = add(p, "task", "A", goal["nid"]), add(p, "task", "B", goal["nid"])
    close(p, t1["nid"])
    assert node(p, goal["nid"])["progress"] == 0.5
    r = client.post(f"/v1/nodes/{t1['nid']}/archive", headers=p["h"]).json()
    assert r["archived"] == 1 and r["folded"] is True
    assert node(p, goal["nid"])["progress"] == 0.5  # the figure survives
    ids = [n["nid"] for n in client.get("/v1/nodes/tree", headers=p["h"]).json()["nodes"]]
    assert t1["nid"] not in ids and t2["nid"] in ids
    # archiving an open one just takes it out of the sums
    client.post(f"/v1/nodes/{t2['nid']}/archive", headers=p["h"])
    assert node(p, "R1")["counts"]["open"] == 1  # only the goal is left open


def test_prerequisites_block_and_free_and_a_loop_is_refused():
    p = person()
    goal = add(p, "goal", "G")
    a = add(p, "task", "First", goal["nid"])
    b = add(p, "task", "Second", goal["nid"], requires=[a["nid"]])
    assert b["blocked"] is True and b["status"] == "blocked" and b["waiting_on"] == 1
    assert node(p, "R1")["counts"]["blocked"] == 1
    r = close(p, a["nid"])
    assert r["unblocked"] == [b["nid"]] and node(p, b["nid"])["status"] == "open" and node(p, "R1")["counts"]["blocked"] == 0
    # reopening the prerequisite blocks it again
    client.post(f"/v1/nodes/{a['nid']}/badge", json={"badge": {"status": "open"}}, headers=p["h"])
    assert node(p, b["nid"])["blocked"] is True
    codes = lambda body, nid: client.post(f"/v1/nodes/{nid}/requires", json=body, headers=p["h"]).json()["detail"]["code"]
    assert codes({"requires": [b["nid"]]}, a["nid"]) == "requires_cycle"
    assert codes({"requires": [a["nid"]]}, a["nid"]) == "requires_self"
    assert codes({"requires": [goal["nid"]]}, a["nid"]) == "requires_ancestor"
    assert codes({"requires": ["T999"]}, a["nid"]) == "requires_not_found"
    assert client.post(f"/v1/nodes/{b['nid']}/requires", json={"requires": []}, headers=p["h"]).json()["blocked"] is False


def test_children_are_paged_in_order_and_the_path_runs_to_the_root():
    p = person()
    goal = add(p, "goal", "G")
    for i in range(5):
        add(p, "task", f"T{i}", goal["nid"])
    page = client.get(f"/v1/nodes/{goal['nid']}/children?limit=2", headers=p["h"]).json()
    assert [n["title"] for n in page["nodes"]] == ["T0", "T1"] and page["next"] == 1
    page2 = client.get(f"/v1/nodes/{goal['nid']}/children?limit=2&after={page['next']}", headers=p["h"]).json()
    assert [n["title"] for n in page2["nodes"]] == ["T2", "T3"]
    last = client.get(f"/v1/nodes/{goal['nid']}/children?limit=2&after={page2['next']}", headers=p["h"]).json()
    assert [n["title"] for n in last["nodes"]] == ["T4"] and last["next"] is None
    assert [n["nid"] for n in client.get(f"/v1/nodes/{page['nodes'][0]['nid']}/path", headers=p["h"]).json()["path"]] == ["R1", goal["nid"], page["nodes"][0]["nid"]]


def test_people_never_see_each_others_trees():
    a, b = person(), person()
    g = add(a, "goal", "Private")
    assert client.get(f"/v1/nodes/{g['nid']}", headers=b["h"]).status_code == 404
    assert client.post(f"/v1/nodes/{g['nid']}/badge", json={"badge": {"status": "closed"}}, headers=b["h"]).status_code == 404
    assert client.get("/v1/nodes/tree", headers=b["h"]).json()["nodes"][0]["counts"].get("open", 0) == 0
    assert client.get("/v1/nodes/tree").status_code in (401, 403)


def test_earn_grows_a_green_leaf_in_its_area_and_the_area_is_made_once():
    p = person()
    with engine().begin() as conn:
        service.earn(conn, p["id"], "move", "Moving", "Morning walk", kind="walk")
        service.earn(conn, p["id"], "move", "Moving", "Evening walk", kind="walk")
        service.earn(conn, p["id"], "give", "Giving back", "Garden session")
    tr = client.get("/v1/nodes/tree", headers=p["h"]).json()
    areas = [n for n in tr["nodes"] if n["type"] == "area"]
    assert sorted(a["key"] for a in areas) == ["give", "move"] and tr["leaves"] == 3 and tr["growing"] == 0
    assert next(a for a in areas if a["key"] == "move")["counts"]["closed"] == 2


# ---------- what the other modules tell the tree ----------
def walk_body():
    from datetime import datetime, timedelta, timezone
    return {"started_at": (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat(), "duration_s": 1800, "moving_s": 1620, "distance_m": 2400, "steps": 3100}


def test_a_saved_walk_and_a_yes_check_in_each_grow_a_leaf_once_a_day():
    p = person()
    assert client.post("/v1/health/walks", json=walk_body(), headers=p["h"]).status_code == 200
    client.post("/v1/health/checkin", json={"moved": True}, headers=p["h"])
    client.post("/v1/health/checkin", json={"moved": True}, headers=p["h"])  # changing the answer again adds nothing
    client.post("/v1/health/checkin", json={"moved": False}, headers=p["h"])
    tr = client.get("/v1/nodes/tree", headers=p["h"]).json()
    assert tr["leaves"] == 2 and [n["key"] for n in tr["nodes"] if n["type"] == "area"] == ["move"]


def test_saying_going_plants_a_gathering_and_once_it_has_passed_the_leaf_turns_green():
    lead, member = person(), person()
    cid = client.post("/v1/communities", json={"name": "Nodes Heights"}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    with engine().begin() as conn:
        soon = str(conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at) values (:c, :o, 'Tea morning', now() + interval '2 days') returning id"), {"c": cid, "o": lead["id"]}).scalar_one())
        past = str(conn.execute(text("insert into activities (community_id, organiser_id, title, starts_at) values (:c, :o, 'Old photographs', now() - interval '1 day') returning id"), {"c": cid, "o": lead["id"]}).scalar_one())
    client.post(f"/v1/communities/activities/{soon}/going", json={"going": True}, headers=member["h"])
    tr = client.get("/v1/nodes/tree", headers=member["h"]).json()
    ev = [n for n in tr["nodes"] if n["type"] == "event"]
    assert len(ev) == 1 and ev[0]["title"] == "Tea morning" and ev[0]["status"] == "open" and tr["leaves"] == 0 and tr["growing"] == 1
    client.post(f"/v1/communities/activities/{soon}/going", json={"going": False}, headers=member["h"])  # changed my mind
    assert [n for n in client.get("/v1/nodes/tree", headers=member["h"]).json()["nodes"] if n["type"] == "event"] == []
    with engine().begin() as conn:
        conn.execute(text("insert into activity_participants (activity_id, user_id, status) values (:a, :u, 'going')"), {"a": past, "u": member["id"]})
        from app.modules.nodes import feed
        feed.going(conn, member["id"], past, True)  # said going before it happened
    tr = client.get("/v1/nodes/tree", headers=member["h"]).json()
    assert tr["leaves"] == 0 and tr["growing"] == 1  # it passed, but nobody checked them in: still an outline, never a green leaf by itself
    with engine().begin() as conn:
        conn.execute(text("update activities set starts_at = now() - interval '6 days' where id = :a"), {"a": past})
    tr = client.get("/v1/nodes/tree", headers=member["h"]).json()
    assert tr["leaves"] == 0 and tr["growing"] == 0  # long past and never attended: taken off the tree


# ---------- the Tree of Wisdom: a leaf only for showing up ----------
def wisdom_of(p, **q):
    r = client.get("/v1/nodes/wisdom", params=q, headers=p["h"])
    assert r.status_code == 200, r.text
    return r.json()


def circle(name):
    """A lead, a member and a gathering that is on right now (so the member may check themself in)."""
    lead, member = person(), person()
    cid = client.post("/v1/communities", json={"name": name}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    return lead, member, cid


def gathering(cid, lead, title, when="now()"):
    with engine().begin() as conn:
        return str(conn.execute(text(f"insert into activities (community_id, organiser_id, title, starts_at) values (:c, :o, :t, {when}) returning id"), {"c": cid, "o": lead["id"], "t": title}).scalar_one())


def test_going_alone_gives_no_leaf_and_a_check_in_gives_exactly_one():
    lead, member, cid = circle("Bishan Walkers")
    a = gathering(cid, lead, "Morning walk")
    client.post(f"/v1/communities/activities/{a}/going", json={"going": True}, headers=member["h"])
    assert wisdom_of(member) == {"leaves": 0, "events": [], "next_before": None}  # saying "I'm going" earns nothing
    assert client.post(f"/v1/communities/activities/{a}/checkin", json={}, headers=member["h"]).status_code == 200
    w = wisdom_of(member)
    assert w["leaves"] == 1 and len(w["events"]) == 1
    e = w["events"][0]
    assert e["title"] == "Morning walk" and e["source"] == "community" and e["source_name"] == "Bishan Walkers" and e["at"] and e["id"] and e["ref_id"] == a
    client.post(f"/v1/communities/activities/{a}/checkin", json={}, headers=member["h"])  # reported again, by the person
    client.post(f"/v1/communities/activities/{a}/checkin", json={"user_id": member["id"]}, headers=lead["h"])  # and by their lead
    assert wisdom_of(member)["leaves"] == 1
    client.post(f"/v1/communities/activities/{a}/going", json={"going": False}, headers=member["h"])  # "going" changed to no afterwards
    assert wisdom_of(member)["leaves"] == 1  # a check-in leaf is never taken away


def test_a_check_in_without_going_first_still_gives_a_leaf():
    lead, member, cid = circle("Toa Payoh Gardeners")
    a = gathering(cid, lead, "Herb morning")
    assert client.post(f"/v1/communities/activities/{a}/checkin", json={"user_id": member["id"]}, headers=lead["h"]).status_code == 200
    w = wisdom_of(member)
    assert w["leaves"] == 1 and w["events"][0]["title"] == "Herb morning"
    assert wisdom_of(lead)["leaves"] == 0  # the lead who checked them in earns nothing for it


def test_showed_up_for_market_and_wisdom_gives_one_each_and_only_a_self_report_can_be_withdrawn():
    from datetime import datetime, timedelta, timezone
    from app.modules.nodes import feed
    lead, member, cid = circle("Ang Mo Kio Singers")
    a = gathering(cid, lead, "Choir practice")
    client.post(f"/v1/communities/activities/{a}/checkin", json={}, headers=member["h"])
    now = datetime.now(timezone.utc)
    market_ref, session_ref = str(uuid.uuid4()), str(uuid.uuid4())
    with engine().begin() as conn:
        for _ in range(2):  # reported twice: still one leaf each
            feed.showed_up(conn, member["id"], "market", market_ref, "Sunday market day", now - timedelta(days=1), "Bishan Active Ageing Centre")
            feed.showed_up(conn, member["id"], "wisdom", session_ref, "Repairing a bicycle", now - timedelta(days=2), "Lakshmi Nair")
        feed.showed_up(conn, member["id"], "festival", "x", "Not a source", now)  # an unknown source is refused quietly and never raises
    w = wisdom_of(member)
    assert w["leaves"] == 3 and [e["source"] for e in w["events"]] == ["community", "market", "wisdom"]  # newest first
    assert w["events"][1]["source_name"] == "Bishan Active Ageing Centre" and w["events"][2]["source_name"] == "Lakshmi Nair"
    with engine().begin() as conn:
        feed.showed_up(conn, member["id"], "market", market_ref, "Sunday market day", now, on=False)  # "I went" changed to "I didn't go"
        feed.showed_up(conn, member["id"], "community", a, "Choir practice", now, on=False)  # a check-in cannot be withdrawn
        feed.showed_up(conn, member["id"], "wisdom", session_ref, "Repairing a bicycle", now, on=False)  # nor a completed session
    w = wisdom_of(member)
    assert w["leaves"] == 2 and [e["source"] for e in w["events"]] == ["community", "wisdom"]
    with engine().begin() as conn:
        feed.showed_up(conn, member["id"], "market", market_ref, "Sunday market day", now - timedelta(days=1))  # changed back to "I went"
    assert wisdom_of(member)["leaves"] == 3


def test_a_reminder_ticked_a_walk_and_a_goal_give_no_wisdom_leaf():
    from app.modules.nodes import feed
    p = person()
    with engine().begin() as conn:
        feed.care(conn, p["id"], str(uuid.uuid4()), "2026-11-17T08:00:00+00:00", "Morning medicine", "medicine", True)
        feed.walked(conn, p["id"])
        service.earn(conn, p["id"], "give", "Giving back", "Garden session")
    assert client.get("/v1/nodes/tree", headers=p["h"]).json()["leaves"] >= 3  # the old tree still counts them, exactly as before
    assert wisdom_of(p) == {"leaves": 0, "events": [], "next_before": None}


def test_the_history_is_paged_in_order_once_each_and_never_shows_another_person():
    from datetime import datetime, timedelta, timezone
    from app.modules.nodes import feed
    p, other = person(), person()
    now = datetime.now(timezone.utc)
    with engine().begin() as conn:
        for i in range(7):
            feed.showed_up(conn, p["id"], "market", f"day-{i}", f"Market day {i}", now - timedelta(days=i), None)
        feed.showed_up(conn, p["id"], "wisdom", "same-time-a", "Session A", now - timedelta(days=3), "Tan Ah Kow")  # same moment as day 3: the id breaks the tie
        feed.showed_up(conn, other["id"], "market", "day-0", "Somebody else's day", now, None)
    seen, before, pages = [], None, 0
    while True:
        w = wisdom_of(p, limit=3, **({"before": before} if before else {}))
        assert w["leaves"] == 8 and len(w["events"]) <= 3
        seen += w["events"]
        pages += 1
        before = w["next_before"]
        if not before:
            break
    assert pages == 3 and len(seen) == 8 and len({e["id"] for e in seen}) == 8
    assert [e["at"] for e in seen] == sorted((e["at"] for e in seen), reverse=True)
    assert all(e["title"] != "Somebody else's day" for e in seen) and seen[0]["source_name"] is None
    assert wisdom_of(other)["leaves"] == 1
    assert len(wisdom_of(p, limit=500)["events"]) == 8  # the limit is capped at 50, not refused
    assert len(wisdom_of(p, before="nonsense")["events"]) == 8  # a cursor that cannot be read starts again from the newest
    assert client.get("/v1/nodes/wisdom").status_code in (401, 403)


def test_upcoming_carries_the_going_count_names_and_category():
    lead, member = person(), person()
    cid = client.post("/v1/communities", json={"name": "Upcoming Heights"}, headers=lead["h"]).json()["id"]
    code = client.get(f"/v1/communities/{cid}", headers=lead["h"]).json()["community"]["invite_code"]
    client.post("/v1/communities/join", json={"code": code}, headers=member["h"])
    with engine().begin() as conn:
        conn.execute(text("update users set display_name = 'Lakshmi Nair' where id = :u"), {"u": lead["id"]})
        a = str(conn.execute(text("insert into activities (community_id, organiser_id, title, category, starts_at) values (:c, :o, 'Sunday Market', 'Market', now() + interval '2 days') returning id"), {"c": cid, "o": lead["id"]}).scalar_one())
    client.post(f"/v1/communities/activities/{a}/going", json={"going": True}, headers=lead["h"])
    up = client.get("/v1/communities/upcoming?limit=5", headers=member["h"]).json()["activities"]
    row = next(x for x in up if x["id"] == a)
    assert row["category"] == "Market" and row["going_count"] == 1 and row["going_names"] == ["Lakshmi Nair"] and row["i_going"] is False
