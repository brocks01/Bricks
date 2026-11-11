import { definePage } from '../../../../kit/page';
import { strings } from '../../words';

export const exploreItem = definePage({
  key: 'explore.item',
  module: 'explore',
  route: '/explore/item/[id]',
  params: ['id'],
  requiresAuth: true,
  summary: 'One guide, practice, story or activity: what you will learn and the steps, with Start, Next step, Save and Finish.',
  keywords: ['explore', 'guide', 'practice', 'story', 'learn'],
  elements: {
    heading: { kind: 'text', summary: 'The title of the item.' },
    start: { kind: 'action', summary: 'Start the item, or continue where the person stopped.' },
    next: { kind: 'action', summary: 'Go to the next step. On the last step it finishes the item.' },
    save: { kind: 'action', summary: 'Save the item to come back to it, or remove it from saved.' },
  },
  strings,
});
