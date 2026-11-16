# Task 1: Communities in the app (circle feeling, audience, host)

Work straight on `main`. Area: `app/src/features/connect`, `app/src/features/community`, `app/src/api/communities*.ts`; small backend change. Migrations `0040-0049`.

## Context
Communities is the heart of Wisdom: **belonging by emotion**, not interest or skill (`team-docs/02-product/communities.md`). The backend already has, for a community: `circle` (origin, faith, place, life, interest), `audience` (all, men, women), `host_id`, `source` (people or imported). Joining a men-only or women-only circle uses the person's own optional gender answer; the API answers `gender_needed` (409) if unknown, `audience_men` or `audience_women` (403) if it does not match. Explore returns `audience`, `circle`, `source`. The app does not use any of this yet.

## Build
1. **Backend (small):** the request flow (`community_requests`, `rules.request_create`, `rules.create_from_request`, `rules_router.RequestIn`) must carry `circle` and `audience`, so a person asking to start a circle can choose them. Add a migration for the two columns, update the functions, return them in `my_requests` and `review_list`. Test it.
2. **Starting a circle (app):** the "ask to start a community" form gets two plain-language choices. **What brings you together?** origin ("where we are from"), faith or festival ("what we keep"), place ("where we live"), life ("who we were or are: family, colleagues"), interest ("something we enjoy"), each with a short example. **Who is it for?** everyone, men only, women only, with one calm sentence about why gendered circles exist.
3. **Showing it:** explore cards and the community home show the audience (a small badge for men only or women only), the feeling in words, and "brought in from {host}" for imported circles. The Communities tab lists them as before.
4. **Joining:** handle `gender_needed` by asking once, kindly ("To join a men-only circle we need to know. You can answer or choose not to say"), saving the answer with `PUT /v1/onboarding/basics` `{answers: {gender: "man"|"woman"|"other"|"prefer_not_to_say"}}`, then retrying the join. Handle `audience_men` and `audience_women` with a respectful message (never blame the person).
5. **Words:** every new string in six languages in `features/community/extraWords.ts` (or a new table) following the `WordTable` pattern.

## Acceptance
Backend test for the request flow carrying `circle` and `audience`; app type-check, self-test and lint clean; each new word in six languages; no hard-coded sample communities; the gender prompt appears only when the server answers `gender_needed`.

## Out of scope
Festival calendar, presence, taking part from afar (task 2 and 3); creating hosts (task 5).
