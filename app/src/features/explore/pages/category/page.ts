import { definePage } from '../../../../kit/page';
import { strings } from '../../words';

export const exploreCategory = definePage({
  key: 'explore.category',
  module: 'explore',
  route: '/explore/category/[id]',
  params: ['id'],
  requiresAuth: true,
  summary: 'One Explore category with all its items.',
  keywords: ['explore', 'category'],
  elements: { heading: { kind: 'text', summary: 'The name of the category.' } },
  strings,
});
