import { definePage } from '../../../../kit/page';
import { pageStrings } from '../../words';

export const growProgress = definePage({
  key: 'grow.progress',
  module: 'grow',
  route: '/progress',
  requiresAuth: true,
  summary: 'A gentle overview of activity, health readings, aspirations, exploring and contributions. Counts, never scores.',
  keywords: ['grow', 'progress'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
  },
  strings: pageStrings('h_progress'),
});
