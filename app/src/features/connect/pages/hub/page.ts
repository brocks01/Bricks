import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const connectHub = definePage({
  key: 'connect.hub',
  module: 'connect',
  route: '/connect',
  requiresAuth: true,
  summary: 'The Connect hub: the kinds of things a community can do together. Every tile is Coming soon for now.',
  keywords: ['community', 'activities', 'events', 'clubs', 'competitions', 'training', 'services', 'jobs', 'governance'],
  elements: {
    heading: { kind: 'text' },
    subtitle: { kind: 'text' },
    communities: { kind: 'action', summary: 'Communities. Coming soon.' },
    events: { kind: 'action', summary: 'Events. Coming soon.' },
    clubs: { kind: 'action', summary: 'Clubs & Groups. Coming soon.' },
    competitions: { kind: 'action', summary: 'Competitions. Coming soon.' },
    training: { kind: 'action', summary: 'Training & Workshops. Coming soon.' },
    services: { kind: 'action', summary: 'Services. Coming soon.' },
    opportunities: { kind: 'action', summary: 'Opportunities (Jobs & Work). Coming soon.' },
    contributions: { kind: 'action', summary: 'Contributions & Earnings. Coming soon.' },
    governance: { kind: 'action', summary: 'Governance & Roles. Coming soon.' },
  },
  strings,
});
