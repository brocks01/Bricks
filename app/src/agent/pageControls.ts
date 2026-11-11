import { t } from '../i18n/tables';
import { glow } from '../kit/glow';
import { note } from '../navigation/log';
import type { AgentPolicy, FieldType, Origin } from '../navigation/types';

// What is ON the open page that the agent may read, fill or press. A page registers its fields and buttons by element key
// (for example 'events.new.title'). The agent sees words and keys, never code.
export interface Control {
  key: string; // full element key
  page: string; // page key
  id: string; // element id on that page
  kind: 'field' | 'action';
  label: string; // in the person's language
  type?: FieldType;
  options?: string[];
  /** Who may use it. A listed item's action carries the tier the screen chose; a declared element uses page.ts's. */
  agent?: AgentPolicy;
  get?: () => unknown;
  set?: (value: unknown) => void;
  run?: () => void | Promise<void>;
}

const controls = new Map<string, Control>();

export function registerControl(c: Control): () => void {
  controls.set(c.key, c);
  return () => {
    if (controls.get(c.key) === c) controls.delete(c.key);
  };
}

export const getControl = (key: string): Control | undefined => controls.get(key);
export const controlsOfPage = (page: string): Control[] => [...controls.values()].filter((c) => c.page === page);

/** A new page takes a moment to appear. Wait until it has registered something, or give up. */
export async function waitForPage(page: string, ms = 2000): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (controlsOfPage(page).length) return true;
    await new Promise((r) => setTimeout(r, 50));
  }
  return controlsOfPage(page).length > 0;
}

function coerce(type: FieldType | undefined, v: unknown): unknown {
  if (type === 'number') return Number(v);
  if (type === 'boolean') return v === true || v === 'true' || v === 'yes';
  return v === undefined || v === null ? '' : String(v);
}

/** How long the glow shows before the agent acts, so the person can follow. Tests set it to 0. */
export const agentSettings = { pace: 450 };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Every agent action on a control glows here, in ONE place, whether it comes from the fill and press tools or from a skill.
// A person's own taps never reach this code, so they never glow.
export async function fillElement(key: string, value: unknown, origin: Origin = 'agent'): Promise<{ ok: boolean; summary: string }> {
  const c = controls.get(key);
  if (!c || c.kind !== 'field' || !c.set) return { ok: false, summary: `"${key}" is not on the open page. Call read to see what is here.` };
  if (c.options && !c.options.includes(String(value))) return { ok: false, summary: `"${String(value)}" is not allowed here. Choose one of: ${c.options.join(', ')}.` };
  if (origin === 'agent') {
    glow(key, t('common.agentFilling', { label: c.label }), agentSettings.pace + 1300);
    await pause(agentSettings.pace);
  }
  c.set(coerce(c.type, value));
  note({ type: 'control', key, what: 'fill', origin });
  return { ok: true, summary: `Filled "${c.label}".` };
}

export async function pressElement(key: string, origin: Origin = 'agent'): Promise<{ ok: boolean; summary: string }> {
  const c = controls.get(key);
  if (!c || c.kind !== 'action' || !c.run) return { ok: false, summary: `"${key}" is not a button on the open page. Call read to see what is here.` };
  if (origin === 'agent') {
    glow(key, t('common.agentPressing', { label: c.label }), agentSettings.pace + 1300);
    await pause(agentSettings.pace);
  }
  note({ type: 'control', key, what: 'press', origin });
  await c.run();
  return { ok: true, summary: `Pressed "${c.label}".` };
}
