# Progress log

**Newest entry at the bottom. Every agent appends an entry at the end of each session** (see `AGENTS.md`). Format:

```
## YYYY-MM-DD (tool and model)
Did: ...
Tested: ... (how)
Not done / not tested: ...
Next: ...
```

---

## 2026-11-11 (Claude Code, Sonnet 5.5): up to the first handoff
Did:
- Backend identity module (email code sign-in, Google sign-in, sessions, profile), stateless 15-minute tokens with session id and fast revocation, migrations 0001 and 0002.
- Email service (Brevo REST, SMTP fallback), daily cap, plain transactional template. Test-mode code hidden from public tunnels.
- App: login and profile management only, everything else "Coming soon", no hard-coded data; AuthGate; setup, edit profile, language; no scroll bars.
- Phone voice agent in Python (Twilio + Gemini Live) copied in design from the Jambagrad voice module; one real call placed with the owner's go-ahead.
- In-app Bricks Agent: bottom bar, mic and text, live transcript lines, tools run in the app, server-side web search and page reading.
- Web hosting through the owner's ngrok tunnel (backend serves the built website); GitHub repo `brocks01/Bricks` with `main` and `Ankit`; CI workflow, pull request template, CONTRIBUTING; Vercel config.
- Handoff docs (this folder, `AGENTS.md`). `backend/run.py` now accepts `PORT`.
Tested: 50 backend tests pass; app type-check and self-test pass; browser walkthrough of sign-in, setup, Me, agent typing and web search; one live phone call (35 s); real Google sign-in on localhost:3000 by the owner.
Not done / not tested: real email codes (no Brevo key yet), Vercel deploy, iPhone Safari voice, Expo Go, CI on GitHub, roles and grants, agent `g` token, Singpass, DigiLocker, docs for the technical folder (stale, see HANDOFF section 7).
Next: owner adds `BREVO_API_KEY`, test a real code; deploy `app/` to Vercel and add its URL to Google's authorised origins; open the pull request `Ankit` to `main`; then roles and grants for communities (HANDOFF section 8).

## 2026-11-11 (Claude Code, Sonnet 5.5): product architecture locked, agent surface
Did:
- Locked the product architecture with the owner: two domains Connect and Grow, Thrive removed, flexible activity system, four starting paths, onboarding flow, profile from the avatar
  (`team-docs/02-product/product-architecture.md`, decisions entry, three new UI samples stored in `team-docs/05-design/ui-samples/` with a note on what is superseded, HANDOFF section 2b).
- Built the agent surface: tools `show` and `hide`, `surface.ts`, `AgentSurface.tsx`, sandboxed `HtmlFrame.web.tsx`, system prompt guidance, words for the Close button in six languages.
Tested: app type-check and self-test pass (new checks for show/hide, waiting question, dismissal, size caps); backend 51 tests pass; in the browser the agent showed a card page with
3 steps and two choices, the sandbox and policy were present (no script), and tapping "Join a community" returned the answer and closed the panel.
Not done / not tested: the app's tabs and onboarding still follow the OLD samples (five placeholder tabs); iPhone Safari and Expo Go (HTML is hidden on phones by design until a development build);
a long html page's height (fixed 260 px frame, content scrolls inside it); the public Vercel/ngrok copy was rebuilt only if noted below.
Next: owner decides Home as a tab or not; then rebuild the tabs as Connect and Grow and the new onboarding (language, interests, four-path start); then the activity system and roles/grants.

## 2026-11-11 (Claude Code, Sonnet 5.5): two tabs
Did: replaced the five placeholder tabs with exactly two, **Connect** and **Grow** (owner's decision); removed the old home, community, events and goals modules; the profile page (`me.index`, "My profile") is no longer a tab and opens from the avatar with a back arrow; words for the two tabs in six languages; docs updated (open question resolved).
Tested: type-check and self-test pass (new checks: two tabs in order, profile not a tab); in the browser the two tabs show and the avatar opens /me.
Not done / not tested: the public ngrok copy of the website was not rebuilt (run `npx expo export --platform web --output-dir dist` in `app`); not committed until the owner says so.
Next: the new onboarding (language, interests, four-path start), then real content in Connect (community create/join/discover).

## 2026-11-11 (Claude Code, Sonnet 5.5): final UI direction and build spec
Did: stored the final UI image as sample 06 (the visual target; wins over 03 to 05); wrote `06-technical/ui-build-spec.md` (every onboarding, Connect, Connect hub and Grow screen with page keys, routes, elements, data sources, empty states, backend needs and a build order) so another agent can build directly; updated the product architecture, the samples README and HANDOFF.
Tested: docs only (no code change in this entry).
Not done: none of the new screens is built yet (Language onboarding, Interests, Start, Connect landing content, hub, Grow content); Phone OTP, photo upload, Apple sign-in are not built.
Next: follow the build order in `ui-build-spec.md` section E.

## 2026-11-11 (OpenCode, mimo-v2.6-flash): the agent no longer shows internal keys to the person
Did:
- Two places leaked internals to the person: the transcript line printed the tool name plus a page/element key (`docs grow.index`) and the approval banner printed `me.edit.save: Save`. Both now show plain words in the person's language. Three new shared words `agent.tool.lookup`, `agent.tool.screen`, `agent.tool.show` (all six languages), picked by tool; the tool's own name, path, key and query are never shown or read out.
- The server-side lookup line (`web_search`, `read_page`) now also sends `name` so the app writes the localised phrase; `text` is kept so an older built copy still displays something.
- Left in the tree from this session's first small piece: the Welcome heading/subtitle now carry the tagline from `ui-build-spec.md` A1 (six languages).
Tested: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts` — all 46 checks pass, including "every word exists in all six languages" with the three new word ids added to the self-test list. `backend/app/modules/agent/router.py` compiles (`py_compile`).
Not done / not tested: **no browser or live-talk check** — no real talk has been watched to confirm the transcript now reads "Looking something up…" instead of `docs grow.index`; the public `app/dist` copy was not rebuilt (rebuild it before the owner's tunnel shows this); the Welcome tagline edit is committed to no branch yet and was not reviewed by the owner.
Next: the panel (the thing the owner calls the canvas) — a prompt rule so the agent never duplicates what the open page already shows, and auto-close of the panel when the person moves page or when the agent starts acting.

## 2026-11-11 (Claude Code, Sonnet 5.5): Agent Canvas spec stored
Did: stored sample 07 (Agent Canvas) and wrote `06-technical/agent-canvas-spec.md` from the owner's proposal, adapted to our stack (the proposal's Next.js/Node/Mongo stack is replaced by Expo/FastAPI/PostgreSQL); decisions, samples README and HANDOFF updated.
Tested: docs only (no code change in this entry).
Not done: Canvas is not built beyond the existing `show`/`hide` surface; the event-creation MVP depends on the activity and community backend.
Next: owner agrees the first slice (canvas label and close, selection tiles, step dots and Next), then build it.
