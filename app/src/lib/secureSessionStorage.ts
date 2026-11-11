import * as SecureStore from 'expo-secure-store';

/**
 * Storage for the sign-in session, in the phone's keychain / keystore.
 * SecureStore holds at most 2 KB per item and Supabase sessions are larger,
 * so each value is split into numbered chunks.
 */

const CHUNK = 1800;
const countKey = (key: string) => `${key}.chunks`;
const chunkKey = (key: string, i: number) => `${key}.${i}`;
// SecureStore keys allow only letters, digits, ".", "-" and "_".
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureSessionStorage = {
  async getItem(rawKey: string): Promise<string | null> {
    const key = safe(rawKey);
    const count = Number(await SecureStore.getItemAsync(countKey(key)));
    if (!count) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(chunkKey(key, i))),
    );
    // A missing chunk means a half-written value: treat it as signed out.
    return parts.every((p) => p !== null) ? parts.join('') : null;
  },

  async setItem(rawKey: string, value: string): Promise<void> {
    const key = safe(rawKey);
    await this.removeItem(rawKey);
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(chunkKey(key, i), value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    await SecureStore.setItemAsync(countKey(key), String(count));
  },

  async removeItem(rawKey: string): Promise<void> {
    const key = safe(rawKey);
    const count = Number(await SecureStore.getItemAsync(countKey(key)));
    await SecureStore.deleteItemAsync(countKey(key));
    for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(chunkKey(key, i));
  },
};
