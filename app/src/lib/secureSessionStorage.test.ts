import * as SecureStore from 'expo-secure-store';

import { secureSessionStorage } from './secureSessionStorage';

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    __items: items,
    getItemAsync: jest.fn((k: string) => Promise.resolve(items.get(k) ?? null)),
    setItemAsync: jest.fn((k: string, v: string) => {
      if (v.length > 2048) throw new Error('too big for SecureStore');
      items.set(k, v);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((k: string) => {
      items.delete(k);
      return Promise.resolve();
    }),
  };
});

const items = (jest.requireMock('expo-secure-store') as { __items: Map<string, string> }).__items;

beforeEach(() => items.clear());

it('stores a large session in chunks and reads it back', async () => {
  const session = JSON.stringify({ access_token: 'x'.repeat(5000), refresh_token: 'r' });
  await secureSessionStorage.setItem('sb-abc-auth-token', session);
  expect(await secureSessionStorage.getItem('sb-abc-auth-token')).toBe(session);
  expect(items.size).toBeGreaterThan(2);
});

it('replaces a value cleanly, and removes every chunk', async () => {
  await secureSessionStorage.setItem('k', 'a'.repeat(4000));
  await secureSessionStorage.setItem('k', 'short');
  expect(await secureSessionStorage.getItem('k')).toBe('short');
  await secureSessionStorage.removeItem('k');
  expect(items.size).toBe(0);
  expect(await secureSessionStorage.getItem('k')).toBeNull();
});

it('treats a half-written value as signed out', async () => {
  await secureSessionStorage.setItem('k', 'b'.repeat(4000));
  await SecureStore.deleteItemAsync('k.1');
  expect(await secureSessionStorage.getItem('k')).toBeNull();
});
