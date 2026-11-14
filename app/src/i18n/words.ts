import type { PageStrings } from '../navigation/types';

// A compact way to write the words of a module in all six languages at once: one line per word, six translations in a fixed order.
// A word with a missing language cannot be written (the tuple has exactly six slots), so the six-language rule holds by construction.
// First drafts by an AI assistant; native-speaker review needed for hi, bn, ta, zh, ms.
export type Six = readonly [en: string, hi: string, bn: string, ta: string, zh: string, ms: string];
export type WordTable = Record<string, Six>;
const ORDER = ['en', 'hi', 'bn', 'ta', 'zh', 'ms'] as const;

/**
 * The strings of one page: every word in `table`, plus the page's element ids pointed at the word that says them.
 * `aliases` maps an element id (as declared on the page) to the word key that holds its text, for example { heading: 'h_health', startWalk: 'start_walk' }.
 */
export function pageWords(table: WordTable, aliases: Record<string, string> = {}): PageStrings {
  const out: PageStrings = {};
  ORDER.forEach((lang, i) => {
    const words: Record<string, string> = {};
    for (const [key, six] of Object.entries(table)) words[key] = six[i];
    for (const [id, key] of Object.entries(aliases)) {
      if (!(key in table)) throw new Error(`words: alias "${id}" points at unknown word "${key}"`);
      words[id] = table[key][i];
    }
    out[lang] = words;
  });
  return out;
}
