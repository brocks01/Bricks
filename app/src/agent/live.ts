// The in-app agent, client side: one WebSocket to the Bricks API (which talks to Gemini Live), the microphone up, the voice down,
// and the agent's tool requests run HERE, in the app, so the person watches the glow and gives approvals on their own screen.
// The same agent will also be reachable by phone call (backend/app/modules/voice); both use the same engine.
import { t } from '../i18n/tables';
import { createStore } from '../core/store';
import { apiBase } from '../api/client';
import { freshToken } from '../session/store';
import { audioAvailable, isSpeaking, playPcm24k, startMic, stopMic, stopPlayback } from './audio';
import { toolSpecs } from './tools';
import { hideSurface } from './surface';

export type Phase = 'idle' | 'connecting' | 'listening' | 'speaking' | 'working';
export interface Line {
  role: 'agent' | 'person' | 'tool'; // tool = something the agent did in the app
  text: string;
}

export const agentUi = createStore<{ phase: Phase; open: boolean; mic: boolean; lines: Line[]; notice: string | null }>({ phase: 'idle', open: false, mic: false, lines: [], notice: null });

type Runner = { call: (name: string, args?: Record<string, unknown>) => Promise<unknown>; page: () => string | undefined };
let runner: Runner | null = null;
/** The agent provider hands over its tools (they know how to navigate, glow and ask for approval). */
export const registerRunner = (r: Runner) => {
  runner = r;
};

let ws: WebSocket | null = null;
let ready = false;
let queued: string[] = [];
let held: string[] = []; // microphone chunks spoken before the agent was ready
let starting: symbol | null = null;

const set = (patch: Partial<ReturnType<typeof agentUi.get>>) => agentUi.set((s) => ({ ...s, ...patch }));
const wsUrl = () => apiBase().replace(/^http/, 'ws') + '/v1/agent/live';
const send = (obj: object) => {
  if (ws?.readyState === 1) ws.send(JSON.stringify(obj));
};

function addLine(role: Line['role'], text: string) {
  agentUi.set((s) => {
    const last = s.lines[s.lines.length - 1];
    // Fragments of one spoken turn join the same line.
    const lines = last && last.role === role && !closed[role] ? [...s.lines.slice(0, -1), { role, text: last.text + text }] : [...s.lines, { role, text }].slice(-40);
    return { ...s, lines };
  });
  closed[role] = false;
}
const closed: Record<Line['role'], boolean> = { agent: true, person: true, tool: true };

/** Model arguments sometimes arrive as JSON text for object fields (Gemini cannot declare free-form objects). */
const fixArgs = (a: Record<string, unknown>) => {
  const out = { ...a };
  for (const k of ['input', 'data']) {
    if (typeof out[k] === 'string') {
      try {
        out[k] = JSON.parse(out[k] as string);
      } catch {
        out[k] = {};
      }
    }
  }
  return out;
};

/**
 * What the person sees in the transcript for an action: a plain phrase in their language. NEVER the tool's own name or a
 * page/element key (those are internal and must not be shown or read out). Words live in i18n/common.ts under agent.tool.
 */
const TOOL_WORD: Record<string, 'lookup' | 'screen' | 'show'> = {
  tree: 'lookup', search: 'lookup', docs: 'lookup', read: 'lookup', web_search: 'lookup', read_page: 'lookup',
  open: 'screen', fill: 'screen', press: 'screen', run: 'screen',
  show: 'show', hide: 'show',
};
const toolWord = (name: string) => t(`common.agent.tool.${TOOL_WORD[name] ?? 'screen'}`);

async function onToolCall(m: { id: string; name: string; args: Record<string, unknown> }) {
  set({ phase: 'working' });
  // Acting on the app means the panel has done its job: close it first so the person sees what the agent is doing, never two things at once.
  // Lookups (tree, search, docs, read, web) and show/hide are left alone.
  if (m.name === 'open' || m.name === 'fill' || m.name === 'press' || m.name === 'run') hideSurface();
  addLine('tool', toolWord(m.name));
  closed.tool = true; // each action is its own line
  closed.agent = true; // and what the agent says next starts a new line below it
  let response: unknown;
  try {
    response = runner ? await runner.call(m.name, fixArgs(m.args ?? {})) : { error: 'not_ready' };
  } catch (e) {
    response = { error: (e as Error).message };
  }
  send({ type: 'toolResult', id: m.id, name: m.name, response });
  set({ phase: isSpeaking() ? 'speaking' : 'listening' });
}

