/**
 * The app's first setup and the getting-to-know-you, and what the bottom bar shows because of the roles:
 * a learner sees only the round Wisdom button; someone who came to connect and share sees all three.
 */
import { expect, test, type Page } from '@playwright/test';
import { App, type Role, randomEmail } from './app';
import { deleteE2EUser } from './db';

let app: App | null = null;

/** A fresh person: sign in with the test-mode code, first setup, the three needed parts, skip the optional ones. */
async function newUser(page: Page, roles: Role[]): Promise<App> {
  const a = new App(page, randomEmail());
  app = a; // claimed at once, so the account is deleted even when a step fails
  await a.signIn();
  await a.setup('40to59');
  await a.onboard(roles);
  return a;
}

test.afterEach(async () => {
  if (app) await deleteE2EUser(app.email);
});

test('a learner (role learn only) sees only the Wisdom button', async ({ page }) => {
  const a = await newUser(page, ['learn']);
  await expect(a.heading('Wisdom')).toBeVisible();
  await expect(a.tab('wisdom')).toBeVisible();
  await expect(a.tab('communities')).toHaveCount(0);
  await expect(a.tab('marketplace')).toHaveCount(0);
  await expect(a.button('Keep a story or lesson')).toBeVisible();
});

test('someone who came to connect and share sees all three tabs', async ({ page }) => {
  const a = await newUser(page, ['connect', 'share']);
  await expect(a.heading('Wisdom')).toBeVisible();
  await expect(a.tab('wisdom')).toBeVisible();
  await expect(a.tab('communities')).toBeVisible();
  await expect(a.tab('marketplace')).toBeVisible();
});
