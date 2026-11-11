/**
 * Web build: browsers have no keychain, so the session lives in localStorage
 * (what Supabase does by default on the web). Phones use the SecureStore version.
 */
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Private mode or storage off: the session lasts until the tab closes.
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Nothing stored.
    }
  },
};
