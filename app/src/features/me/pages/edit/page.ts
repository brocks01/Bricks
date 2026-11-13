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
    spoken: { kind: 'field', type: 'string', summary: 'Languages the person speaks, as a comma list of codes such as en,hi,bho,bn (23 are allowed: en hi bn ta te mr gu kn ml pa ur or as bho mai ne kok zh yue nan teo ms id).' },
    commLanguage: { kind: 'field', type: 'string', summary: 'The one language code the person prefers to talk in. It must be one of the languages they speak.' },
    save: { kind: 'action', summary: 'Saves the changes.' },
  },
  strings,
});
