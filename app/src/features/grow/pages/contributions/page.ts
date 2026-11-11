import { definePage } from '../../../../kit/page';
import { pageStrings } from '../../words';

export const growContributions = definePage({
  key: 'grow.contributions',
  module: 'grow',
  route: '/contributions',
  requiresAuth: true,
  summary: 'What the person has given to their communities, with a form to add a contribution.',
  keywords: ['grow', 'contributions'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
    log: { kind: 'action', summary: 'Open the form to add a contribution.' },
    saveContribution: { kind: 'action', summary: 'Save the contribution.' },
  },
  strings: pageStrings('h_contributions'),
});
