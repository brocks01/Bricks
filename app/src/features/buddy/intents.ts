import type { ReminderKind, ReminderRepeat } from '@/api/types';
import { LANGUAGES, type Language } from '@/i18n/languages';

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
  | { kind: 'navigate'; to: NavTarget }
  | { kind: 'back' }
  | { kind: 'unknown' };

/** Every screen Buddy can open by name. */
export type NavTarget =
  | 'home'
  | 'kampung'
  | 'circles'
  | 'create'
  | 'passItOn'
  | 'thrive'
  | 'checkin'
  | 'reminders'
  | 'settings'
  | 'language'
  | 'safeCircle'
  | 'family';

/**
 * What people call each screen, per language: the app's own names for it (tabs and
 * titles) plus everyday words. More specific targets come first ("safe circle"
 * before "circles", "start something" before "events").
 */
const NAV_WORDS: Record<Language, [NavTarget, string[]][]> = {
  en: [
    ['safeCircle', ['safe circle']],
    [
      'create',
      [
        'start something',
        'create an event',
        'create event',
        'new event',
        'host an event',
        'organise',
        'organize',
      ],
    ],
    ['circles', ['my circles', 'circles', 'groups']],
    ['checkin', ['check-in', 'check in', 'checkin', 'morning question', 'morning check']],
    ['reminders', ['reminders', 'my reminders', 'reminder list']],
    [
      'passItOn',
      [
        'my activity',
        'activity tab',
        'activity',
        'pass it on',
        'share a skill',
        'share my skill',
        'teach',
      ],
    ],
    ['kampung', ['community', 'kampung', 'happenings', 'events', 'activities']],
    ['thrive', ['thrive', 'my health', 'health']],
    ['language', ['language', 'languages']],
    ['settings', ['settings', 'setting']],
    ['family', ['my family', 'family']],
    ['home', ['home', 'home page', 'main page', 'start page']],
  ],
  ms: [
    ['safeCircle', ['kumpulan selamat', 'bulatan selamat']],
    ['create', ['mulakan sesuatu', 'buat acara', 'acara baru']],
    ['circles', ['bulatan saya', 'bulatan', 'kumpulan']],
    ['checkin', ['soalan pagi', 'daftar masuk']],
    ['reminders', ['peringatan saya', 'senarai peringatan']],
    ['passItOn', ['aktiviti saya', 'kongsi ilmu', 'kongsi kemahiran']],
    ['kampung', ['komuniti', 'kampung', 'aktiviti', 'acara']],
    ['thrive', ['sihat', 'kesihatan']],
    ['language', ['bahasa']],
    ['settings', ['tetapan']],
    ['family', ['keluarga']],
    ['home', ['utama', 'laman utama']],
  ],
  zh: [
    ['safeCircle', ['安全圈']],
    ['create', ['发起活动', '创建活动', '新活动', '发起']],
    ['circles', ['我的圈子', '圈子', '小组']],
    ['checkin', ['早上问候', '签到']],
    ['reminders', ['我的提醒', '提醒列表']],
    ['passItOn', ['我的活动', '传承分享', '传承', '分享技能']],
    ['kampung', ['社区', '甘榜', '活动']],
    ['thrive', ['健康']],
    ['language', ['语言']],
    ['settings', ['设置']],
    ['family', ['家人', '家庭']],
    ['home', ['首页', '主页']],
  ],
  // Word stems: Tamil adds endings ("அமைப்புகளைத் திற" = open settings).
  ta: [
    ['safeCircle', ['பாதுகாப்பு வட்ட']],
    ['create', ['ஒன்றைத் தொடங்', 'புதிய நிகழ்வ']],
    ['circles', ['என் வட்ட', 'வட்டங்க']],
    ['checkin', ['காலை விசாரிப்ப', 'செக் இன்']],
    ['reminders', ['நினைவூட்டல்க']],
    ['passItOn', ['என் செயல்பா', 'பகிர்ந்து கொ', 'திறமை']],
    ['kampung', ['சமூக', 'கம்போங்', 'நிகழ்வுக', 'நிகழ்ச்சிக']],
    ['thrive', ['நலம்', 'நலத்', 'ஆரோக்கிய']],
    ['language', ['மொழி']],
    ['settings', ['அமைப்பு']],
    ['family', ['குடும்ப']],
    ['home', ['முகப்ப']],
  ],
};

