# Migration track: Bricks moves into the shared repo

Version 1.0 · Sun 15 Nov 2026 · Source: the comparison of both codebases (this file, "Why"), the shared repo's
`AGENTS.md`, `CONTRIBUTING.md`, `team-docs/06-technical/backend-modules.md` and `team-docs/10-handoff/HANDOFF.md`.

## Why

The two Bricks codebases are becoming one, in the **shared repo** (`github.com/brocks01/Bricks`). Its folder layout and
rules are the ones we follow from now on, because more of its modules will be added later. Our code is already there
as the branch `sayan` (a copy of `sarath` at `644f333`), with no history in common with its `main`.

## What was decided (Sun 15 Nov 2026)

| Question | Decision |
|---|---|
| Whose layout | **The shared repo's**: `app/`, `backend/app/{core,modules/<name>}`, `backend/migrations/NNNN_*.sql`, `team-docs/`, `platform-docs/` |
| Whose app | **Ours** goes into `app/` and is the app everyone works on. The shared repo's current app is replaced |
| Our backend code | **Moved into the module layout, code kept as it is** (async psycopg). No rewrite to sync SQLAlchemy |
| Accounts and sign-in | **The shared repo's `identity` module** (emailed code + Google, its own tokens and `users` table). Supabase sign-in goes |
| Voice | **The shared repo's `voice` module** (Twilio Media Streams + Gemini Live) replaces our turn-by-turn calls and `/assistant/turn`. WhatsApp stays. Speech to text and spoken replies for the app (`/assistant/transcribe`, `/tts`) stay |

Still open: the questions in [M0.1](M0.1-decisions-and-map.md). Nothing is moved before they are answered.

## The iterations

| Phase | Iteration | Goal | Est. |
|---|---|---|---|
| M0 Agree | [M0.1](M0.1-decisions-and-map.md) | The open questions answered, the module map agreed, the decision record written | 2 h |
| M1 Move as is | [M1.1](M1.1-repo-frame-and-app.md) | One branch with both histories; our app in `app/`; docs and tooling in place | 3 h |
| | [M1.2](M1.2-backend-into-modules.md) | Our backend runs inside the shared backend's modules, still on Supabase sign-in; every test passes | 6 h |
| M2 One identity | [M2.1](M2.1-identity-backend.md) | Our tables point at the shared `users`; our routes use its sign-in; seed and tests rewritten | 8 h |
| | [M2.2](M2.2-identity-app.md) | The app signs in with emailed code or Google through the shared `identity`; Supabase is gone | 5 h |
| M3 Live voice | [M3.1](M3.1-live-voice-backend.md) | Phone calls run on the shared `voice` module, with our SOS check and our actions as its tools; our call agent removed | 6 h |
| | [M3.2](M3.2-voice-in-the-app.md) | Buddy keeps working on phones; live talk in the browser through `/v1/agent/live` with our actions | 4 h |
| M4 Land it | [M4.1](M4.1-ci-docs-handoff.md) | CI runs our checks; docs in `team-docs/`; `HANDOFF.md`, `PROGRESS.md`, `AGENTS.md` true | 3 h |
| | [M4.2](M4.2-verify-and-merge.md) | Golden path passes on the merged branch; one pull request into `main`; new preview APK | 3 h |

About **40 hours** in all. M2 (one identity) is the largest and riskiest part: about a third of the work.

```
M0.1 decisions ─► M1.1 frame + app ─► M1.2 backend modules ─┬─► M2.1 identity (backend) ─► M2.2 identity (app) ─┐
                                                             └─► M3.1 live voice (backend) ─► M3.2 voice in app ──┴─► M4.1 ─► M4.2
```
M2 and M3 can run **side by side** once M1.2 is done: they touch different modules. M3.1's tools need M2.1's user ids
only at the end (task 3.1.6), so do that task after M2.1 lands.

## Branches and pull requests (the shared repo's rules)

- An integration branch **`sayan/migration`**, made from the shared `main` in M1.1. Each iteration is a branch
  `sayan/migration-<iteration>` with a pull request into `sayan/migration`; one teammate reviews it; squash merge.
- `main` is touched **once**, in M4.2, by one pull request from `sayan/migration`. Until then `main` keeps working as it is.
- The branch `sayan` stays as the untouched copy of our code, for reference.
- Commits are authored by the repo owner of each side; no AI co-author lines.

## Working in parallel

No fixed owners: anyone takes a stream, says so in the group, and the iteration file's numbered tasks are the streams.

| Stream | Iterations | Notes |
|---|---|---|
| **Repo and tooling** | M1.1, M4.1 | Git work, CI, docs moves. Short, mostly mechanical |
| **Backend modules** | M1.2, M2.1 | The biggest stream. M2.1 splits by module (safety, thrive, walks, ... ) once its shared table changes land |
| **App** | M2.2, M3.2 | Sign-in screens, API client, Buddy |
| **Voice** | M3.1 | Needs the Gemini key with Live access and the Twilio console (the owner changes webhooks) |
| **Checks** | M0.1, M4.2 | The decision record, then the golden path and the final pull request |

## Rules for every migration iteration

- **Move first, improve later.** An iteration that moves code does not also change what it does.
- **Tests pass at the end of every iteration**: backend tests, app `npm run check`, and the shared repo's own tests.
- **Nothing on the shared `main`** until M4.2. Never force-push a shared branch.
- **No secrets** in any commit, file or log line. `.env` files are never committed; `.env.example` lists names only.
- **Never run `bricks_api.seed` against a database someone else uses**: it wipes every table. Migrations are add-only.
- Each iteration ends with an entry in the shared repo's `team-docs/10-handoff/PROGRESS.md` (from M1.1 on) and in
  our `CHANGELOG.md` until M4.1 moves it.
