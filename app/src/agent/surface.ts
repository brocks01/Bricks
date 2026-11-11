// The agent's SURFACE: a space over the top of the app where the agent can show a question, a step-by-step explanation, or a small visual page
// (HTML) written for this person, in their language. The agent bar stays visible and the person can always close it.
// The agent uses it through the `show` and `hide` tools (agent/tools.ts). Nothing here can reach the app's data or run code (see HtmlFrame).
import { createStore } from '../core/store';

export interface Surface {
  title: string;
  message: string;
  steps: string[];
  html: string;
  options: string[];
  allowText: boolean;
}

export const LIMITS = { title: 120, message: 1500, steps: 8, step: 220, options: 6, option: 60, html: 20000 };

export const surfaceStore = createStore<{ open: boolean; surface: Surface | null }>({ open: false, surface: null });

let waiting: ((r: { answer?: string; how?: 'option' | 'typed'; dismissed?: boolean }) => void) | null = null;

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
const list = (v: unknown, n: number, max: number) => (Array.isArray(v) ? v : []).map((x) => text(x, max)).filter(Boolean).slice(0, n);

/**
 * Show something. A question (options or allowText) waits for the person's answer and resolves with it; anything else resolves at once.
 * A new show replaces the old one (a question still open is answered as dismissed).
 */
export function showSurface(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const surface: Surface = {
    title: text(args.title, LIMITS.title),
    message: text(args.message, LIMITS.message),
    steps: list(args.steps, LIMITS.steps, LIMITS.step),
    html: text(args.html, LIMITS.html),
    options: list(args.options, LIMITS.options, LIMITS.option),
    allowText: args.allow_text === true || args.allowText === true,
  };
  if (!surface.title && !surface.message && !surface.steps.length && !surface.html && !surface.options.length) {
    return Promise.resolve({ error: 'nothing_to_show', hint: 'Give a title, a message, steps, html or options.' });
  }
  waiting?.({ dismissed: true });
  waiting = null;
  surfaceStore.set({ open: true, surface });
  if (!surface.options.length && !surface.allowText) return Promise.resolve({ shown: true, note: 'It stays until the person closes it or you call hide.' });
  return new Promise((resolve) => {
    waiting = (r) => resolve(r.dismissed ? { dismissed: true, note: 'The person closed it without answering.' } : { answer: r.answer, how: r.how });
  });
}

/** The person chose an option or typed an answer. */
export function answerSurface(answer: string, how: 'option' | 'typed'): void {
  const w = waiting;
  waiting = null;
  w?.({ answer, how });
  surfaceStore.set({ open: false, surface: null });
}

/** Close it (the person, or the agent's `hide`). A waiting question is answered as dismissed. */
export function hideSurface(): void {
  const w = waiting;
  waiting = null;
  w?.({ dismissed: true });
  surfaceStore.set({ open: false, surface: null });
}
