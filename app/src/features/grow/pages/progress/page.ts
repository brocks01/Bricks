import { pageWords } from '../../../../i18n/words';
import { definePage } from '../../../../kit/page';
import { WISDOM_TREE } from '../../wisdomWords';

// The Tree of Wisdom (the key and the route are kept from the earlier progress page, so every link to it still works).
export const growProgress = definePage({
  key: 'grow.progress',
  module: 'grow',
  route: '/progress',
  requiresAuth: true,
  summary: 'Tree of Wisdom: the person own tree, which starts as bare branches and grows one leaf for every event they showed up to (a community gathering, a market day, a Wisdom session), the number of leaves, and the history of those events, newest first.',
  keywords: ['tree', 'wisdom', 'leaves', 'leaf', 'history', 'events', 'showed up', 'progress'],
  elements: {
    heading: { kind: 'text', summary: 'The title: Tree of Wisdom.' },
    count: { kind: 'text', summary: 'How many leaves the tree has: one for every event the person showed up to.' },
    history: { kind: 'text', summary: 'The title of the list of events behind the leaves, newest first.' },
    showMore: { kind: 'action', summary: 'Show the next page of the history.' },
    retry: { kind: 'action', summary: 'Try loading the tree again after it could not be loaded.' },
  },
  strings: pageWords(WISDOM_TREE, { heading: 'title', count: 'every', showMore: 'show_more', retry: 'try_again' }),
});
