import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const meEdit = definePage({
  key: 'me.edit',
  module: 'me',
  route: '/profile/edit',
  requiresAuth: true,
  summary: 'Edit profile: opens the profile page, where every detail (name, where you live, what you enjoy, language, text size, voice, reminders, age group, phone) has its own edit screen (me.field).',
  keywords: ['edit', 'profile', 'name', 'phone'],
  elements: {
    heading: { kind: 'text' },
  },
  strings,
});
