import { definePage } from '../../kit/page';
import { pageWords } from '../../i18n/words';
import { ALIASES, W } from './words';

export const homeIndex = definePage({
  key: 'home.index',
  module: 'home',
  route: '/today',
  requiresAuth: true,
  summary: 'Home: a greeting, the next thing to do (highlighted, with how much free time there is before it), the whole day with booked and free windows, the daily check-in, this week at a glance, and links to the calendar, reminders and family.',
  keywords: ['home', 'today', 'calendar', 'reminder', 'schedule', 'plan', 'next', 'free time', 'alarm'],
  elements: {
    heading: { kind: 'text' },
    markDone: { kind: 'action', summary: 'Mark the highlighted next thing as done.' },
    markSkip: { kind: 'action', summary: 'Skip the highlighted next thing.' },
    checkinYes: { kind: 'action', summary: 'Answer yes to "did you move today?".' },
    checkinNo: { kind: 'action', summary: 'Answer no to "did you move today?".' },
    goYes: { kind: 'action', summary: 'Say "I am going" to the next gathering shown on the card.' },
    goNo: { kind: 'action', summary: 'Say "not this time" to the next gathering shown on the card.' },
    changeAnswer: { kind: 'action', summary: 'Change the answer to the next gathering.' },
    openCalendar: { kind: 'action', summary: 'Open the full calendar.' },
    addReminder: { kind: 'action', summary: 'Open the form to add a reminder.' },
    openFamily: { kind: 'action', summary: 'Open the family page.' },
    openHelp: { kind: 'action', summary: 'Open the help page to answer a family member who asked for help.' },
    openCommunities: { kind: 'action', summary: 'Open the Community tab.' },
    openMarket: { kind: 'action', summary: 'Open the Marketplace tab.' },
  },
  strings: pageWords(W, ALIASES),
});
