# Working with Codex and other agents: how the work is split

The **orchestrator** is Claude Code (in the owner's main session). It decides direction, keeps the documentation true, reviews and merges. **Worker agents** (Codex, or any other coding agent) each take **one brief** from this folder and commit **straight to `main`** (the owner works alone, so there are no branches and no pull requests). The owner starts the workers and says when a task is done.

## Where to commit
Straight to `main`, always: `git pull --rebase origin main`, run the checks, small commits, `git push origin main`. If two workers run at once, pull with rebase before every push and keep to your lane (below) so rebases stay clean.

## The tasks, in order
Run tasks **in the same row in parallel**; a task in a later row waits for the earlier row it names.

| Row | Task (file) | Area | Depends on | Suggested model setting |
|---|---|---|---|---|
| 1 | `01-communities-app.md` | app: communities screens | backend done | strong model, medium effort |
| 1 | `02-belonging-backend.md` | backend: days, presence, taking part from afar | none | strongest model, high effort |
| 1 | `04-services-into-wisdom.md` | app: move paid services into Wisdom | none | strong model, medium effort |
| 1 | `07-safety-and-moderation.md` | backend and app: reports, blocks, admin review | none | strongest model, high effort |
| 1 | `08-translations-review.md` | words in six languages | none | the small, cheap model is fine |
| 2 | `03-belonging-app.md` | app: our days, our people, take part | tasks 1 and 2 merged | strong model, medium effort |
| 2 | `05-hosts-self-serve.md` | backend and app: hosts list their own opportunities | none | strongest model, high effort |
| 2 | `06-wisdom-trust-and-conversation.md` | backend and app: proof, endorsements, a first conversation | task 4 merged | strongest model, high effort |

**About the model names.** The owner's picker shows names the orchestrator cannot rank ("6 Luna", "5.6 Terra", "5.6 Luna", "5.1 Codex Mini"). Rule of thumb that holds either way: use the **largest full model at high reasoning** for tasks that design data and rules (tasks 2, 5, 6, 7); a **mid setting** for tasks that follow existing patterns (1, 3, 4); the **Mini** for mechanical work (8). Start with the picker's "Default" if unsure, and move up if a worker keeps missing the acceptance checks.

## Shared rules (every worker)
1. **Read first, in this order:** `AGENTS.md`, `team-docs/10-handoff/HANDOFF.md`, `team-docs/01-philosophy/philosophy.md`, `team-docs/02-product/tabs-requirements.md`, then your own brief.
2. **Commit and push straight to `main`** (no branches, no pull requests): `git pull --rebase origin main` first, run the checks, then `git push origin main`.
3. **Stay in your lane.** Touch only the files your brief names, plus the small shared files below. If you need something outside your lane, write the question in `team-docs/10-handoff/progress/<task>-questions.md` and continue with what you can.
4. **Shared files that always conflict, so follow these rules:**
   - **Migrations:** use only your reserved number range (below). Never edit an existing migration.
   - `backend/app/main.py` (router registration) and `backend/app/modules/skills/registry.py` (the import line at the bottom): add **one line each** and nothing else.
   - **Words** (six languages): new words go in your feature's own `words.ts` as `WordTable` rows (English, Hindi, Bengali, Tamil, Chinese, Malay). Do not edit another feature's words.
   - **PROGRESS.md:** do not edit it. Write your entry in `team-docs/10-handoff/progress/<task>.md`; the orchestrator merges it.
5. **No secrets** (never print, paste or commit keys, tokens or `.env`). **No invented data** or sample people in the app: real names and realistic data only, otherwise show "Coming soon" or an empty state. **Never place a call, never start or stop ngrok.** Do not kill running servers you did not start.
6. **Respect the philosophy:** every feature must make a person feel noticed, needed, expected or remembered; reach out with consent; the other side decides; stories are private until shared; no medical, legal or financial advice from the system; we never hold money.
7. **Definition of done (all must be true, and say what you ran):**
   - Backend: `cd backend && python -m pytest tests -q` passes (one known time-of-day test, `test_health_home.py::test_walks_are_saved_listed_and_totalled_by_week`, may fail; ignore it). New behaviour has new tests. Migrations apply with `python run.py migrate`.
   - App: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts && npx expo lint` all clean. Every new word exists in all six languages.
   - Your progress file is written, with what was tested and what was **not**.
8. **Do not guess at product decisions.** If the brief is silent, choose the simplest option that fits the philosophy and note it in your progress file.

## How to run things (Windows, owner's machine)
- Python: use the bundled interpreter `C:/Users/ankitkumar/Desktop/work/1/runtime/python/python.exe` (or any Python 3.11 with `backend/requirements.txt`). The database is local PostgreSQL configured in `backend/.env` (do not open or print it).
- API: `cd backend && PORT=8000 python run.py` (migrations apply at start). Local sign-in shows a "test mode code".
- App: `cd app && EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web --port 3000` (the app looks for the API on 8800 unless that variable is set).
- Reserved **migration ranges** (the latest existing is `0031`): task 1 `0040-0049`, task 2 `0050-0059`, task 5 `0060-0069`, task 6 `0070-0079`, task 7 `0080-0089`.

## Code patterns to follow
- **Backend:** each module in `backend/app/modules/<name>/` has `service.py` (plain functions over one DB connection, every rule here), `router.py` (thin), and its tests in `backend/tests/test_<name>.py` (see `test_wisdom.py`, `test_three_products.py` for the person-helper and cleanup style). Agent **skills** (what the agent can do on a call or chat) live in `backend/app/modules/skills/<name>.py` and register at the bottom of `registry.py`; risk levels are `read`, `safe`, `confirm` (needs the person's yes). Messages to people go through `channels/outbox.py` (`core.notify`).
- **App:** features are modules of pages (`app/src/features/<name>/pages.ts` with `definePage`, `module.ts`, `screens/`, `words.ts`); routes are one-line files in `app/src/app/`. Look at `features/wisdom` as the model.
- **Decisions already taken** are in `team-docs/02-product/*.md`; follow them.

## What the orchestrator keeps for itself
Direction and the philosophy; the logo and icons once the owner supplies the files; reviewing and merging pull requests; the final integration and restarting servers; the phone door and live WhatsApp, SMS and Telegram checks (they need the owner's accounts); anything that changes a decision in `team-docs/02-product/`.
