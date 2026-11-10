/**
 * The four supported languages. Names are always shown in their own script
 * (docs/02_DESIGN_PRINCIPLES.md §8): never flags, never a dropdown.
 */

export const LANGUAGES = ['en', 'ms', 'zh', 'ta'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'en';

export const LANGUAGE_INFO: Record<
  Language,
  {
    /** Name in its own script, for the language picker. */
    nativeName: string;
    /** BCP 47 voice for Read It Out (expo-speech). */
    speechLocale: string;
    /** BCP 47 locale for dates and times (Intl). */
    intlLocale: string;
  }
> = {
  en: { nativeName: 'English', speechLocale: 'en-SG', intlLocale: 'en-SG' },
  ms: { nativeName: 'Bahasa Melayu', speechLocale: 'ms-MY', intlLocale: 'ms-MY' },
  zh: { nativeName: '中文', speechLocale: 'zh-CN', intlLocale: 'zh-CN' },
  ta: { nativeName: 'தமிழ்', speechLocale: 'ta-IN', intlLocale: 'ta-IN' },
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * Picks the first supported language from the device's preferred list.
 * Accepts language codes or full tags ("ta-SG", "zh-Hans-CN").
 */
export function matchLanguage(preferred: readonly (string | null | undefined)[]): Language {
  for (const tag of preferred) {
    const code = tag?.toLowerCase().split(/[-_]/)[0];
    if (isLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}
