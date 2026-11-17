import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const meIndex = definePage({
  key: 'me.index',
  module: 'me',
  route: '/me',
  requiresAuth: true,
  summary: 'Your profile, opened from your avatar: the profile card (name, how you signed in), Your details (language, text size, name, where you live, what you enjoy, your voice, reminders, what you can share, then age group, phone and languages you speak; each row opens its own edit screen), Sign out (asks first), and More (communities, health, emergency numbers, messages and check-in, and other pages).',
  keywords: ['profile', 'settings', 'account', 'my details', 'sign out'],
  elements: {
    heading: { kind: 'text' },
    editProfile: { kind: 'action', summary: 'Opens the edit screen for the name (each other detail has its own row).' },
    chooseLanguage: { kind: 'action', summary: 'Opens the language edit screen.' },
    signOut: { kind: 'action', summary: 'Asks "Sign out of Interchange on this phone?" with Yes and No. It does not sign out by itself.' },
    signOutYes: { kind: 'action', agent: 'confirm', summary: 'Yes, sign out of this phone. Needs the person to approve.' },
    reachChannel: { kind: 'choice', type: 'string', options: ['call', 'whatsapp', 'telegram', 'sms', 'app'], summary: 'Where Interchange should message you first (in More, Messages, quiet hours and check-in).' },
    quietFrom: { kind: 'field', type: 'string', summary: 'From what time Interchange should keep quiet.' },
    quietTo: { kind: 'field', type: 'string', summary: 'Until what time Interchange should keep quiet.' },
    reachSave: { kind: 'action', summary: 'Save how Interchange reaches you.' },
    quietClear: { kind: 'action', summary: 'Use the usual night quiet hours (21:00 to 08:00) instead.' },
    checkinSwitch: { kind: 'action', summary: 'Turn the daily check-in on or off.' },
    checkinTime: { kind: 'choice', type: 'string', options: ['07:00', '08:00', '09:00', '10:00', '12:00', '18:00', '19:00', '20:00'], summary: 'The hour Interchange asks its daily question.' },
    checkinFamily: { kind: 'choice', type: 'string', options: ['no', 'yes'], summary: 'Whether Interchange may tell the family after three silent days.' },
  },
  strings,
});
