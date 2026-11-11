import { definePage } from '../../../../kit/page';
import { pageStrings } from '../../words';

export const growActivity = definePage({
  key: 'grow.activity',
  module: 'grow',
  route: '/activity',
  requiresAuth: true,
  summary: 'Activity this week: minutes per day, days in a row, and a form to add a walk, jog, yoga or exercise.',
  keywords: ['grow', 'activity'],
  elements: {
    heading: { kind: 'text', summary: 'The title.' },
    logActivity: { kind: 'action', summary: 'Open the form to add an activity.' },
    saveActivity: { kind: 'action', summary: 'Save the activity.' },
  },
  strings: pageStrings('h_activity'),
});
