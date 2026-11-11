import { t } from '../i18n/tables';
import { allModules, findPage, getModule } from './registry';
import type { AppModule, ElementDef, PageDef } from './types';

// The tree the agent walks, one level at a time: modules > pages > elements.
// A path has up to three parts joined by dots: 'events', 'events.new', 'events.new.title'. Skills are 'events/create'.
export type Parsed =
  | { level: 'root' }
  | { level: 'module'; module: AppModule }
  | { level: 'page'; module: AppModule; page: PageDef }
  | { level: 'element'; module: AppModule; page: PageDef; id: string; element: ElementDef };

export function parsePath(path: string): Parsed | null {
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return { level: 'root' };
  const module = getModule(parts[0]);
  if (!module) return null;
  if (parts.length === 1) return { level: 'module', module };
  const page = findPage(`${parts[0]}.${parts[1]}`);
  if (!page) return null;
  if (parts.length === 2) return { level: 'page', module, page };
  const element = page.elements[parts[2]];
  if (!element || parts.length > 3) return null;
  return { level: 'element', module, page, id: parts[2], element };
}

export interface TreeNode {
  path: string;
  kind: 'module' | 'page' | 'element' | 'skill';
  summary: string;
  label?: string; // the words the person sees, in their language
  detail?: Record<string, unknown>;
}

/** The children of a path, one level down. Null if the path does not exist. */
export function childrenOf(path = ''): TreeNode[] | null {
  const p = parsePath(path);
  if (!p) return null;
  if (p.level === 'root') return allModules().map((m) => ({ path: m.id, kind: 'module', summary: m.summary, detail: { pages: m.pages.length, skills: m.skills.length } }));
  if (p.level === 'module') {
    return [
      ...p.module.pages.map((pg): TreeNode => ({ path: pg.key, kind: 'page', summary: pg.summary, label: t(`${pg.key}.${pg.tab ? 'tab' : 'heading'}`, {}), detail: { tab: pg.tab ?? null, params: pg.params ?? [] } })),
      ...p.module.skills.map((s): TreeNode => ({ path: `${p.module.id}/${s.name}`, kind: 'skill', summary: s.summary, detail: { approval: s.by === 'human' ? 'person only' : s.confirm ? 'needs approval' : 'free' } })),
    ];
  }
  if (p.level === 'page') return Object.entries(p.page.elements).map(([id, el]) => elementNode(p.page, id, el));
  return [];
}

export function elementNode(page: PageDef, id: string, el: ElementDef): TreeNode {
  return {
    path: `${page.key}.${id}`,
    kind: 'element',
    summary: el.summary ?? '',
    label: t(`${page.key}.${id}`),
    detail: { element: el.kind, type: el.type ?? null, required: !!el.required, options: el.options ?? null, agent: el.agent ?? 'free' },
  };
}

/** Words the agent can read about one node. Generated from the declarations, never hand-written, so it cannot drift. */
export function describe(path: string): string | null {
  const p = parsePath(path);
  if (!p || p.level === 'root') return null;
  if (p.level === 'module') {
    const m = p.module;
    const lines = [`# ${m.title} (module ${m.id})`, m.summary, '', '## Pages (open with "open")', ...m.pages.map((pg) => `- ${pg.key}: ${pg.summary}${pg.params?.length ? ` Needs: ${pg.params.join(', ')}.` : ''}`)];
    if (m.skills.length) {
      lines.push('', '## Skills (run with "run")');
      for (const s of m.skills) {
        const tier = s.by === 'human' ? ' [person only]' : s.confirm ? ' [the person must approve]' : '';
        const inputs = s.input.length ? s.input.map((f) => `${f.name}${f.required ? '*' : ''}:${f.type}`).join(', ') : 'none';
        lines.push(`- ${m.id}/${s.name}${tier}: ${s.summary} Inputs: ${inputs}.`);
      }
    }
    return lines.join('\n');
  }
  if (p.level === 'page') {
    const lines = [`# ${p.page.key}`, p.page.summary, '', '## Elements (use with "fill" and "press")'];
    for (const [id, el] of Object.entries(p.page.elements)) lines.push(`- ${p.page.key}.${id} [${el.kind}${el.required ? ', required' : ''}${el.options ? ', one of ' + el.options.join('|') : ''}${el.agent && el.agent !== 'free' ? ', ' + el.agent : ''}]: "${t(`${p.page.key}.${id}`, {}, 'en')}"${el.summary ? ' ' + el.summary : ''}`);
    return lines.join('\n');
  }
  const el = p.element;
  return [`# ${p.page.key}.${p.id}`, `Kind: ${el.kind}${el.type ? ' (' + el.type + ')' : ''}${el.required ? ', required' : ''}.`, `Words: "${t(`${p.page.key}.${p.id}`, {}, 'en')}".`, el.summary ?? '', el.options ? `Allowed values: ${el.options.join(', ')}.` : '', `Agent policy: ${el.agent ?? 'free'}.`].filter(Boolean).join('\n');
}
