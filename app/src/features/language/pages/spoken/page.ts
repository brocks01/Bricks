import { SPOKEN_LANGUAGES } from '../../../../i18n/spoken';
import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// The languages the person SPEAKS to Bricks (up to 23, their own scripts) and the one they prefer to
// talk in. Reachable from the welcome page BEFORE sign-in (the choice lives on the phone first) and
// from the profile afterwards (then it is also saved to the account). Separate from language.pick,
// which changes the six-language app language.
export const languageSpoken = definePage({
  key: 'language.spoken',
  module: 'language',
  route: '/settings/spoken',
  summary: 'The languages the person speaks to Bricks and the one they prefer to talk in. Saved on the phone before sign-in, and to the account after.',
  keywords: ['spoken', 'speak', 'talk', 'languages', 'voice', 'hindi', 'bhojpuri'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text', summary: 'One sentence: tell Bricks which languages you talk in, and it answers only in those.' },
    spoken: { kind: 'field', type: 'string', summary: 'The languages the person speaks, as comma-separated codes (for example en,hi,bho).' },
    commLanguage: { kind: 'choice', type: 'string', options: SPOKEN_LANGUAGES.map((l) => l.code), summary: 'The one language they prefer to talk in, when they speak more than one.' },
    save: { kind: 'action', summary: 'Save these languages on this phone, and to the account when signed in.' },
  },
  strings,
});
