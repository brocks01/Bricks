/** A non-2xx response from our backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly path: string,
  ) {
    super(`API ${status} on ${path}`);
    this.name = 'ApiError';
  }

  /** 4xx errors won't succeed on retry (except timeouts and rate limits). */
  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 408 || this.status === 429;
  }
}

/** The request never got a response: offline, DNS failure, timeout. */
export class NetworkError extends Error {
  constructor(
    readonly path: string,
    override readonly cause?: unknown,
  ) {
    super(`Network error on ${path}`);
    this.name = 'NetworkError';
  }
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) return error.isRetryable;
  return error instanceof NetworkError;
}
