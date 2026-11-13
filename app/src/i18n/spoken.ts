// The languages a person may SPEAK to the agent (23), separate from the six the app is translated into. Mirrors backend/app/core/languages.py.
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
