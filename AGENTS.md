# Instructions for any coding agent (OpenCode, Claude Code, others)

Read these two files first, in this order, before you change anything:

1. `team-docs/10-handoff/HANDOFF.md` : what Wisdom is, how it is built, how to run it, what is done, what is not, and the rules. Then `team-docs/01-philosophy/philosophy.md` (why we build it).
2. `team-docs/10-handoff/PROGRESS.md` : the running log. **Read the last entries to see where the previous agent stopped.**

## Your duty: keep the log current
At the end of every working session (and after every meaningful change), **append an entry to `team-docs/10-handoff/PROGRESS.md`**:
date, who you are (tool and model), what you did, what you tested and how, what is NOT done or NOT tested, and the next step.
If you change how something works, also update `HANDOFF.md` (the sections "Current state" and "Not done yet"). The owner switches between
agents, so the next one must be able to continue from the files alone. Never claim something works unless you ran it; say what was not tested.

## Hard rules (the owner's, non-negotiable)
- **Never print, paste, log or commit a secret** (API keys, tokens, passwords, database URLs). `.env` files are never committed and never opened
  to read values; scripts may read them in-process and print only names. Do not hunt through the owner's other repositories for credentials.
- **Never place a phone call without the owner's go-ahead in that moment.** Only numbers in `VOICE_ALLOWED_NUMBERS`, only people who agreed.
- **ngrok belongs to the owner**: never start, stop or reconfigure it. **Do not kill running services** (API, dev server, tunnel) unless the owner
  tells you to in that moment; start your own on another port if you need one.
- **Discuss before building** anything the owner did not ask for. No extra features, no extra docs, no invented content or sample data in the app.
- **Real names and realistic data only** in anything the owner sees (demo people, accounts, labels, greetings): never "test", "UI Check", "Neighbour 7" or similar. Use his real account for his own testing.
- **No hard-coded sample data** in the app: every tab that is not built shows "Coming soon".
- **The owner works alone for now: commit and push straight to `main`.** Run `git pull --rebase origin main` first, run the checks, make small commits, push often. Do not create branches or pull requests unless he asks.
- Say plainly what was tested and what was not. Short, solution-first answers.

## Quick facts
- Monorepo: `app/` (Expo SDK 58 app and website), `backend/` (Python FastAPI + Postgres), `team-docs/`.
- Typecheck and self-test the app: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts`
- Backend tests: `cd backend && python -m pytest tests -q` (needs the local database and `backend/.env`).
- The app's own `AGENTS.md` in `app/` says Expo APIs change between releases: check the docs for SDK 58 before touching Expo APIs.
