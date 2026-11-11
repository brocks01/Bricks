import { readFileSync } from 'fs';
import { join } from 'path';

import { LANGUAGES } from '@/i18n/languages';

import { matchIntent } from './intents';

/**
 * The backend's distress list (voice iteration 0.2) is checked before the model on
 * every channel. The app's Buddy must open SOS for every one of those phrases too,
 * in any app language, even with no connection to the server.
 */
const DISTRESS_FILE = join(__dirname, '../../../../backend/src/bricks_api/assistant/distress.json');
const distress = JSON.parse(readFileSync(DISTRESS_FILE, 'utf8')) as {
  phrases: Record<string, string[]>;
};

const cases = Object.entries(distress.phrases).flatMap(([lang, phrases]) =>
  phrases.map((phrase) => [lang, phrase] as const),
);

describe('Buddy opens SOS for every phrase in the backend distress list', () => {
  it('covers all four languages', () => {
    expect(Object.keys(distress.phrases).sort()).toEqual([...LANGUAGES].sort());
  });

  it.each(cases)('[%s] "%s", whatever the app language', (_lang, phrase) => {
    for (const appLanguage of LANGUAGES) {
      expect(matchIntent(phrase, appLanguage).kind).toBe('help');
    }
  });
});
