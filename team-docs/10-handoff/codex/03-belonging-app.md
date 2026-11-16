# Task 3: The belonging layer in the app

Work straight on `main`. Wait until **tasks 1 and 2 are done** (on `main`). Area: `app/src/features/community`, `app/src/api/belonging.ts`. Strong model, medium effort.

## Context
Read `team-docs/02-product/communities.md` and the endpoints task 2 added (`backend/app/modules/belonging/router.py`). The goal is the feeling in `philosophy.md`: a person far from home still feels **counted, remembered and part of it**.

## Build (inside the community home, `features/community/pages/home`)
1. **Our days:** the circle's coming days with a countdown ("Chhath is in 3 days"); a leader can add or remove one. Empty state: a calm line, no sample data.
2. **Our people:** the member list now shows who is **away** (when they chose to share) with warm words ("Rajan is in Singapore"); a person can mark themself away and choose whether to share it.
3. **Take part from where you are:** on a day, a simple "Send a blessing" (text) and "Send a message"; the circle's blessings for that day are listed with who sent them. (Voice is a later task; leave a clear place for it.)
4. **Our stories:** a list of stories shared into the circle; a person can share one of their own Wisdom stories into a circle they belong to.
5. Words in six languages; plain, warm, short; no jargon. Large touch targets, large text.

## Acceptance
`tsc`, self-test and lint clean; all new words in six languages; nothing is shown that the server did not return (no hard-coded festivals or people); away status is shown only when shared; works with the "reduce motion" and large-text settings.

## Out of scope
Any backend change (ask in the questions file if one is needed).
