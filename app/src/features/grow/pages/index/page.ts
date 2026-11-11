import { definePage } from '../../../../kit/page';
import { strings } from './strings';

export const growIndex = definePage({
  key: 'grow.index',
  module: 'grow',
  route: '/grow',
  tab: 2,
  icon: 'heart',
  requiresAuth: true,
  summary: 'Your personal goals, health and learning. Coming soon.',
  keywords: ['goals', 'health', 'wellbeing', 'learning', 'personal'],
  elements: {
    heading: { kind: 'text' },
    soon: { kind: 'text', summary: 'A note that this part is coming soon.' },
  },
  strings,
});
