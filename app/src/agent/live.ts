// The in-app agent, client side: one WebSocket to the Wisdom API (which talks to Gemini Live), the microphone up, the voice down,
// and the agent's tool requests run HERE, in the app, so the person watches the glow and gives approvals on their own screen.
// The same agent will also be reachable by phone call (backend/app/modules/voice); both use the same engine.
import { t } from '../i18n/tables';
import { createStore } from '../core/store';
import { apiBase } from '../api/client';
import { freshToken, sessionStore } from '../session/store';
import { languageStore } from '../i18n/store';
import { spokenStore } from '../i18n/spoken';
import { audioAvailable, isSpeaking, playPcm24k, speechSeenAt, startMic, stopMic, stopPlayback } from './audio';
import { toolSpecs } from './tools';

export type Phase = 'idle' | 'connecting' | 'listening' | 'speaking' | 'working';
export interface Line {
  role: 'agent' | 'person' | 'tool'; // tool = something the agent did in the app
  text: string;
  at?: number; // when it started, for the time under a chat bubble
}

export const agentUi = createStore<{ phase: Phase; open: boolean; mic: boolean; lines: Line[]; notice: string | null; since: number | null }>({ phase: 'idle', open: false, mic: false, lines: [], notice: null, since: null });

type Runner = { call: (name: string, args?: Record<string, unknown>) => Promise<unknown>; page: () => string | undefined };
let runner: Runner | null = null;
/** Who the open talk was opened for: 'guest' (before sign-in, look-only) or the signed-in person's id. */
let talkAs: string | null = null;
/** The agent's own tool names allowed before sign-in: it may only look (see the open page) and end the talk. */
const GUEST_TOOLS = ['read', 'tree', 'search', 'docs', 'end'];
/** The agent provider hands over its tools (they know how to navigate, glow and ask for approval). */
export const registerRunner = (r: Runner) => {
  runner = r;
};

let ws: WebSocket | null = null;
let ready = false;
let queued: string[] = [];
let held: string[] = []; // microphone chunks spoken before the agent was ready
let starting: symbol | null = null;

/**
 * The talk ends by itself when it is over: with no word from the agent and nothing said into the microphone
 * for IDLE_MS, the call is cut and the bar goes back to "Tap to talk". Without this, a person who says
 * "that's all, thanks" leaves the agent listening to them forever. The agent's own `end` tool ends it at once.
 */
export const IDLE_MS = 15000;
let lastActivity = Date.now();
let watchdog: ReturnType<typeof setInterval> | null = null;
const poke = () => {
  lastActivity = Date.now();
};
function stopWatchdog() {
  if (watchdog) {
    clearInterval(watchdog);
    watchdog = null;
  }
}
function startWatchdog() {
  stopWatchdog();
  watchdog = setInterval(() => {
    if (!ws) return stopWatchdog();
    const s = agentUi.get();
    if (s.phase === 'speaking' || s.phase === 'working') {
      lastActivity = Date.now(); // the agent is mid-answer; its clock starts when it finishes
      return;
    }
    const quiet = Date.now() - lastActivity >= IDLE_MS;
    // The microphone streams silence as well as speech, so "audio is flowing" proves nothing; it only counts
    // as still talking when a chunk actually rose above the room tone. With no microphone up, only quiet matters.
    const talking = s.mic && Date.now() - speechSeenAt() < IDLE_MS;
    if (quiet && !talking) end();
  }, 1000);
}

const set = (patch: Partial<ReturnType<typeof agentUi.get>>) => agentUi.set((s) => ({ ...s, ...patch }));
const wsUrl = () => apiBase().replace(/^http/, 'ws') + '/v1/agent/live';
const send = (obj: object) => {
  if (ws?.readyState === 1) ws.send(JSON.stringify(obj));
};

