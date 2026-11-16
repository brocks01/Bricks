import { definePage } from '../../../../kit/page';
import { welcomeStrings } from '../../preWords';

export const authWelcome = definePage({
  key: 'auth.welcome',
  module: 'auth',
  route: '/welcome',
  bare: true,
  summary: 'The first screen for someone who is not signed in: Welcome to Interchange, with Get started.',
  keywords: ['start', 'welcome', 'begin', 'get started'],
  elements: {
    heading: { kind: 'text' },
    start: { kind: 'action', summary: 'Goes on to choosing the language.' },
  },
  strings: welcomeStrings,
});
