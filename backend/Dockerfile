FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /bin/uv
WORKDIR /srv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project
COPY src ./src
COPY migrations ./migrations
RUN uv sync --locked --no-dev
EXPOSE 8000
# Hosts (Render, Railway, Fly) pass the port in $PORT.
CMD ["sh", "-c", "uv run --no-sync python -m bricks_api --port ${PORT:-8000}"]
