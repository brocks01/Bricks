# Instructions for any coding agent (OpenCode, Claude Code, others)

## Read first, in this order
1. `team-docs/README.md` (the index), then `team-docs/01-philosophy/philosophy.md`: **what Wisdom is and why we build it** (we solve social isolation and loneliness; belonging is a feeling; three products: Communities, Wisdom, Marketplace; the app is one door).
2. `team-docs/02-product/tabs-requirements.md`, then the product page of **your area**.
3. `team-docs/04-build/areas.md`: **who owns which files, the rules for several sessions working in this one folder, the open tasks, and the definition of done.** Your prompt names your area; build its open tasks, in order.
4. `team-docs/03-technical/architecture.md` when you need modules, data, how to run it and environment names.

The documentation is the single source of truth. There is no handoff file and no log: keep your area's product page true (its Status section) when behaviour changes.

## Hard rules (the owner's, non-negotiable)
- **Never print, paste, log or commit a secret** (API keys, tokens, passwords, database URLs). `.env` files are never committed and never opened to read values; scripts may read them in-process and print only names.
- **Never place a phone call.** **ngrok belongs to the owner**: never start, stop or reconfigure it.
- **Do not start, stop or restart servers.** The orchestrator keeps the API and the web app running.
- **Stay in your area's files** (see `areas.md`). Commit only your own files, never push, never create branches or pull requests; the orchestrator pushes to `main`.
- **Real names and realistic data only** in anything the owner sees; no hard-coded sample data in the app (an empty state or "Coming soon" instead).
- Every user-visible word exists in six languages. Say plainly what was tested and what was not. Short, solution-first answers.

## Quick facts
- Monorepo: `app/` (Expo SDK 58 app and website), `backend/` (Python FastAPI and PostgreSQL), `team-docs/`.
- App checks: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts && npx expo lint`. Backend tests: `cd backend && python -m pytest tests -q` (needs the local database and `backend/.env`).
- The app's own `AGENTS.md` in `app/` says Expo APIs change between releases: check the docs for SDK 58 before touching Expo APIs.
