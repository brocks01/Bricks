import { createElement, useEffect, useRef, useState } from 'react';
import { colors } from '../theme/tokens';

// A page written by the agent, shown in a locked box. It may now RUN SCRIPTS (so a calculator, a quiz or a converter can really be used), but only in a
// box with no way out: `sandbox="allow-scripts"` WITHOUT allow-same-origin gives the page an empty, unique origin, so it cannot read this app, its storage,
// its cookies or the person's session; there is no allow-top-navigation, allow-forms, allow-popups or allow-modals, so it cannot leave, submit or open
// anything; and the page's own policy (default-src 'none') blocks EVERY network request, so nothing can be sent anywhere (images must be inline data).
// It can compute, react to taps and draw; that is all. A page that loops for ever can only freeze its own box.
const BASE = `*{box-sizing:border-box}body{margin:0;padding:4px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:18px;line-height:1.55;color:${colors.ink};background:transparent}
h1,h2,h3{margin:.3em 0;color:${colors.ink}}h1{font-size:24px}h2{font-size:21px}h3{font-size:19px}p{margin:.5em 0}
ul,ol{padding-left:1.2em}li{margin:.3em 0}a{color:${colors.accent};pointer-events:none}table{border-collapse:collapse;width:100%}
td,th{border:1px solid ${colors.line};padding:8px;text-align:left}th{background:${colors.accentSoft}}
button{font:inherit;font-size:20px;min-height:48px;min-width:48px;border-radius:12px;border:1px solid ${colors.line};background:#fff;color:${colors.ink};cursor:pointer}
button:active{background:${colors.accentSoft}}input{font:inherit;font-size:20px;min-height:48px;border-radius:12px;border:1px solid ${colors.line};padding:0 12px;width:100%}
.card{background:#fff;border:1px solid ${colors.line};border-radius:14px;padding:12px;margin:8px 0}.accent{color:${colors.accent};font-weight:700}`;

// Our own small script (not the agent's) tells this app how tall the page is, so the box fits its content and never scrolls inside the chat.
const FIT = `<script>(function(){function s(){try{parent.postMessage({bricksFrameHeight:Math.ceil(document.documentElement.scrollHeight)},'*')}catch(e){}}addEventListener('load',s);try{new ResizeObserver(s).observe(document.body)}catch(e){}setInterval(s,500)})()</script>`;

export const htmlFrameAvailable = true;

export function HtmlFrame({ html, height = 260 }: { html: string; height?: number }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [h, setH] = useState(height);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return; // only this box
      const v = (e.data as { bricksFrameHeight?: unknown } | null)?.bricksFrameHeight;
      if (typeof v === 'number' && v > 40 && v < 4000) setH(v + 8);
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:"/><style>${BASE}</style></head><body>${html}${FIT}</body></html>`;
  return createElement('iframe', { ref, sandbox: 'allow-scripts', srcDoc: doc, title: 'Agent page', style: { width: '100%', height: h, border: 0, borderRadius: 12, background: 'transparent' } });
}