/** "Open …", "go to …", "show me …": with one of these, a screen name always wins. */
const NAV_VERBS: Record<Language, string[]> = {
  en: [
    'open',
    'go to',
    'go',
    'show',
    'take me',
    'bring me',
    'see',
    'view',
    'where is',
    'switch to',
  ],
  ms: ['buka', 'pergi ke', 'pergi', 'tunjuk', 'bawa saya', 'lihat'],
  // Not 去 / போ: they also mean "I'm going" (join).
  zh: ['打开', '去看', '看看', '显示', '带我', '进入'],
  ta: ['திற', 'காட்டு', 'செல்'],
};

const BACK_WORDS: Record<Language, string[]> = {
  en: ['go back', 'back', 'previous page', 'previous screen'],
  ms: ['kembali', 'balik', 'undur'],
  zh: ['返回', '回去', '上一页'],
  ta: ['பின்செல்', 'திரும்பி', 'முந்தைய'],
};

function navTarget(text: string, language: Language): NavTarget | null {
  return NAV_WORDS[language].find(([, words]) => has(text, words))?.[0] ?? null;
}

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
    // help: the backend's distress list (backend/src/bricks_api/assistant/distress.json),
    // kept in step by distress-sync.test.ts. SOS never waits for the server.
    help: [
      'help',
      'help me',
      'save me',
      'i fell',
      "i've fallen",
      'i have fallen',
      'fell down',
      'fallen down',
      'pain',
      'hurt',
      'chest pain',
      'heart attack',
      'stroke',
      "can't breathe",
      'cannot breathe',
      'emergency',
      'ambulance',
      'call 995',
    ],
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
    help: [
      'tolong',
      'tolong saya',
      'bantu saya',
      'bantuan',
      'saya jatuh',
      'terjatuh',
      'sakit',
      'sakit dada',
      'sesak nafas',
      'tak boleh bernafas',
      'kecemasan',
      'ambulans',
      'serangan jantung',
      'strok',
      'panggil 995',
    ],
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
    help: [
      '救命',
      '帮帮我',
      '救救我',
      '帮忙',
      '我摔倒了',
      '摔倒',
      '跌倒',
      '好痛',
      '很痛',
      '胸口痛',
      '喘不过气',
      '呼吸困难',
      '紧急',
      '救护车',
      '心脏病',
      '中风',
    ],
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
    help: [
      'உதவி',
      'உதவுங்கள்',
      'காப்பாற்று',
      'நான் விழுந்துவிட்டேன்',
      'விழுந்து',
      'வலி',
      'நெஞ்சு வலி',
      'மூச்சு விட முடியவில்லை',
      'மூச்சுத் திணறல்',
      'அவசரம்',
      'ஆம்புலன்ஸ்',
      'மாரடைப்பு',
      'பக்கவாதம்',
    ],
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
  // Every language, whatever the app's language: people switch languages under stress.
  if (LANGUAGES.some((l) => has(text, WORDS[l].help))) return { kind: 'help' };

  // "Open settings", "go to my reminders": a screen named with a verb is a place to go.
  const target = navTarget(text, language);
  if (target && has(text, NAV_VERBS[language])) return { kind: 'navigate', to: target };
  if (has(text, BACK_WORDS[language])) return { kind: 'back' };

  if (has(text, w.remind)) {
    const reminder = parseReminder(text, language);
    // "My reminders" with no time is the list, not a new reminder.
    if (reminder.minutes === null && target === 'reminders') {
      return { kind: 'navigate', to: 'reminders' };
    }
    return { kind: 'remind', reminder };
  }
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
  // Just the name of a screen ("Settings") also goes there.
  if (target) return { kind: 'navigate', to: target };
  return { kind: 'unknown' };
}
