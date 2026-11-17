// Time in plain words, for Home and the Marketplace: "Today, 7 am", "Tomorrow, 9.30 am", "Thursday, 7 am", "Sat 29 Nov, 7 am".
// Pure (no React): the words are registered once under 'hwhen.*' and read with the plain `t`, so the check file can run without a screen.
import type { LangCode } from '../../i18n/languages';
import { registerStrings, t } from '../../i18n/tables';
import { pageWords, type WordTable } from '../../i18n/words';

export const LOCALE: Record<LangCode, string> = { en: 'en-SG', hi: 'hi-IN', bn: 'bn-IN', ta: 'ta-SG', zh: 'zh-SG', ms: 'ms-SG' };

// Order of the six: English, Hindi, Bengali, Tamil, Chinese, Malay. First drafts: native-speaker review needed.
export const WHEN: WordTable = {
  today: ['Today, {time}', 'आज, {time}', 'আজ, {time}', 'இன்று, {time}', '今天 {time}', 'Hari ini, {time}'],
  tomorrow: ['Tomorrow, {time}', 'कल, {time}', 'আগামীকাল, {time}', 'நாளை, {time}', '明天 {time}', 'Esok, {time}'],
  yesterday: ['Yesterday, {time}', 'बीता कल, {time}', 'গতকাল, {time}', 'நேற்று, {time}', '昨天 {time}', 'Semalam, {time}'],
  on: ['{day}, {time}', '{day}, {time}', '{day}, {time}', '{day}, {time}', '{day} {time}', '{day}, {time}'],
  today_word: ['Today', 'आज', 'আজ', 'இன்று', '今天', 'Hari ini'],
  tomorrow_word: ['Tomorrow', 'कल', 'আগামীকাল', 'நாளை', '明天', 'Esok'],
};
registerStrings('hwhen', pageWords(WHEN));

const DAY_MS = 86_400_000;
const at0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Whole calendar days from `now` to `d`, in the device's own time: 0 today, 1 tomorrow, -1 yesterday. */
export function dayDiff(d: Date, now: Date): number {
  return Math.round((at0(d).getTime() - at0(now).getTime()) / DAY_MS);
}

/** The clock time: "7 am" on the hour, "9:30 am" otherwise. */
export function timeWords(d: Date, lang: LangCode): string {
  const opts: Intl.DateTimeFormatOptions = d.getMinutes() === 0 ? { hour: 'numeric' } : { hour: 'numeric', minute: '2-digit' };
  return d.toLocaleTimeString(LOCALE[lang], opts);
}

/** When something happens, in plain words: today, tomorrow, yesterday, a weekday within the week, otherwise a short date. */
export function whenWords(iso: string, now: Date, lang: LangCode): string {
  const d = new Date(iso);
  const n = dayDiff(d, now);
  const time = timeWords(d, lang);
  if (n === 0) return t('hwhen.today', { time }, lang);
  if (n === 1) return t('hwhen.tomorrow', { time }, lang);
  if (n === -1) return t('hwhen.yesterday', { time }, lang);
  const day = n > 1 && n < 7
    ? d.toLocaleDateString(LOCALE[lang], { weekday: 'long' })
    : d.toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short', ...(d.getFullYear() === now.getFullYear() ? null : { year: 'numeric' }) });
  return t('hwhen.on', { day, time }, lang);
}

/** A whole date in words, for a heading: "Thursday, 20 November" (the year only when it is not this year). */
export function dateWords(d: Date, now: Date, lang: LangCode): string {
  return d.toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long', ...(d.getFullYear() === now.getFullYear() ? null : { year: 'numeric' }) });
}

/** A date heading for a list grouped by day: "Today · Tuesday", "Tomorrow · Wednesday", or "Friday, 21 November". */
export function dayHeading(d: Date, now: Date, lang: LangCode): string {
  const n = dayDiff(d, now);
  const weekday = d.toLocaleDateString(LOCALE[lang], { weekday: 'long' });
  if (n === 0) return `${t('hwhen.today_word', {}, lang)} · ${weekday}`;
  if (n === 1) return `${t('hwhen.tomorrow_word', {}, lang)} · ${weekday}`;
  return dateWords(d, now, lang);
}
