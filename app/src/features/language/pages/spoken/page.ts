import { SPOKEN_LANGUAGES } from '../../../../i18n/spoken';
import { definePage } from '../../../../kit/page';
import { strings } from './strings';

const speakElements = Object.fromEntries(SPOKEN_LANGUAGES.map((l) => [`speak${l.code.charAt(0).toUpperCase()}${l.code.slice(1)}`, { kind: 'action' as const, summary: `Toggle ${l.native} in the languages you speak.` }]));
// each language chip is named in its own script, the same in every language
const speakNames = Object.fromEntries(SPOKEN_LANGUAGES.map((l) => [`speak${l.code.charAt(0).toUpperCase()}${l.code.slice(1)}`, l.native]));
const allStrings = Object.fromEntries(Object.entries(strings).map(([lang, t]) => [lang, { ...speakNames, ...t }])) as typeof strings;
export const languageSpoken = definePage({
  key: 'language.spoken',
  module: 'language',
  route: '/settings/spoken',
  summary: 'The languages the person speaks to Wisdom and the one they prefer to talk in. Saved on the phone before sign-in, and to the account after.',
  keywords: ['spoken', 'speak', 'talk', 'languages', 'voice', 'hindi', 'bhojpuri'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text', summary: 'One sentence: tell Wisdom which languages you talk in, and it answers only in those.' },
    spoken: { kind: 'field', type: 'string', summary: 'The languages the person speaks, as comma-separated codes (for example en,hi,bho).' },
    save: { kind: 'action', summary: 'Save these languages on this phone, and to the account when signed in.' },
    ...speakElements,
  },
  strings: allStrings,
});