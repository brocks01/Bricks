import { definePage } from '../../../../kit/page';
import { strings } from '../../strings';

// One saved plan: when it happens, how often, who added it, and the marks on its times this week.
// Change reopens the form with the plan's values; cancelling keeps the record but stops every future day.
export const calendarItem = definePage({
  key: 'calendar.item',
  module: 'calendar',
  route: '/calendar/item/[id]',
  params: ['id'],
  requiresAuth: true,
  summary: 'One plan in full: what, when, how often it repeats, until when, who added it, and the marks on its times this week. Change or cancel it.',
  keywords: ['plan', 'detail', 'change', 'cancel', 'medicine'],
  elements: {
    heading: { kind: 'text' },
    when: { kind: 'text', summary: 'When it happens and how often it repeats.' },
    note: { kind: 'text', summary: 'The note on the plan.' },
    addedBy: { kind: 'text', summary: 'Who added this plan.' },
    times: { kind: 'list', summary: 'The times this week with their marks.' },
    change: { kind: 'action', summary: 'Change the plan: what, when, how often, until when.' },
    cancelPlan: { kind: 'action', summary: 'Cancel the plan; every future day stops.' },
  },
  strings,
});
