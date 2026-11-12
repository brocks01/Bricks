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
    kindOf: { kind: 'choice', type: 'string', options: ['time', 'skill', 'goods', 'money'], summary: 'The kind of contribution.' },
    whatDid: { kind: 'field', type: 'string', summary: 'What the person did.' },
    hoursOpt: { kind: 'field', type: 'string', summary: 'How many hours, as a number (optional).' },
    saveContribution: { kind: 'action', summary: 'Save the contribution.' },
  },
  strings: pageStrings('h_contributions'),
});
