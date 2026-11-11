
// The long-lived sign-in token is kept in the phone's secure storage; on the web it falls back to the browser's storage.
// Loaded lazily so this file also runs in plain Node tests.
const KEY = 'bricks.refresh';

async function secure() {
  const { Platform } = await import('react-native');
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
}

async function plain() {
  try {
    return (await import('@react-native-async-storage/async-storage')).default;
  } catch {
    return null;
  }
}

export async function loadRefreshToken(): Promise<string | null> {
  try {
    const s = await secure();
    if (s) return await s.getItemAsync(KEY);
    return (await (await plain())?.getItem(KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveRefreshToken(token: string | null): Promise<void> {
  try {
    const s = await secure();
    if (s) {
      if (token) await s.setItemAsync(KEY, token);
      else await s.deleteItemAsync(KEY);
      return;
    }
    const p = await plain();
    if (token) await p?.setItem(KEY, token);
    else await p?.removeItem(KEY);
  } catch {
    /* signing in still works for this session */
  }
}
