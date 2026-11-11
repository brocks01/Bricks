import { definePage } from '../../../../kit/page';
import { strings } from '../../words';

export const exploreHome = definePage({
  key: 'explore.home',
  module: 'explore',
  route: '/explore',
  requiresAuth: true,
  summary: 'Explore home: a banner and six categories to open.',
  keywords: ['explore', 'discover', 'learn', 'categories', 'search'],
  elements: {
    heading: { kind: 'text', summary: 'The Explore title.' },
    categories: { kind: 'text', summary: 'The six categories to explore.' },
    interests: { kind: 'action', summary: 'Open My interests to choose what to see more of.' },
    mine: { kind: 'action', summary: 'Open My exploration: in progress, completed and saved.' },
  },
  strings,
});
