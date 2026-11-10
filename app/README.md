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
    (tabs)/          Home · Pass It On · Kampung · Thrive, each its own stack
    sos.tsx          S28 emergency screen (full-screen modal)
  components/        BigButton, SectionCard, layout/Screen (fixed controls), primitives/Text, icons
  features/          feature logic (readout = Read It Out engine, home)
  api/               wire types, mock + HTTP clients, React Query hooks
  mocks/             JSON fixtures = exact API responses (filled from backend seed in 0.2)
  i18n/              en / ms / zh / ta strings, language matching
  state/             persisted device settings (zustand + AsyncStorage)
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
  ```

- **Every string is translated.** Tests fail if `ms` / `zh` / `ta` miss a key, drop a
  `{{placeholder}}`, or contain an emoji.
- **Contrast is tested.** Token pairs are checked against WCAG (7:1 target, 4.5:1 floor).

## Fonts

Noto Sans (English, Malay) and Noto Sans Tamil, weights 400 / 600 / 700, imported per weight.
**Mandarin uses the system font** (Noto Sans CJK on Android, PingFang SC on iPhone): bundling
Noto Sans SC would add ~96 MB.

## Environment

| Variable                | Meaning                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL`   | Backend base URL (ngrok or `demo`). Unset → mocks.          |
| `EXPO_PUBLIC_USE_MOCKS` | `true` in Phase 1; `false` from iteration 2.1.              |
| `EXPO_PUBLIC_DEV_TOOLS` | Hidden dev screens. Forced off in preview / production.     |
| `APP_VARIANT`           | Set by `eas.json`: `development` / `preview` / `production` |

`EXPO_PUBLIC_*` values are bundled into the app: never put secrets in them.

## Translation status

`ms`, `zh`, `ta` strings for the 0.1 shell are **drafts** written to test layout and fonts.
The Voice track replaces them with native-speaker-reviewed text in translation wave 1 (iteration 1.1).
