import { config } from '@/lib/config';

import { ApiError, NetworkError } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;

/** Supplies the bearer token. Wired to Supabase Auth in iteration 2.1. */
type TokenProvider = () => Promise<string | null>;
let getToken: TokenProvider = async () => null;

export function setAuthTokenProvider(provider: TokenProvider): void {
  getToken = provider;
}

/**
 * The demo account to act as (Settings → Demo), sent as X-Demo-User. Demo servers
 * only honour it when nobody is signed in; real servers ignore it.
 */
type DemoUserProvider = () => string | null;
let getDemoUser: DemoUserProvider = () => null;

export function setDemoUserProvider(provider: DemoUserProvider): void {
  getDemoUser = provider;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** JSON body, or FormData for uploads (voice recordings). */
  body?: unknown;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!config.apiUrl) {
    throw new NetworkError(path, new Error('EXPO_PUBLIC_API_URL is not set'));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onCallerAbort);

  try {
    const token = await getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    const isForm = typeof FormData !== 'undefined' && options.body instanceof FormData;
    // FormData sets its own multipart Content-Type (with the boundary).
    if (options.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    const demoUser = getDemoUser();
    if (demoUser) headers['X-Demo-User'] = demoUser;

    let response: Response;
    try {
      response = await fetch(config.apiUrl + path, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers,
        body:
          options.body === undefined
            ? undefined
            : isForm
              ? (options.body as FormData)
              : JSON.stringify(options.body),
      });
    } catch (cause) {
      throw new NetworkError(path, cause);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ApiError(response.status, body, path);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onCallerAbort);
  }
}

/** A recorded file for a multipart upload (React Native's FormData file shape). */
export function audioFile(uri: string): Blob {
  const name = uri.split('/').pop() || 'recording.m4a';
  return { uri, name, type: 'audio/m4a' } as unknown as Blob;
}

/** FormData from plain fields; null and undefined fields are left out. */
export function formData(
  fields: Record<string, string | number | boolean | Blob | null | undefined>,
) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined) continue;
    form.append(key, typeof value === 'object' ? value : String(value));
  }
  return form;
}
