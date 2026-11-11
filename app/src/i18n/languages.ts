export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'zh', name: 'Chinese', native: '中文' },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LangCode = 'en';
export const isLangCode = (v: unknown): v is LangCode => LANGUAGES.some((l) => l.code === v);
