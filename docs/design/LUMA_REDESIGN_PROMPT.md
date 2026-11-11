# Prompt: implement the Luma-inspired UI in the Bricks app

Copy everything below the line into your coding agent (Claude Code or similar), opened at the
repo root.

---

You are restyling the Bricks mobile app (`app/`, Expo SDK 58, Expo Router, TypeScript) so it
looks and feels like the **Luma iOS app (Sep 2026)**. The behaviour (UX) stays as it is; only the
look changes, plus a few new layout pieces listed below. Work screen by screen, keep every test
green, and show each step working before moving on.

## 1. Context you need first

Read these before changing anything:
- `CHANGELOG.md`: the current state and the latest entries ("Luma-style redesign, first pass").
- `docs/02_DESIGN_PRINCIPLES.md`: the accessibility rules (they still apply; see §4).
- `app/src/theme/tokens.ts`: **the only place** with raw colours, sizes, radii, shadows and
  timings. Components use tokens, never hex values or magic numbers.
- `app/src/components/` (shared pieces: `BigButton`, `Card`, `EventCard`, `SectionCard`,
  `BottomSheet`, `StatusBanner`, `ListRow`, `Chip`, `Tag`, `Avatar`, `layout/Screen`,
  `layout/TopBar`, `layout/BackButton`) and `app/src/app/` (screens, Expo Router).
- `app/AGENTS.md`: Expo rules. **Do not trust memory for Expo APIs**: check
  https://docs.expo.dev/versions/v58.0.0/ before using any Expo or React Native API.

