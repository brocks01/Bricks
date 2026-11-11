import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/lib/supabase';

// Closes the sign-in tab when the app runs on the web; does nothing on phones.
WebBrowser.maybeCompleteAuthSession();

export type GoogleSignIn =
  | { status: 'signed-in'; name: string | null }
  | { status: 'cancelled' }
  | { status: 'unavailable' };

/** Where Google sends people back: exp://…/--/auth/callback in Expo Go, bricks-…://auth/callback in our builds. */
export const authRedirectUri = () => makeRedirectUri({ path: 'auth/callback' });

/**
 * Google sign-in through Supabase in the phone's browser (no native Google SDK,
 * so it works in Expo Go). PKCE: the browser returns a one-time code, which we
 * swap for a session that's kept in the phone's secure storage.
 */
export async function signInWithGoogle(): Promise<GoogleSignIn> {
  if (!supabase) return { status: 'unavailable' };
  const redirectTo = authRedirectUri();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error('No sign-in address from Supabase');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { status: 'cancelled' };

  const back = new URL(result.url);
  const failure = back.searchParams.get('error_description') ?? back.searchParams.get('error');
  if (failure) throw new Error(failure);
  const code = back.searchParams.get('code');
  if (!code) throw new Error('Google sign-in came back without a code');

  const { data: signedIn, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
  const meta = signedIn.user?.user_metadata as { full_name?: string; name?: string } | undefined;
  return { status: 'signed-in', name: meta?.full_name ?? meta?.name ?? null };
}

/** Signs out of Supabase (and so of the API). Safe to call when not signed in. */
export async function signOutOfSupabase(): Promise<void> {
  await supabase?.auth.signOut().catch(() => {});
}
