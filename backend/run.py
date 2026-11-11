"""Launcher that works from any Python build.
  python backend/run.py            start the API on http://0.0.0.0:8800
  python backend/run.py migrate    apply new SQL migrations
  python backend/run.py seed-demo [emails...] [--reset]   one full demo community (see app/seed_demo.py)
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
elif len(sys.argv) > 1 and sys.argv[1] == "seed-explore":
    from app.seed_explore import main as explore_main

    explore_main(sys.argv[2:])
else:
    import uvicorn

    # 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) can reach it during development.
    import os

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8800")))
