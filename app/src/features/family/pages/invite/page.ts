import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const familyInvite = definePage({
  key: 'family.invite',
  module: 'family',
  route: '/family/[id]/invite',
  params: ['id'],
  requiresAuth: true,
  summary: 'Invite a family member to this family by their contact. Owners may invite helpers and members; helpers invite members.',
  keywords: ['family', 'invite', 'contact', 'code'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
    contact: { kind: 'field', type: 'string', required: true, summary: 'The contact of the person being invited: an email address.' },
    role: { kind: 'choice', type: 'string', required: true, options: ['helper', 'member'], summary: 'helper may also invite people and set up accounts; member sees the family space.' },
    send: { kind: 'action', summary: 'Send the invitation.' },
  },
  strings,
});
