import { ApiError } from '../api/client';

/** Turns a failed request into the full word key (and values) to show the person. The words live in i18n/common.ts. */
export function errorWords(e: unknown): { key: string; vars?: Record<string, number> } {
  if (!(e instanceof ApiError)) return { key: 'common.error.generic' };
  switch (e.code) {
    case 'network':
      return { key: 'common.error.network' };
    case 'rate_limited':
      return { key: 'common.error.rateLimited', vars: { n: Number(e.extra.retry_after ?? 30) } };
    case 'code_invalid':
      return { key: 'common.error.codeInvalid' };
    case 'too_many_attempts':
      return { key: 'common.error.tooManyAttempts' };
    case 'email_failed':
      return { key: 'common.error.emailFailed' };
    case 'email_busy':
      return { key: 'common.error.emailBusy' };
    case 'validation':
      return { key: 'common.error.required' };
    default:
      return { key: 'common.error.generic' };
  }
}
