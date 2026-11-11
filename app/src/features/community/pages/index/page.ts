import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const communityIndex = definePage({
  key: 'community.index',
  module: 'community',
  route: '/community',
  tab: 2,
  icon: 'people',
  requiresAuth: true,
  summary: 'Coming soon. Nothing is on this page yet.',
  keywords: ['community', 'neighbourhood'],
  elements: {
    heading: { kind: 'text' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
