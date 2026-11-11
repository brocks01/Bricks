# App tree: modules, pages, elements; agent tools; language (built 12 Nov 2026)

Code: `bricks/app/src`. Inspired by the idea of one registry that decides where every screen lives and what every module can do; no code was copied.

## 1. The tree
**module > page > element**, with full dotted keys:
- module `events`
- page `events.new` (key is always `<module>.<name>`)
- element `events.new.title` (ids are letters and digits, no dots)
- module skills are written `events/create`

One key has three uses: its **words** (looked up in the person's language), its **address** (navigation), its **control** (the agent fills or presses it).

## 2. One page = one folder, one declaration file
```
src/features/events/
  module.ts            id, summary, skills; its pages are listed here
  store.ts             data
  components/          pieces used by more than one page of the module (EventCard)
  pages/new/
    page.ts            THE declaration (plain data, no React): key, route, summary, tab, params, elements, strings
    Screen.tsx         the screen; no hard-coded text and no key strings
    strings.ts         this page's words in en, hi, bn, ta, zh, ms
src/app/event/new.tsx  router file: one line re-exporting the Screen
```
`page.ts` declares each element (`kind`: text, field, choice, action, list; `type`, `required`, `options`, `agent` policy, `secret`, `summary`). `definePage()` checks it at start-up (bad key, module mismatch, missing English words, choice without options).

## 3. What the one declaration drives
Navigation address, the bottom bar (pages that declare `tab`), the words every language must supply (a test fails if one is missing), what the agent can see and do, and the generated descriptions. No second list to keep in step.

## 4. Agent tools (`agent/`): walk the tree one level at a time
`tree` (modules, then a module's pages and skills, then a page's elements), `search`, `docs` (one node), `open`, `read` (what is on the open page, with values), `fill` (by element key; opens the page first if needed), `press`, `run` (`module/skill`). Plain JSON-schema specs, ready for Gemini function calling. The agent targets **keys, not words**, so it works the same in any language, and it never sees code or addresses.

Policy per element or skill: **free**, **confirm** (the person approves in a banner), **human** (the agent refuses and guides). `secret: true` elements never return their value.

## 5. The glow
When the **agent** fills or presses something, the element glows with a pulsing ring and a caption bar says what it is doing ("Assistant is filling: Event title"), in the person's language. A person's own taps never glow. It lives in one place (`fillElement` / `pressElement`), so tools and skills glow the same way. Reduced-motion users get a steady ring.

## 6. Language (`i18n/`)
Six languages: English, Hindi, Bengali, Tamil, Chinese, Malay. Fixed words live beside each page; shared words in `i18n/common.ts`. A missing word shows English. The choice is saved on the device (falls back to the phone's language, then English); the agent can change it. **All five non-English tables are first drafts by an AI assistant and need native-speaker review.** Member-written content is not translated yet (plan: show as written, with a Translate button that translates on read and saves the result).

## 7. Tests
`npx tsx src/navigation/selftest.ts` (42 checks, all pass): the tree at every level, search, path parsing, definePage refusals, fill that opens the page, glow state, policies (person-only, approval, secret), the language switch by skill and by element key, and that every word of every page exists in all six languages. The app type-checks.

## 8. UI shell and the assistant dock (13 Nov)
Rebuilt to match `05-design/ui-samples`: header (logo, bell, avatar that opens the profile), greeting, community goal card, event cards with Join pills, five icon tabs, Create Event form with icons, language list, and Me as the profile page. The bottom bar is drawn once in the root layout so it stays on inner pages too; its icons come from each page's declaration (`icon`).
**Assistant dock** (`agent/dock.tsx`): mic and keyboard buttons float above the bar; typing mode (message field, send), listening bar (waveform, end button) and an acting state that shows what the agent is doing. Speech input uses the browser's recognition on the web (`agent/voice.ts`); on a phone it needs a development build.
**The brain is NOT connected** (`agent/brain.ts`): typed or spoken text gets an honest "not connected yet" reply. Plan: the app sends the text and `toolSpecs` to a backend endpoint that holds the Gemini key and does the function calling; the app runs each returned tool call, sends the result back, and repeats until there is a reply. The key never lives in the app.

## 9. Not done yet
The brain (backend endpoint and Gemini); sign-in (the guard is a stub); real data from the backend; the remaining screens from the UI samples; real event photos and profile photos (icon tiles and an initial for now); the "Added" state on a created event; the Translate button for member text; removing the sample community.
