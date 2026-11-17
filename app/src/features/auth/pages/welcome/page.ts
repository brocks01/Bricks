import { definePage } from '../../../../kit/page';
import { welcomeStrings } from '../../preWords';

export const authWelcome = definePage({
  key: 'auth.welcome',
  module: 'auth',
  route: '/welcome',
  bare: true,
  summary: 'The first screen for someone who is not signed in: choose the language, then Next. For a presentation, "Demo: skip onboarding" signs straight in as Mr Lim, the demo person, and opens Home.',
  keywords: ['start', 'welcome', 'begin', 'language'],
  elements: {
    heading: { kind: 'text' },
    start: { kind: 'action', summary: 'Goes to the text size screen.' },
    skipDemo: { kind: 'action', summary: 'Demo: skip onboarding. Signs in as Mr Lim (a retired finance manager in Tampines, already set up) and opens Home.' },
  },
  strings: welcomeStrings,
});
