"""python backend/run.py skill you@example.com [skill-name] ['{"json": "args"}']   run (or list) a skill for one account, with no app open."""
import json
import sys

from sqlalchemy import text

from .core.db import engine
from .modules.skills import registry


def main(argv: list[str]) -> None:
    if not argv:
        print(__doc__)
        return
    email, rest = argv[0].strip().lower(), argv[1:]
    if not rest:
        for s in registry.listing():
            print(f"{s['name']:<18} [{s['risk']}]  {s['label']}")
        return
    try:
        args = json.loads(rest[1]) if len(rest) > 1 else {}
    except ValueError:
        print("The arguments must be JSON, for example '{\"moved\": true}'.")
        return
    with engine().begin() as conn:
        uid = conn.execute(text("select id from users where lower(email) = :e"), {"e": email}).scalar()
        if uid is None:
            print("No account with that email.")
            return
        print(json.dumps(registry.run(conn, str(uid), rest[0], args), indent=2, default=str))


if __name__ == "__main__":
    main(sys.argv[1:])
