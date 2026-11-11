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
