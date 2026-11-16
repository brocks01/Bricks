import { defineConfig } from '@playwright/test';

/**
 * End-to-end browser tests (Quality area, team-docs/04-build/areas.md task 1).
 * They drive the real website at http://localhost:3000 (the Expo web app) and the real API
 * the web app was started with (EXPO_PUBLIC_API_URL=http://localhost:8000).
 * The servers are NOT started here: the orchestrator keeps them running (rule 5 in areas.md).
 * Run: cd app && npm run e2e   (first time: npx playwright install chromium)
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // The dev server compiles the app bundle on the first page load; one thing at a time.
  workers: 1,
  fullyParallel: false,
  retries: 1, // another session may be mid-edit and the dev bundle may fail to compile for a minute
  timeout: 5 * 60_000, // a full onboarding run through the real server
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    // The phone the app is designed for (PhoneFrame's own size).
    viewport: { width: 390, height: 844 },
    locale: 'en-SG',
    timezoneId: 'Asia/Singapore',
    // First load compiles the whole web bundle; after that it is fast.
    navigationTimeout: 180_000,
    actionTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
