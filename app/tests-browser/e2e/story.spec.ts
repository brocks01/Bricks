/**
 * Keep a story, then share it. A person who came to share: the story starts private, and one press
 * on the story's row shares it into the library. No capability is lost along the way.
 */
import { expect, test } from '@playwright/test';
import { App, randomEmail, vis } from './app';
import { deleteE2EUser } from './db';

let app: App | null = null;

test('keep a story private, then share it', async ({ page }) => {
  const a = new App(page, randomEmail());
  app = a; // claimed at once, so the account is deleted even when a step fails
  await a.signIn();
  await a.setup('60plus');
  await a.onboard(['connect', 'share']);

  // Someone who came to share starts on their own part: Mine.
  await expect(a.heading('Wisdom')).toBeVisible();
  await expect(a.button('Share your experience')).toBeVisible();
  await a.button('Share your experience').click();

  await expect(a.heading('Keep a story or lesson')).toBeVisible();
  const title = 'What forty years of teaching taught me about patience';
  await vis(a.page.getByLabel('Title')).fill(title);
  await vis(a.page.getByLabel('Your story, skill or lesson')).fill(
    'In my last year at the school, a boy who never spoke raised his hand. It took three years of waiting, not talking. Patience is a subject nobody grades.',
  );
  await a.button('Keep it').click();

  // Back on the Wisdom tab: the story is there, and it is private until the person says otherwise.
  await expect(a.heading('Wisdom')).toBeVisible();
  const row = a.button(title);
  await expect(row).toBeVisible();
  await expect(vis(a.page.getByText('Private', { exact: true }))).toBeVisible();

  // One press shares it. The row now says Shared.
  await row.click();
  await expect(vis(a.page.getByText('Shared', { exact: true }))).toBeVisible();
  await expect(vis(a.page.getByText('Private', { exact: true }))).toHaveCount(0);
});

test.afterEach(async () => {
  if (app) await deleteE2EUser(app.email);
});
