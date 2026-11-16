"""Launcher that works from any Python build.
  python backend/run.py            start the API on http://0.0.0.0:8800
  python backend/run.py migrate    apply new SQL migrations
  python backend/run.py seed-demo [emails...] [--reset]   one full demo community (see app/seed_demo.py)
  python backend/run.py showcase you@example.com [--undo]   fill one account's history and the leader tools for a demo (see app/showcase.py)
  python backend/run.py skill you@example.com [name] [json]   run or list a backend skill for one account, no app needed (see app/modules/skills)
  python backend/run.py call you@example.com [+number]   place one phone call that talks to Wisdom (see app/call_cli.py)
  python backend/run.py link-phone you@example.com +65...   let that number phone Wisdom and reach this account
  python backend/run.py seed-wisdom [--reset]   a matured Singapore: real centres, circles, ~1000 people, stories, offers, market days (see app/seed_wisdom.py)
  python backend/run.py seed-explore [--reset]            the Explore library (see app/seed_explore.py)
"""
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

if len(sys.argv) > 1 and sys.argv[1] == "migrate":
    runpy.run_module("app.migrate", run_name="__main__")
elif len(sys.argv) > 1 and sys.argv[1] == "seed-demo":
    from app.seed_demo import main as seed_main

    seed_main(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "seed-wisdom":
    from app.seed_wisdom import main as seed_wisdom_main

    seed_wisdom_main(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "showcase":
    from app.showcase import main as showcase_main

    showcase_main(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "skill":
    from app.skills_cli import main as skill_main

    skill_main(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "call":
    from app.call_cli import main as call_main

    call_main(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "link-phone":
    from app.phone_cli import main as phone_main

    phone_main(sys.argv[2:])
elif len(sys.argv) > 1 and sys.argv[1] == "seed-explore":
    from app.seed_explore import main as explore_main

    explore_main(sys.argv[2:])
else:
    import uvicorn

    # 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) can reach it during development.
    import os

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8800")))
