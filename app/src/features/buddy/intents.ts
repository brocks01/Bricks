import type { ReminderKind, ReminderRepeat } from '@/api/types';
import type { Language } from '@/i18n/languages';

/**
 * Mock Buddy (S36): what did they ask for? Keyword matching in each language,
 * good enough to show the flow on mock data. Iteration 2.2 replaces this with
 * the backend's /assistant/turn, which returns the same intents.
 *
 * Keyword lists are drafts until the voice track's lists arrive (docs/04 §6).
 */

export type Intent =
  | { kind: 'help' }
  | { kind: 'remind'; reminder: ReminderRequest }
  | { kind: 'checkin'; answer: 'yes' | 'no' }
  | { kind: 'start_walk' }
  | { kind: 'stop_walk' }
  | { kind: 'join' }
  | { kind: 'profile' }
  | { kind: 'today' }
  | { kind: 'unknown' };

export interface ReminderRequest {
  kind: ReminderKind;
  /** Minutes after midnight, or null when no time was said. */
  minutes: number | null;
  repeat: ReminderRepeat;
  /** For "once": 0 today, 1 tomorrow. */
  dayOffset: 0 | 1;
}

interface Words {
  help: string[];
  remind: string[];
  yesterday: string[];
  negation: string[];
  walk: string[];
  start: string[];
  stop: string[];
  join: string[];
  profile: string[];
  today: string[];
  medicine: string[];
  doctor: string[];
  everyDay: string[];
  tomorrow: string[];
  am: string[];
  pm: string[];
  half: string[];
}

/** Lower-case keywords. Latin-script words match whole words; others match anywhere. */
const WORDS: Record<Language, Words> = {
  en: {
    help: ['help', 'emergency', 'ambulance', 'i fell', 'i have fallen', 'save me'],
    remind: ['remind', 'reminder'],
    yesterday: ['yesterday'],
    negation: ['not', "didn't", 'didnt', 'no', 'never'],
    walk: ['walk', 'walking'],
    start: ['start', 'begin', 'go for', "let's", 'record'],
    stop: ['stop', 'finish', 'end', 'done'],
    join: ['join', "i'm going", 'i am going', 'sign me up', 'count me in'],
    profile: ['profile', 'my page'],
    today: ['today', "what's on", 'what is on', 'happening'],
    medicine: ['medicine', 'medication', 'pill', 'pills', 'tablet', 'tablets'],
    doctor: ['doctor', 'clinic', 'appointment', 'polyclinic'],
    everyDay: ['every day', 'everyday', 'daily', 'every morning', 'every night'],
    tomorrow: ['tomorrow'],
    am: ['am', 'a.m.', 'morning'],
    pm: ['pm', 'p.m.', 'evening', 'night', 'afternoon'],
    half: ['half past'],
  },
  ms: {
    help: ['tolong', 'bantuan', 'kecemasan', 'saya jatuh', 'ambulans'],
    remind: ['ingatkan', 'peringatan'],
    yesterday: ['semalam', 'kelmarin'],
    negation: ['tidak', 'tak', 'belum', 'bukan'],
    walk: ['jalan', 'berjalan'],
    start: ['mula', 'mulakan', 'mari', 'pergi'],
    stop: ['berhenti', 'tamat', 'habis', 'selesai'],
    join: ['sertai', 'ikut', 'saya pergi', 'nak pergi', 'daftar'],
    profile: ['profil'],
    today: ['hari ini'],
    medicine: ['ubat', 'pil'],
    doctor: ['doktor', 'klinik', 'temu janji'],
    everyDay: ['setiap hari', 'tiap hari', 'hari-hari'],
    tomorrow: ['esok', 'besok'],
    am: ['pagi'],
    pm: ['petang', 'malam', 'tengah hari'],
    half: ['setengah', 'stengah'],
  },
  zh: {
    help: ['救命', '帮帮我', '帮忙', '紧急', '摔倒', '叫救护车'],
    remind: ['提醒'],
    yesterday: ['昨天'],
    negation: ['没', '不'],
    walk: ['走路', '散步', '步行', '走走'],
    start: ['开始', '去'],
    stop: ['停', '结束', '完成'],
    join: ['参加', '报名', '我要去', '我去'],
    profile: ['我的资料', '个人资料', '资料'],
    today: ['今天'],
    medicine: ['药'],
    doctor: ['医生', '看病', '诊所', '门诊'],
    everyDay: ['每天', '天天'],
    tomorrow: ['明天'],
    am: ['早上', '上午', '早'],
    pm: ['下午', '晚上', '傍晚'],
    half: ['半'],
  },
  ta: {
    help: ['உதவி', 'காப்பாற்று', 'அவசரம்', 'விழுந்து'],
    remind: ['நினைவூட்டு', 'ஞாபகப்படுத்து', 'நினைவு'],
    yesterday: ['நேற்று'],
    negation: ['இல்லை', 'வில்லை', 'மாட்டேன்'],
    walk: ['நடை', 'நடக்க', 'நடந்'],
    start: ['தொடங்கு', 'ஆரம்பி', 'போக', 'போகலாம்'],
    stop: ['நிறுத்து', 'முடி'],
    join: ['சேர', 'கலந்து', 'போகிறேன்', 'வருகிறேன்'],
    profile: ['சுயவிவர', 'என் பக்கம்'],
    today: ['இன்று'],
    medicine: ['மருந்து', 'மாத்திரை'],
    doctor: ['டாக்டர்', 'மருத்துவர்', 'கிளினிக்'],
    everyDay: ['தினமும்', 'ஒவ்வொரு நாளும்'],
    tomorrow: ['நாளை'],
    am: ['காலை'],
    pm: ['மாலை', 'இரவு', 'மதியம்'],
    half: ['அரை'],
  },
};

