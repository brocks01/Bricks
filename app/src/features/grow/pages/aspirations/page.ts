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
    saveAsp: { kind: 'action', summary: 'Save the new aspiration.' },
  },
  strings: pageStrings('h_aspirations'),
});
