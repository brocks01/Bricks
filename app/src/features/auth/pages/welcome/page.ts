import { definePage } from '../../../../kit/page';
import { welcomeStrings } from '../../preWords';

export const authWelcome = definePage({
  key: 'auth.welcome',
  module: 'auth',
  route: '/welcome',
  bare: true,
  summary: 'The first screen for someone who is not signed in: choose the language, then Next.',
  keywords: ['start', 'welcome', 'begin', 'language'],
  elements: {
    heading: { kind: 'text' },
    start: { kind: 'action', summary: 'Goes to the text size screen.' },
  },
  strings: welcomeStrings,
});
