import { definePage } from '../../../../kit/page';
import { strings } from '../../words';

export const exploreInterests = definePage({
  key: 'explore.interests',
  module: 'explore',
  route: '/explore/interests',
  requiresAuth: true,
  summary: 'My interests: tick the categories to see more of, then save.',
  keywords: ['interests', 'explore', 'preferences'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
    saveInterests: { kind: 'action', summary: 'Save the ticked interests.' },
  },
  strings,
});
