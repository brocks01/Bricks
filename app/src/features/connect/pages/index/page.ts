import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// The Connect dashboard is an ENTRY POINT to the person's communities and nothing else (scope locked by the owner, 12 Nov 2026).
// Members, events, roles, resources, governance and management all live INSIDE a community, never here.
export const connectIndex = definePage({
  key: 'connect.index',
  module: 'connect',
  route: '/communities',
  tab: 2,
  icon: 'people',
  requiresAuth: true,
  summary: 'Connect: find and open your communities, join or create one, and see the next few events across them.',
  keywords: ['community', 'communities', 'join', 'create', 'find', 'events', 'coming up'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text' },
    find: { kind: 'field', type: 'string', summary: 'Type to find one of your communities by name.' },
    mine: { kind: 'text', summary: 'The title of the list of communities the person belongs to.' },
    noCommunity: { kind: 'text', summary: 'Says the person is not in a community yet.' },
    joinOrCreate: { kind: 'action', summary: 'The one entry point to join a community with an invite code or create a new one.' },
    filter: { kind: 'action', summary: 'Filter and sort the list of communities. Coming soon.' },
    comingUp: { kind: 'text', summary: 'The next few events across all the communities the person belongs to.' },
  },
  strings,
});