function addLine(role: Line['role'], text: string) {
  agentUi.set((s) => {
    const last = s.lines[s.lines.length - 1];
    // Fragments of one spoken turn join the same line.
    const lines = last && last.role === role && !closed[role] ? [...s.lines.slice(0, -1), { role, text: last.text + text, at: last.at }] : [...s.lines, { role, text, at: Date.now() }].slice(-40);
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
  show: 'show', hide: 'show', panel: 'show',
};
const toolWord = (name: string) => t(`common.agent.tool.${TOOL_WORD[name] ?? 'screen'}`);

async function onToolCall(m: { id: string; name: string; args: Record<string, unknown> }) {
  set({ phase: 'working' });
  if (m.name !== 'end') {
    // Hanging up is not something to narrate in the transcript: the bar simply goes back to "Tap to talk".
    addLine('tool', toolWord(m.name));
    closed.tool = true; // each action is its own line
    closed.agent = true; // and what the agent says next starts a new line below it
  }
  let response: unknown;
  try {
    response = runner ? await runner.call(m.name, fixArgs(m.args ?? {})) : { error: 'not_ready' };
  } catch (e) {
    response = { error: (e as Error).message };
  }
  send({ type: 'toolResult', id: m.id, name: m.name, response });
  if (m.name === 'end') return end(); // the result is away, so now cut the call rather than keep listening
  set({ phase: isSpeaking() ? 'speaking' : 'listening' });
}

function onMessage(raw: string) {
  poke();
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
  poke();
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
      .then(() => starting === mine && set({ mic: true, since: Date.now() }))
      .catch(() => set({ notice: 'micdenied' }));
  }
  const token = await freshToken(); // no network unless the token is about to expire
  if (!token && !runner?.page()) {
    // no session and no page context: nothing to talk about
    stopMic();
    stopWatchdog();
    return void set({ phase: 'idle', notice: 'signin' });
  }
  if (starting !== mine) return; // ended while we waited
  const sock = new WebSocket(wsUrl());
  ws = sock;
  talkAs = token ? sessionStore.get().user?.id ?? 'user' : 'guest';
  if (token) {
    // Signed in: the server reads the account's languages; the phone's own choice is the fallback
    // for an account that has none yet (chosen on the first screen, before sign-in).
    const spoken = spokenStore.get();
    sock.onopen = () => send({ type: 'auth', token, page: runner?.page(), tools: toolSpecs, spoken: spoken.spoken, comm: spoken.comm });
  } else {
    // Not signed in: a guest talk on the sign-in pages. The agent may only SEE the open page and explain
    // what to do (an elderly person who cannot follow the sign-in or the code asks for help at any moment).
    // The languages they say they speak are sent too, so the agent never guesses outside their list.
    const seeOnly = toolSpecs.filter((s) => GUEST_TOOLS.includes(s.name));
    const spoken = spokenStore.get();
    sock.onopen = () => send({ type: 'auth', guest: true, language: languageStore.get().code, spoken: spoken.spoken, comm: spoken.comm, page: runner?.page(), tools: seeOnly });
  }
  sock.onmessage = (e) => onMessage(String(e.data));
  sock.onerror = () => set({ notice: 'failed' });
  sock.onclose = () => {
    if (ws === sock) end();
  };
  poke();
  startWatchdog(); // nobody says anything for IDLE_MS and the call is cut
}

/** Typed message: opens the talk (without the microphone) if it is not open yet. */
export async function sendText(text: string): Promise<void> {
  const t = text.trim();
  if (!t) return;
  poke();
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
  poke();
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
  talkAs = null;
  ready = false;
  queued = [];
  held = [];
  stopWatchdog();
  stopMic();
  stopPlayback();
  try {
    s?.send(JSON.stringify({ type: 'end' }));
    s?.close();
  } catch {
    /* already closed */
  }
  set({ phase: 'idle', mic: false, since: null });
}

// A talk opened BEFORE sign-in is a guest talk: the server lets it only look and explain, so the agent can only SUGGEST ("tap this").
// When the person then signs in (or out, or another person signs in) that talk must not carry on: it is closed, and the next message opens
// a fresh one with the new sign-in, where the agent can really open, fill and press. The chat lines stay on screen.
sessionStore.subscribe(() => {
  const s = sessionStore.get();
  const now = s.status === 'in' ? s.user?.id ?? null : s.status === 'out' ? 'guest' : null; // 'loading' decides nothing
  if (ws && talkAs && now && now !== talkAs) end();
});

export const togglePanel = () => set({ open: !agentUi.get().open });
export const clearNotice = () => set({ notice: null });