const LATIN = /^[a-z0-9 .'-]+$/;

function has(text: string, words: string[]): boolean {
  return words.some((word) => {
    if (!LATIN.test(word)) return text.includes(word);
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z])${escaped}($|[^a-z])`).test(text);
  });
}

const CHINESE_NUMBERS: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
  十一: 11,
  十二: 12,
};

/** The hour and minute said, as minutes after midnight, or null. */
export function parseTime(text: string, language: Language): number | null {
  const w = WORDS[language];
  let hour: number | null = null;
  let minute = 0;

  const digits = /(\d{1,2})(?:[:.](\d{2}))?/.exec(text);
  if (digits) {
    hour = Number(digits[1]);
    minute = digits[2] ? Number(digits[2]) : 0;
  } else if (language === 'zh') {
    const zh = /(十[一二]|[一二两三四五六七八九十])点/.exec(text);
    if (zh) hour = CHINESE_NUMBERS[zh[1]!] ?? null;
  }
  if (hour === null || hour > 23 || minute > 59) return null;
  if (minute === 0 && has(text, w.half)) minute = 30;

  if (hour < 12 && has(text, w.pm)) hour += 12;
  else if (hour === 12 && has(text, w.am)) hour = 0;
  return hour * 60 + minute;
}

export function parseReminder(text: string, language: Language): ReminderRequest {
  const w = WORDS[language];
  const kind: ReminderKind = has(text, w.medicine)
    ? 'medicine'
    : has(text, w.doctor)
      ? 'doctor'
      : 'other';
  const tomorrow = has(text, w.tomorrow);
  // Medicine is usually every day; anything said for "tomorrow" is a one-off.
  const repeat: ReminderRepeat =
    has(text, w.everyDay) || (kind === 'medicine' && !tomorrow) ? 'daily' : 'once';
  return { kind, minutes: parseTime(text, language), repeat, dayOffset: tomorrow ? 1 : 0 };
}

export function matchIntent(said: string, language: Language): Intent {
  const text = said.toLowerCase().trim();
  const w = WORDS[language];
  if (!text) return { kind: 'unknown' };

  // Help always wins: it must never be mistaken for anything else.
  if (has(text, w.help) || has(text, WORDS.en.help)) return { kind: 'help' };
  if (has(text, w.remind)) return { kind: 'remind', reminder: parseReminder(text, language) };
  if (has(text, w.yesterday)) {
    return { kind: 'checkin', answer: has(text, w.negation) ? 'no' : 'yes' };
  }
  if (has(text, w.walk)) {
    if (has(text, w.stop)) return { kind: 'stop_walk' };
    if (has(text, w.start)) return { kind: 'start_walk' };
  }
  if (has(text, w.join)) return { kind: 'join' };
  if (has(text, w.profile)) return { kind: 'profile' };
  if (has(text, w.today)) return { kind: 'today' };
  return { kind: 'unknown' };
}
