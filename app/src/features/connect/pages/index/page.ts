import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const connectIndex = definePage({
  key: 'connect.index',
  module: 'connect',
  route: '/',
  tab: 1,
  icon: 'people',
  requiresAuth: true,
  summary: 'Your community and everything happening in it. Coming soon.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  elements: {
    heading: { kind: 'text' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