The design source is the folder **`Luma ios Sep 2026/`** at the repo root: 393 PNG screenshots
named `Luma ios Sep 2026 N.png`. It is **not in git** (292 MB, someone else's app): get it from
the team and put it at the repo root; it is git-ignored. Open the screenshots you need for each
step (index in §6).

## 2. What is already done (don't redo)

The first pass is in place:
- **Tokens:** ink-black `primary` `#111111` (pressed `#3A3A3C`, subtle `#E9E9EE`); soft
  grey `bgSubtle` `#F2F2F5`, `border` `#E3E3E8`; radii `card 20`, `button 999` (pills), `tile 14`,
  `sheet 28`, `avatar 999`; one `shadow.floating`.
- **Tab bar** (`app/src/app/(tabs)/_layout.tsx`): a floating white pill with a soft shadow; the
  selected tab sits in a grey pill. Tabs are **Home · Community · Activity · Health** (routes
  `home`, `kampung`, `pass-it-on`, `thrive`; don't rename the routes).
- **`Card`:** a borderless grey panel (`tone="plain"` gives white).
- **`BigButton`:** pills; `outline` is now a grey pill.
- **`SectionCard`:** a grey panel with a white icon tile.
- **`BackButton`:** a grey pill, with the word "Back" kept.
- **`BottomSheet`:** floats as a rounded panel inset from the edges.
- **`EventCard`:** a Luma event row (square photo on the left; host, title, when, where and
  going count on the right; then the "I'm going" pill).

## 3. Decisions already made (don't change them)

- Take Luma's **design language**, not its brand: no Luma name, logo, sparkle icon, wording or
  cover art. All images come from our own data and category icons.
- **Light mode only for now.** Every colour stays in `tokens.ts`, so a dark palette can be added
  later without touching screens.
- **Chat:** keep the WhatsApp group link per event and Circle. In-app chat is later (don't build
  it).
- **Leave out:** QR tickets and check-in scanning; payments, prices, Stripe, coupons and
  currencies; registration-question builders; passkeys; crypto; app-icon switching; and
  "slide to confirm" (sliding is hard for shaky hands; use a clear two-step confirm with a big
  button).
- **Buddy** (the round floating voice button) stays on every screen except the safety screens
  (SOS, Are you okay, helper alert). The red **Help** button stays on every screen.

## 4. Hard rules (accessibility floors win over the screenshots)

Luma's text is small and its grey text is low-contrast. Our members are 60–85, so keep the
Luma layout but at our sizes:
- Body text ≥ 20 pt, nothing below 18 pt (`typeScale`). Text contrast ≥ 4.5:1, aim for 7:1;
  never lighten `textSecondary`. The checks are in `theme/tokens.test.ts`; keep them passing and
  add new pairs when you add colours.
- Touch targets ≥ 64 dp (`touch.min`) with ≥ 16 dp gaps. Never icon-only buttons: always a word.
- Layouts must work at 200% system font size and in **Tamil** (long words wrap, never cut off).
  The existing test "Tamil at 200% text on every new screen" must keep passing.
- **All text goes through i18n** (`app/src/i18n/locales/{en,ms,zh,ta}.json`); add every new key
  in all 4 languages. `locales.test.ts` checks that every language has the same keys.
- Every screen keeps working with **Read it out** (its `readOut` script) and with Buddy's
  "show, don't tell" (Buddy highlights and fills fields by `testID`, so **don't remove or rename
  testIDs**). Read-outs say units in words (`sayDistance`, `sayMinutes`, `sayDigits` in
  `lib/format.ts`).
- Motion: 150–200 ms fades and slides only (`motion`). No bounce, no confetti.
- If a screenshot conflicts with these rules, follow the rules and add a line to the changelog
  saying where and why.

## 5. Native code: stay in JavaScript where you can

The team's phones run a development build; JavaScript changes reach them over Metro instantly.
A new native library (for example `expo-blur`, `expo-linear-gradient`, `expo-glass-effect`,
image-colour extraction) needs a **new EAS dev build** for everyone. So:
- Gradients: use `react-native-svg` (already installed: `LinearGradient` inside `Svg`).
- Glass: translucent white plus `shadow.floating`, no real blur, for now.
- Images: `expo-image` (already installed).
- Only add a native library if there is no JS way, and say so in the changelog ("needs a new
  dev build").

## 6. Work plan (in this order; one commit per step)

For each step, open the Luma screenshots listed, then restyle the Bricks screens named.

**Step 1: shared pieces still missing** (do these first; screens are built from them)
- `Toast`: a green pill at the top ("You're going", "Copied"), replacing `StatusBanner` where a
  message only confirms an action. Luma 51, 54, 59, 82, 163, 343.
- `SheetHeader`: an icon in a soft circle, a bold title, one line of explanation, then the
  buttons (main action as a black pill, cancel as a grey pill, destructive as a red pill). Use it
  in `ConfirmSheet`, the leave-event sheet, Add to calendar and Buddy's confirm. Luma 48, 56, 79,
  99, 166, 206, 256–260.
- `GroupedList` / `GroupedRow`: an iOS-style grouped list on a grey panel; each row has a
  coloured rounded-square icon, a title, an optional grey subtitle, a value on the right and a
  chevron. Luma 169–174 and 328–336.
- `StatusBadge`: a small coloured label over a photo or after a title: Going (green), Hosting
  (purple), Full (grey), New (black). Luma 22–31. Add the badge colours to tokens and test their
  contrast.
- `EmptyState`: restyle to Luma's (a soft grey icon, a bold line, one grey line, an optional
  button). Luma 25, 32, 105, 222, 262, 290, 330.
- `AvatarStack`: overlapping faces plus "+12". Luma 38, 157.
- `DateHeader`: "Tomorrow / Wednesday" section headings for timelines. Luma 22–31.

**Step 2: Home** (`app/(tabs)/home/index.tsx`). Luma 22–32, 392.
- A big greeting, then "Your events" as a timeline of event rows grouped by `DateHeader`, with
  `StatusBadge`s.
- The check-in card and the next reminder sit as grey cards at the top.
- The Community / Activity / Health section cards stay (in tab order), restyled.

**Step 3: event page** (`app/event/[id].tsx`, `app/going/[id].tsx`). Luma 33–59, 77–84.
- A large square cover photo (or category art), then the title, when and host.
- **The page background is tinted from the cover**: a gradient from the cover's main colour
  to white. Get the colour from the backend when an event photo is saved (add an optional
  `cover_color` to the event API; until then, use a colour per category in tokens). Text on the
  tint must still pass contrast.
- An action row of three pills: **I'm going** / **WhatsApp group** / **More** (More opens a sheet:
  Add to calendar, Share, I can't go any more).
- Then a grey Location card with the map preview, a Host row, "12 going" with an `AvatarStack`,
  and About.
- "You're going" (`going/[id]`): a big green tick, the title, and "We'll remind you at …".
  Luma 45, 69, 84.

**Step 4: Community tab** (`app/(tabs)/kampung/*`). Luma 21, 264–289, 93–95.
- The top: the title, then category `Chip`s in a horizontal scroll (Walks, Tai chi, Games,
  Music, Cooking, Gardening, Classes, Coffee, With children).
- "Near you": event rows grouped by `DateHeader`.
- **A map view**: a toggle at the top switches the list to a map with event pins
  (`components/RouteMap` shows how maps are done; check `react-native-maps` in Expo SDK 58).
  Luma 284–286.
- Circles (`circles.tsx`, `circle/[id]`): like Luma's calendar and club pages. A cover, the
  name, member count and description; a Join pill; then that Circle's events. Luma 271–281, 94–95.
- Start Something (`create.tsx`): keep the one-question-per-screen flow. Restyle each step
  like Luma's create screen (dark-glass header with the cover, grouped rows for when and where,
  a map card for the place). Luma 109–124, 144–151. The live form Buddy fills must keep its
  testIDs.

**Step 5: Activity tab** (`app/(tabs)/pass-it-on/*`). No direct Luma screen: use the same
pieces. Skill and thank-you items look like event rows; voice notes sit in a grey card with a
black play pill; the share flow uses `SheetHeader` and `GroupedList`.

**Step 6: Health tab** (`app/(tabs)/thrive/*`, `app/walk/*`). No direct Luma screen.
- Big stat cards as grey panels; the week bar chart in black.
- Reminders as a `GroupedList`.
- The walk recording screen: big numbers, a black Pause pill and a red Finish pill.
- The walk summary: a map card, stats, and the praise as a `Toast`-style green panel.

**Step 7: Profile, Settings, Family** (`app/profile.tsx`, `app/settings/*`,
`app/family.tsx`). Luma 93, 328–336, 361–375, 383–386.
- Profile: a big avatar, the name and short bio, "Joined June 2026 · 2 hosted · 6 attended", the
  events they host, and past events.
- Settings: a `GroupedList` with sections (You: Edit profile, Language, Read it out. Safety:
  Safe Circle, Family. Notifications. Help: Contact us, Sign out).
- Sign out and similar: `SheetHeader` confirm.

**Step 8: onboarding and sign-in** (`app/onboarding/*`). Luma 0–19, 387–391.
- The welcome screen: our event and category art in a slowly drifting collage, a big headline,
  then the black "Continue with phone" pill.
- One field per screen; a large code-entry box; "Complete your profile" with a photo circle.

**Step 9: the safety screens** (`app/sos.tsx`, `app/are-you-ok.tsx`,
`app/helper-alert.tsx`). Restyle only lightly: keep them plain, red and very large. **No
Buddy, no decorative images, no gradients.** Check the existing safety tests still pass.

## 7. How to check each step

From `app/`:
```
npx tsc --noEmit
npx expo lint
npx jest
```
All must pass (currently 506 tests). If a test checked the old look (for example a border
colour), update it to the new look; never delete a test about behaviour, accessibility or
read-outs. Then run the app on a phone (`npx expo start --dev-client`) and look at the screen
in English, then in Tamil with the phone's font at its largest.

For each step, add an entry to `CHANGELOG.md` under "Unreleased" (what changed, which screens,
any accessibility trade-off, "needs a new dev build" if so), and keep the "Current state" table
true.

## 8. Git

- Work on a branch, for example `ui-luma`; one commit per step with a plain message
  ("ui: event page in the Luma style").
- **Never commit** `.env`, `app/.env.local`, `backend/.env` or the `Luma ios Sep 2026/` folder.
- No AI co-author lines in commit messages.
- Open one pull request when Steps 1–4 are done, so the team can try it before the rest.
