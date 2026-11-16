import { definePage } from '../../kit/page';
import { pageWords } from '../../i18n/words';
import { ALIASES, HOST } from './words';

const base = { module: 'host', requiresAuth: true } as const;

/** My host: what the host the person works for has coming up, and the form to add one (their own host only). */
export const hostHome = definePage({
  ...base,
  key: 'host.home',
  route: '/host',
  summary: 'The host the person works for (an Active Ageing Centre, a mall, a community centre): what is coming up with who is going and the stalls left, a form to add an opportunity (title, what it is, where, when, repeat, stalls, link, what a person can do there), and a way to cancel one. Owners, editors and platform admins only; everyone else sees nothing.',
  keywords: ['host', 'centre', 'mall', 'market day', 'add', 'opportunity', 'cancel', 'listing'],
  elements: {
    heading: { kind: 'text' },
    title: { kind: 'field', type: 'string', required: true, summary: 'What the opportunity is called, for example "Saturday market at the centre".' },
    kind: { kind: 'choice', type: 'string', options: ['market_day', 'volunteer', 'gig', 'show', 'activity'], summary: 'What kind it is: a market day, volunteering, a paid gig, a show or an activity.' },
    venue: { kind: 'field', type: 'string', required: true, summary: 'Where it happens: the centre, the mall or the venue name.' },
    address: { kind: 'field', type: 'string', summary: 'The address (optional).' },
    date: { kind: 'field', type: 'string', summary: 'The day it starts, as 2026-11-20.' },
    time: { kind: 'field', type: 'string', summary: 'The start time, as 10:30. Empty means 10:00.' },
    repeat: { kind: 'choice', type: 'string', options: ['none', 'weekly', 'monthly'], summary: 'Once, every week or every month.' },
    stalls: { kind: 'field', type: 'number', summary: 'How many stalls the venue allows (0 to 200).' },
    link: { kind: 'field', type: 'string', summary: "The host's own page for it (optional)." },
    add: { kind: 'action', agent: 'confirm', summary: 'Add the opportunity so people can see it and say they are going. It tells other people, so it needs approval.' },
  },
  strings: pageWords(HOST, ALIASES),
});
