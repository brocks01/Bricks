# Calendar, family scheduling and reminder calls: build spec (13 Nov 2026)

For the coding agent that builds this. Written so you can work from this file alone. **Read first, in this order:** `AGENTS.md`, `team-docs/10-handoff/HANDOFF.md`, the last entries of `team-docs/10-handoff/PROGRESS.md`. Copy existing patterns; do not invent a second way.

## 0. What the owner decided (13 Nov 2026)

- Build a **calendar in the database and backend first**, so a person's plan (medicine, appointments, exercise, events, calls) is scheduled **for the person and, with the right access, by their family**.
- A **family member with rights can schedule for an elderly person**. "Rights" = an active delegation (see section 1.2). The elderly person can always see it and end that access.
- **Calendar is a fourth bottom tab** (after Connect, Grow, Family).
- **Medicine reminders are in from the start**, always with the words "not medical advice" on the screen that creates them. Bricks reminds; it never advises on doses.
- It must run **live in the app AND by phone call**. The app part is phase 1 and 2. The call part is phase 3 and needs consent, a scheduler and a place to host the voice agent (section 6).
- **Decided 13 Nov 2026 (owner):** there is NO external cron and NO separate voice service. The backend runs **one in-process reminder loop** that ticks forever (the owner's Render plan never sleeps), and when a reminder is due it calls the reminder module, which decides the channel: **the app reminder is the main thing** (calls cost money); a call is placed only when the app path will not do (channel `call`, or `both` and the app reminder stayed unmarked). The voice agent is **not a separate thing**: the agent that already lives in the backend places the call, given the reminder's context.
- **Testing calls: one call per test, never in a loop** (owner).
- Not decided yet (ask the owner, do not guess): nothing in phase 1; Twilio spend stays "a few test calls" until the owner says otherwise.

## 0.1 Rules you must follow (from AGENTS.md and what went wrong before)

- Work on a **new branch cut from `origin/main`** (`git fetch origin && git switch -c calendar origin/main`). Never on `main`. Open a pull request. Never use `git add -A` at the repo root: the owner and another agent work in the same checkout, add your own files by path.
- **No secrets** in code, logs, chat or commits. Never open or print `.env` values. Scripts may read them in-process and print only names or yes/no.
- **Never place a real phone call without the owner's go-ahead in that moment.** Only numbers in `VOICE_ALLOWED_NUMBERS`, only people who agreed.
- **Do not kill running services** (API, dev server, tunnel). Start your own on another port (the owner uses 3000, 8093, 8800; I used 3002 and 8095).
- **Real names and realistic data only** in anything the owner sees. No "test", "Neighbour 7". No hard-coded sample data in the app: an unbuilt thing says "Coming soon", an empty list says so honestly.
- **Six languages** for every word the person sees: en, hi, bn, ta, zh, ms. The self-test fails if one is missing. First drafts are fine, mark them for native review.
- **Tests must never send real email** (a `tests/conftest.py` already blocks it). Do not remove it. Brevo mail credit was burned once by tests mailing `test-xxxx@example.com`.
- Say plainly what you tested and what you did not. Log every session in `team-docs/10-handoff/PROGRESS.md` (newest at the bottom) and keep HANDOFF "Current state / Not done yet" true.
- Checks before you say done:
  - app: `cd app && npx tsc --noEmit && npx tsx src/navigation/selftest.ts && npx expo lint` (all clean, lint 0 warnings)
  - backend: `cd backend && "C:/Users/ankitkumar/Desktop/work/1/runtime/python/python.exe" -m pytest tests -q` (the machine's own `python` is 3.9 and too old; use that bundled Python. Currently 131 tests pass.)

## 1. Concepts and permissions

### 1.1 Words
- **person**: the user the calendar belongs to (`users.id`). An elderly person with a phone, or an assisted profile (a family member set up by a helper).
- **item**: one scheduled thing, possibly repeating (a medicine every morning, a doctor visit once).
- **occurrence**: one dated instance of an item. Occurrences are **calculated on the fly** from the item, not stored, except the marks (done/skipped).
- **mark**: the person (or a helper) says "I took it" / "skip" for one occurrence.

### 1.2 Who may do what (reuse the family code, do not rebuild it)
The function `backend/app/modules/family/service.py: acting(conn, helper_id, person_id)` returns `"self"`, or the delegation level `"setup" | "ongoing" | "full"`, or raises `FamilyError(403, no_access | setup_expired)`. It re-checks the live delegation, that both share a family, and that a one-time `setup` help does not follow a claimed account. **Call it on every request that names another person.** Rules:

| Caller | Read person's calendar | Create / edit / cancel items | Mark done |
|---|---|---|---|
| the person themselves | yes | yes | yes |
| helper with level `setup` (assisted profile, not yet claimed) | yes | yes | yes |
| helper with level `ongoing` or `full` | yes | yes | yes |
| anyone else in the family | no | no | no |
| a stranger | 403 `no_access` | 403 | 403 |

- Every item records `created_by` (who typed it). The elderly person sees "Added by <name>" on each item, so nothing is hidden from them.
- Do not write calendar changes to `permission_events` (that table records access changes only). Keep it simple: `created_by` and `updated_by` columns; add a separate log only if the owner asks.
- Do **not** use the on-behalf header (`X-Bricks-On-Behalf`). It only works for `/me`. The calendar takes an explicit `person_id` and checks `acting()` itself.

## 2. Phase 1 backend (do this first)

### 2.1 Migration `backend/migrations/0011_calendar.sql`
Migrations are applied by themselves at startup now (`app/main.py` lifespan) and by `python backend/run.py migrate`. Name the next free number (check `ls backend/migrations`). Draft:

```sql
create table calendar_items (
  id             uuid primary key default gen_random_uuid(),
  person_id      uuid not null references users(id) on delete cascade,   -- whose calendar
  created_by     uuid references users(id) on delete set null,
  updated_by     uuid references users(id) on delete set null,
  kind           text not null check (kind in ('medicine','appointment','exercise','event','call','other')),
  title          text not null check (char_length(title) between 1 and 120),
  note           text check (note is null or char_length(note) <= 500),
  first_date     date not null,                    -- the first day, in the person's own local time
  local_time     time not null,                    -- the wall-clock time, in the person's own local time
  tz_offset_min  int  not null default 480,        -- minutes EAST of UTC at creation (Singapore 480, India 330). Fixed offset: SG and IN have no daylight saving.
  duration_min   int  check (duration_min is null or duration_min between 1 and 1440),
  repeat         text not null default 'none' check (repeat in ('none','daily','weekdays','weekly')),
  repeat_days    smallint[],                       -- for 'weekly': 0=Mon .. 6=Sun; null = the weekday of first_date
  until_date     date,                             -- last day (inclusive), null = forever
  remind_before_min int not null default 0 check (remind_before_min between 0 and 1440),
  channel        text not null default 'app' check (channel in ('app','call','both')),   -- 'call' and 'both' only take effect in phase 3 and only with consent
  notify_family  boolean not null default true,    -- tell the helpers if it is missed (phase 2)
  status         text not null default 'active' check (status in ('active','cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index calendar_items_person_idx on calendar_items (person_id, status, first_date);

create table calendar_marks (
  item_id     uuid not null references calendar_items(id) on delete cascade,
  occurs_at   timestamptz not null,               -- the occurrence this mark is for (UTC, as expanded)
  status      text not null check (status in ('done','skipped')),
  marked_by   uuid references users(id) on delete set null,
  marked_at   timestamptz not null default now(),
  primary key (item_id, occurs_at)
);
```
Phase 3 adds `call_consents` and `call_attempts` in its own migration (section 6).

### 2.2 Module layout (copy `modules/family/` and `modules/communities/` style)
```
backend/app/modules/calendar/__init__.py
backend/app/modules/calendar/service.py    plain functions over one Connection; raises CalendarError(code, status)
backend/app/modules/calendar/router.py     prefix /v1/calendar, thin; refusals RETURNED as JSONResponse, not raised
backend/app/modules/calendar/schemas.py    pydantic models
backend/tests/test_calendar.py
```
Register in `backend/app/main.py` (`from .modules.calendar.router import router as calendar_router` and `app.include_router(calendar_router)`). The other agent edits `main.py`: make a small, separate edit and expect to merge.

### 2.3 Expansion algorithm (no stored occurrences)
`expand(item, range_start_utc, range_end_utc) -> list[datetime]` in **service.py**, pure and unit-tested:
1. `offset = timedelta(minutes=item.tz_offset_min)`.
2. Walk local dates `d` from `(range_start_utc + offset).date() - 1 day` to `(range_end_utc + offset).date() + 1 day`.
3. Keep `d` if `d >= first_date`, `until_date is None or d <= until_date`, and the rule holds:
   - `none`: `d == first_date`
   - `daily`: always
   - `weekdays`: `d.weekday() < 5`
   - `weekly`: `d.weekday() in (repeat_days or [first_date.weekday()])`
4. `occurs_at = datetime.combine(d, local_time) - offset`, as UTC aware. Keep it if `range_start_utc <= occurs_at < range_end_utc`.
5. Cap a request to **62 days** and to 500 occurrences (return 422 `range_too_large`).

### 2.4 API (all need `Authorization: Bearer`; `person_id` optional, default me)
Use the same error shape as the rest: `{"detail": {"code": "..."}}` with the status below.

| Method and path | What |
|---|---|
| `GET /v1/calendar/people` | the calendars I may open: me, plus every person I hold an active delegation for who shares a family (`select ... from delegations where helper_id = me and status = 'active'`, then verify with `acting()`; skip `setup_expired`). Returns `[{id, name, is_me, level}]` |
| `GET /v1/calendar/occurrences?person_id=&from=&to=` | `from`/`to` ISO datetimes, default now-3h to now+7d. Returns occurrences, each: `{item_id, occurs_at, kind, title, note, duration_min, status: "pending"/"done"/"skipped", added_by_name, channel, can_edit}` sorted by time. For **me** also merges the community activities I said "going" to (`activity_participants` + `activities`, status scheduled), as `kind: "event"`, `can_edit: false`, `item_id: null`, plus `activity_id` and `community_id`. |
| `POST /v1/calendar/items` | body: `person_id?`, `kind`, `title`, `note?`, `starts_at` (aware ISO datetime, **its offset becomes `tz_offset_min`, its local date and time become `first_date` and `local_time`**), `duration_min?`, `repeat`, `repeat_days?`, `until_date?`, `remind_before_min?`, `channel?`, `notify_family?`. Returns `{id}`. Reject `starts_at` without an offset: 422 `time_needs_offset` |
| `PATCH /v1/calendar/items/{id}` | same fields, all optional. Changing the time of a repeating item changes all future ones (keep it simple, say so in the docs) |
| `DELETE /v1/calendar/items/{id}` | sets `status='cancelled'` (never hard delete) |
| `POST /v1/calendar/items/{id}/mark` | body `{occurs_at, status: "done"|"skipped"}`; `occurs_at` must be a real occurrence of that item (recompute, else 422 `not_an_occurrence`); idempotent upsert; returns the occurrence |
| `DELETE /v1/calendar/items/{id}/mark?occurs_at=` | undo a mark |

Errors: `no_access` 403, `setup_expired` 403, `not_found` 404 (also for a malformed uuid), `validation` 422. Always check `acting()` on the item's `person_id`, never trust a `person_id` in the body without it.

### 2.5 Tests to write (`tests/test_calendar.py`, throw-away people, clean up in a module fixture like `test_family.py`)
1. `expand` unit tests: none, daily, weekdays, weekly with and without `repeat_days`, `until_date`, a negative offset, a range that starts mid-day, the 62-day cap.
2. Create and list for myself: item appears at the right UTC time for offset 480 and 330.
3. Mark done, idempotent re-mark, skipped, undo; a mark for a time that is not an occurrence is refused.
4. Cancel hides the item.
5. **Permissions** (most important): an owner creates a family, an assisted profile (`POST /v1/families/{id}/assisted`, this auto-creates a `setup` delegation); the owner (helper) can create/read/mark on that profile's calendar; an unrelated user gets 403 `no_access`; after `DELETE /v1/delegations/{id}` the helper is refused; after the profile is claimed (`POST /v1/auth/claim`) a `setup` helper gets `setup_expired`; a helper with `ongoing` can still act. See `tests/test_delegations.py` and `tests/test_claim.py` for how to build these situations.
6. The "going" community activities appear for me only, read-only.
7. `GET /people` lists me plus the people I may act for, nobody else.

Target: all existing 131 tests still pass plus yours.

## 3. Phase 1 app (the Calendar tab)

### 3.1 Conventions you must follow
Module > page > element. Read `team-docs/10-handoff/HANDOFF.md` section 6 and copy `app/src/features/community/` (pages in `pages.ts`, one `strings.ts`, `screens/`, shared `ui.tsx`) and `app/src/features/family/`. Every list and action is published to the agent with `usePageData(...)`; **every input is bound with `useField(page, id, value, setter)` and declared in the page's `elements`** (an input that is not registered is something the agent cannot type into; this bit us on the Grow forms).

### 3.2 Files
```
app/src/api/calendar.ts                       typed calls to the endpoints above (use api() from './client')
app/src/features/calendar/module.ts           defineModule({ id: 'calendar', pages: [...] }); import it in app/src/features/index.ts
app/src/features/calendar/pages.ts            definePage x3: calendar.index (tab: 4, icon: 'calendar', route '/calendar'), calendar.new ('/calendar/new'), calendar.item ('/calendar/item/[id]')
app/src/features/calendar/strings.ts          six languages
app/src/features/calendar/screens/*.tsx       Today.tsx (index), New.tsx, Item.tsx
app/src/app/(tabs)/calendar.tsx               export { default } from '../../features/calendar/screens/Today';
app/src/app/calendar/new.tsx, item/[id].tsx   re-exports
```
The tab bar reads `tabPages()` from the registry; setting `tab: 4` on `calendar.index` makes it appear. **Update the self-test** (`app/src/navigation/selftest.ts` line about "three tabs" and the module count `allModules().length`) and the doc line in `team-docs/10-handoff/HANDOFF.md`. Check that four tabs still fit the bar on a 360 px phone (labels are short: Connect, Grow, Family, Calendar).

### 3.3 Screens
- **Today** (the tab): header with a person switcher (chips from `GET /people`; only shown when the list has more than me; the chosen person's name is written large so nobody edits the wrong calendar). A banner when viewing someone else: "You are looking at X's calendar. Added by you." Sections: "Now / Next", "Today", "Tomorrow", "This week". Each row: time, title, kind icon, and a big **Done** and **Skip** button (large touch targets, this is for seniors). Done rows show a tick. Empty state: honest sentence and the Add button. A floating or footer **Add** pill.
- **New**: kind chips (Medicine, Appointment, Exercise, Event, Call, Other), title, date, time, repeat chips (Once, Every day, Weekdays, Weekly + day chips), optional note, **"Tell family if missed"** switch, and a person line "For: X". Date and time are typed as `YYYY-MM-DD` and `HH:MM` like `app/src/features/community/screens/NewEvent.tsx` (same parsing, same "bad date" message; compute the device offset with `-new Date().getTimezoneOffset()` and send an ISO string that carries it). **For Medicine show, above the Save button: "Bricks reminds you. It does not give medical advice. Follow your doctor's instructions."** (six languages).
- **Item**: details, "Added by", who it is for, edit, cancel with a confirm.
- Everything respects the person in view: a helper creating an item sends `person_id`.

### 3.4 Words (all six languages; build the list first, then translate)
Calendar, Today, Tomorrow, This week, Now, Next, Add, Done, Skip, Undo, Medicine, Appointment, Exercise, Event, Call, Other, Title, Date (YYYY-MM-DD), Time (HH:MM, 24-hour), Repeat, Once, Every day, Weekdays, Weekly, Mon to Sun, Note, Tell my family if I miss it, For {name}, Added by {name}, You are looking at {name}'s calendar, Nothing planned, the medicine disclaimer, error and retry lines. Reuse words that already exist in `strings.ts` files where they match.

### 3.5 Agent
Phase 1 only needs the fields and actions registered (done by `useField`/`useAction`/`usePageData`). Phase 2 adds agent **tools** (section 5).

### 3.6 Test it for real (how I did it, so you do not lose hours)
- Start your own API: `cd backend && PORT=8095 "<bundled python>" run.py` and web: `cd app && EXPO_PUBLIC_API_URL=http://localhost:8095 npx expo start --web --port 3002`. Do not touch ports 3000, 8093, 8800.
- The sign-in code endpoint is rate-limited (3 per hour per address, and a minimum gap). To sign in the browser quickly, call `POST /v1/auth/request-code` and `/verify-code` from a small Python script, then set `localStorage['bricks.refresh']` to the returned refresh token in the browser pane and reload. **A refresh token is single-use and rotates: reload once, wait ~6 s, do not navigate in quick succession** or you are signed out. If you hit the rate limit locally, delete that email's rows in the local `login_codes` table.
- Use the owner's own address plus-tagged (for example `name+test@gmail.com`) only if you need a real mail; otherwise rely on the dev code shown locally.
- Use the browser pane's mobile size (375 x 812) and drive it with `find` / `read_page` / `get_page_text`; screenshots lag a frame.
- Test as: the elderly person; a helper on an assisted profile (create family, "Set up for someone", hand over the account); a stranger. See `team-docs/10-handoff/PROGRESS.md` (13 Nov entries) for the exact family walk-through I ran.

## 4. Definition of done for phase 1
Backend tests green (existing plus new). App checks clean. In a browser: I add a daily medicine for myself; a helper adds an appointment for the assisted profile and the profile (after claiming) sees it with "Added by <helper>"; a stranger cannot read it; the helper loses access after "End access". PROGRESS and HANDOFF updated. A pull request opened (squash merge). Not deployed anywhere until the owner says.

## 5. Phase 2: reminders in the app, missed items, family view, agent tools, conflict warnings

1. **Due now**: while the app is open, the Today screen highlights the item that is due within `remind_before_min` and, when due, the agent bar shows a one-line prompt ("Time for your 8 o'clock medicine. Done?") with Done / Later. Polling every 60 s (`GET /occurrences` for the next hour) is enough; no push yet.
2. **Heartbeat (owner, 13 Nov 2026)**: while the app is open it pings the backend (a light `/v1/calendar/heartbeat`, every ~60 s, together with the poll). The backend marks the person "app-reachable for now". The reminder loop uses this when a channel is `both`: app reminder first; if still unmarked after about 10 minutes AND the person was not reachable, a call. It is a hint, never a hard rule — a call always obeys consent and quiet hours.
3. **Missed**: an occurrence is missed when `occurs_at + 60 min < now` and it has no mark. Add `GET /v1/calendar/missed?person_id=` and show "Missed" in red on Today. For helpers: a "Needs attention" list on the Family detail page (items missed in the last 24 h where `notify_family` is true) with a **Call** shortcut later.
4. **Conflict warnings (owner, 13 Nov 2026) — a warning, never a blockade.** The person can always save. Keep it in its **own small module** (`calendar/warnings.py`) so it can grow: the point is that two things may share a time when neither needs the body (8 o'clock medicine reminder + 8 o'clock call to mum is fine), while two **group events** at once are a real clash. First cut: warn on overlap or a gap under 15 minutes when the new thing is a group event, or when both are events; plain reminders just warn on exact same-time-for-the-same-person duplicates. The margin, the distance, travel time and "what kind of thing does this clash with" evolve gradually in this module alone — nothing else in the app changes shape because of it.
5. **Agent tools** (see `app/src/agent/tools.ts` and `backend/app/modules/agent/declarations.py`; tool descriptions are cut at 1000 characters, the self-test checks it): `calendar_today` (read), `calendar_add` (confirm tier: the person approves in the banner), `calendar_done` (free). The agent must say in the person's language, never use words like "occurrence" or "item". Acting for a family member goes through the same `person_id` and `acting()` check on the server, never trusted from the model.
6. **Push notifications** need `expo-notifications` and a development build (not Expo Go); do it after the owner approves the APK path. Record it as "not done" until then.
7. Add `tz_offset_min` to the user profile so the agent and calls use the person's own time (otherwise use the item's offset).

## 6. Phase 3: reminder calls (only after phases 1 and 2, and only with the owner's go-ahead)

The voice module exists: `backend/app/modules/voice/` (Twilio + Gemini Live). Facts to build on:
- `POST /v1/voice/calls` (header `X-Voice-Admin-Key`) places a call. The service **refuses** unless the number is in `VOICE_ALLOWED_NUMBERS` (E.164 list, empty = nobody) and the body has `consent: true`. See `voice/service.py: start_call`. Languages and prompts are in `voice/logic.py` and `voice/tools.py`.
- The owner's rule: **never place a call without his go-ahead in that moment, only to people who agreed.** A scheduled call is a standing go-ahead for that person only after they opt in (below). The first live test of any call is done with the owner watching.

### 6.1 Data (new migration)
```sql
create table call_consents (
  person_id   uuid primary key references users(id) on delete cascade,
  phone_e164  text not null,
  language    text not null default 'en' check (language in ('en','hi','bn','ta','zh','ms')),
  window_from time not null default '08:00',     -- allowed hours, person's local time
  window_to   time not null default '20:00',
  agreed_at   timestamptz not null,
  agreed_by   uuid references users(id),          -- the person themselves, or a helper WITH the person present; show which
  revoked_at  timestamptz
);
create table call_attempts (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid references calendar_items(id) on delete set null,
  person_id   uuid not null references users(id) on delete cascade,
  occurs_at   timestamptz not null,
  attempt_no  int not null default 1,
  status      text not null check (status in ('queued','dialing','answered','acknowledged','no_answer','failed','blocked')),
  voice_call_id text,
  outcome     text,                                -- 'took_it' | 'will_do_later' | 'needs_help' | null
  created_at  timestamptz not null default now(),
  unique (item_id, occurs_at, attempt_no)
);
```
The consent is **the person's**. A helper may record it only inside the app together with the person ("they are next to me and said yes", with an explicit tick and a record in `agreed_by`). The person can revoke any time (a Settings row and "stop calling me" said to the agent). A revoked or missing consent means `status='blocked'`, never a call.

### 6.2 The scheduler
- **Decided (owner, 13 Nov 2026): no external cron and no separate service.** The backend never sleeps (the owner's Render plan is Pro), so the backend itself runs **one always-on reminder loop**: a single async task started in the app lifespan, ticking every ~30 s. It finds items with `channel in ('call','both')` whose occurrence is due now (within the last 5 minutes), not marked, with a valid consent and inside the allowed hours; it creates `call_attempts` rows (the unique key makes it safe to run twice), places the call, updates the status. The same loop serves the heartbeat bookkeeping and the missed-item marks, so there is exactly ONE background thing to reason about.
- **Testing: one call per test, never a loop** (owner). The retry rule below still applies to real operation: no answer → try again ONCE after 10 minutes, then stop and mark `no_answer`.
- The voice agent is the agent the backend already has (`modules/agent`), invoked with the reminder's context — nothing new to host.
- Cost: Twilio bills per minute. Make the call short (about 30 seconds), and cap attempts per item per day.

### 6.3 What the agent says
A short scripted opening in the person's language, from the item: "Hello <first name>, this is Bricks. It is time for <title>. Have you taken it?" Then listens for yes / later / help and calls a tool `calendar_outcome` that sets `outcome` and marks the occurrence done on "took it". It never gives medical advice, never changes a dose, and says "ask your doctor" if asked. If the person says they need help, it creates a notification for the helpers.
- Retry rule: no answer: try again once after 10 minutes, then stop and mark `no_answer`; if `notify_family`, show it in the helper's "Needs attention" list (in-app, phase 2) and send nothing outside the app.
- Quiet hours always win over the item time.

### 6.4 Not to do in phase 3 without the owner
Calling anyone not on `VOICE_ALLOWED_NUMBERS`; changing `VOICE_ALLOWED_NUMBERS` (it is his env value); placing a test call to a real number; spending Twilio credit beyond a few test calls.

## 7. Pitfalls we already hit (save yourself the time)
- **Squash merges cause conflicts** when you keep working on a branch that was squash-merged. Branch from fresh `origin/main` for each piece of work.
- Pasting secrets in chat happened once: tell the owner to rotate anything that gets pasted.
- Tests that create users must not email: `tests/conftest.py` replaces the SMTP connection. Keep it.
- Sign-in codes are rate limited; the local code is shown on screen only when `APP_ENV` is not prod and the request is from this computer.
- A Python heredoc with `python -` ignores the path: when a script imports `app.*`, put it in a file and add the backend folder to `sys.path`. Git Bash has no `python3`.
- Windows line-ending warnings from git are harmless.
- Render blocks outbound SMTP on the free plan; mail uses the Brevo REST API there (`BREVO_API_KEY` + `EMAIL_FROM`). Not your task, but do not add anything that needs SMTP.
- Inputs not registered with `useField` cannot be filled by the agent. Register every input.
- The Health tab is "coming soon" on purpose (a teammate is building a live trainer). Do not touch it.

## 8. Order of work, one pull request each
1. Migration, module, tests (section 2). Open PR 1.
2. App: API client, Calendar tab, New and Item screens, words, self-test (section 3). PR 2.
3. Phase 2 (section 5). PR 3.
4. Phase 3 only after the owner answers the hosting question and approves (section 6). PR 4.
