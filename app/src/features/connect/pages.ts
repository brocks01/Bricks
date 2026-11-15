import { definePage } from '../../kit/page';
import { mergeStrings, pageWords } from '../../i18n/words';
import { EXPLORE_ALIASES, R, REQUEST_ALIASES, REVIEW_ALIASES } from './rulesWords';
import { strings } from './startStrings';
import { L } from '../lead/leadWords';

// Join a community with an invite code, explore the others, or ask to start one. Reached from the Community tab.
const base = { module: 'connect', requiresAuth: true } as const;

export const connectJoin = definePage({
  ...base,
  key: 'connect.join',
  route: '/join-community',
  strings: mergeStrings(strings, pageWords(R, { goCreate: 'ask_start' })),
  summary: 'Join a community by typing the invite code a community leader gave you; or choose to ask to start a community of your own. A person can be in three communities at most.',
  keywords: ['join', 'community', 'invite code', 'code'],
  elements: {
    code: { kind: 'field', type: 'string', required: true, summary: 'The invite code, for example ABCD-2345.' },
    joinButton: { kind: 'action', agent: 'confirm', summary: 'Join the community with the code. Refused when the person is already in three communities.' },
    goCreate: { kind: 'action', summary: 'Open the form to ask the Bricks team to start a new community.' },
  },
});

export const connectCreate = definePage({
  ...base,
  key: 'connect.create',
  route: '/create-community',
  strings: mergeStrings(strings, pageWords(R, REQUEST_ALIASES)),
  summary: 'Ask to start a new community. Only people with some experience (a while in a community and a few events) can ask, and the Bricks team approves each one. Once approved, the person creates it here and becomes its Community Lead.',
  keywords: ['create', 'community', 'start', 'new', 'request', 'approve'],
  elements: {
    name: { kind: 'field', type: 'string', required: true, summary: 'The name of the community.' },
    kind: { kind: 'choice', type: 'string', options: ['apartment', 'block', 'neighbourhood', 'club', 'other'], summary: 'What kind of community it is.' },
    area: { kind: 'field', type: 'string', summary: 'The area or address it covers.' },
    about: { kind: 'field', type: 'string', summary: 'What the people will do together.' },
    why: { kind: 'field', type: 'string', summary: 'Why it would thrive and who would come.' },
    createButton: { kind: 'action', agent: 'confirm', summary: 'Send the request to the Bricks team. Needs approval.' },
    reviewLink: { kind: 'action', summary: 'For the Bricks team only: open the list of requests waiting for a decision.' },
  },
});

export const connectExplore = definePage({
  ...base,
  key: 'connect.explore',
  route: '/explore-communities',
  strings: pageWords(R, EXPLORE_ALIASES),
  summary: 'Look at every community: search, see how many people are in each and which of the person\'s family are there, and join an open one. A person can be in three at most; to join a fourth they must leave one first.',
  keywords: ['explore', 'communities', 'search', 'join', 'leave', 'family', 'find'],
  elements: {
    heading: { kind: 'text' },
    search: { kind: 'field', type: 'string', summary: 'Type to search communities by name, area or description.' },
  },
});

export const connectReview = definePage({
  ...base,
  key: 'connect.review',
  route: '/review-communities',
  strings: pageWords(R, REVIEW_ALIASES),
  summary: 'For the Bricks team only: requests to start a community, each with who asked and why, to approve or decline.',
  keywords: ['review', 'approve', 'requests', 'communities'],
  elements: { heading: { kind: 'text' } },
});

export const connectPick = definePage({
  ...base,
  key: 'connect.pick',
  route: '/choose-places',
  strings: pageWords(L, { heading: 'pick_title', pickContinue: 'pick_go' }),
  summary: 'First run: choose up to three communities to join, each with a picture, then continue. A person can be in three communities at most and can change this later.',
  keywords: ['choose', 'places', 'paths', 'first', 'join', 'welcome', 'start'],
  elements: {
    heading: { kind: 'text' },
    pickContinue: { kind: 'action', agent: 'confirm', summary: 'Join the chosen communities and go to Today.' },
  },
});
