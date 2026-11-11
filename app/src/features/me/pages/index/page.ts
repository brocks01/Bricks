import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const meIndex = definePage({
  key: 'me.index',
  module: 'me',
  route: '/me',
  tab: 5,
  icon: 'person',
  requiresAuth: true,
  summary: 'Your own page: your details, language, and sign out.',
  keywords: ['profile', 'settings', 'account'],
  elements: {
    heading: { kind: 'text' },
    email: { kind: 'text', summary: 'The email address you signed in with.' },
    phone: { kind: 'text', summary: 'Your phone number.' },
    ageBand: { kind: 'text', summary: 'Your age group.' },
    area: { kind: 'text', summary: 'Your area.' },
    language: { kind: 'text', summary: 'The language the app is using now.' },
    editProfile: { kind: 'action', summary: 'Opens the page to change your name, age group, phone and area.' },
    chooseLanguage: { kind: 'action', summary: 'Opens the list of languages.' },
    signOut: { kind: 'action', agent: 'confirm', summary: 'Signs you out of this device. Needs the person to approve.' },
  },
  strings,
});
