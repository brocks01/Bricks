import { definePage } from '../../kit/page';
import { mergeStrings, pageWords } from '../../i18n/words';
import { DAYS } from './dayWords';
import { ALIASES, W } from './words';

const strings = (headingWord: string) => pageWords(W, { ...ALIASES, heading: headingWord });
const base = { module: 'market', requiresAuth: true } as const;

export const marketIndex = definePage({
  ...base,
  key: 'market.index',
  route: '/market',
  tab: 3,
  icon: 'storefront',
  summary: 'Marketplace: what is happening near you, hosted by Active Ageing Centres, malls and others — market days, volunteering, paid gigs, shows and activities, with a filter for what you want to do there. Paid sessions (services by the hour) live in Wisdom.',
  keywords: ['marketplace', 'market day', 'opportunity', 'event', 'volunteer', 'nearby', 'stall'],
  elements: {
    heading: { kind: 'text' },
  },
  strings: mergeStrings(strings('h_market'), pageWords(DAYS)),
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
  elements: { heading: { kind: 'text', summary: 'The name of the market day.' } },
  strings: pageWords(DAYS, { heading: 'dayHeading' }),
});
