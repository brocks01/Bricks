import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const connectIndex = definePage({
  key: 'connect.index',
  module: 'connect',
  route: '/',
  tab: 1,
  icon: 'people',
  requiresAuth: true,
  summary: 'Connect: your community and everything happening in it. Shows a greeting and, until you belong to a community, a card to join or create one.',
  keywords: ['community', 'activities', 'events', 'people', 'home', 'join', 'create'],
  elements: {
    heading: { kind: 'text', summary: "A greeting with the person's first name." },
    noCommunity: { kind: 'text', summary: 'Says the person is not in a community yet.' },
    join: { kind: 'action', summary: 'Join a community with an invite code. Coming soon.' },
    create: { kind: 'action', summary: 'Create a community. Coming soon.' },
    yourCommunities: { kind: 'text', summary: 'The title above the list of communities the person belongs to.' },
  },
  strings,
});
