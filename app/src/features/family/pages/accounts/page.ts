import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// "My Bricks accounts": my own account plus the accounts of the family members I help.
// Switching here decides whose account the WHOLE app works on (the on-behalf header).
export const familyAccounts = definePage({
  key: 'family.accounts',
  module: 'family',
  route: '/accounts',
  requiresAuth: true,
  summary: 'My Bricks accounts: switch between my own account and the accounts of family members I help, see who has access to my account and at what level, and end access.',
  keywords: ['accounts', 'switch', 'delegation', 'access', 'on behalf'],
  elements: {
    heading: { kind: 'text' },
    acting: { kind: 'text', summary: 'Shown when the app is currently acting on behalf of a family member.' },
    backToMe: { kind: 'action', summary: 'Go back to acting as myself.' },
    helpers: { kind: 'text', summary: 'The heading of the list of accounts I help with.' },
    access: { kind: 'text', summary: 'The heading of the list of people who have access to my account.' },
    history: { kind: 'action', summary: 'Open the record of everything that was done in my name.' },
  },
  strings,
});
