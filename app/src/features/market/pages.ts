import { definePage } from '../../kit/page';
import { mergeStrings, pageWords } from '../../i18n/words';
import { DAYS } from './dayWords';
import { HOME_M } from './marketHomeWords';
import { MKT } from './revampWords';
import { ALIASES, W } from './words';

const strings = (headingWord: string) => pageWords(W, { ...ALIASES, heading: headingWord });
const base = { module: 'market', requiresAuth: true } as const;

export const marketIndex = definePage({
  ...base,
  key: 'market.index',
  route: '/market',
  tab: 2, // third in the bar: after Communities (1), before Wisdom (3)
  icon: 'storefront',
  summary: 'Marketplace: events near you. A search bar; "Your market days" (the ones you said you are going to, and after the day "Did you go?" with I went or I did not go); then "Recommended for you", grouped by day and ranked by your interests and how near they are, with a filter for what you want to do there. Paid sessions (services by the hour) live in Wisdom.',
  keywords: ['marketplace', 'market day', 'opportunity', 'event', 'volunteer', 'nearby', 'stall', 'search', 'i went', 'recommended'],
  elements: {
    heading: { kind: 'text' },
    search: { kind: 'field', type: 'string', summary: 'Words to search the events for: a title, a venue, an area or a host.' },
    clearSearch: { kind: 'action', summary: 'Clear the search and show every recommended event again.' },
    intent: { kind: 'choice', type: 'string', options: ['all', 'earn', 'contribute', 'volunteer', 'enjoy'], summary: 'What the person wants to do there: earn, contribute, volunteer or enjoy (or all).' },
    yourDays: { kind: 'text', summary: 'The title of the list of market days the person said they are going to.' },
    recommended: { kind: 'text', summary: 'The title of the list of events recommended for the person.' },
    retry: { kind: 'action', summary: 'Try loading the Marketplace again.' },
    myHost: { kind: 'action', summary: 'Open the area of the host the person works on (only for host members).' },
  },
  strings: mergeStrings(mergeStrings(mergeStrings(strings('h_market'), pageWords(DAYS)), pageWords(HOME_M)), pageWords(MKT, { clearSearch: 'clear', intent: 'interests_label', yourDays: 'your_days', retry: 'try_again' })),
});

// The earlier, longer Marketplace screen (every opportunity nearby, with filters) stays reachable from the bottom of the simple one: nothing is removed.
export const marketMore = definePage({
  ...base,
  key: 'market.more',
  route: '/market/more',
  summary: 'More to do nearby: market days, volunteering, paid gigs, shows and activities hosted by Active Ageing Centres, malls and others, with filters.',
  keywords: ['marketplace', 'opportunity', 'volunteer', 'gig', 'show', 'nearby', 'more'],
  elements: marketIndex.elements,
  strings: marketIndex.strings,
});

export const marketStall = definePage({
  ...base,
  key: 'market.stall',
  route: '/market/stall/[id]',
  params: ['id'],
  summary: 'The stalls at a market day: who is selling what, and a form for a senior to reserve a stall with a helper.',
  keywords: ['stall', 'market day', 'sell', 'helper', 'volunteer'],
  elements: {
    heading: { kind: 'text' },
    selling: { kind: 'field', type: 'string', summary: 'What the person will sell.' },
    helper: { kind: 'field', type: 'string', summary: 'The name of a helper or volunteer who comes with them (optional).' },
    reserve: { kind: 'action', agent: 'confirm', summary: 'Reserve the stall. Needs approval.' },
    giveUp: { kind: 'action', agent: 'confirm', summary: 'Give up the reserved stall.' },
  },
  strings: strings('h_stall'),
});

export const marketDay = definePage({
  ...base,
  key: 'market.day',
  route: '/market/day/[id]',
  params: ['id'],
  summary: 'One market day at an Active Ageing Centre, a mall or a community centre: when and where, how many are going, the stalls, a button to say you are going and a form to take a stall (people aged 60 and over). It may repeat every week or month.',
  keywords: ['market day', 'stall', 'sell', 'going', 'mall', 'centre'],
  elements: {
    heading: { kind: 'text', summary: 'The name of the market day.' },
    went: { kind: 'action', agent: 'confirm', summary: 'After the day: say "I went". It grows a leaf on the Tree of Wisdom. Needs approval.' },
    didntGo: { kind: 'action', agent: 'confirm', summary: 'After the day: say "I did not go". Needs approval.' },
    change: { kind: 'action', summary: 'Show the two answers again, to change "I went" or "I did not go".' },
  },
  strings: mergeStrings(pageWords(DAYS, { heading: 'dayHeading' }), pageWords(MKT, { went: 'i_went', didntGo: 'i_didnt' })),
});
