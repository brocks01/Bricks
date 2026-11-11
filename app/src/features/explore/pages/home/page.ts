import { definePage } from '../../../../kit/page';
import { strings } from '../../words';

export const exploreHome = definePage({
  key: 'explore.home',
  module: 'explore',
  route: '/explore',
  requiresAuth: true,
  summary: 'Explore home: a search box, six categories, things picked for the person, and what they saved or started.',
  keywords: ['explore', 'discover', 'learn', 'categories', 'search'],
  elements: {
    heading: { kind: 'text', summary: 'The Explore title.' },
    search: { kind: 'field', type: 'string', summary: 'Search guides, practice and stories by a word.' },
    categories: { kind: 'text', summary: 'The six categories to explore.' },
    picked: { kind: 'text', summary: 'Items picked for the person.' },
    continue: { kind: 'text', summary: 'Items the person saved or started.' },
    interests: { kind: 'action', summary: 'Open My interests to choose what to see more of.' },
    mine: { kind: 'action', summary: 'Open My exploration: in progress, completed and saved.' },
  },
  strings,
});
