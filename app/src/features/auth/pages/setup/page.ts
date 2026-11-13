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
    spoken: { kind: 'field', type: 'string', summary: 'Languages the person speaks, as a comma list of codes such as en,hi,bho,bn (23 are allowed: en hi bn ta te mr gu kn ml pa ur or as bho mai ne kok zh yue nan teo ms id).' },
    commLanguage: { kind: 'field', type: 'string', summary: 'The one language code the person prefers to talk in. It must be one of the languages they speak.' },
    save: { kind: 'action', summary: 'Saves the profile and continues.' },
  },
  strings,
});
