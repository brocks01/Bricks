import { api, ApiError, configureClient } from '../api/client';
import { createStore } from '../core/store';
import { setLanguage, languageStore } from '../i18n/store';
import { isLangCode, type LangCode } from '../i18n/languages';
import { loadRefreshToken, saveRefreshToken } from './storage';

export type AgeBand = 'under40' | '40to59' | '60plus';

export interface User {
  id: string;
  email: string | null; // null on an assisted profile: set up by a family member, no own login yet
  display_name: string | null;
  language: LangCode;
  age_band: AgeBand | null;
  phone: string | null;
  area_name: string | null;
  login_kind: 'own' | 'assisted'; // 'assisted' = a family member is helping set this account up
  profile_complete: boolean;
}

interface SessionState {
  status: 'loading' | 'out' | 'in';
  user: User | null;
  activeProfile: string | null; // the account the app is acting on (acting as a family helper); null = myself
  actingUser: User | null; // that account's own profile (name, phone...), loaded when it is switched to; null while myself or still loading
  pendingEmail: string | null; // the address a code was just sent to
  devCode: string | null; // only set when the server is in development mode
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  user: User;
  is_new: boolean;
}

export const sessionStore = createStore<SessionState>({ status: 'loading', user: null, activeProfile: null, actingUser: null, pendingEmail: null, devCode: null });

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

async function accept(t: Tokens): Promise<void> {
  accessToken = t.access_token;
  refreshToken = t.refresh_token;
  await saveRefreshToken(t.refresh_token);
  sessionStore.set((s) => ({ ...s, status: 'in', user: t.user, activeProfile: null, actingUser: null, pendingEmail: null, devCode: null }));
}

async function clear(): Promise<void> {
  accessToken = null;
  refreshToken = null;
  await saveRefreshToken(null);
  sessionStore.set((s) => ({ ...s, status: 'out', user: null, activeProfile: null, actingUser: null }));
}

/**
 * Switch accounts: act on behalf of a family member I help, or go back to my own account.
 * Every request the app makes carries the on-behalf header while another profile is active;
 * the server re-checks the live delegation on every request, so ended access takes hold at once.
 */
export function setActiveProfile(id: string | null): void {
  const mine = !id || sessionStore.get().user?.id === id;
  sessionStore.set((s) => ({ ...s, activeProfile: mine ? null : id, actingUser: null }));
  if (mine || !id) return;
  // The profile the person now acts on (the server sends the on-behalf header's account); shown by Me and Edit profile instead of my own.
  api<User>('GET', '/v1/me')
    .then((u) => sessionStore.set((s) => (s.activeProfile === id ? { ...s, actingUser: u } : s)))
    .catch(() => undefined);
}

