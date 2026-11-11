// The agent's SURFACE (the "Agent Canvas"): a panel in the app's content area where the agent shows a question, a step-by-step
// explanation, or a small page it wrote for this person, in their language. The tab bar and the agent bar stay visible below it
// and the person can always close it. Mounted once in the root layout (components/AgentSurface.tsx).
// The agent uses it through the `show` and `hide` tools (agent/tools.ts). Nothing here can reach the app's data or run code (see HtmlFrame).
//
// Everything the model sends is validated HERE with a Zod schema before it can reach the renderer: only the fields in `showSchema`
// are read (the rest are stripped), every string is trimmed and capped, every list is capped, and a tile's id and icon must look
// like an id and an icon name. A value of the wrong type falls back to the empty one, so one bad field can never blank the screen.
import { z } from 'zod';
import { createStore } from '../core/store';

export interface Tile {
  id: string;
  label: string; // what the person sees
  icon: string; // an Ionicons name; '' means "use the neutral one"
}

export interface Surface {
  title: string;
  message: string;
  question: string; // the bold line above the tiles
  hint: string; // a short helpful note in a card
  steps: string[]; // numbered explanation steps
  html: string;
  options: string[]; // plain buttons; a tap answers at once
  allowText: boolean;
  tiles: Tile[]; // selectable tiles; answered with Next
  step: number; // which step dot is lit, 0 for none
  stepTotal: number; // how many step dots, 0 for none
  next: boolean; // show the Next button
}

export const LIMITS = {
  title: 120, message: 1500, question: 200, hint: 400,
  steps: 8, stepChars: 220, // stepChars = the most characters in one numbered step
  options: 6, option: 60, html: 20000,
  tiles: 12, tileLabel: 40, stepCount: 10,
};

export const surfaceStore = createStore<{ open: boolean; surface: Surface | null; seq: number }>({ open: false, surface: null, seq: 0 });

let waiting: ((r: { answer?: string; how?: 'option' | 'typed'; dismissed?: boolean }) => void) | null = null;

const ID_OK = /^[A-Za-z0-9_-]{1,40}$/;
const ICON_OK = /^[a-z0-9-]{1,40}$/;

/** One string: trimmed, capped, and '' when the model sent anything else. */
const str = (max: number) => z.string().transform((s) => s.trim().slice(0, max)).catch('');

/** A list of strings: each trimmed and capped, blanks dropped, then the list itself capped. */
const strs = (n: number, max: number) =>
  z.array(z.string()).transform((a) => a.map((s) => s.trim().slice(0, max)).filter(Boolean).slice(0, n)).catch([]);

/** A whole number in 1..max, rounded; anything that is not a positive number means "none" (0). */
const int = (max: number) =>
  z
    .number()
    .catch(0)
    .transform((n) => (n >= 1 ? Math.min(Math.round(n), max) : 0));

/** A yes/no the model may have written as a real boolean or as the word "true". Everything else is a no. */
const flag = z
  .union([z.boolean(), z.string()])
  .transform((v) => (typeof v === 'boolean' ? v : v.trim().toLowerCase() === 'true'))
  .catch(false);

/** One tile, as either a bare label or an object. A tile the model got wrong becomes a blank one, which is then dropped. */
const tileIn = z
  .union([
    z.string().transform((label) => ({ label, id: '', icon: '' })),
    z.object({ label: z.string().catch(''), id: z.string().catch(''), icon: z.string().catch('') }),
  ])
  .catch({ label: '', id: '', icon: '' });

