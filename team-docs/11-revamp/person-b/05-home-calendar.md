# B5: Home, bottom half: "Your calendar"

Branch: `b/home-calendar` (from the latest `main`, after B4 is merged).
Read first: `AGENTS.md`, `team-docs/11-revamp/README.md` (screen rules), then this file.

## Goal
Under "Your upcoming events", Home shows **"Your calendar"**: one plain month. Days with something coming up are highlighted. Past days
where the person completed an event show a green tick. Tapping a day opens a pop-up with that day's events. Nothing else.

## What exists today
- `features/home/screens/MonthPlanner.tsx`: the month on Home today (a row per week, a dot on planned days, the chosen day's list under it).
- `api/calendar.ts`: `calendarApi.occurrences(person, from, to)` returns the person's reminders, agreed bookings and the gatherings they
  said yes to, each with its mark (done, skipped) when there is one. `features/calendar/` holds the older calendar pages.
- `GET /v1/home/upcoming` and the answers from B4.

## Build
1. Rework the month into a simple calendar (keep it in `features/home`; a pure helper `features/home/month.ts` builds the cells):
   - a header with the month and year in words ("November 2026") and two big arrow buttons, previous and next month, each with a spoken label;
   - one row of weekday names, then the days. Monday first. Day cells at least 44 by 44 with large numbers;
   - **remove** anything that is not this: no week numbers or "Week 1" labels, no per-kind coloured dots, no legend, no day list under the grid;
   - **today** has a clear ring;
   - a day from today onward with at least one event is **highlighted** (a filled soft colour with a small dot under the number);
   - a past day on which the person completed something (an event they showed up to, or a calendar item marked done) shows
     a **green tick** in the cell;
   - a past day with nothing completed, and days with nothing planned, are plain.
2. **Tap a day** opens a pop-up (a centred card over a dimmed page, not a new page): the date in words as the title, then each event that
   day: the title, the time, the place, the tag ("From Bishan Walkers", "From Marketplace", or "My reminder"), and its state ("You are
   going", "You came" or "Done" with a green tick, "Not going"). A day with nothing says "Nothing planned". One big **Close** button; tapping outside
   or the device back button also closes it. It must be readable by a screen reader as a dialog.
3. What counts as an event here: the person's own calendar occurrences plus the upcoming events from B4 that they have not answered No to.
   Do not count the same event twice when it appears in both.
4. `features/home/month.check.ts`: the cells for months starting on each weekday, leap February, highlight and tick rules, the
   no-double-count rule, and the month and weekday names in six languages.
5. Declare the arrows and the day choice in `definePage`, and publish the month's events as page data so the agent can answer
   "what is on Thursday?".

## Files you may touch
`app/src/features/home/**`, `app/src/features/calendar/**` (only to reuse or move helpers), `app/src/api/calendar.ts`, `app/src/api/home.ts`.
In `selftest.ts` only existing lines about `home` or `calendar`.

## Not in this iteration
No backend change is expected. The older calendar pages (`features/calendar`: add a reminder, reminder calls) are not redesigned here and
are no longer linked from Home.

## Done when
- At phone size: this month shows upcoming days highlighted and past days the person showed up ticked; the arrows change month; tapping a day shows its
  events in the pop-up; Close returns to Home in the same place.
- Largest text size: seven columns still fit the width with no cut numbers. All six languages.
- `npx tsx src/features/home/month.check.ts`, `tsc`, `expo lint`, `selftest.ts` pass. `LOG.md` entry.
