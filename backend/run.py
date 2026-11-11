"""Launcher that works from any Python build.
  python backend/run.py            start the API on http://0.0.0.0:8800
  python backend/run.py migrate    apply new SQL migrations
"""
import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

if len(sys.argv) > 1 and sys.argv[1] == "migrate":
    runpy.run_module("app.migrate", run_name="__main__")
else:
    import uvicorn

    # 0.0.0.0 so a phone on the same Wi-Fi (Expo Go) can reach it during development.
    uvicorn.run("app.main:app", host="0.0.0.0", port=8800)
