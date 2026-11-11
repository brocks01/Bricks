import { definePage } from '../../../../kit/page';
import { strings } from '../../words';

export const exploreMine = definePage({
  key: 'explore.mine',
  module: 'explore',
  route: '/explore/mine',
  requiresAuth: true,
  summary: 'My exploration: what is in progress, completed and saved, and gentle counts of what the person has explored.',
  keywords: ['explore', 'progress', 'saved', 'completed'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
    inProgress: { kind: 'action', summary: 'Show items in progress.' },
    completed: { kind: 'action', summary: 'Show completed items.' },
    savedTab: { kind: 'action', summary: 'Show saved items.' },
  },
  strings,
});
