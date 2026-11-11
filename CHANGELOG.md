# Changelog

## Current state

| Area | State |
|---|---|
| App look | Luma-style redesign in progress on branch `ui-luma` (see Unreleased) |
| Design brief | `docs/design/LUMA_REDESIGN_PROMPT.md` |
| Accessibility floors | Body ≥ 20 pt, nothing < 18 pt, touch ≥ 64 dp, contrast ≥ 4.5:1 (aim 7:1), 200% font, Tamil: all still enforced by tests |

## Unreleased

### UI step 0: Luma first pass (tokens, buttons, cards, tab bar)
The brief assumed this pass was done; it wasn't in this repo, so it's done here.
- **Tokens:** ink-black accent `primary #111111` (pressed `#3A3A3C`, grey pill `#E9E9EE`);
  soft-grey panels `bgSubtle #F2F2F5`, `border #E3E3E8`; radii card 20, button 999 (pills),
  tile 14, sheet 28; one `shadow.floating`; badge and toast colours; **category art colours**
  (a soft tint + deep icon per event category, used where there's no photo). All new colour
  pairs have contrast tests.
- **Tab bar:** a floating white pill with a soft shadow; the selected tab sits in a grey pill.
  It stays in the layout (doesn't overlap screens), so footers are never hidden under it.
- **Tabs renamed and reordered:** Home · Community · Activity · Health (routes unchanged:
  `home`, `kampung`, `pass-it-on`, `thrive`). Screen titles, Home cards and read-outs use the
  same words. In Malay, Mandarin and Tamil, "Activity" is "my activity" (Aktiviti Saya / 我的活动
  / என் செயல்பாடு), because "aktiviti" / "活动" already mean the events in Community. Buddy
  understands the new names and the old ones.
- **Components:** `Card` is a borderless grey panel (`tone="plain"` is white); `BigButton` is a
  pill (secondary actions are grey pills); `SectionCard` is a grey panel with a white icon tile;
  `BackButton` is a grey pill that keeps the word "Back"; `BottomSheet` floats as an inset
  rounded panel; `Chip` is a grey pill, black with a tick when selected.
- **`EventCard`:** a Luma event row: square cover (photo or category art) with a status badge,
  host, title, when, where; "12 going" and the pill button below. From 150% system font the
  cover moves above the words so they keep the full width.
- New: `CoverArt`, `StatusBadge` (Going / Hosting / Full / New), 32 dp `Avatar`.
- Web preview only: the walk map and sign-in storage have web versions, and launch-notification
  handling is skipped on web (phones unchanged).
- **Accessibility trade-off:** Luma's grey pills have no outline. Their dark labels carry the
  meaning; `borderStrong` stays for text inputs.

### UI step 1: shared pieces
- **`Toast`** (`showToast(text)`, `ToastHost` in the root layout): a green pill that confirms an
  action, shown 5 s (long enough to read twice), announced to screen readers. It sits **below**
  the top bar so Read it out and Help are never covered.
- **`SheetHeader`**: an icon in a soft circle, a bold title, one grey line; used by
  `ConfirmSheet` (which gains `detail` and `icon`).
- **`GroupedList` / `GroupedRow`**: iOS-style grouped rows on a grey panel: coloured icon
  square, title, grey subtitle, value, chevron; rows without an action are plain information.
- **`EmptyState`**: a soft grey icon, a bold line, an optional grey line (`detail`), one button.
- **`AvatarStack`** (faces + "+12") and **`DateHeader`** ("Tomorrow / Wednesday").
- All are in the `/dev/components` gallery with tests.
- **Rule over screenshot:** Luma uses red pills for destructive actions. Red stays only for
  Help and emergencies (docs/02), so destructive actions are black pills with a clear verb
  ("Leave", "Sign out"). Sheets have no icon-only "X": they close with a labelled button.

### UI step 2: Home
- A big greeting, then the **check-in** and **next reminder** as grey cards at the top.
- **"Your events"**: the member's next three plans as a timeline under `DateHeader`s
  ("14 Nov / Saturday"), with **Going / Hosting** badges on the covers; "See all N of your
  events" when there are more; an `EmptyState` with "Find something to join" when there are none.
- **"Picked for you"**: one event worth joining (hidden when it's already the check-in's walk
  suggestion, or they're going).
- The **Community · Activity · Health** cards follow in tab order; Settings is a `GroupedRow`.
- Read-out order matches the screen (Community first).
- Event rows say **"You're hosting"** on the member's own events.
