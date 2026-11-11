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
    /** "Choose your language", in this language (S1 shows all four, stacked). */
    chooseLanguage: string;
    /** What S1 reads out in this language. */
    chooseLanguageReadOut: string;
  }
> = {
  en: {
    nativeName: 'English',
    speechLocale: 'en-SG',
    intlLocale: 'en-SG',
    chooseLanguage: 'Choose your language',
    chooseLanguageReadOut: 'Hello. Choose your language.',
  },
  ms: {
    nativeName: 'Bahasa Melayu',
    speechLocale: 'ms-MY',
    intlLocale: 'ms-MY',
    chooseLanguage: 'Pilih bahasa anda',
    chooseLanguageReadOut: 'Selamat datang. Pilih bahasa anda.',
  },
  zh: {
    nativeName: '中文',
    speechLocale: 'zh-CN',
    intlLocale: 'zh-CN',
    chooseLanguage: '请选择语言',
    chooseLanguageReadOut: '您好。请选择语言。',
  },
  ta: {
    nativeName: 'தமிழ்',
    speechLocale: 'ta-IN',
    intlLocale: 'ta-IN',
    chooseLanguage: 'உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்',
    chooseLanguageReadOut: 'வணக்கம். உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்.',
  },
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
