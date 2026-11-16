/**
 * Drives the real app the way a person does: the welcome page, the code sign-in (the server's own
 * test-mode code, shown on the verify page), the first setup, and the getting-to-know-you questions.
 * Everything it waits for and presses is what the person sees (the words are the app's English words).
 * It never calls the API itself: the app under test is the one that talks to the server.
 *
 * Note for the whole driver: the web app keeps earlier screens mounted but hidden behind the current
 * one (a stack). Hidden screens repeat headings, buttons and fields, so every locator is filtered to
 * the elements a person can actually see.
 */
import { expect, type Locator, type Page } from '@playwright/test';

export type Role = 'connect' | 'share' | 'learn';

// The words the person sees (the app's English words, from the app's own word tables).
const W = {
  start: 'Get started',
  signInHeading: 'Sign in',
  email: 'Email address',
  sendCode: 'Send me a code',
  code: '6-digit code',
  devCode: 'Test mode code:',
  setupHeading: 'Only your name is required.',
  name: 'Your name',
  save: 'Save and continue',
  skip: 'Skip this part',
  ageBand: { under40: 'Under 40', '40to59': '40 to 59', '60plus': '60 and over' },
  roleWords: { connect: 'Stay connected and active', share: 'Share what I know', learn: 'Learn from experienced people' },
  tabs: { communities: 'Communities', wisdom: 'Wisdom', marketplace: 'Marketplace' },
};

/** Only what the person can see: hidden screens behind the current one repeat the same controls. */
export const vis = (l: Locator): Locator => l.filter({ visible: true });

export function randomEmail(): string {
  const n = Math.random().toString(36).slice(2, 10);
  return `e2e-${n}@example.com`;
}

export class App {
  readonly page: Page;
  readonly email: string;
  readonly name: string;

  constructor(page: Page, email = randomEmail(), name = 'Test Person') {
    this.page = page;
    this.email = email;
    this.name = name;
  }

  /** The heading the person can currently read: the only visible one on the page. */
  private async currentHeading(): Promise<string | null> {
    return this.page.evaluate(() => {
      const heads = [...document.querySelectorAll('[role="heading"]')] as HTMLElement[];
      const shown = heads.find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      return shown?.textContent ?? null;
    });
  }

  /** Sign in with the test-mode code, from the welcome page. */
  async signIn(): Promise<void> {
    const { page } = this;
    await page.goto('/');
    // The dev server compiles the app on the first load (and after another session saves a file):
    // wait for the page itself before pressing anything.
    const start = vis(page.getByRole('button', { name: W.start }));
    await expect(start).toBeVisible({ timeout: 180_000 });
    await start.click();

    await expect(vis(page.getByRole('heading', { name: W.signInHeading }))).toBeVisible();
    await vis(page.getByLabel(W.email)).fill(this.email);
    await vis(page.getByRole('button', { name: W.sendCode })).click();

    // The verify page shows the server's test-mode code in development; the person reads it and types it.
    const devCode = vis(page.getByText(new RegExp(`${W.devCode}\\s*\\d{6}`)));
    try {
      await expect(devCode).toBeVisible({ timeout: 30_000 });
    } catch {
      throw new Error(
        `No test-mode code appeared for ${this.email}: the web app could not reach the API. ` +
          `Check that the web app on http://localhost:3000 was started with EXPO_PUBLIC_API_URL=http://localhost:8000 and that the API on http://localhost:8000 is running.`,
      );
    }
    const code = (await devCode.textContent())?.match(/\d{6}/)?.[0];
    if (!code) throw new Error('The verify page did not show a test mode code.');
    await vis(page.getByLabel(W.code)).fill(code);
    // The button carries its arrow icon inside the same label, so match by name, not exactly.
    await vis(page.getByRole('button', { name: W.signInHeading })).click();
  }

  /** The first setup: only the name is needed; the age band decides the first roles. */
  async setup(ageBand: keyof typeof W.ageBand): Promise<void> {
    const { page } = this;
    await expect(vis(page.getByText(W.setupHeading))).toBeVisible();
    await vis(page.getByLabel(W.name)).fill(this.name);
    await vis(page.getByRole('radio', { name: W.ageBand[ageBand] })).click();
    await vis(page.getByRole('button', { name: W.save })).click();
  }

  private async waitSection(title: string): Promise<void> {
    await expect(vis(this.page.getByRole('heading', { name: title }))).toBeVisible();
  }

  /** Fill the three needed parts, then skip every optional part, choosing the given roles on the way. */
  async onboard(roles: Role[]): Promise<void> {
    const { page } = this;

    // About you
    await this.waitSection('About you');
    await vis(page.getByLabel('What should we call you?')).fill(this.name);
    await vis(page.getByRole('button', { name: 'English', exact: true })).click();
    await vis(page.getByRole('button', { name: W.ageBand['40to59'] })).click();
    await vis(page.getByRole('button', { name: 'Singapore', exact: true })).click();
    await vis(page.getByRole('button', { name: W.save })).click();

    // What you want here
    await this.waitSection('What you want here');
    for (const role of roles) {
      await vis(page.getByRole('checkbox', { name: W.roleWords[role] })).click();
    }
    await vis(page.getByRole('button', { name: W.save })).click();

    // Your say over your information: the first two yeses are needed (privacy and terms).
    await this.waitSection('Your say over your information');
    await vis(page.getByRole('button', { name: 'Yes', exact: true })).nth(0).click();
    await vis(page.getByRole('button', { name: 'Yes', exact: true })).nth(1).click();
    await vis(page.getByRole('button', { name: W.save })).click();

    // Every part left is optional: skip it until there is nothing left, which ends the getting-to-know-you.
    for (let i = 0; i < 12; i++) {
      const skip = vis(page.getByRole('button', { name: W.skip }));
      if (!(await skip.isVisible().catch(() => false))) break;
      const before = await this.currentHeading();
      await skip.click();
      await expect
        .poll(async () => (await this.currentHeading()) !== before, { timeout: 30_000, intervals: [250] })
        .toBe(true);
      await page.waitForTimeout(300); // let the new section's questions finish mounting before the next skip
    }
    await expect(vis(page.getByRole('button', { name: W.skip }))).toHaveCount(0);
  }

  /** The three tab buttons of the bottom bar, as the person sees them. */
  tab(which: keyof typeof W.tabs): Locator {
    return vis(this.page.getByRole('tab', { name: W.tabs[which] }));
  }

  /** The heading of the page the person is on. */
  heading(name: string): Locator {
    return vis(this.page.getByRole('heading', { name }));
  }

  /** A button the person can see right now. */
  button(name: string | RegExp): Locator {
    return vis(this.page.getByRole('button', { name }));
  }
}

export { W };
