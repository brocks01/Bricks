# 06. App plan and navigation

Status: the stack and the middle-frame idea are decided; the **navigation and folder structure below is a proposal awaiting Ankit's approval**.

## Stack
- Expo (SDK 58) with React Native and TypeScript; Expo Router (file-based routes in `app/src/app`).
- Test on a phone with **Expo Go** (`npx expo start`, scan the QR code, same Wi-Fi). The same code runs on the web (`npx expo start --web`, http://localhost:8081).
- **Middle frame on the web:** on a wide screen the whole app sits in a 420 px phone-sized column in the middle; on a narrow screen it fills the page; on a phone it is normal full screen. Done once in `PhoneFrame.tsx`.
- Camera, steps, push notifications and some speech features work only on a phone; each must check the platform and show a plain message on the web.
- Rules: large text (body 18 px), buttons at least 52 px tall, all text in language files later (English first), every screen readable aloud, spoken commands go through the one map of places.

## Proposed navigation and folder structure (`app/src`)
```
app/                       routes only, thin files
  (auth)/                  welcome, sign-in, enter-code, profile-setup, join-community
  (tabs)/                  home (Community), events, me, help (voice)
  community/[id]/          index, people-and-roles, objectives, notices
  event/[id]/              index, check-in;  event/new
  contribution/new, goal/new, activity/log
  notifications, settings/privacy, community/new
navigation/                THE central map
  places.ts                every screen: id, title, path, who may open it, spoken words
  routes.ts                typed paths and parameters
  guards.ts                signed-in and member checks
  voice-commands.ts        spoken phrases mapped to places
  deep-links.ts            links from invites and notifications
features/                  one folder per feature: auth, community, roles, events, contributions, wellbeing, voice
                           (each with components, hooks, api calls)
components/                shared building blocks
theme/  i18n/  api/  store/
```

## Screen list for the first version (P0)
Welcome; sign in (email); enter code; profile setup; join a community; community home; people and roles; events list; event detail with RSVP and check-in; create event; log a contribution; me (goals and week); add goal and log activity; help (voice); notifications; settings and privacy; create community.

## Next steps
1. Approve the navigation structure and screen list; generate UI images from `07_ui_brief_and_prompts.md`.
2. Build the screens to match the images, still on sample data.
3. Connect to the backend API.
4. Real speech input (needs a development build; not available in Expo Go).
