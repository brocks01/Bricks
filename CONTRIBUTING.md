# How we work

One monorepo: `app/` (Expo app and website), `backend/` (Python API), and `team-docs/`.

## Branches
- `main` is always working and is what gets deployed. Nobody pushes to it directly.
- Work happens on a branch named `<person>/<short-topic>`, for example `ankit/login-profile`. A long-running personal branch such as `Ankit` is fine early on.
- Keep a branch small and short-lived, and bring `main` into it before opening the pull request.

## Pull requests
1. Open a pull request into `main` using the template. A title in the form `type: what` (feat, fix, docs, chore, refactor, test).
2. CI must pass (types and self-test for the app, tests for the backend).
3. At least one teammate reviews it. The author answers every comment, then merges with **squash**, so `main` has one clean commit per change.
4. Delete the branch after merging.

## Commits
Short, present tense, say why: `feat: sign in with an emailed code`. Never commit `.env` files, keys, passwords or tokens. If one slips in, treat it as leaked and replace it.

## Settings to switch on in GitHub (repository admin)
Branch protection on `main`: require a pull request, require the CI checks, require one approval, block force pushes.

## Run it
- API: `python backend/run.py` (needs `backend/.env`, see `backend/.env.example`; migrations with `python backend/run.py migrate`).
- App: `cd app && npm install && npm run web` (opens on port 3000).
- Website deploy: Vercel, root directory `app` (the settings are in `app/vercel.json`).
