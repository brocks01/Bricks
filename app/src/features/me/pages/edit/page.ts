import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const meEdit = definePage({
  key: 'me.edit',
  module: 'me',
  route: '/profile/edit',
  requiresAuth: true,
  summary: 'Change your name, age group, phone number and area.',
  keywords: ['edit', 'profile', 'name', 'phone'],
  elements: {
    heading: { kind: 'text' },
    displayName: { kind: 'field', type: 'string', required: true, summary: 'The name other people will see.' },
    ageBand: { kind: 'choice', type: 'string', options: ['under40', '40to59', '60plus'], summary: 'Age group: under40, 40to59 or 60plus.' },
    phone: { kind: 'field', type: 'string', summary: 'Phone number. Optional.' },
    area: { kind: 'field', type: 'string', summary: 'Neighbourhood or area name. Optional.' },
    save: { kind: 'action', summary: 'Saves the changes.' },
  },
  strings,
});
