import { fireEvent, screen } from 'expo-router/testing-library';

import { useOnboarding } from '@/state/onboarding';
import { useSettings } from '@/state/settings';
import { renderApp, resetAppState } from '@/test-utils/renderApp';

/**
 * S3 with Supabase set up (2.1): Google is the real browser sign-in, Phone is
 * hidden until an SMS provider exists, Singpass is labelled as the demo it is.
 */

jest.setTimeout(60_000);

const mockSignInWithGoogle = jest.fn();

jest.mock('@/lib/config', () => {
  const actual = jest.requireActual<typeof import('@/lib/config')>('@/lib/config');
  return {
    config: {
      ...actual.config,
      supabase: { url: 'https://x.supabase.co', anonKey: 'sb_publishable_test' },
      phoneSignIn: false,
    },
  };
});
jest.mock('@/features/auth/google', () => ({
  signInWithGoogle: (...a: unknown[]) => mockSignInWithGoogle(...a),
  signOutOfSupabase: jest.fn(),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await resetAppState({ onboarded: false });
  useSettings.setState({ language: 'en' });
  useOnboarding.setState({ path: 'self' });
});

it('T1: Google signs in and fills in the name from the Google account', async () => {
  mockSignInWithGoogle.mockResolvedValue({ status: 'signed-in', name: 'Siti Nurhaliza' });
  await renderApp('/onboarding/sign-in');
  expect(screen.queryByTestId('sign-in-phone')).toBeNull();
  expect(screen.getByText(/Demo: Singpass signs in to a sample account/)).toBeTruthy();

  await fireEvent.press(screen.getByTestId('sign-in-google'));
  expect(await screen.findByTestId('screen-onboarding-about')).toBeTruthy();
  expect(screen.getByTestId('about-name').props.value).toBe('Siti');
  expect(useOnboarding.getState().draft.name).toBe('Siti Nurhaliza');
});

it('closing the Google page leaves them on Sign in, with nothing changed', async () => {
  mockSignInWithGoogle.mockResolvedValue({ status: 'cancelled' });
  await renderApp('/onboarding/sign-in');
  await fireEvent.press(screen.getByTestId('sign-in-google'));
  expect(screen.getByTestId('screen-onboarding-sign-in')).toBeTruthy();
  expect(screen.queryByTestId('sign-in-google-failed')).toBeNull();
});

it('a failed Google sign-in says so in plain words and offers Singpass', async () => {
  mockSignInWithGoogle.mockRejectedValue(new Error('Provider not enabled'));
  await renderApp('/onboarding/sign-in');
  await fireEvent.press(screen.getByTestId('sign-in-google'));
  expect(
    await screen.findByText("Google sign-in didn't work. Please try again, or use Singpass."),
  ).toBeTruthy();
});
