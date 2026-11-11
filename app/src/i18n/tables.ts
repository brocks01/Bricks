import type { PageStrings } from '../navigation/types';
import { common } from './common';
import { DEFAULT_LANGUAGE, LANGUAGES, type LangCode } from './languages';
import { languageStore } from './store';

// Pure (no React): every page registers its words here under its own prefix, for example 'events.new.title'.
// A key missing in a language shows English; a key missing in English shows the key itself.
const tables: Record<LangCode, Record<string, string>> = { en: {}, hi: {}, bn: {}, ta: {}, zh: {}, ms: {} };

export function registerStrings(prefix: string, strings: PageStrings): void {
  for (const lang of Object.keys(strings) as LangCode[]) {
    const words = strings[lang];
    if (!words || !tables[lang]) continue;
    for (const id of Object.keys(words)) tables[lang][`${prefix}.${id}`] = words[id];
  }
}

export const hasWord = (key: string, lang: LangCode): boolean => key in tables[lang];

/** Translate a full key into a language (default: the chosen one), filling {name} style blanks. */
export function t(key: string, vars: Record<string, string | number> = {}, lang: LangCode = languageStore.get().code): string {
  const text = tables[lang][key] ?? tables[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

/** For tests: which languages lack this key? */
export const languagesMissing = (key: string): LangCode[] => LANGUAGES.map((l) => l.code).filter((c) => !hasWord(key, c));

registerStrings('common', common);