function onMessage(raw: string) {
  const m = JSON.parse(raw);
  switch (m.type) {
    case 'ready':
      ready = true;
      set({ phase: 'listening' });
      held.forEach((a) => send({ type: 'audio', data: a }));
      held = [];
      queued.forEach((t) => send({ type: 'text', text: t }));
      queued = [];
      break;
    case 'audio':
      playPcm24k(m.data);
      set({ phase: 'speaking' });
      break;
    case 'text':
      addLine(m.role, m.text);
      break;
    case 'toolCall':
      void onToolCall(m);
      break;
    case 'tool': // something the server looked up for the agent (a web search, a page): plain words, never the tool's name
      addLine('tool', m.name ? toolWord(String(m.name)) : m.text);
      closed.tool = true;
      closed.agent = true;
      break;
    case 'interrupted':
      stopPlayback();
      closed.agent = true;
      set({ phase: 'listening' });
      break;
    case 'turn':
      closed.agent = closed.person = true;
      set({ phase: 'listening' });
      break;
    case 'error':
      set({ notice: m.message === 'busy' ? 'busy' : m.message === 'unauthorized' ? 'signin' : 'failed' });
      end();
      break;
  }
}

/**
 * Open the talk. It feels instant: the bar says "Listening…" and the microphone starts at once, while the connection opens behind it;
 * what you say in that moment is held and sent the moment the agent is ready. With mic: false the agent answers typed messages.
 */
export async function startTalk(opts: { mic: boolean }): Promise<void> {
  if (ws || starting) return;
  set({ phase: 'listening', notice: null, mic: false });
  if (opts.mic && !audioAvailable()) {
    set({ notice: 'nomic' });
    opts = { mic: false };
  }
  ready = false;
  held = [];
  const mine = Symbol();
  starting = mine;
  if (opts.mic) {
    startMic((b64) => {
      if (ready) send({ type: 'audio', data: b64 });
      else if (held.length < 60) held.push(b64); // about six seconds while the connection opens
    })
      .then(() => starting === mine && set({ mic: true }))
      .catch(() => set({ notice: 'micdenied' }));
  }
  const token = await freshToken(); // no network unless the token is about to expire
  if (!token) {
    stopMic();
    return void set({ phase: 'idle', notice: 'signin' });
  }
  if (starting !== mine) return; // ended while we waited
  const sock = new WebSocket(wsUrl());
  ws = sock;
  sock.onopen = () => send({ type: 'auth', token, page: runner?.page(), tools: toolSpecs });
  sock.onmessage = (e) => onMessage(String(e.data));
  sock.onerror = () => set({ notice: 'failed' });
  sock.onclose = () => {
    if (ws === sock) end();
  };
}

/** Typed message: opens the talk (without the microphone) if it is not open yet. */
export async function sendText(text: string): Promise<void> {
  const t = text.trim();
  if (!t) return;
  addLine('person', t);
  closed.person = true;
  if (!ws) {
    queued.push(t);
    await startTalk({ mic: false });
  } else if (ready) send({ type: 'text', text: t });
  else queued.push(t);
}

/**
 * A message sent by a button in the app instead of by the person (the canvas's Regenerate). It opens the talk if it is not
 * open yet, and deliberately adds no line to the transcript: the person pressed a button, they did not say anything.
 */
export async function askAgent(text: string): Promise<void> {
  const m = text.trim();
  if (!m) return;
  if (!ws) {
    queued.push(m);
    await startTalk({ mic: false });
  } else if (ready) send({ type: 'text', text: m });
  else queued.push(m);
}

export function end(): void {
  const s = ws;
  ws = null;
  starting = null;
  ready = false;
  queued = [];
  held = [];
  stopMic();
  stopPlayback();
  try {
    s?.send(JSON.stringify({ type: 'end' }));
    s?.close();
  } catch {
    /* already closed */
  }
  set({ phase: 'idle', mic: false });
}

export const togglePanel = () => set({ open: !agentUi.get().open });
export const clearNotice = () => set({ notice: null });
