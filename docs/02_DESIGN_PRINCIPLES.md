# Design System & Principles

Version 2.0 · 10 Nov 2026 · Owners: Kavya (UX review) + Person A (App) · Applies to: app, WhatsApp messages, call scripts, voice helper

Companion doc: `02b_SCREEN_DESIGNS.md` — every screen, which existing app it takes inspiration from, and its layout.

> **The test for every screen:** Could a 70-year-old who has never seen this app use it **without asking anyone**? If not, simplify until they can.

---

## 1. Design direction: clean, calm, readable

Our anchor is **Luma**: lots of white space, one photo, one title, one clear button. We copy its **restraint**.

**One warning that shapes everything:** for seniors, "minimal" has to mean **fewer things on screen**, not small grey text and thin icons. Many clean apps get their look from light fonts and low contrast — that would fail our users. We keep the restraint of Luma, Airbnb and Apple Health, **but keep large type and strong contrast.**

| We copy | We do not copy |
|---|---|
| Few elements per screen, generous spacing | Small text, light font weights |
| One primary action per screen | Light-grey text on white |
| Real photography | Thin hairline icons |
| Calm, consistent cards | Hidden gestures, swipe-only navigation |
| Plain words | Dense stats and jargon (Strava's "Elev gain", "Cadence") |

## 2. The 10 rules

1. **One screen, one job.** Each screen asks for one decision. Max **3 primary actions** visible.
2. **Big everything.** Body text ≥ 20pt, buttons ≥ 64dp tall, full width where possible.
3. **Icon + word, always.** Never an icon alone.
4. **Fixed places.** Read It Out (speaker icon) top-left, Help (alert icon) top-right, Tell me (mic icon) bottom-centre, tabs at the bottom. They never move.
5. **Speak or tap — always both.** Typing is never required.
6. **No hidden gestures.** No swipe-to-delete, long-press, pinch, hamburger menus or tiny X buttons.
7. **Forgive mistakes.** Big Undo after actions; confirm anything public or hard to reverse; every screen has Back and Home.
8. **Plain, warm words.** "Join walk", not "RSVP". "Family", not "Linked accounts". Never blame.
9. **Encourage, never scold.** Celebrate small wins. Missed days are never red.
10. **Fewer settings.** Smart defaults; family can set things up for the senior.

## 3. How to avoid an "AI-generated" look

**Avoid**
- Emojis in the interface, notifications, WhatsApp messages or call scripts
- Purple-to-blue gradients
- Glassy see-through cards and glowing shadows
- Sparkle icons and "AI" badges
- Stock 3D illustrations, mascots, AI-generated images
- Too many accent colours
- Rounded-everything with no hierarchy
- Confetti and bouncy animations

**Do instead**
- **One icon set, used consistently.** Phosphor (Regular or Bold weight) or Material Symbols Rounded (weight 500+). Avoid very thin line icons — seniors can't read them.
- **One typeface family.** Noto Sans covers all four languages. Hierarchy comes from **size and weight, not colour**.
- **Neutral base plus one accent.** White or off-white backgrounds, near-black text, deep blue for actions. Green only for "done" or "going". Red only for SOS.
- **Real photos of local places and seniors** — the park, the community centre, the void deck — not illustrations. This makes it look built for Singapore.
- **Same corner radius and spacing everywhere.** Consistency is most of what makes an app look "designed".
- **Words do the work.** "Morning walk · Tomorrow, 7 am · Bishan Park" with a single button reads cleaner than icons everywhere.

## 4. Reference apps (overview)

Each screen in `02b_SCREEN_DESIGNS.md` names its references. Summary:

| App | What to borrow | Where in our app |
|---|---|---|
| **Luma** | Event cards with one photo, title, date and place. Lots of white space. One clear "Register" button. A calm event page with host and attendees. | Kampung: Happenings, Event details |
| **Airbnb** | Large real photography, simple cards, setup flows that ask one question per screen with a big "Next" button. | Onboarding, Start Something, Share a skill |
| **Apple Health / Apple Fitness** | Summary cards with one big number and a plain label ("5 days active this week"). Clean weekly bar charts. No clutter. | Thrive tab, progress, walk history |
| **Hinge** | Profile built from prompts and voice answers instead of forms. | My Story, profile, voice intro |
| **Strava** (Clubs + activity) | Club pages: members, upcoming group activities, a simple join button. Activity recording and post-activity summary (map + stats + splits). Kudos. | My Circles, walking groups, My Walks |
| **Monzo** | Plain, friendly wording; big readable numbers; clear status messages. | All copy, confirmations, empty states |
| **Grab** | Home screen with a few large service tiles. Singapore seniors already know this layout. | Home, Simple Mode |
| **Singpass / LifeSG** | Government apps seniors trust. Clear forms and accessible patterns. | Sign-in, SOS, family setup |
| **Be My Eyes** | Accessibility-first yet clean: huge buttons, high contrast, almost no decoration. | SOS screen, voice helper |
| **WhatsApp** | Familiarity. Plain chat bubbles and voice-note playback seniors already understand. | Thank-You Wall voice notes, Buddy replies |

**Singapore reference:** the **Singapore Government Design System (SGDS)**. It's public, built for accessibility, and gives a credible pitch line: *"Our design follows Singapore's own accessibility standards."*

**Take the mechanics, not the look:** **Duolingo** is good for streaks and gentle nudges, but its cartoon style is exactly what we avoid.

### Mobbin reference board (do in Phase 0)
Search Mobbin (we already have the Luma screens) and collect 2–3 screens each into **one shared board**, labelled by our screen name:
- Luma — event list, event details, create event
- Airbnb — host onboarding (one question per screen)
- Apple Health — summary, weekly charts
- Hinge — profile prompts, voice prompts
- Strava — club page, record activity, activity summary
- Monzo — confirmations, empty states
- Grab — home tiles
- Singpass / LifeSG — sign-in, forms
- Be My Eyes — main call screen

Kavya owns the board; Person A builds from it.

## 5. Visual tokens

### 5.1 Type scale (Noto Sans / Noto Sans SC / Noto Sans Tamil)

| Token | Size | Weight | Use |
|---|---|---|---|
| `display` | 34pt | Bold 700 | Greeting, big stat numbers |
| `stat` | 40pt | Bold 700 | Live walk numbers, Apple-Health-style big number |
| `title` | 28pt | Bold 700 | Screen titles |
| `heading` | 24pt | Semibold 600 | Card titles |
| `body` | 20pt | Regular 400 | All body text (minimum) |
| `button` | 22pt | Semibold 600 | Button labels |
| `caption` | 18pt | Regular 400 | Absolute minimum, rare (timestamps) |

- Line height ≥ 1.4×. No weights below 400. No italics for meaning. No ALL CAPS sentences.
- Must not break at 200% system font size.

### 5.2 Colour

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FFFFFF` | Screen background |
| `bg-subtle` | `#F7F8FA` | Card / section background |
| `border` | `#E6E8EC` | 1px card borders |
| `text` | `#111111` | Body and titles |
| `text-secondary` | `#3C4043` | Secondary text (never lighter than this) |
| `primary` | `#1557B0` | Buttons, links, active tab, route lines, charts |
| `primary-pressed` | `#0F428A` | Pressed state |
| `success` | `#1E7B34` | "Going", "Done", completed days |
| `sos` | `#C62828` | **Only** Help button and emergency screens |
| `notice` | `#8A5A00` on `#FFF4DC` | Gentle notices (amber) |

- Text contrast ≥ **7:1** (WCAG AAA); never below 4.5:1.
- Red only for SOS. Never colour alone to carry meaning.

### 5.3 Shape, spacing, elevation
- Radius: **16dp cards, 14dp buttons, 999 for avatars only.** Nothing else.
- Spacing scale: 4 · 8 · 16 · 20 · 24 · 32 · 48. Screen padding 20.
- Elevation: **flat with 1px border** (no shadows). One rule everywhere.
- Touch targets ≥ 64×64dp, ≥ 16dp apart. Primary button at the bottom, full width.
- Haptic tick on every successful tap.

### 5.4 Icons, photos, maps
- Phosphor Bold for buttons/tabs, Regular for inline; 28–32dp; always with a label.
- Photos: real, local, warm light; 16:9 on cards; consent for any senior's face.
- No photo? Category icon on a `bg-subtle` square — never clip-art.
- Maps: light desaturated basemap; route `primary` 6dp; start/end as filled dots.

### 5.5 Motion
- 150–200 ms fades and slides only. No bounce, no confetti. Success = check icon + short sentence + haptic.

## 6. Components (build once, use everywhere)

| Component | Spec | Inspired by |
|---|---|---|
| **BigButton** | Full width, 64–72dp, icon left + label; primary / success / outline / sos | Be My Eyes |
| **YesNo** | Two side-by-side BigButtons: Yes (success) / No (outline, never red) | Monzo confirmations |
| **EventCard** | 16:9 photo, title (24pt), "Tomorrow, 7 am · Bishan Park", going count, one button | Luma |
| **StatCard** | One big number (40pt) + plain label + optional 7-bar chart | Apple Health |
| **Tile** | Large square tile, icon + label, 2 per row | Grab |
| **PromptCard** | Prompt text + voice answer player + transcript | Hinge |
| **ClubCard** | Circle photo, name, members count, next activity, Join | Strava Clubs |
| **VoiceNoteBubble** | Play button, waveform, duration, name, transcript under | WhatsApp |
| **ScreenHeader** | Read It Out · Title · Help; Back + "Back" label off tab roots | SGDS |
| **TellMeButton** | Floating mic button bottom-centre, 72dp, label "Tell me" | Be My Eyes |
| **ListeningSheet** | "Listening…", live transcript in large text, Stop | Be My Eyes |
| **ConfirmSheet** | "You said: Join the 6 pm walk. Is that right?" + YesNo | Monzo |
| **UndoBar** | Bottom bar 8 s: "You joined the walk. Undo" | Monzo |
| **StepProgress** | "Step 2 of 3" in words | Airbnb |
| **StatusBanner** | Plain-language status ("Priya is on her way") | Monzo / Be My Eyes |
| **EmptyState** | One sentence + one action | Monzo |

## 7. Read It Out (every screen)

- Speaker-icon button labelled **Read it out**, top-left of every screen.
- Reads: **where you are → main content → what you can do.**
- While reading: **Pause · Repeat · Slower**; tap a card to read just that card; highlight the text being read.
- Settings (family can set): Auto-read (on in Simple Mode), speed (default slow), voice (male/female).
- Every screen spec in `02b` includes its read-out script. Read It Out reads; Tell me acts — two separate buttons.

## 8. Four languages

- **English · Bahasa Melayu · 中文 · தமிழ்** — picker shows each in its own script.
- Everything translated: UI, read-out, voice helper, WhatsApp, calls, notifications, family reports.
- User content: original + **Translate** button; voice keeps original audio + translated transcript.
- **Design for Tamil first** (longest strings). No fixed-width text buttons. No text in images.
- Everyday words, reviewed by native speakers. Dates as "Tomorrow, 7 am".

## 9. Copy (Monzo-style: plain, friendly, clear)

| Don't | Do |
|---|---|
| "RSVP confirmed" | "You're going. See you at 7 am." |
| "Invalid input" | "Sorry, I didn't catch that. Let's try again." |
| "You missed 3 days" | "Welcome back. Ready for a walk today?" |
| "Elderly users" | "Members" |
| "AI assistant" | "Buddy, your helper" |
| "Emergency monitoring" | "Safe Circle — get help fast" |
| "Avg pace 13:20/km, Elev gain 12 m" | "2.4 km in 32 minutes. Nice and steady." |

Voice helper: started only by tapping Tell me; ≤ 2 short sentences; shows what it does; confirms changes; offers choices when unsure; no medical advice, no money, no long chats.

## 10. Testing with seniors

- **5-second test:** show a screen 5 s; ask "What would you tap to ___?" Hesitation = redesign.
- **Task test (think aloud):** 5 seniors (≥ 2 men), 5 tasks — join a walk; answer the check-in; press Help and cancel; set a reminder by voice; start and finish a walk and say what the summary shows.
- Test in at least two languages and at large system font. Film with consent.

## 11. UX Definition of Done (every screen / PR)

- [ ] Body ≥ 20pt; buttons ≥ 64dp; contrast ≥ 7:1
- [ ] Works at 200% system font
- [ ] Every action by tap **and** voice
- [ ] Read It Out script written and working
- [ ] All strings in i18n; checked in Tamil and Mandarin
- [ ] Back + Home; no dead ends; Undo or confirm on data changes
- [ ] No emojis, no gradients, one accent colour, red only for SOS, no icon-only buttons
- [ ] Matches its reference in `02b` (restraint) without copying its small type
- [ ] Empty, loading and error states written in plain words
- [ ] Tested by someone who didn't build it (ideally a senior)
