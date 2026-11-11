/**
 * Google sign-in through Supabase (2.1 §4.3): browser → one-time code → session.
 * Supabase and the browser are faked here; the real ones need a phone.
 */
import { signInWithGoogle } from './google';

const mockExchange = jest.fn();
const mockSignInWithOAuth = jest.fn();
const mockOpenAuthSession = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...a: unknown[]) => mockSignInWithOAuth(...a),
      exchangeCodeForSession: (...a: unknown[]) => mockExchange(...a),
      signOut: jest.fn(),
    },
  },
}));
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: (...a: unknown[]) => mockOpenAuthSession(...a),
}));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'exp://192.168.1.5:8081/--/auth/callback',
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSignInWithOAuth.mockResolvedValue({
    data: { url: 'https://x.supabase.co/auth/v1/authorize?provider=google' },
    error: null,
  });
});

it('opens Google in the browser and swaps the returned code for a session', async () => {
  mockOpenAuthSession.mockResolvedValue({
    type: 'success',
    url: 'exp://192.168.1.5:8081/--/auth/callback?code=abc123',
  });
  mockExchange.mockResolvedValue({
    data: { user: { user_metadata: { full_name: 'Siti Nurhaliza' } } },
    error: null,
  });

  await expect(signInWithGoogle()).resolves.toEqual({
    status: 'signed-in',
    name: 'Siti Nurhaliza',
  });
  expect(mockSignInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: 'exp://192.168.1.5:8081/--/auth/callback', skipBrowserRedirect: true },
  });
  expect(mockExchange).toHaveBeenCalledWith('abc123');
});

it('closing the browser is a plain cancel, not an error', async () => {
  mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
  await expect(signInWithGoogle()).resolves.toEqual({ status: 'cancelled' });
  expect(mockExchange).not.toHaveBeenCalled();
});

it('reports an error that Google or Supabase sends back', async () => {
  mockOpenAuthSession.mockResolvedValue({
    type: 'success',
    url: 'exp://x/--/auth/callback?error=access_denied&error_description=Provider+not+enabled',
  });
  await expect(signInWithGoogle()).rejects.toThrow('Provider not enabled');
});
