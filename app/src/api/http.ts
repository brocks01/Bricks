import { config } from '@/lib/config';

import { ApiError, NetworkError } from './errors';

const DEFAULT_TIMEOUT_MS = 10_000;

/** Supplies the bearer token. Wired to Supabase Auth in iteration 2.1. */
type TokenProvider = () => Promise<string | null>;
let getToken: TokenProvider = async () => null;

export function setAuthTokenProvider(provider: TokenProvider): void {
  getToken = provider;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
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
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
      response = await fetch(config.apiUrl + path, {
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
