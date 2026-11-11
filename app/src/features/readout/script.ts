import type { Language } from '@/i18n/languages';

/**
 * Read It Out scripts. A screen describes what to say as plain text, or as parts
 * that point at a region of the screen (`target`) so that region is highlighted
 * while it is read (docs/02 §7).
 */

export interface ReadOutPart {
  text: string;
  /** Id of a <ReadOutTarget> to highlight while this part is read. */
  target?: string;
  /** Read in this language's voice instead of the app's (the language picker). */
  language?: Language;
}

export type ReadOutContent = string | readonly ReadOutPart[];

/** A function so it is built fresh (with current data) at the moment it's read. */
export type ReadOutScript = ReadOutContent | (() => ReadOutContent);

const SENTENCE_END = new Set(['.', '!', '?', '。', '！', '？']);
const FULL_WIDTH_END = new Set(['。', '！', '？']);

/**
 * Splits text into sentences, so reading can pause, repeat or slow down at a
 * sentence and carry on from there. "2.4 km" stays whole: a full stop only ends a
 * sentence before a space or the end. Chinese full stops end one without a space.
 */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (!SENTENCE_END.has(ch)) continue;
    // Keep closing quotes and brackets with their sentence.
    let end = i + 1;
    while (end < text.length && /["'”’)]/.test(text[end]!)) end++;
    const next = text[end];
    if (FULL_WIDTH_END.has(ch) || next === undefined || /\s/.test(next)) {
      sentences.push(text.slice(start, end));
      start = end;
      i = end - 1;
    }
  }
  sentences.push(text.slice(start));
  return sentences.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Resolves a script into the sentence-sized parts the engine reads one by one. */
export function toParts(script: ReadOutScript): ReadOutPart[] {
  const content = typeof script === 'function' ? script() : script;
  const parts: readonly ReadOutPart[] = typeof content === 'string' ? [{ text: content }] : content;
  return parts.flatMap(({ text, ...rest }) =>
    splitSentences(text).map((sentence) => ({ text: sentence, ...rest })),
  );
}
