import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const goalsIndex = definePage({
  key: 'goals.index',
  module: 'goals',
  route: '/goals',
  tab: 4,
  icon: 'heart',
  requiresAuth: true,
  summary: 'Coming soon. Nothing is on this page yet.',
  keywords: ['goals', 'targets'],
  elements: {
    heading: { kind: 'text' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
