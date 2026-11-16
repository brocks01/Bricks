"""Host skills: what is coming up at the host(s) the person works for (an Active Ageing Centre, a mall, a community centre).
Read-only: it only looks at what their own host has listed. The same services the app uses, so every rule holds here too."""
from ..skills.registry import S, _local, skill
from . import service


@skill("my_host_events", "My host's opportunities", "What is coming up at the host(s) the person works for: title, when, where, how many are going and the stalls taken. Use it for 'what do I have coming up at the centre', 'my host's market days'.",
       {"host": S("A host name (optional)")}, risk="read")
def my_host_events(conn, me, args):
    hosts = service.my_hosts(conn, me)
    out = []
    for h in hosts:
        if args.get("host") and str(args["host"]).lower() not in h["name"].lower():
            continue
        evs = service.host_events(conn, me, h["id"])
        out.append({"host": h["name"], "role": h["role"],
                    "coming_up": [{"title": e["title"], "when": _local(conn, me, e["starts_at"]), "venue": e["venue_name"],
                                   "going": e["going_count"], "stalls_left": e["stalls_left"]} for e in evs]})
    return {"hosts": out}
