import { definePage } from '../../../../kit/page';
import { strings } from '../../strings';

// The fourth bottom tab (after Connect, Grow, Family): what is planned for one person, this week.
// A family member with access can open somebody else's calendar here and plan for them.
export const calendarToday = definePage({
  key: 'calendar.today',
  module: 'calendar',
  route: '/calendar',
  tab: 4,
  icon: 'calendar',
  requiresAuth: true,
  summary: 'The week ahead for one person: medicines, appointments, exercise and events, with done and skipped marks. Add a plan, or open the calendar of a family member I hold access for.',
  keywords: ['calendar', 'today', 'week', 'medicine', 'appointment', 'reminders'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text', summary: 'One sentence on what this calendar holds.' },
    forWho: { kind: 'action', summary: 'Choose whose calendar is shown: me, or a family member I hold access for.' },
    list: { kind: 'list', summary: 'The planned things day by day, each with Done and Skip.' },
    add: { kind: 'action', summary: 'Add a new plan for the chosen person.' },
  },
  strings,
});
