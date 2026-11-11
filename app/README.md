# Bricks: mobile app

React Native + Expo (TypeScript), Expo Router. Plan: [`docs/04_APP_PLAN.md`](../docs/04_APP_PLAN.md) ·
iterations: [`iterations/app/`](../iterations/app/README.md).

> **Expo SDK 58 is pinned on purpose** (React Native 0.88, React 19.3).
> iPhones run the app inside **Expo Go from the App Store**, which runs exactly one SDK: 58 since
> 11 Nov 2026. Before every iPhone check, open Expo Go → Settings and confirm the SDK. When Expo Go
> moves to 59, upgrade on a branch with `npx expo install expo@^59.0.0 --fix`, then `npm run check`.
>
> **Never run `npm audit fix --force`.** It "fixes" warnings by rewriting Expo package versions
> (it once dropped `expo` to SDK 52) and breaks the app. The audit warnings are in build and test
> tooling and are fixed by Expo updates.

## Run it

```bash
cd app
npm install
cp .env.example .env.local      # defaults run fully on mock data
```

| Phone                   | How                                                                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **iPhone** (Expo Go)    | `npm run start:go` → scan the QR with the Camera app. Expo Go now requires being **logged in** to the same Expo account in both the CLI and the app.     |
| **Android** (dev build) | Once: `npx eas-cli@latest build --profile development --platform android`, install the APK. Then `npm run start:dev` and scan the QR inside the dev app. |
| Android without a build | `npm run start:go` works in Expo Go for Android too (no posture module, no remote push).                                                                 |

Phone on a different network from the laptop? Add `--tunnel`.

**Added a route folder** (like `settings/`)? Restart `expo start`. A server that was already
running generates wrong typed routes for new folders (`/settings/index` instead of `/settings`),
and `npm run typecheck` then fails until it restarts.

## Demo on mock data

A fresh install opens on **S1 Language**, then onboarding; the app opens on Home once set up.

- **Buddy (Tell me)** records your voice, but Expo Go has no speech-to-text, so the sheet also
  shows **"Demo: tap what was said"**: one phrase per intent, in the app's language. The
  facilitator taps what the senior said. These phrases never show with a real speech service.
- **Sign in** with Singpass, Google or a phone number all sign in to the sample account (Raj).
- **Family:** after "Send invite", a **"Demo: Dad says yes"** button stands in for the parent's
  WhatsApp reply.
- **Start again:** Settings → **Sign out** resets the demo data and goes back to S1.
- Filming instructions: [`FILMING.md`](FILMING.md).

## Checks (run before every PR)

```bash
npm run check     # typecheck + lint + prettier + tests
npm run doctor    # expo-doctor: SDK-compatible dependency versions
```

