import { registerStrings, t } from '../i18n/tables';
import type { AppModule, PageDef, Skill } from './types';

// THE registry: module > page > element. Every module declares its pages and skills once, here.
// The tab bar, links, deep links, translations and the agent all read it.
const modules = new Map<string, AppModule>();
const pages = new Map<string, PageDef>();

export function defineModule(m: AppModule): void {
  if (modules.has(m.id)) return; // safe on hot reload
  if (m.id.includes('.')) throw new Error(`module "${m.id}": the id must not contain a dot`);
  for (const p of m.pages) {
    if (p.module !== m.id) throw new Error(`page "${p.key}" is listed in module "${m.id}" but declares module "${p.module}"`);
    if (pages.has(p.key)) throw new Error(`duplicate page key "${p.key}"`);
    pages.set(p.key, p);
    registerStrings(p.key, p.strings);
  }
  modules.set(m.id, m);
}

export const allModules = (): AppModule[] => [...modules.values()];
export const getModule = (id: string): AppModule | undefined => modules.get(id);
export const findPage = (key: string): PageDef | undefined => pages.get(key);
export const allPages = (): PageDef[] => [...pages.values()];
export const findSkill = (moduleId: string, name: string): Skill | undefined => modules.get(moduleId)?.skills.find((s) => s.name === name);

/** Bottom-bar pages in order. */
export function tabPages(): PageDef[] {
  return allPages()
    .filter((p) => p.tab !== undefined)
    .sort((a, b) => (a.tab ?? 0) - (b.tab ?? 0));
}

/** Which page does this router path belong to? Used to know "where am I". */
export function pageForPath(path: string): PageDef | undefined {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/';
  for (const p of pages.values()) {
    const pattern = p.route.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\/+$/, '') || '/';
    if (new RegExp('^' + pattern + '$').test(clean)) return p;
  }
  return undefined;
}

export interface SearchHit {
  kind: 'module' | 'page' | 'element' | 'skill';
  path: string; // module id, page key, element key, or "module/skill"
  summary: string;
  score: number;
}

/** Search every level of the tree by plain words. Matches English words and the key names. */
export function search(query: string): SearchHit[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  const score = (text: string) => words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
  const hits: SearchHit[] = [];
  for (const m of modules.values()) {
    const ms = score(`${m.id} ${m.title} ${m.summary} ${m.keywords.join(' ')}`.toLowerCase());
    if (ms) hits.push({ kind: 'module', path: m.id, summary: m.summary, score: ms });
    for (const p of m.pages) {
      const ps = score(`${p.key} ${p.summary} ${(p.keywords ?? []).join(' ')}`.toLowerCase());
      if (ps) hits.push({ kind: 'page', path: p.key, summary: p.summary, score: ps + ms * 0.1 });
      for (const [id, el] of Object.entries(p.elements)) {
        const label = t(`${p.key}.${id}`, {}, 'en');
        const es = score(`${p.key}.${id} ${label} ${el.summary ?? ''}`.toLowerCase());
        if (es) hits.push({ kind: 'element', path: `${p.key}.${id}`, summary: `${label}${el.summary ? ': ' + el.summary : ''}`, score: es + ps * 0.1 });
      }
    }
    for (const k of m.skills) {
      const s = score(`${m.id} ${k.name} ${k.summary} ${(k.keywords ?? []).join(' ')}`.toLowerCase());
      if (s) hits.push({ kind: 'skill', path: `${m.id}/${k.name}`, summary: k.summary, score: s + ms * 0.1 });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 12);
}
