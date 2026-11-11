# App plan (draft 1, 11 Nov 2026)

The app is where features live. The website is documentation only (platform-docs).

## Stack
- **Expo (SDK 58) with React Native and TypeScript**, file-based routing with **Expo Router** (routes in `app/src/app`).
- **Expo Go** on a phone for testing: run `npx expo start` in `bricks/app`, then scan the QR code with Expo Go (same Wi-Fi). The Expo Go app must support the project's SDK; update Expo Go from the store if it complains.
- **Expo web**: the same code runs in a browser (`npx expo start --web`, `http://localhost:8081`). Share a link only through a hosted build later.

## The middle frame on the web
On a wide screen the whole app sits in a phone-sized column (420 px) in the middle of the page; on a narrow screen it fills the page. On a real phone it is normal full screen. This is done once, in `src/components/PhoneFrame.tsx`, wrapped around everything in `src/app/_layout.tsx`.

## Things that can break on the web
Camera, step counting, push notifications, background tasks and some speech features work only on a phone. Each such feature must check `Platform.OS` and show a plain message on the web. The web build is for looking and sharing, not for full use.

## Folder layout (`bricks/app`)
```
src/
  app/            routes (Expo Router): _layout.tsx, (tabs)/index, events, me, help
  components/     PhoneFrame, ui (Screen, Card, Button, ProgressBar)
  navigation/     places.ts: the ONE map of places (tab bar, voice commands, deep links)
  theme/          tokens.ts: colours, spacing, text sizes (large and readable)
  data/           mock.ts: sample data until the API is connected
  (later) api/    client for the backend; i18n/ language files
```

## Rules
- Text is large (body 18 px) and high contrast. Every tappable item is at least 52 px tall.
- All text will move into language files (English first).
- Every screen can be read aloud; spoken commands go through `places.ts`.
- No new place is added without adding it to `places.ts`.

## Next steps
1. Sign in with an email code and a join-a-community screen.
2. Connect to the backend API instead of mock data.
3. Real speech input (needs a development build; not available in Expo Go).
