# A7: close the revamp (run once, after every A and B iteration is merged)

Branch: `a/close-revamp` (from the latest `main`).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md`, both `LOG.md` files, then this file.

## Goal
Put the project back on its normal rules: one true handoff and one running log. During the revamp nobody edited `HANDOFF.md` or
`PROGRESS.md`; this iteration does it once, so there is no conflict.

## Build
1. Read `team-docs/11-revamp/person-a/LOG.md` and `person-b/LOG.md` in full, and check what they claim against the code on `main`.
2. Append **one** entry to `team-docs/10-handoff/PROGRESS.md`: the date, who, what the revamp changed (onboarding, Singpass sign-in,
   profile and settings, recommended communities, Community tab, Tree of Wisdom, Home, calendar, Marketplace), what was tested and how,
   and everything both logs list as not done or not tested.
3. Update `team-docs/10-handoff/HANDOFF.md`, sections "Current state" and "Not done yet", so they describe the app as it is now
   (three tabs, the Singpass button as a demo sign-in, the new onboarding, the leaf rule). Remove statements the revamp made untrue.
4. Go through every "Requests for the other person" in both logs. For each one still open, either do it now (ownership ends with this
   iteration) or list it under "Not done yet".
5. Run everything once on `main`'s code: `cd app && npx tsc --noEmit && npx expo lint && npx tsx src/navigation/selftest.ts`, every
   `*.check.ts` under `app/src/features`, and `cd backend && python -m pytest tests -q`. Report failures as they are.
6. Walk the whole app once in the browser at phone size with a new account: onboarding, sign-in, recommended communities, Home (answer an
   event Yes, then "I'm here" on one that is on now, and see the leaf), the tree, the calendar, the Community tab, the Marketplace, profile, settings, sign out. Write down what you saw.

## Done when
`PROGRESS.md` has the entry, `HANDOFF.md` is true, the checks' real results are in the pull request, and the walk-through notes are in the entry.
