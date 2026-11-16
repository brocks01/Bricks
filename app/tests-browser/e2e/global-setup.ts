/**
 * Runs once before the tests. It does not start any server (rule 5 in team-docs/04-build/areas.md):
 * the orchestrator keeps the API (port 8000) and the web app (port 3000) running. It only checks both
 * are reachable — with a clear message when they are not — warms up the web bundle so the first test
 * does not wait for the dev compiler, and deletes stray test accounts left over by an earlier run.
 */
import { deleteStrayE2EUsers } from './db';

const API = 'http://localhost:8000';
const WEB = 'http://localhost:3000';

export default async function globalSetup(): Promise<void> {
  const api = await fetch(API + '/').catch(() => null);
  if (!api || !api.ok) {
    throw new Error(`The API is not reachable on ${API}. Start it first: python backend/run.py (the tests never start servers).`);
  }

  // The web app compiles the bundle on demand; asking for the page and its entry script once here
  // means the first test's page load is quick.
  const page = await fetch(WEB + '/').catch(() => null);
  if (!page || !page.ok) {
    throw new Error(`The web app is not reachable on ${WEB}. Start it first: cd app && EXPO_PUBLIC_API_URL=${API} npx expo start --web --port 3000 (the tests never start servers).`);
  }
  const html = await page.text();
  const entry = /<script[^>]+src="([^"]+)"/.exec(html)?.[1];
  if (entry) {
    // Warming the entry chunk also compiles it. The API address itself lives in lazily compiled chunks,
    // so it cannot be checked here — signIn() reports a clear message if the app cannot reach the API.
    await fetch(new URL(entry, WEB).toString()).catch(() => undefined);
  }

  const removed = await deleteStrayE2EUsers();
  if (removed > 0) console.log(`[e2e] removed ${removed} leftover test account(s)`);
}
