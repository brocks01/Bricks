import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const meIndex = definePage({
  key: 'me.index',
  module: 'me',
  route: '/me',
  requiresAuth: true,
  summary: 'Your profile and settings, opened from your avatar: your details, language, and sign out.',
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
    reachChannel: { kind: 'choice', type: 'string', options: ['call', 'whatsapp', 'telegram', 'sms', 'app'], summary: 'Where Wisdom should message you first.' },
    quietFrom: { kind: 'field', type: 'string', summary: 'From what time Wisdom should keep quiet.' },
    quietTo: { kind: 'field', type: 'string', summary: 'Until what time Wisdom should keep quiet.' },
    reachSave: { kind: 'action', summary: 'Save how Wisdom reaches you.' },
    quietClear: { kind: 'action', summary: 'Use the usual night quiet hours (21:00 to 08:00) instead.' },
    checkinSwitch: { kind: 'action', summary: 'Turn the daily check-in on or off.' },
    checkinTime: { kind: 'choice', type: 'string', options: ['07:00', '08:00', '09:00', '10:00', '12:00', '18:00', '19:00', '20:00'], summary: 'The hour Wisdom asks its daily question.' },
    checkinFamily: { kind: 'choice', type: 'string', options: ['no', 'yes'], summary: 'Whether Wisdom may tell the family after three silent days.' },
  },
  strings,
});
