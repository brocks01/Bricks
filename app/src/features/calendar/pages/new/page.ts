import { definePage } from '../../../../kit/page';
import { strings } from '../../strings';

// The form to add a plan (or to change one, when opened with the plan's values). Medicine always shows
// the words "not medical advice": Interchange reminds at the set time, it never advises on the medicine itself.
export const calendarNew = definePage({
  key: 'calendar.new',
  module: 'calendar',
  route: '/calendar/new',
  requiresAuth: true,
  summary: 'Add a plan: what kind, what, a note, the day and time, how often it repeats, until when, and how long before to remind.',
  keywords: ['add', 'new', 'plan', 'medicine', 'reminder', 'repeat'],
  elements: {
    heading: { kind: 'text' },
    forWho: { kind: 'action', summary: 'Choose who this plan is for: me, or a family member I hold access for.' },
    kind: { kind: 'choice', type: 'string', options: ['medicine', 'appointment', 'exercise', 'event', 'other'], summary: 'Choose the kind: medicine, appointment, exercise, event or other.' },
    title: { kind: 'field', type: 'string', summary: 'What it is, for example blood pressure tablet.' },
    note: { kind: 'field', type: 'string', summary: 'An optional note, for example after breakfast.' },
    date: { kind: 'field', type: 'string', summary: 'The first day, YYYY-MM-DD.' },
    time: { kind: 'field', type: 'string', summary: 'The wall-clock time, HH:MM 24 hour.' },
    repeat: { kind: 'choice', type: 'string', options: ['none', 'daily', 'weekdays', 'weekly'], summary: 'How often: once, every day, Monday to Friday, or chosen days of the week.' },
    someDays: { kind: 'choice', type: 'string', options: ['0', '1', '2', '3', '4', '5', '6'], summary: 'When repeat is chosen days: the days of the week, 0=Monday to 6=Sunday.' },
    until: { kind: 'field', type: 'string', summary: 'The last day, YYYY-MM-DD, or empty for forever.' },
    remind: { kind: 'choice', type: 'string', options: ['0', '15', '30', '60'], summary: 'How long before to remind: on time, 15, 30 or 60 minutes.' },
    clashSave: { kind: 'action', summary: 'Keep the plan as saved, after the clash warning was shown.' },
    save: { kind: 'action', summary: 'Save the plan.' },
    notMedical: { kind: 'text', summary: 'The not-medical-advice note, always shown for medicines.' },
  },
  strings,
});
