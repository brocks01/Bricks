# UI build spec: the final screens (11 Nov 2026)

For the coding agent that builds the UI. **Visual target: `../05-design/ui-samples/06-final-ui-direction.webp`** (it wins over samples 03 to 05 where they differ). Architecture: `../02-product/product-architecture.md`. How the app is built: `../10-handoff/HANDOFF.md` (section 6: module > page > element). Follow the existing conventions exactly; **copy an existing page** (for example `app/src/features/me/pages/edit/`) and do not invent a second way.

## Rules for every screen
- One folder per page: `app/src/features/<module>/pages/<page>/{page.ts, strings.ts, Screen.tsx}`; register the module in `app/src/features/index.ts`; add a thin route file in `app/src/app/`.
- Every visible word goes in `strings.ts` for all six languages (en, hi, bn, ta, zh, ms); shared words in `i18n/common.ts`. The self-test fails if one is missing.
- Declare every field and button as an element in `page.ts` so the agent can use it by key, and wrap it in `El` with `useField` / `useAction`. Policy `human` for anything the agent must never do (OTP, Singpass, DigiLocker), `confirm` for risky actions.
- **No hard-coded sample data.** Names, communities, goals and numbers in the sample image are illustration only. Everything shown comes from the account or the database; where there is no data yet, show an empty state or "Coming soon".
- Colours, spacing and radius come from `app/src/theme/tokens.ts` (green `#1B7F3B`). Large readable text, big touch targets. No visible scroll bars. Header: logo, bell, avatar (avatar opens `/me`).
- Bottom: exactly two tabs, **Connect** and **Grow**, then the **Bricks Agent bar** (already built; its hint text changes per screen, see below).
- Run the checks before you finish: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts`, and log your work in `team-docs/10-handoff/PROGRESS.md`.

## A. Onboarding (all `bare`: no tab bar). Order: Welcome, Language, Sign up, Profile, Interests, Start
| # | Page key / route | What the sample shows | Elements (id: kind) | State today |
|---|---|---|---|---|
| 1 | `auth.welcome` `/welcome` | Logo, "Connect. Grow. Participate.", "Your community, your activities, and your personal journey, all in one place.", illustration, **Get Started** | heading, subtitle, start: action, languageLink: action | Built (change the heading to the tagline) |
| 2 | `auth.language` `/language` (new) | "Choose Your Language", "Use Bricks in the language you are most comfortable with." Radio list: English, हिन्दी, বাংলা, தமிழ், 中文, Bahasa Melayu, **More Languages**, Continue | language: choice (en, hi, bn, ta, zh, ms), more: action, continue: action | Language page exists (`language.pick`); add the onboarding version and put it before sign-up. Needs a Malay name `Bahasa Melayu` in `i18n/languages.ts` if missing |
| 3 | `auth.signIn` + `auth.verify` | "Sign Up": tabs **Email / Phone**, email field, **Send OTP**, "Enter 6-digit code" boxes, "Verified", Continue. Google below. | email, sendCode, code (human + secret), verify, resend, google, singpass, digilocker | Email + Google built. **Phone OTP is not built** (needs an SMS provider; leave the tab disabled until then) |
| 4 | `auth.setup` `/setup` | "Your Profile": photo with camera badge, Name, Age Group (dropdown), Preferred Language (dropdown), Continue | displayName, ageBand, phone, area, save (built); add photo: action, preferredLanguage: choice | Built without photo. Photo upload needs storage (later) |
| 5 | `auth.interests` `/interests` (new) | "Your Interests", "Select what you love to do. You can change this later." Multi-select tiles: **Community Activities, Health & Wellbeing, Sports & Fitness, Learning & Skills, Culture & Events, Volunteering & Service**, Continue | interests: choice (multi), continue: action | New. Store in a `user_interests` table (see below) |
| 6 | `auth.start` `/start` (new) | "How do you want to start?" Four cards: **Join a Community** (I have an invite code or link), **Create a Community** (Start my own community, for example apartment, society, club), **Start Personally** (Set my personal goals and wellbeing), **Explore First** (See what Bricks can do) | join: action, create: action, personal: action, explore: action | New. Join and Create open their own flows (section D); Personal goes to Grow; Explore goes to Connect in read-only mode |

Guard rules (`AuthGate`): signed out on a private page goes to Welcome; signed in without a name goes to Setup; after Setup go to Interests, then Start, then the app. Remember how far a person got (a `onboarding_step` on the user or a simple flag per step) so a returning person is not asked again.

## B. Tabs
**Connect tab (landing, "Home" content)** `connect.index` `/`
- Greeting from the account: "Good morning, <first name>" (time-of-day word in the person's language; the waving emoji is decoration).
- Community selector: "<community name> · <n> members" with a dropdown to switch communities (shown only if the person belongs to one; otherwise an invitation card: join or create).
- A community card "<community name> / Our Community" that opens the **Connect = communities only (owner's decision, 11 Nov 2026).** There are NO tiles and NO clubs or groups (those already run on WhatsApp; the college club was only inspiration). The Connect tab shows:
- a person with no community: a card with **Join a community** (invite code, link, QR, nearby) and **Create a community**;
- a person with communities: **Your communities** (a card each: name, area, members, my role) and the same Join and Create buttons below. If there is only one, open it directly.
- **Inside a community** (`connect.community`, built next): announcements, events and activities (competitions, workshops and training are kinds of activity), members, roles and leadership, contributions and recognition, opportunities (jobs, services, referrals). Sponsors and funds come later.
Built today: the landing with the list (reads `GET /v1/communities/mine`); Join and Create are disabled "Coming soon". Backend ready: create, join by code, community detail, "I'm going" to an activity.

**Grow tab** `grow.index` `/grow` (title "Grow", subtitle "Your Goals, Health & Learning")
- A goal card: "My Goal: <title> / <period> / <done> of <target> <unit> (<percent>%)" with a progress bar (from the person's active goal; empty state "Set your first goal" when none).
- Rows, each opening a page: **My Health** (Track and manage your wellbeing), **My Goals** (Set and track personal goals), **My Learning** (Build skills at your pace), **My Progress** (Your activity, milestones and streaks).
- Agent bar hint: "How can I help you grow today?".

**Profile and settings** (from the avatar) `me.index` `/me` "My profile": already built (Edit profile, Language, Sign out). Add later: Translate this screen, Privacy and consent, Settings, Help and support (sample 05).

## C. The Ecosystem panel in the sample (copy for the marketing site and the Explore-first screen)
- **Connect, everything you do together:** create or join communities; run any kind of event; clubs, societies and programmes; competitions and leagues; health, fitness and group activities; learning, workshops and training; community services and volunteering; jobs, referrals and local opportunities; contributions, sponsorships and funds; roles, leadership and governance.
- **Grow, your personal development:** personal goals and milestones; health and wellbeing; walking, jogging and fitness; learning and skill building; habits and daily routines; personal progress and achievements; reminders and intelligent assistance; private health and activity records; family support (optional).
- **Key principles:** Flexible and community-driven · Multilingual and inclusive · Voice and agent-first · People centric · Private and trusted.

## D. What the backend needs (build in this order; keep to `database-schema.md`)
1. `onboarding` (a column or table: steps done) and `user_interests` (user_id, interest key). Interest keys: `community_activities, health_wellbeing, sports_fitness, learning_skills, culture_events, volunteering_service`.
2. `communities`, `memberships`, `role_definitions`, `role_terms` (already designed): create, join by invite code or link, discover nearby (PostGIS), switch community.
3. **One activity system** (`activities`, `activity_participants`, attendance, optional sponsorship; the `kind` and a free `category` carry event, competition, class, drive, club). Tiles in the Connect hub are filters over it. Do not add a table per tile.
4. `goals` and `goal_progress` for Grow; contributions and recognition after that.
Each module follows `backend/app/modules/identity` (router, service, schemas, tests with a real database). Use grants with term dates for roles (HANDOFF section 8).

## E. Suggested build order for the UI agent
1. Welcome heading, onboarding Language, Interests, Start screens (with `onboarding_step`), then the guard order.
2. Connect landing with the community selector and empty states, then **create / join / discover community** (with the backend of D2).
3. Connect hub (all tiles "Coming soon"), then Events as the first real tile on the activity system.
4. Grow landing with the goal card and the four rows ("Coming soon"), then My Goals.
5. Translate-this-screen and the agent surface hooks (the agent already has `show`/`hide`; give each new page a good `summary` and element `summary` so the agent can use it).
After each step: type-check, self-test, a browser check, and a PROGRESS entry.