/** Tiles, validated one by one: a label is required, the id must be an id (duplicates get a suffix), the icon must look like an icon name. */
const tilesIn = z
  .array(tileIn)
  .transform((tiles) => {
    const out: Tile[] = [];
    for (const t of tiles) {
      const label = t.label.trim().slice(0, LIMITS.tileLabel);
      if (!label) continue;
      const wanted = t.id.trim();
      const base = ID_OK.test(wanted) ? wanted : `t${out.length + 1}`;
      let id = base;
      let n = 1;
      while (out.some((x) => x.id === id)) id = `${base}_${++n}`; // ids must be unique: the answer is keyed by them
      const icon = t.icon.trim();
      out.push({ id, label, icon: ICON_OK.test(icon) ? icon : '' });
    }
    return out.slice(0, LIMITS.tiles);
  })
  .catch([]);

/** Everything `show` accepts. Unknown fields are stripped by z.object, so the model cannot smuggle anything else in. */
const showSchema = z.object({
  title: str(LIMITS.title),
  message: str(LIMITS.message),
  question: str(LIMITS.question),
  hint: str(LIMITS.hint),
  steps: strs(LIMITS.steps, LIMITS.stepChars),
  html: str(LIMITS.html),
  options: strs(LIMITS.options, LIMITS.option),
  allow_text: flag,
  allowText: flag, // older builds used this spelling; accept both
  tiles: tilesIn,
  step: int(LIMITS.stepCount),
  step_count: int(LIMITS.stepCount),
  next: flag,
});

export type ShowSpec = z.infer<typeof showSchema>;

/** Validate what the model sent. Exported so the self-test can check the schema itself. */
export function parseShow(args: unknown): ShowSpec | null {
  const raw = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
  const parsed = showSchema.safeParse(raw);
  if (!parsed.success) {
    // Only reachable if a schema field itself is broken: report it back to the model, never to the person.
    return null;
  }
  return parsed.data;
}

/**
 * Show something. A question (options, tiles, Next, or a typed answer) waits for the person's answer and resolves with it;
 * a display-only panel resolves at once. A new show replaces the old one (a question still open is answered as dismissed).
 */
export function showSurface(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const a = parseShow(args);
  if (!a) return Promise.resolve({ error: 'bad_request', hint: 'One field had a value of the wrong type. Check the types in the tool description.' });
  const stepTotal = a.step_count;
  const surface: Surface = {
    title: a.title,
    message: a.message,
    question: a.question,
    hint: a.hint,
    steps: a.steps,
    html: a.html,
    options: a.options,
    allowText: a.allow_text || a.allowText,
    tiles: a.tiles,
    step: stepTotal ? Math.min(a.step || 1, stepTotal) : 0,
    stepTotal,
    next: a.next,
  };
  const empty = !surface.title && !surface.message && !surface.question && !surface.steps.length && !surface.html && !surface.options.length && !surface.tiles.length && !surface.hint;
  if (empty) return Promise.resolve({ error: 'nothing_to_show', hint: 'Give a title, a message, a question, steps, tiles, html or options.' });
  waiting?.({ dismissed: true });
  waiting = null;
  // seq counts the screens shown: the renderer keys itself on it, so a new screen always starts with nothing typed or picked.
  surfaceStore.set({ open: true, surface, seq: surfaceStore.get().seq + 1 });
  const waitsForAPerson = surface.options.length > 0 || surface.allowText || surface.tiles.length > 0 || surface.next;
  if (!waitsForAPerson) return Promise.resolve({ shown: true, note: 'It stays until the person closes it or you call hide.' });
  return new Promise((resolve) => {
    waiting = (r) => resolve(r.dismissed ? { dismissed: true, note: 'The person closed it without answering.' } : { answer: r.answer, how: r.how });
  });
}

/** The person chose an option or typed an answer. */
export function answerSurface(answer: string, how: 'option' | 'typed'): void {
  const w = waiting;
  waiting = null;
  w?.({ answer, how });
  surfaceStore.set((s) => ({ ...s, open: false, surface: null }));
}

/** Close it (the person, or the agent's `hide`). A waiting question is answered as dismissed. */
export function hideSurface(): void {
  const w = waiting;
  waiting = null;
  w?.({ dismissed: true });
  surfaceStore.set((s) => ({ ...s, open: false, surface: null }));
}
