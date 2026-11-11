import { createContext, ReactNode, useContext, useEffect } from 'react';
import { useStore } from '../core/store';
import { LANGUAGES, type LangCode } from './languages';
import { languageStore, loadLanguage, setLanguage } from './store';
import { t } from './tables';

export { LANGUAGES, setLanguage, languageStore, t };
export type { LangCode };

type TFn = (key: string, vars?: Record<string, string | number>) => string;
const LangContext = createContext<{ t: TFn; code: LangCode } | null>(null);

/** Loads the saved language once and re-renders everything below when it changes. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { code } = useStore(languageStore);
  useEffect(() => {
    void loadLanguage();
  }, []);
  const value = { code, t: ((key, vars) => t(key, vars, code)) as TFn };
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Translate any full key, for example useT()('common.members', { n: 42 }). */
export function useT(): TFn {
  const v = useContext(LangContext);
  if (!v) throw new Error('language: no <LanguageProvider> above this component.');
  return v.t;
}

export function useLanguage(): LangCode {
  const v = useContext(LangContext);
  if (!v) throw new Error('language: no <LanguageProvider> above this component.');
  return v.code;
}
