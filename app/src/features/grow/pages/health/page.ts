import { definePage } from '../../../../kit/page';
import { pageStrings } from '../../words';

export const growHealth = definePage({
  key: 'grow.health',
  module: 'grow',
  route: '/health-records',
  requiresAuth: true,
  summary: 'The person\'s own health records: latest heart rate, sleep, weight and blood pressure, with a form to add a reading. Not medical advice.',
  keywords: ['grow', 'health'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
    addReading: { kind: 'action', summary: 'Open the form to add a reading.' },
    saveReading: { kind: 'action', summary: 'Save the reading.' },
    overview: { kind: 'action', summary: 'Show the overview.' },
    records: { kind: 'action', summary: 'Show the records.' },
  },
  strings: pageStrings('h_health'),
});
