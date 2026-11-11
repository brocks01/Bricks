import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { config } from './config';
import { secureSessionStorage } from './secureSessionStorage';

/**
 * Supabase, used for sign-in only (docs/03 §4): the app's data comes from the
 * Bricks API, which checks the Supabase access token we send with each request.
 * Null when Supabase isn't configured (demo builds on mock data).
 */
export const supabase: SupabaseClient | null = config.supabase
  ? createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        storage: secureSessionStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Sign-in comes back through a deep link, handled in features/auth.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  : null;

// Refresh the session only while the app is open (Supabase's advice for React Native).
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

/** The signed-in member's access token for API requests, or null. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
