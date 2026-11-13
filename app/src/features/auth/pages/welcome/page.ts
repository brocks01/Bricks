import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const authWelcome = definePage({
  key: 'auth.welcome',
  module: 'auth',
  route: '/welcome',
  bare: true,
  summary: 'The first page for someone who is not signed in: what Bricks is, and the button to start.',
  keywords: ['start', 'welcome', 'begin'],
  elements: {
    heading: { kind: 'text' },
    subtitle: { kind: 'text' },
    start: { kind: 'action', summary: 'Goes to the sign-in page.' },
    familyCode: { kind: 'action', summary: 'For the person whose family set up an account for them: they enter the code and their own contact to make the account theirs.' },
    languageLink: { kind: 'action', summary: 'Opens the list of languages.' },
    spokenLink: { kind: 'action', summary: 'Opens the page where the person says which languages they speak to Bricks, before signing in.' },
  },
  strings,
});
