# Mock data

Phase 1 runs on an in-memory backend (`EXPO_PUBLIC_USE_MOCKS=true`). Each function returns the
exact JSON its API endpoint will return (`src/api/types.ts`), so switching to the real backend in
iteration 2.1 changes no screen code.

| File                | What                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `db.ts`             | Events, Circles, people; joins the parts below                            |
| `thriveDb.ts`       | Check-ins, reminders, walks (3 weeks for Raj), SOS (uses the Safe Circle) |
| `walkProcessing.ts` | Reference implementation of the walk pipeline (docs/03 §6)                |
| `passItOnDb.ts`     | Me, sign-in, Safe Circle, profile, skills, thank-yous, family invites     |
| `audio.ts`          | Sample voice notes (`assets/audio/*.wav`, synthetic English voice)        |
| `me.json`           | Raj's starting `GET /me`                                                  |

Times are relative to "now", so "Tomorrow, 7 am" is always true. Keep names, ids and shapes
identical to the backend seed (docs/03 §9). Not supported on mock data: speech-to-text
(`/assistant/transcribe`) and cloud voices (`/tts`); the app falls back as described in
`app/README.md` → Demo on mock data.
