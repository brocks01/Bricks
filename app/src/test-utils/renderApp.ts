import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import path from 'path';

import { resetMockDb } from '@/api/mock';
import { useSettings } from '@/state/settings';
import { useUndo } from '@/state/undo';

/** The real app directory, so tests exercise actual layouts, tabs and providers. */
const APP_DIR = path.resolve(__dirname, '../app');

/** Fresh data, English, no pending undo. Call in beforeEach. */
export function resetAppState(): void {
  resetMockDb();
  useUndo.getState().clear();
  useSettings.setState({ language: 'en' });
}

let current: Awaited<ReturnType<typeof renderRouter>> | null = null;

/** The URL currently shown, e.g. "/event/e_taichi". */
export function currentPath(): string {
  if (!current) throw new Error('renderApp() has not been called');
  return current.getPathname();
}

/** Renders the whole app at a URL and waits for the first screen to appear. */
export async function renderApp(initialUrl = '/'): Promise<void> {
  current = await renderRouter(APP_DIR, { initialUrl });
  // Startup waits for fonts, saved settings and the language switch; then a screen appears.
  await waitFor(() => expect(screen.getAllByTestId(/^screen-/).length).toBeGreaterThan(0));
}
