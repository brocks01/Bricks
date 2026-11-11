import { createStore } from '../core/store';
import { DEFAULT_LANGUAGE, isLangCode, type LangCode } from './languages';

// The chosen language lives in a plain store so a person, the settings screen and the agent can all change it.
export const languageStore = createStore<{ code: LangCode; ready: boolean }>({ code: DEFAULT_LANGUAGE, ready: false });

const KEY = 'bricks.language';

// Storage and locale are loaded lazily so this file also runs in plain Node tests.
async function storage() {
  try {
    return (await import('@react-native-async-storage/async-storage')).default;
  } catch {
    return null;
  }
}

function deviceLanguage(): LangCode | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    const code = getLocales()[0]?.languageCode ?? '';
    return isLangCode(code) ? code : null;
  } catch {
    return null;
  }
}

/** Called once at start: the saved choice wins, then the phone's language, then English. */
export async function loadLanguage(): Promise<void> {
  let code: LangCode | null = null;
  try {
    const s = await storage();
    const saved = s ? await s.getItem(KEY) : null;
    if (isLangCode(saved)) code = saved;
  } catch {
    /* ignore: fall back below */
  }
  languageStore.set({ code: code ?? deviceLanguage() ?? DEFAULT_LANGUAGE, ready: true });
}

export async function setLanguage(code: LangCode): Promise<void> {
  languageStore.set({ code, ready: true });
  try {
    const s = await storage();
    await s?.setItem(KEY, code);
  } catch {
    /* the choice still applies for this session */
  }
}
