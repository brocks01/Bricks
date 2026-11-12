import { definePage } from '../../../../kit/page';
import { pageStrings } from '../../words';

export const growAspirations = definePage({
  key: 'grow.aspirations',
  module: 'grow',
  route: '/aspirations',
  requiresAuth: true,
  summary: 'Your aspirations: things the person would like to do, with the option to add one and to mark one done.',
  keywords: ['grow', 'aspirations'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
    add: { kind: 'action', summary: 'Open the form to add an aspiration.' },
    addTitle: { kind: 'field', type: 'string', summary: 'What the person would like to do (open the form with add first).' },
    kindOf: { kind: 'choice', type: 'string', options: ['travel', 'hobby', 'health', 'family', 'own'], summary: 'The kind of aspiration.' },
    saveAsp: { kind: 'action', summary: 'Save the new aspiration.' },
  },
  strings: pageStrings('h_aspirations'),
});
