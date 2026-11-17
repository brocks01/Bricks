// The live link to the server (backend modules/live): while the app or website is open and signed in, the server knows this screen is here ("presence"), tells it
// when something about the person changed anywhere (a phone call, a chat, another device) so it can refresh exactly that, and can ask it to open a page
// ("show me my calendar" said on a call). One WebSocket, reconnecting by itself. No data travels on it: a "changed" message only names topics; the screen
// asks for the data through its normal signed-in requests. Plain TypeScript (no React) so it can be tested.
import { apiBase } from '../api/client';

export interface LiveHandlers {
  /** Topics that changed ("calendar", "home"...; "*" = everything). */
  onChanged: (topics: string[]) => void;
  /** The server asks to show a page (only pages the app knows; the caller checks again). */
  onOpen: (page: string, params: Record<string, string>) => void;
  /** A fresh sign-in token (the access token lives 15 minutes). */
  token: () => Promise<string | null>;
  /** The page the person is on now. */
  page: () => string;
}

const PING_MS = 25_000;
const device = Math.random().toString(36).slice(2, 8); // one per open tab or app start

const wsUrl = () => apiBase().replace(/^http/, 'ws') + '/v1/live';

let rev = 0; // the newest change this screen has been told about (and has refetched for)
/** Sent with every edit so the server can refuse one made from a screen that missed a change on another device. */
export const liveHeaders = (): Record<string, string> => ({ 'X-Bricks-Device': device, 'X-Bricks-Seen-Rev': String(rev) });

let current: { setPage: (p: string) => void } | null = null;
export const liveSetPage = (page: string): void => current?.setPage(page);

/** Starts the link and keeps it alive (reconnects with a growing pause). Returns the function that stops it. */
export function startLive(h: LiveHandlers): () => void {
  let ws: WebSocket | null = null;
  let stopped = false;
  let pause = 1000;
  let ping: ReturnType<typeof setInterval> | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let seenBefore = false;

  const send = (obj: object) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify(obj));
  };

  const connect = async () => {
    if (stopped) return;
    const token = await h.token().catch(() => null);
    if (stopped) return;
    if (!token) return schedule();
    let sock: WebSocket;
    try {
      sock = new WebSocket(wsUrl());
    } catch {
      return schedule();
    }
    ws = sock;
    sock.onopen = () => send({ type: 'auth', token, device, page: h.page() });
    sock.onmessage = (ev) => {
      let m: { type?: string; topics?: string[]; page?: string; params?: Record<string, string>; rev?: number };
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (m.type === 'ready') {
        pause = 1000;
        if (seenBefore) {
          h.onChanged(['*']); // we were away: anything may have changed, refresh what is on screen
          const known = m.rev ?? 0;
          setTimeout(() => (rev = Math.max(rev, known)), 5000); // until the refresh has landed, an edit is still judged against what we last knew
        } else rev = m.rev ?? 0;
        seenBefore = true;
        if (ping) clearInterval(ping);
        ping = setInterval(() => send({ type: 'ping' }), PING_MS);
      } else if (m.type === 'changed' && Array.isArray(m.topics)) {
        h.onChanged(m.topics);
        rev = Math.max(rev, m.rev ?? 0);
      }
      else if (m.type === 'open' && m.page) h.onOpen(m.page, m.params ?? {});
    };
    sock.onclose = () => {
      if (ping) clearInterval(ping);
      ping = null;
      if (ws === sock) ws = null;
      schedule();
    };
    sock.onerror = () => {
      try {
        sock.close();
      } catch {
        /* already closed */
      }
    };
  };

  function schedule() {
    if (stopped || retry) return;
    retry = setTimeout(() => {
      retry = null;
      void connect();
    }, pause);
    pause = Math.min(pause * 2, 30_000);
  }

  current = { setPage: (page) => send({ type: 'page', page }) };
  void connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    if (ping) clearInterval(ping);
    try {
      send({ type: 'bye' });
      ws?.close();
    } catch {
      /* closing */
    }
    ws = null;
    current = null;
  };
}
