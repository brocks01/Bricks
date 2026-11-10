import { LANGUAGES, LANGUAGE_INFO, matchLanguage } from './languages';
import en from './locales/en.json';
import ms from './locales/ms.json';
import ta from './locales/ta.json';
import zh from './locales/zh.json';

type Tree = { [key: string]: string | Tree };

const LOCALES: Record<string, Tree> = { en, ms, zh, ta };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

const placeholders = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).sort();

// Pictographic emoji, variation selectors and joiners. No emojis anywhere (docs/02 §3).
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/u;

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

/** Splits keys into plain keys and plural groups ("event.going" → ["one", "other"]). */
function shape(strings: Record<string, string>) {
  const plain: string[] = [];
  const plurals: Record<string, string[]> = {};
  for (const key of Object.keys(strings)) {
    const match = key.match(PLURAL_SUFFIX);
    if (match) (plurals[key.replace(PLURAL_SUFFIX, '')] ??= []).push(match[1]!);
    else plain.push(key);
  }
  return { plain: plain.sort(), plurals };
}

const english = flatten(en);
const englishShape = shape(english);
/** English text for a key; plural forms compare against English "_other". */
const englishFor = (key: string) =>
  english[key] ?? english[key.replace(PLURAL_SUFFIX, '_other')] ?? '';

describe.each(Object.keys(LOCALES))('%s strings', (lang) => {
  const strings = flatten(LOCALES[lang]!);
  const { plain, plurals } = shape(strings);

  it('has exactly the same keys as English', () => {
    expect(plain).toEqual(englishShape.plain);
    expect(Object.keys(plurals).sort()).toEqual(Object.keys(englishShape.plurals).sort());
  });

  it('has exactly the plural forms its grammar needs', () => {
    // The same rules i18next uses at runtime.
    const needed = [...new Intl.PluralRules(lang).resolvedOptions().pluralCategories].sort();
    for (const [key, forms] of Object.entries(plurals)) {
      expect({ key, forms: [...forms].sort() }).toEqual({ key, forms: needed });
    }
  });

  it('keeps every {{placeholder}} from English', () => {
    for (const [key, value] of Object.entries(strings)) {
      expect({ key, placeholders: placeholders(value) }).toEqual({
        key,
        placeholders: placeholders(englishFor(key)),
      });
    }
  });

  it('has no empty strings and no emojis', () => {
    for (const [key, value] of Object.entries(strings)) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
      expect({ key, emoji: EMOJI.test(value) }).toEqual({ key, emoji: false });
    }
  });
});

describe('languages', () => {
  it('has a native name, speech voice and date locale for every language', () => {
    for (const lang of LANGUAGES) {
      expect(LANGUAGE_INFO[lang].nativeName).toBeTruthy();
      expect(LANGUAGE_INFO[lang].speechLocale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(LANGUAGE_INFO[lang].intlLocale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });

  it.each([
    [['ta-SG', 'en-SG'], 'ta'],
    [['zh-Hans-CN'], 'zh'],
    [['zh_TW'], 'zh'],
    [['MS-my'], 'ms'],
    [['fr-FR', 'ms-MY'], 'ms'],
    [['fr-FR'], 'en'],
    [[null, undefined, ''], 'en'],
    [[], 'en'],
  ])('matches %j to %s', (preferred, expected) => {
    expect(matchLanguage(preferred)).toBe(expected);
  });
});
