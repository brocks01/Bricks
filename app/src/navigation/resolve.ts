import { findPage } from './registry';
import type { Decision, Guard } from './types';

/**
 * THE decision. A tap, a link, a notification and the agent all go through this one function.
 * Only origin differs, and origin is recorded elsewhere. Unknown, denied and incomplete moves are refused with a reason, never silently.
 */
export function resolvePage(key: string, params: Record<string, string> = {}, guard: Guard = { isAuthenticated: true }): Decision {
  const page = findPage(key);
  if (!page) return { ok: false, reason: 'unknown_page' };
  if (page.requiresAuth && !guard.isAuthenticated) return { ok: false, reason: 'denied' };
  const missing = (page.params ?? []).filter((p) => params[p] === undefined || params[p] === '');
  if (missing.length) return { ok: false, reason: 'missing_params', missing };
  const path = page.route.replace(/\[([^\]]+)\]/g, (_, name: string) => encodeURIComponent(params[name]));
  return { ok: true, page, path, params };
}
