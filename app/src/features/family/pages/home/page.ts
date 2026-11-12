import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// The third tab: always shown (a person with no family sees how to create or join one). Empty state invites
// creating a family (I become its owner) or joining one with a code a family member gave me.
export const familyHome = definePage({
  key: 'family.home',
  module: 'family',
  route: '/family',
  tab: 3,
  icon: 'people',
  requiresAuth: true,
  summary: 'My families: the space where family members help each other set up and look after accounts. Create a family or join one with a code.',
  keywords: ['family', 'families', 'home', 'members', 'help'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text', summary: 'One sentence on what the family space is for.' },
    create: { kind: 'action', summary: 'Create a new family; I become its owner.' },
    join: { kind: 'action', summary: 'Join a family by typing the invitation code a family member gave me.' },
  },
  strings,
});
