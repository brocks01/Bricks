import { useLocales } from 'expo-localization';
import { useMemo } from 'react';

import { useSettings } from '@/state/settings';

import { matchLanguage, type Language } from './languages';

/**
 * The language the app speaks right now: the member's choice if they made one,
 * otherwise the best match for the phone's language, otherwise English.
 */
export function useActiveLanguage(): Language {
  const chosen = useSettings((s) => s.language);
  const locales = useLocales();
  const deviceLanguage = useMemo(() => matchLanguage(locales.map((l) => l.languageTag)), [locales]);
  return chosen ?? deviceLanguage;
}