Add dependencies **only** with `npx expo install <pkg>` so versions match SDK 58, and only if the
library is in Expo Go ([list](https://docs.expo.dev/versions/v58.0.0/sdk/third-party-overview/)).
Anything else must be Android-only behind a flag in `src/lib/platform.ts`.

## Layout

```
app.config.ts        dynamic config: variants, permissions (plain-language reasons), plugins
eas.json             build profiles: development · preview (demo APK) · production
src/
  app/               routes only (Expo Router)
    _layout.tsx      fonts + saved settings + language behind the splash; providers; crash screen
    index.tsx        opens Home, or onboarding (resuming the last step) until set up
    onboarding/      S1 Language → S2 Who → S3 Sign in → S4 ×3 → S5 → S6 → S7 → S8; S9 Family
    (tabs)/          Home · Pass It On · Kampung · Thrive, each its own stack
    sos.tsx          S28 emergency screen (full-screen modal)
    settings/, family.tsx, profile.tsx, thank/[eventId].tsx, event/, going/, walk/
  components/        BigButton, SectionCard, ListRow, RecordPanel, layout/Screen (fixed controls), …
  features/          readout (Read It Out: sentences, Pause/Repeat/Slower, highlight, /tts fallback),
                     buddy (intents in 4 languages, BuddyHost), voice (recorder, listening sheet),
                     onboarding, passItOn, safety (Safe Circle editor), walk, reminders, events, home
  api/               wire types, mock + HTTP clients, React Query hooks
  mocks/             JSON fixtures = exact API responses (filled from backend seed in 0.2)
  i18n/              en / ms / zh / ta strings, language matching
  state/             settings, onboarding progress (persisted), undo, Buddy listening
  theme/             tokens.ts: the only place with colours and sizes
  lib/               config (env), platform flags, query client, haptics
```

## Rules the code enforces

- **Tokens only.** Hex colours outside `src/theme` fail lint. Sizes come from `tokens.ts`.
- **One `Text`.** Importing `Text` from `react-native` fails lint. `@/components` `Text` applies the
  type scale, the right font for the language and a 1.4 line height, and caps growth at 200% font.
- **Flags, not `Platform.OS`.** Screens read `platform.canUsePosture`, `canUseRemotePush`,
  `canRecordInBackground`. Checking `Platform.OS` in screens fails lint.
- **Every screen uses `<Screen>`**, which places the fixed controls:

  ```
  [ Read it out ]                    [ Help ]    ← same place on every screen
  ‹ Back                                         ← own row, only off a stack root
  Title
  …
  [ Pause | Repeat | Slower ]                    ← only while reading
  [ Tell me ]  or  [ primary action ]            ← Buddy where there's no action bar
  ```

- **Every string is translated.** Tests fail if `ms` / `zh` / `ta` miss a key, drop a
  `{{placeholder}}`, or contain an emoji.
- **Contrast is tested.** Token pairs are checked against WCAG (7:1 target, 4.5:1 floor).

## Fonts

Noto Sans (English, Malay) and Noto Sans Tamil, weights 400 / 600 / 700, imported per weight.
**Mandarin uses the system font** (Noto Sans CJK on Android, PingFang SC on iPhone): bundling
Noto Sans SC would add ~96 MB.

## Environment

| Variable                                 | Meaning                                                        |
| ---------------------------------------- | -------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`                    | Backend base URL (ngrok or `demo`). Unset → mocks.             |
| `EXPO_PUBLIC_USE_MOCKS`                  | Force mock data even with an API URL. Default `false`.         |
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | Supabase Auth. **Publishable key only.** Unset → demo sign-in. |
| `EXPO_PUBLIC_PHONE_SIGN_IN`              | Show phone-number sign-in (needs a Supabase SMS provider).     |
| `EXPO_PUBLIC_DEV_TOOLS`                  | Hidden dev screens. Forced off in preview / production.        |
| `APP_VARIANT`                            | Set by `eas.json`: `development` / `preview` / `production`    |

`EXPO_PUBLIC_*` values are bundled into the app: never put secrets in them.

## Translation status

All `ms`, `zh`, `ta` strings (0.1 to 1.3) are **drafts** written to test layout and fonts, and need
native-speaker review (SOS and consent wording first). Buddy's keyword lists
(`src/features/buddy/intents.ts`) are drafts too, until the Voice track's lists arrive.

## Sign-in (Supabase)

Google sign-in opens Supabase's Google page in the phone's browser and comes back to the app
(`features/auth/google.ts`, PKCE). No native Google SDK, so it works in Expo Go. The session is
kept in the phone's secure storage and sent as `Authorization: Bearer …` on every API request.

One-time Supabase set-up:

1. **Authentication → Providers → Google:** turn on, paste a Google Cloud OAuth _Web_ client id
   and secret. In Google Cloud, the client's redirect URI is
   `https://<project>.supabase.co/auth/v1/callback`.
2. **Authentication → URL Configuration → Redirect URLs:** add `exp://**` (Expo Go) and
   `bricks-development://**`, `bricks-preview://**`, `bricks://**` (our builds).
