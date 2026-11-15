import { definePage } from '../../kit/page';
import { pageWords } from '../../i18n/words';
import { ALIASES, W } from './words';

const strings = (headingWord: string) => pageWords(W, { ...ALIASES, heading: headingWord });
const base = { module: 'market', requiresAuth: true } as const;

export const marketIndex = definePage({
  ...base,
  key: 'market.index',
  route: '/market',
  summary: 'Marketplace: skills and experience that people near you offer (crafts, cooking, teaching, repair, music, advice...). Search, filter by kind, offer your own service, or open your bookings.',
  keywords: ['marketplace', 'services', 'skills', 'hire', 'book', 'sell', 'offer', 'experience'],
  elements: {
    heading: { kind: 'text' },
    search: { kind: 'field', type: 'string', summary: 'Type to search services by words in the title, description or area.' },
    category: { kind: 'choice', type: 'string', options: ['all', 'crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other'], summary: 'Filter by kind of service.' },
    offer: { kind: 'action', summary: 'Open the form to offer a service of your own.' },
    mine: { kind: 'action', summary: 'Open your services and bookings.' },
  },
  strings: strings('h_market'),
});

export const marketOffer = definePage({
  ...base,
  key: 'market.offer',
  route: '/market/offer',
  summary: 'A form to offer a service: what it is, the kind, how complex, years of experience, proof of work, the price per hour (or free) and the area. Shows a draft pay guide.',
  keywords: ['offer', 'service', 'list', 'price', 'experience', 'proof'],
  elements: {
    heading: { kind: 'text' },
    title: { kind: 'field', type: 'string', required: true, summary: 'What the person offers, for example "Kueh making lesson".' },
    category: { kind: 'choice', type: 'string', options: ['crafts', 'cooking', 'teaching', 'repair', 'music', 'wellness', 'advice', 'storytelling', 'other'], summary: 'The kind of service.' },
    tier: { kind: 'choice', type: 'string', options: ['basic', 'skilled', 'expert'], summary: 'How complex the work is: basic, skilled or expert.' },
    years: { kind: 'field', type: 'number', summary: 'Years of experience.' },
    description: { kind: 'field', type: 'string', summary: 'A few words about the service.' },
    proof: { kind: 'field', type: 'string', summary: 'Proof of work in their own words: where they worked, what they made, how long.' },
    rate: { kind: 'field', type: 'number', summary: 'Price per hour in Singapore dollars; empty means free.' },
    area: { kind: 'field', type: 'string', summary: 'The area where they offer it.' },
    publish: { kind: 'action', agent: 'confirm', summary: 'Publish the service so others can book it. Needs approval.' },
  },
  strings: strings('h_offer'),
});

export const marketListing = definePage({
  ...base,
  key: 'market.listing',
  route: '/market/listing/[id]',
  params: ['id'],
  summary: 'One service: who offers it, their experience and proof, what people say, and a form to book it (for yourself or, as a community leader, for your community).',
  keywords: ['service', 'book', 'hire', 'endorse', 'thank'],
  elements: {
    heading: { kind: 'text' },
    date: { kind: 'field', type: 'string', summary: 'The day to book, as 2026-11-20.' },
    time: { kind: 'field', type: 'string', summary: 'The start time, as 10:30.' },
    hours: { kind: 'field', type: 'number', summary: 'How many hours.' },
    note: { kind: 'field', type: 'string', summary: 'A note for the provider.' },
    forWhom: { kind: 'field', type: 'string', summary: 'Who it is for: "me", or the id of a community the person leads.' },
    sendRequest: { kind: 'action', agent: 'confirm', summary: 'Send the booking request. Needs approval.' },
    endorseNote: { kind: 'field', type: 'string', summary: 'A few kind words for the provider.' },
    endorse: { kind: 'action', summary: 'Say thank you to the provider (only after the service happened).' },
    pause: { kind: 'action', agent: 'confirm', summary: 'Pause or show again the person\'s own service.' },
    removeListing: { kind: 'action', agent: 'confirm', summary: 'Remove the person\'s own service.' },
  },
  strings: strings('h_listing'),
});

export const marketMine = definePage({
  ...base,
  key: 'market.mine',
  route: '/market/mine',
  summary: 'The person\'s own services, the booking requests waiting for their answer, and the services they booked.',
  keywords: ['bookings', 'requests', 'my services', 'accept', 'decline'],
  elements: { heading: { kind: 'text' } },
  strings: strings('h_mine'),
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