/** Gets a new access token from the saved refresh token. Used at start-up and whenever the server says the token has expired. */
export function refreshSession(): Promise<boolean> {
  if (!refreshToken) return Promise.resolve(false);
  if (!refreshing) {
    refreshing = api<Tokens>('POST', '/v1/auth/refresh', { refresh_token: refreshToken }, { auth: false })
      .then(async (t) => {
        await accept(t);
        return true;
      })
      .catch(async (e) => {
        if (e instanceof ApiError && e.status === 401) await clear(); // only a real refusal signs the person out, not a network problem
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

configureClient({
  getToken: () => accessToken,
  refresh: refreshSession,
  getActiveProfile: () => sessionStore.get().activeProfile,
});

/** Called once when the app starts. */
export const getAccessToken = (): string | null => accessToken;

/** The access token if it still has more than a minute left (no network at all), otherwise a fresh one. */
export async function freshToken(): Promise<string | null> {
  if (accessToken) {
    try {
      const exp = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp as number;
      if (exp - Date.now() / 1000 > 60) return accessToken;
    } catch {
      /* unreadable: ask for a new one */
    }
  }
  await refreshSession().catch(() => false);
  return accessToken;
}

export async function bootSession(): Promise<void> {
  refreshToken = await loadRefreshToken();
  if (!refreshToken) {
    sessionStore.set((s) => ({ ...s, status: 'out' }));
    return;
  }
  const ok = await refreshSession();
  if (!ok && sessionStore.get().status === 'loading') sessionStore.set((s) => ({ ...s, status: 'out' })); // server unreachable: show the sign-in page
  const lang = sessionStore.get().user?.language;
  if (ok && lang && lang !== languageStore.get().code) await setLanguage(lang);
}

export async function requestCode(email: string): Promise<{ expiresIn: number }> {
  const r = await api<{ sent: boolean; expires_in: number; dev_code: string | null }>('POST', '/v1/auth/request-code', { email }, { auth: false });
  sessionStore.set((s) => ({ ...s, pendingEmail: email.trim().toLowerCase(), devCode: r.dev_code }));
  return { expiresIn: r.expires_in };
}

export async function verifyCode(code: string): Promise<{ isNew: boolean; complete: boolean }> {
  const email = sessionStore.get().pendingEmail;
  if (!email) throw new ApiError(400, 'code_invalid');
  const t = await api<Tokens>('POST', '/v1/auth/verify-code', { email, code }, { auth: false });
  await accept(t);
  // A returning person gets their saved language; a new person keeps the language they picked on the first screen.
  if (!t.is_new && isLangCode(t.user.language)) await setLanguage(t.user.language);
  else if (t.is_new) await updateProfile({ language: languageStore.get().code });
  return { isNew: t.is_new, complete: sessionStore.get().user?.profile_complete ?? false };
}

export interface Providers {
  email: boolean;
  google: boolean;
  singpass: boolean;
  digilocker: boolean;
}

/** Which sign-in methods the server has switched on. If the server cannot be reached, only email is offered. */
export async function loadProviders(): Promise<Providers> {
  try {
    return await api<Providers>('GET', '/v1/auth/providers', undefined, { auth: false });
  } catch {
    return { email: true, google: false, singpass: false, digilocker: false };
  }
}

/** Signs in with a Google ID token (the page that shows Google's button gets it). */
export async function googleSignIn(idToken: string): Promise<{ isNew: boolean; complete: boolean }> {
  const t = await api<Tokens>('POST', '/v1/auth/google', { id_token: idToken }, { auth: false });
  await accept(t);
  if (!t.is_new && isLangCode(t.user.language)) await setLanguage(t.user.language);
  else if (t.is_new) await updateProfile({ language: languageStore.get().code });
  return { isNew: t.is_new, complete: sessionStore.get().user?.profile_complete ?? false };
}

export type ProfilePatch = Partial<{ display_name: string; language: LangCode; age_band: AgeBand | null; phone: string | null; area_name: string | null }>;

export async function updateProfile(patch: ProfilePatch): Promise<User> {
  const user = await api<User>('PATCH', '/v1/me', patch);
  // While acting on behalf of someone else the answer is THEIR profile; my session stays mine.
  sessionStore.set((s) => (user.id === s.user?.id ? { ...s, user } : user.id === s.actingUser?.id ? { ...s, actingUser: user } : s));
  return user;
}

export async function signOut(): Promise<void> {
  const token = refreshToken;
  try {
    if (token) await api('POST', '/v1/auth/sign-out', { refresh_token: token }, { auth: false });
  } catch {
    /* signing out here still works if the server cannot be reached */
  }
  await clear();
}

/**
 * The person takes their own account: the 6-digit code a family member showed them in person plus their
 * own contact. The server moves the assisted profile to them and signs them in at once.
 */
export async function claimWithCode(code: string, email: string): Promise<{ isNew: boolean }> {
  const t = await api<Tokens>('POST', '/v1/auth/claim', { code, email }, { auth: false });
  await accept(t);
  const lang = t.user.language;
  if (isLangCode(lang)) await setLanguage(lang);
  return { isNew: t.is_new };
}
