import { createElement } from 'react';
import { colors } from '../theme/tokens';

// A page written by the agent, shown in a locked box. `sandbox=""` turns EVERY power off: no scripts, no forms, no links that leave, no access to
// this app, its storage or its cookies. The page's own policy also blocks every network request (images must be inline data). It can show text,
// colours, lists, tables, simple diagrams in CSS or inline SVG, and nothing more.
const BASE = `*{box-sizing:border-box}body{margin:0;padding:4px;font-family:Roboto,Arial,Helvetica,sans-serif;font-size:18px;line-height:1.55;color:${colors.ink};background:transparent}
h1,h2,h3{margin:.3em 0;color:${colors.ink}}h1{font-size:24px}h2{font-size:21px}h3{font-size:19px}p{margin:.5em 0}
ul,ol{padding-left:1.2em}li{margin:.3em 0}a{color:${colors.accent};pointer-events:none}table{border-collapse:collapse;width:100%}
td,th{border:1px solid ${colors.line};padding:8px;text-align:left}th{background:${colors.accentSoft}}
.card{background:#fff;border:1px solid ${colors.line};border-radius:14px;padding:12px;margin:8px 0}.accent{color:${colors.accent};font-weight:700}`;

export const htmlFrameAvailable = true;

export function HtmlFrame({ html, height = 260 }: { html: string; height?: number }) {
  const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:"/><style>${BASE}</style></head><body>${html}</body></html>`;
  return createElement('iframe', { sandbox: '', srcDoc: doc, title: 'Agent page', style: { width: '100%', height, border: 0, borderRadius: 12, background: 'transparent' } });
}
