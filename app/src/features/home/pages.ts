import { definePage } from '../../kit/page';
import { mergeStrings, pageWords } from '../../i18n/words';
import { HOME2 } from './homeWords';
import { ALIASES, W } from './words';

export const homeIndex = definePage({
  key: 'home.index',
  module: 'home',
  route: '/today',
  tab: 0, // the first tab
  icon: 'home',
  requiresAuth: true,
  summary: 'Home: a greeting, the person upcoming events from Communities, the Marketplace and Wisdom (three, then Show all), and a month calendar with a flag on days with something coming up and a trophy on days they showed up; tapping a day shows its events.',
  keywords: ['home', 'today', 'upcoming', 'events', 'calendar', 'month', 'what is on', 'next'],
  elements: {
    heading: { kind: 'text' },
    upcoming: { kind: 'text', summary: 'The title of the list of upcoming events.' },
    showAll: { kind: 'action', summary: 'Show every upcoming event, or fold the list back to three.' },
    openCommunities: { kind: 'action', summary: 'Open the Communities tab (shown when nothing is coming up).' },
    openMarket: { kind: 'action', summary: 'Open the Marketplace tab (shown when nothing is coming up).' },
    retry: { kind: 'action', summary: 'Try loading the upcoming events again.' },
    calendar: { kind: 'text', summary: 'The title of the month calendar.' },
    prevMonth: { kind: 'action', summary: 'Show the month before.' },
    nextMonth: { kind: 'action', summary: 'Show the month after.' },
    day: { kind: 'field', type: 'number', summary: 'A day of the month shown (1 to 31): opens a pop-up with the events of that day.' },
    closeDay: { kind: 'action', summary: 'Close the pop-up of a day.' },
    openHelp: { kind: 'action', summary: 'Open the help page to answer a family member who asked for help.' },
  },
  strings: mergeStrings(
    pageWords(W, ALIASES),
    pageWords(HOME2, { upcoming: 'upcoming_title', showAll: 'show_fewer', openCommunities: 'btn_communities', openMarket: 'btn_marketplace', retry: 'try_again', calendar: 'calendar_title', prevMonth: 'prev_month', nextMonth: 'next_month', day: 'calendar_title', closeDay: 'close' }),
  ),
});
