import { definePage } from '../../../../kit/page';
import { strings } from '../../strings';

// Reminder calls: the person's own standing yes (phone, language, allowed hours). A helper may record
// it for someone else only when the person is present and says yes (the person_present tick). Only
// the person themselves can stop the calls. The consent is a promise to call - the voice layer still
// refuses any number not on the allowed list.
export const calendarCalls = definePage({
  key: 'calendar.calls',
  module: 'calendar',
  route: '/calendar/calls',
  requiresAuth: true,
  summary: 'Reminder calls for one person: see whether calls are agreed, set the phone number, language and allowed hours, or stop the calls. A helper may record the yes only when the person is present.',
  keywords: ['calls', 'reminders', 'phone', 'consent', 'stop calling'],
  elements: {
    heading: { kind: 'text' },
    intro: { kind: 'text', summary: 'One sentence on what reminder calls do.' },
    callsPhone: { kind: 'field', type: 'string', summary: 'The phone number to call, in international form (for example +6591234567).' },
    callsLanguage: { kind: 'choice', type: 'string', options: ['en', 'hi', 'bn', 'ta', 'zh', 'ms'], summary: 'The language to speak on the call.' },
    callsWindowFrom: { kind: 'field', type: 'string', summary: 'The earliest hour calls are allowed, HH:MM in the person\'s own time.' },
    callsWindowTo: { kind: 'field', type: 'string', summary: 'The latest hour calls are allowed, HH:MM in the person\'s own time.' },
    callsPersonPresent: { kind: 'choice', type: 'string', options: ['no', 'yes'], summary: 'When recording for someone else: the person is here with me and said yes.' },
    callsAgree: { kind: 'action', summary: 'Save the yes to reminder calls.' },
    callsStop: { kind: 'action', agent: 'confirm', summary: 'Stop reminder calls for this person. Only the person themselves can do this; it needs the person to approve.' },
  },
  strings,
});
