import { LANGUAGES } from '@/i18n/languages';

import { BUDDY_DEMO_PHRASES } from './demoPhrases';
import { matchIntent, parseReminder, parseTime } from './intents';

/** The demo phrases, in order, are one per intent (see demoPhrases.ts). */
const EXPECTED = [
  'today',
  'remind',
  'checkin',
  'checkin',
  'join',
  'start_walk',
  'stop_walk',
  'profile',
  'help',
] as const;

describe.each(LANGUAGES)('Buddy intents in %s', (language) => {
  it.each(BUDDY_DEMO_PHRASES[language].map((phrase, i) => [phrase, EXPECTED[i]!]))(
    '"%s" → %s',
    (phrase, kind) => {
      expect(matchIntent(phrase, language).kind).toBe(kind);
    },
  );

  it('tells yes from no in the check-in answers', () => {
    const [, , yes, no] = BUDDY_DEMO_PHRASES[language];
    expect(matchIntent(yes!, language)).toEqual({ kind: 'checkin', answer: 'yes' });
    expect(matchIntent(no!, language)).toEqual({ kind: 'checkin', answer: 'no' });
  });

  it('reads "medicine at 8 in the morning" as a daily 8 am medicine reminder', () => {
    const intent = matchIntent(BUDDY_DEMO_PHRASES[language][1]!, language);
    expect(intent).toEqual({
      kind: 'remind',
      reminder: { kind: 'medicine', minutes: 8 * 60, repeat: 'daily', dayOffset: 0 },
    });
  });
});

describe('help always opens SOS (T5)', () => {
  it.each([
    ['help', 'en'],
    ['Please help me, I fell', 'en'],
    ['tolong', 'ms'],
    ['救命', 'zh'],
    ['உதவி', 'ta'],
    // Someone speaking English while the app is in another language.
    ['help', 'ta'],
    ['remind me, help!', 'en'],
  ] as const)('"%s" (%s)', (phrase, language) => {
    expect(matchIntent(phrase, language).kind).toBe('help');
  });
});

describe('times', () => {
  it.each([
    ['at 8', 'en', 8 * 60],
    ['at 8 pm', 'en', 20 * 60],
    ['at 7.30 in the evening', 'en', 19 * 60 + 30],
    ['at 12 am', 'en', 0],
    ['pukul 9 malam', 'ms', 21 * 60],
    ['晚上八点', 'zh', 20 * 60],
    ['下午3点半', 'zh', 15 * 60 + 30],
    ['இரவு 9 மணி', 'ta', 21 * 60],
    ['no time here', 'en', null],
    ['at 25', 'en', null],
  ] as const)('"%s" (%s) → %s', (text, language, minutes) => {
    expect(parseTime(text, language)).toBe(minutes);
  });

  it('a doctor visit tomorrow is a one-off for tomorrow', () => {
    expect(parseReminder('remind me about the doctor tomorrow at 10', 'en')).toEqual({
      kind: 'doctor',
      minutes: 10 * 60,
      repeat: 'once',
      dayOffset: 1,
    });
  });

  it('says unknown for anything else', () => {
    expect(matchIntent('the weather is nice', 'en').kind).toBe('unknown');
    expect(matchIntent('   ', 'en').kind).toBe('unknown');
  });
});
