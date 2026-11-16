import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// One family: its members with their roles, and everything the owner or a helper may do here.
// What a person can actually press depends on their own role in this family.
export const familyDetail = definePage({
  key: 'family.detail',
  module: 'family',
  route: '/family/[id]',
  params: ['id'],
  requiresAuth: true,
  summary: 'One family: the members and their roles, invitations, setting up an account for someone who needs help, renaming, and leaving.',
  keywords: ['family', 'members', 'roles', 'invite', 'assisted', 'rename', 'leave'],
  elements: {
    heading: { kind: 'text' },
    invite: { kind: 'action', summary: 'Invite a family member by contact; owners may invite helpers, helpers invite members.' },
    assisted: { kind: 'action', summary: 'Set up a Interchange account for a family member who cannot do it themselves.' },
    rename: { kind: 'action', summary: 'Owners may rename the family.' },
    leave: { kind: 'action', summary: 'Leave this family. The owner cannot leave.' },
  },
  strings,
});
