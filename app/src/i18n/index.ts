import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, LANGUAGES, type Language } from './languages';
import en from './locales/en.json';
import ms from './locales/ms.json';
import ta from './locales/ta.json';
import zh from './locales/zh.json';

const i18n = createInstance();

export const resources = {
  en: { translation: en },
  ms: { translation: ms },
  zh: { translation: zh },
  ta: { translation: ta },
} as const;

/**
 * Initialised synchronously with bundled resources, so the first frame already
 * has text. The active language is set from the settings store (see LanguageSync).
 */
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES,
  initAsync: false,
  interpolation: {
    // React Native renders plain text; there is no HTML to escape.
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
  saveMissing: __DEV__,
  missingKeyHandler: (lngs, _ns, key) => {
    if (__DEV__) {
      console.warn(`[i18n] Missing key "${key}" for ${lngs.join(', ')}`);
    }
  },
});

export function setLanguage(language: Language): Promise<unknown> {
  return i18n.language === language ? Promise.resolve() : i18n.changeLanguage(language);
}

export default i18n;
