"""Runs the API: `uv run python -m bricks_api [--port 8000] [--reload]`."""

import argparse
import asyncio

import uvicorn

from .db import loop_factory


def main() -> None:
    parser = argparse.ArgumentParser(description="Bricks API")
    parser.add_argument("--host", default="0.0.0.0", help="0.0.0.0 lets phones on your Wi-Fi in")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    config = uvicorn.Config("bricks_api.main:app", host=args.host, port=args.port, loop="none")
    asyncio.run(uvicorn.Server(config).serve(), loop_factory=loop_factory())


if __name__ == "__main__":
    main()
