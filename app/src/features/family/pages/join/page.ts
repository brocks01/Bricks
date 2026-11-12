import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const familyJoin = definePage({
  key: 'family.join',
  module: 'family',
  route: '/family/join',
  requiresAuth: true,
  summary: 'Join a family by typing the 6-digit invitation code a family member gave me.',
  keywords: ['family', 'join', 'code', 'invitation'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
    code: { kind: 'field', type: 'string', required: true, summary: 'The 6-digit invitation code.' },
    join: { kind: 'action', summary: 'Accept the invitation and open the family.' },
  },
  strings,
});
