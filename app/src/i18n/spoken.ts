// The languages a person may SPEAK to the agent (23), separate from the six the app is translated into. Mirrors backend/app/core/languages.py.
import { createStore } from '../core/store';

export const SPOKEN_LANGUAGES = [
  { code: 'en', native: 'English' }, { code: 'hi', native: 'हिन्दी' }, { code: 'bn', native: 'বাংলা' }, { code: 'ta', native: 'தமிழ்' },
  { code: 'te', native: 'తెలుగు' }, { code: 'mr', native: 'मराठी' }, { code: 'gu', native: 'ગુજરાતી' }, { code: 'kn', native: 'ಕನ್ನಡ' },
  { code: 'ml', native: 'മലയാളം' }, { code: 'pa', native: 'ਪੰਜਾਬੀ' }, { code: 'ur', native: 'اردو' }, { code: 'or', native: 'ଓଡ଼ିଆ' },
  { code: 'as', native: 'অসমীয়া' }, { code: 'bho', native: 'भोजपुरी' }, { code: 'mai', native: 'मैथिली' }, { code: 'ne', native: 'नेपाली' },
  { code: 'kok', native: 'कोंकणी' }, { code: 'zh', native: '中文' }, { code: 'yue', native: '粵語' }, { code: 'nan', native: '閩南語' },
  { code: 'teo', native: '潮州话' }, { code: 'ms', native: 'Bahasa Melayu' }, { code: 'id', native: 'Bahasa Indonesia' },
] as const;
const CODES = new Set<string>(SPOKEN_LANGUAGES.map((l) => l.code));
/** Keeps only known codes, once each, in order. Accepts a list or a comma / space separated string. */
export const cleanSpoken = (v: unknown): string[] => {
  const list = Array.isArray(v) ? v : String(v ?? '').split(/[\s,]+/);
  const out: string[] = [];
  for (const c of list.map((x) => String(x).trim().toLowerCase())) if (CODES.has(c) && !out.includes(c)) out.push(c);
  return out;
};

// The choice lives on the PHONE first, so a person can say what they speak on the very first screen,
// before there is any account. Sign-in copies it into the account; the account copies back into the phone.
export const spokenStore = createStore<{ spoken: string[]; comm: string | null; ready: boolean }>({ spoken: [], comm: null, ready: false });

const KEY = 'bricks.spoken';

// Storage is loaded lazily so this file also runs in plain Node tests (same as i18n/store.ts).
async function storage() {
  try {
    return (await import('@react-native-async-storage/async-storage')).default;
  } catch {
    return null;
  }
}

/** Called once at start: the languages this phone's owner already said they speak. */
export async function loadSpoken(): Promise<void> {
  try {
    const s = await storage();
    const raw = s ? await s.getItem(KEY) : null;
    if (raw) {
      const v = JSON.parse(raw) as { spoken?: unknown; comm?: unknown };
      const spoken = cleanSpoken(v.spoken);
      const comm = cleanSpoken([v.comm ?? ''])[0] ?? null;
      spokenStore.set({ spoken, comm: comm && spoken.includes(comm) ? comm : spoken[0] ?? null, ready: true });
      return;
    }
  } catch {
    /* fall through: nothing saved yet */
  }
  spokenStore.set((s) => ({ ...s, ready: true }));
}

/** Remember the choice on this phone (works before sign-in). Keeps the preferred language inside the set. */
export async function saveSpoken(spoken: string[], comm: string | null): Promise<void> {
  const list = cleanSpoken(spoken);
  const main = comm && list.includes(comm) ? comm : list[0] ?? null;
  spokenStore.set({ spoken: list, comm: main, ready: true });
  try {
    const s = await storage();
    await s?.setItem(KEY, JSON.stringify({ spoken: list, comm: main }));
  } catch {
    /* the choice still applies for this session */
  }
}
