import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const authWelcome = definePage({
  key: 'auth.welcome',
  module: 'auth',
  route: '/welcome',
  bare: true,
  summary: 'The first page for someone who is not signed in: what Wisdom is, and the button to start.',
  keywords: ['start', 'welcome', 'begin'],
  elements: {
    heading: { kind: 'text' },
    subtitle: { kind: 'text' },
    start: { kind: 'action', summary: 'Goes to the sign-in page.' },
    startDemo: { kind: 'action', summary: 'Prototype: makes a throwaway account with a random name and opens the app at once, with no code.' },
    languageLink: { kind: 'action', summary: 'Opens the list of languages.' },
    spokenLink: { kind: 'action', summary: 'Opens the page where the person says which languages they speak to Wisdom, before signing in.' },
  },
  strings,
});
