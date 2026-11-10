# Mock data

Phase 1 runs on these files (`EXPO_PUBLIC_USE_MOCKS=true`). Each file is the exact JSON
an API endpoint returns, so switching to the real backend in iteration 2.1 changes no screen code.

| File      | Endpoint  |
| --------- | --------- |
| `me.json` | `GET /me` |

Iteration 0.2 replaces and extends these with the backend seed export
(5 users, 3 circles, 8 events around Bishan / Toa Payoh, walks, GPS track).
Keep names, ids and shapes identical to the seed.
