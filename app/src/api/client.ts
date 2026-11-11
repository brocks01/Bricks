/**
 * The API this website talks to when it is NOT running on this computer (for example on Vercel). Hard-coded on purpose for now, not read from
 * the environment: it is the tunnel to the backend that runs on the team's computer. When the backend is deployed, this one line changes.
 */
export const PUBLIC_API_URL = 'https://shale-overgrown-buggy.ngrok-free.dev';

/** Where the API lives. Set EXPO_PUBLIC_API_URL to override. On the web it is this computer; in Expo Go it is the computer running Expo. */
export function apiBase(): string {
  // Loaded here (not at the top) so the plain-Node self-test can import the session without the phone libraries.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { Platform } = require('react-native') as typeof import('react-native');
  const Constants = (require('expo-constants') as typeof import('expo-constants')).default;
  const fixed = process.env.EXPO_PUBLIC_API_URL;
  if (fixed) return fixed.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const h = window.location.hostname;
    const local = h === 'localhost' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
    // On this computer or its network the API is on port 8800; anywhere else (Vercel, the tunnel itself) it is the public API address.
    return local ? `http://${h}:8800` : PUBLIC_API_URL;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8800`;
}

/** A refusal from the server. `code` is a machine word (for example code_invalid); the app turns it into words in the person's language. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) {
    super(code);
  }
}

type Hooks = { getToken: () => string | null; refresh: () => Promise<boolean> };
let hooks: Hooks = { getToken: () => null, refresh: async () => false };
export const configureClient = (h: Hooks) => {
  hooks = h;
};

async function once(method: string, path: string, body: unknown, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' }; // skips the tunnel's warning page; ignored by every other server
  const token = auth ? hooks.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    return await fetch(apiBase() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'network');
  }
}

export async function api<T>(method: 'GET' | 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth ?? true;
  let res = await once(method, path, body, auth);
  if (res.status === 401 && auth && (await hooks.refresh())) res = await once(method, path, body, auth); // one silent retry with a fresh token
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const d = (data as { detail?: unknown }).detail;
    if (res.status === 422) throw new ApiError(422, 'validation', { detail: d });
    const obj = (d && typeof d === 'object' ? d : {}) as { code?: string };
    throw new ApiError(res.status, obj.code ?? 'generic', obj as Record<string, unknown>);
  }
  return data as T;
}
