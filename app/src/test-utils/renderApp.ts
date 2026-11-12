import { renderRouter, screen, waitFor } from 'expo-router/testing-library';
import path from 'path';

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

import { resetMockDb } from '@/api/mock';
import { useActiveWalk } from '@/features/walk/activeWalk';
import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { DEFAULT_TEXT_SIZE } from '@/theme';
import { useUndo } from '@/state/undo';

/** The real app directory, so tests exercise actual layouts, tabs and providers. */
const APP_DIR = path.resolve(__dirname, '../app');

/**
 * Fresh data, English, already set up (onboarding done), no pending undo, no walk
 * in progress. Call in beforeEach. Onboarding tests pass `{ onboarded: false }`.
 */
export async function resetAppState({ onboarded = true } = {}): Promise<void> {
  resetMockDb();
  useOnboarding.getState().reset();
  if (onboarded) useOnboarding.getState().complete();
  useUndo.getState().clear();
  useSettings.setState({ language: 'en', textSize: DEFAULT_TEXT_SIZE });
  await useActiveWalk.getState().discard();
  // Screen tests replay the simulated walk; GPS has its own tests (gpsTrack.test.ts).
  useActiveWalk.getState().setSource('simulated');
  useActiveWalk.getState().setSimulationSpeed(1);
  await AsyncStorage.clear();
  (jest.requireMock('expo-speech') as { __state: { autoFinish: boolean } }).__state.autoFinish =
    true;
}

/** Everything Read It Out has said so far, joined up (it speaks one sentence at a time). */
export function spokenText(): string {
  return (Speech.speak as jest.Mock).mock.calls.map((call) => call[0] as string).join(' ');
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

/** The navigation state (for debugging tests). */
export function routerState(): unknown {
  if (!current) throw new Error('renderApp() has not been called');
  return current.getRouterState?.();
}
