/**
 * The notifications screen. Opened from the bell in the header, it shows the heading and, for a person
 * who has just arrived, a calm empty state that says what will appear here.
 */
import { expect, test } from '@playwright/test';
import { App, randomEmail, vis } from './app';
import { deleteE2EUser } from './db';

let app: App | null = null;

test('the notifications screen opens from the bell', async ({ page }) => {
  const a = new App(page, randomEmail());
  app = a; // claimed at once, so the account is deleted even when a step fails
  await a.signIn();
  await a.setup('40to59');
  await a.onboard(['learn']);

  await expect(a.heading('Wisdom')).toBeVisible();
  await a.button('Notifications').click();
  await expect(a.heading('Notifications')).toBeVisible();

  // A person who has just arrived has nothing yet: the empty state is calm and says what will come.
  // If a notice already exists (for example a welcome), it must be there as a row instead.
  const empty = await vis(page.getByText(/Nothing new\./)).isVisible().catch(() => false);
  if (!empty) {
    await expect(vis(page.getByText(/· (in the app|WhatsApp|Telegram|SMS)/)).first()).toBeVisible();
  }
});

test.afterEach(async () => {
  if (app) await deleteE2EUser(app.email);
});
