// Time in plain words, in the person's language: "Today, 7 am", "Tomorrow, 7:30 am", "Saturday, 9 am", "Sat 22 Nov, 9 am".
// One helper for every community card and event row. Pure: the clock and the language are passed in, so when.check.ts can test it.
export type Lang = 'en' | 'hi' | 'bn' | 'ta' | 'zh' | 'ms';

const DAYS: Record<Lang, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  hi: ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
  ta: ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'],
  zh: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
  ms: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
};
const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'],
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
  ta: ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆக', 'செப்', 'அக்', 'நவ', 'டிச'],
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'],
};
const WORDS: Record<Lang, { today: string; tomorrow: string; am: string; pm: string }> = {
  en: { today: 'Today', tomorrow: 'Tomorrow', am: 'am', pm: 'pm' },
  hi: { today: 'आज', tomorrow: 'कल', am: 'सुबह', pm: 'शाम' },
  bn: { today: 'আজ', tomorrow: 'আগামীকাল', am: 'সকাল', pm: 'বিকাল' },
  ta: { today: 'இன்று', tomorrow: 'நாளை', am: 'காலை', pm: 'மாலை' },
  zh: { today: '今天', tomorrow: '明天', am: '上午', pm: '下午' },
  ms: { today: 'Hari ini', tomorrow: 'Esok', am: 'pagi', pm: 'petang' },
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "7 am", "7:30 pm" (or the language's own words for morning and afternoon, placed as that language says it). */
export function clock(d: Date, lang: Lang): string {
  const w = WORDS[lang] ?? WORDS.en;
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const hm = m ? `${h12}:${String(m).padStart(2, '0')}` : `${h12}`;
  const part = h < 12 ? w.am : w.pm;
  if (lang === 'zh' || lang === 'hi' || lang === 'bn' || lang === 'ta') return `${part} ${hm}`;
  return `${hm} ${part}`;
}

/** The day in words: today, tomorrow, the weekday within the next six days, else a short date. */
export function dayWord(d: Date, now: Date, lang: Lang): string {
  const w = WORDS[lang] ?? WORDS.en;
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  if (diff === 0) return w.today;
  if (diff === 1) return w.tomorrow;
  const day = (DAYS[lang] ?? DAYS.en)[d.getDay()];
  if (diff > 1 && diff < 7) return day;
  const month = (MONTHS[lang] ?? MONTHS.en)[d.getMonth()];
  if (lang === 'zh') return `${month}${d.getDate()}日 ${day}`;
  return `${day.slice(0, lang === 'en' || lang === 'ms' ? 3 : day.length)} ${d.getDate()} ${month}`;
}

/** "Tomorrow, 7 am" in the person's language. */
export function whenWords(iso: string, lang: Lang, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${dayWord(d, now, lang)}${lang === 'zh' ? ' ' : ', '}${clock(d, lang)}`;
}

/** A heading for a list grouped by day: "Tomorrow · Wednesday". */
export function dayHeading(iso: string, lang: Lang, now: Date = new Date()): string {
  const d = new Date(iso);
  const first = dayWord(d, now, lang);
  const day = (DAYS[lang] ?? DAYS.en)[d.getDay()];
  return first === day || first.startsWith(day.slice(0, 3)) ? first : `${first} · ${day}`;
}
