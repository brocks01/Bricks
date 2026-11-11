import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const homeIndex = definePage({
  key: 'home.index',
  module: 'home',
  route: '/',
  tab: 1,
  icon: 'home',
  requiresAuth: true,
  summary: 'Coming soon. Nothing is on this page yet.',
  keywords: ['start', 'main'],
  elements: {
    heading: { kind: 'text' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
