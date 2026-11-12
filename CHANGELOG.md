# Changelog

## Current state

| Area | State |
|---|---|
| App look | Luma-style redesign in progress on branch `ui-luma` (see Unreleased) |
| Design brief | `docs/design/LUMA_REDESIGN_PROMPT.md` |
| Accessibility floors | Touch ≥ 64 dp, contrast ≥ 4.5:1 (aim 7:1), 200% font, Tamil: all still enforced by tests. Text: body 20 pt at Large; the member can pick Normal (18 pt, default) or Small (16 pt) |

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

### UI step 3: event page and "You're going"
- **Event page** (`event/[id]`): the page is **tinted from the cover** (a gradient from the colour
  to white, drawn with `react-native-svg`: no new native library). The colour is the event's
  `cover_color` when the server sends one and it keeps text readable (7:1, grey 4.5:1), otherwise
  the category colour. A large square cover floats on it with a white edge; then the title, when,
  and "You're going / You're hosting".
- **Three action tiles** (`ActionTiles`): **I'm going** (black) / **WhatsApp group** / **More**.
  When going, WhatsApp becomes the black tile. At 150% font and above the tiles stack.
- **More** opens a sheet: **Add to calendar** (a Google Calendar link with the event filled in:
  no native calendar library), **Share** (the phone's share sheet), **I can't go any more**
  (then a `ConfirmSheet`), Close. Leaving now takes a deliberate extra step.
- White cards on the tint: **Location** (place, map preview with one pin via new `PlaceMap`,
  Open in Maps), **Host** and **"12 going"** with an `AvatarStack`, **About**.
- "Published." after Start Something is now a **Toast**.
- **"You're going"** (`going/[id]`) uses the same tint behind the big green tick.
- On tints, the going line uses the darker badge green (the standard green is 4.4:1 on the
  pastel tints); tests check text, grey text and green on every tint.
- **API:** optional `cover_color` on `GET /events/{id}` (app type and backend schema; null until
  events have photos).

### UI step 4: Community tab
- **Community** (`kampung/index`): a **List / Map** switch, My Circles, then **"Near you"**:
  Today, This week and the four busiest **kinds** (Walks, Tai chi, Games, Music, Cooking,
  Gardening, Classes, Coffee, With children), plus **"More kinds"** to show the rest in place.
  Happenings are grouped under `DateHeader`s. Kinds filter what's coming up on the phone.
- **Map view** (new `EventsMap`): one pin per happening; tapping a pin shows its name and time,
  and tapping that opens it. The same happenings stay listed below, so the map is never the only
  way in. Web shows the pins without map tiles.
- **Circles** (`ClubCard`, `circle/[id]`): Luma calendar rows and pages: a square cover coloured
  by the kind of Circle, the name, members, next activity; the Circle page is tinted, with a
  raised cover, the captain on a white card and an `AvatarStack` of members.
- **Start Something → Check and publish**: Luma's create screen: the cover, the name, then
  **When / Where / WhatsApp group** as `GroupedRow`s (each goes back to that question), then the
  card exactly as others will see it, now saying **"You're hosting"** (it said "I'm going").
- `GroupedRow` titles always keep 40% of the row (a long value wraps instead of squeezing them).
- **API:** event summaries now include `lat` / `lng` (for the map). Optional in the app type, so
  older servers still work; the backend and the mock data send them.
- **Rule over screenshot:** the brief asks for a sideways-scrolling chip strip. Hidden content you
  must swipe to find breaks docs/02 rule 6 (no hidden gestures), so chips wrap, and "More kinds"
  is a labelled button instead.

### UI step 5: Activity tab
- **Skills** ("What I can share") are event-style rows with a square cover coloured by the
  skill's first tag (chess = games, cooking = cooking…).
- **Thank-yous:** thumbs-ups are plain rows (face, "Siti said thank you", thumbs-up); voice
  thank-yous stay on grey cards with the black **Play** pill.
- **What I've given:** each number on its own grey panel (`BigStatsRow`, also used by Health);
  **badges** as a `GroupedList` with coloured icons (never a trophy wall).
- Section headings are larger (Luma's section style).
- **Share a skill → check step:** the cover and title, then **When / Where / Price** as
  `GroupedRow`s (When and Where go back to that question; Price is always "Free" for now).

### UI step 6: Health tab and walks
- **Health** keeps its layout; the week bar chart is black (the accent), stats sit on grey panels.
- **Reminders** (`thrive/reminders`): one grouped grey panel, a coloured icon square per kind
  (medicine, doctor, event, other), with Done / Remove buttons in each row.
- **Walk summary** (`walk/[id]`): map card, three stats on grey panels (three side by side use the
  28 pt title size so "3,000" never breaks or is cut off), and the **praise as a solid green
  panel** (new `StatusBanner` tone `celebrate`, white on green, 4.5:1+).
- **Recording** keeps a grey **Pause** and a black **Finish**.
- **Rule over screenshot:** the brief asks for a red Finish pill. Red stays only for Help and
  emergencies, so Finish is black.

### UI step 7: Settings, Profile, Family
- **Settings:** Luma's grouped style. The member at the top (face, name, "See my profile");
  **You** (Language); Read aloud and How we remind you stay as big chips (they're choices, not
  links); **People and safety** (Safe Circle, Family); the not-ready items as plain rows that each
  say "Coming soon" (no dead buttons); **Sign out** on its own, confirmed in a `SheetHeader` sheet.
- **Profile:** a 96 dp face and a larger name at the top (new `Avatar` size 96); the rest reuses
  the restyled Activity pieces.
- **Family:** the empty state is the new `EmptyState` with one line on what adding someone gives.

### UI step 8: welcome and sign-in
- **Welcome** (`onboarding/index`, the language picker): a collage of our own category art as
  tilted tiles (`WelcomeCollage`) above "Bricks" and the four language pills.
- **Sign in:** Luma's header: an icon in a soft circle, a centred title and one line on why
  ("So we know it's you…"), then Singpass (black pill) and Google (grey pill).
- **Rule over screenshot:** Luma's welcome collage drifts slowly. Ours is still: continuous motion
  breaks the 150–200 ms motion rule and can unsettle people prone to motion sickness.
- Phone and code entry screens aren't built yet (phone sign-in is off until an SMS provider
  exists), so Luma's code-entry box isn't used.

### UI step 11: text size (Small · Normal · Large) and one-screen layouts
- **New onboarding step** right after the language: "Text size", three white cards each written
  in its own size. Choosing one changes the whole app at once; Next moves on. Normal is chosen to
  start with. Also in **Settings → Text size** (`settings-text-size`).
- **Sizes:** Large is the old full scale (body 20 pt). Normal is the new default (×0.9, body
  18 pt). Small is ×0.8 (body 16 pt). Saved on the device with the other settings, checked on load.
  This deliberately relaxes the brief's 20 pt body floor, at the product owner's request; Large
  keeps it.
- **Compact layout with Small and Normal:** tighter screen and card spacing, 64 dp `lg` buttons,
  shorter welcome picture and walk map, the four languages as a 2×2 grid, smaller sign-in icon.
  Button labels that wrap stay centred. Tap targets stay ≥ 64 dp.
- **Result on a 393×760 phone screen (iPhone 15 size, after the status bar):** every onboarding
  step, Settings → Language and Text size, SOS, Are you OK, the helper alert, Family, check-in and
  Pass It On intro fit with no scrolling at Small and Normal; Walking fits at Small (22 px over
  at Normal). Lists and feeds (Home, Community, Activity, Settings, Profile, event page) still
  scroll: they hold more than one screen of content at any size.
- Tests: onboarding goes through the new step; Settings changes the size and the title grows.

### UI step 10: bolder Luma pass (font, white cards on grey, poster covers, immersive event page)
Steps 0–9 kept the old app's bones, and side by side with the Luma screens it still read as
the same app. This pass changes the shared building blocks, so every screen changes.
- **Font:** Inter for English and Malay (the clean, iPhone-like face of the Luma screens).
  Tamil keeps Noto Sans Tamil; Mandarin keeps the phone's font. `@expo-google-fonts/noto-sans`
  removed, `@expo-google-fonts/inter` added (JS font files only; no dev build needed).
- **Page and surfaces:** the page is pale grey (`canvas #F3F3F6`); cards, grouped lists, number
  panels, Home's section cards and tiles are white with a soft shadow (`shadow.card`), corners
  24dp. Bottom sheets are pale grey so their white buttons stand out.
- **Buttons and chips:** secondary buttons, chips, Back and Read it out are white floating pills
  (`shadow.control`), like Luma's round header buttons. Main actions stay black; Help stays red.
- **Covers:** events and Circles without a photo get poster art: a bold diagonal gradient in the
  category's colours (`posterColor`) with a big white icon, instead of a pastel square.
- **Event page:** a deep band of the category colour behind the cover, fading into the soft tint
  by the cover's bottom edge. It scrolls with the page, so the title and text always sit on the
  light part (contrast unchanged and still tested).
- **Tab bar:** the selected tab is a filled icon on a grey pill with a bold label (the old
  full-item highlight ran past the bar). The bar only reserves a second label line when a
  label has more than one word.
- **Design doc:** `docs/02_DESIGN_PRINCIPLES.md` §5 updated to these tokens (it still described
  the blue, flat look).

### UI step 9: safety screens (checked, kept plain)
- **SOS, Are you okay?, helper alert:** unchanged apart from the shared pill shapes. Still plain,
  very large, red only for the emergency call, with **no Buddy, no pictures and no gradients**.
  The safety tests pass unchanged.
