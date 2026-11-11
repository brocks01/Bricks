import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const eventsIndex = definePage({
  key: 'events.index',
  module: 'events',
  route: '/events',
  tab: 3,
  icon: 'calendar',
  requiresAuth: true,
  summary: 'Coming soon. Nothing is on this page yet.',
  keywords: ['events', 'calendar'],
  elements: {
    heading: { kind: 'text' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
