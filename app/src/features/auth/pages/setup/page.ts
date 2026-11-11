import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const authSetup = definePage({
  key: 'auth.setup',
  module: 'auth',
  route: '/setup',
  requiresAuth: true,
  bare: true,
  summary: 'First-time profile: name (required), age group, phone and area (optional).',
  keywords: ['profile', 'name', 'setup', 'about you'],
  elements: {
    heading: { kind: 'text' },
    subtitle: { kind: 'text' },
    displayName: { kind: 'field', type: 'string', required: true, summary: 'The name other people will see.' },
    ageBand: { kind: 'choice', type: 'string', options: ['under40', '40to59', '60plus'], summary: 'Age group: under40, 40to59 or 60plus.' },
    phone: { kind: 'field', type: 'string', summary: 'Phone number, with country code if outside your own country. Optional.' },
    area: { kind: 'field', type: 'string', summary: 'Neighbourhood or area name. Optional.' },
    save: { kind: 'action', summary: 'Saves the profile and continues.' },
  },
  strings,
});
