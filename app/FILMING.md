# Filming Bricks: one-page guide

For the filming team. The app runs on sample data: nothing you do reaches real people.

## 1. Install

| Phone   | What to do                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| iPhone  | Install **Expo Go** from the App Store. Sign in with the team's Expo account. Open the link or scan the QR code the app team sends. |
| Android | Install the **Bricks** APK the app team sends (allow "install unknown apps" once). Open it, then open the link or scan the QR code. |

Turn the phone's volume up: the app reads screens aloud.
For Malay or Tamil voices, the phone needs that voice installed (Settings → Accessibility →
Text-to-speech). If it isn't, the app still works and reads with another voice.

## 2. Who you are in the demo

**Raj Kumar**, 68, Bishan, a retired maths teacher who teaches chess at the community club.
His daughter **Priya** and neighbours **Ahmad** and **Lim** are his Safe Circle.

## 3. The five tasks (in any of the four languages)

1. **Join a walk:** Home → "I'm going" on the walk card.
2. **Answer the check-in:** Home → "Did you move yesterday?" → Yes or No.
3. **Press Help and cancel:** red **Help** (top right, every screen) → "Cancel, I'm OK".
4. **Set a reminder by voice:** **Tell me** (bottom) → the senior says
   "Remind me to take medicine at 8 am" → **tap that sentence in the "Demo: tap what was said"
   box** → Yes.
5. **Walk and read the summary:** Thrive → Start walk → walk a little → Finish → Yes.

> **About Tell me:** the phone records the senior's voice, but on sample data it can't turn
> speech into words. While they speak, **the facilitator taps the matching sentence** in the
> dashed "Demo" box. Everything after that is real: the question, the answer, the change.
> Saying "Help" (tap "Help" in the box) always opens the emergency screen at once.

Other things to film: Pass It On (thank-you voice notes, Share a skill), Settings → Language,
and Read it out (top left) with Pause / Repeat / Slower.

## 4. Starting again

Settings (bottom of Home) → **Sign out** → Yes. This clears everything and goes back to the
language screen, ready for the next take. Closing and reopening the app keeps where you were.

## 5. If something goes wrong

- A screen says "That didn't work. Let's try again.": tap **Try again**.
- The app looks stuck: close it fully and open it again.
- Anything else: message the app team with the screen and what you tapped.

---

### For the app team: publishing a filming build

```bash
cd app
npx eas-cli@latest login                     # once
npx eas-cli@latest update --branch filming --message "Filming build"
```

Send the update link / QR to the filming team. Android needs the preview APK once:
`npx eas-cli@latest build --profile preview --platform android`.
