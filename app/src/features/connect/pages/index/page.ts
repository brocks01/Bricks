import { definePage } from '../../../../kit/page';
import { mergeStrings, pageWords } from '../../../../i18n/words';
import { INDEX_EXTRA_ALIASES, R } from '../../rulesWords';
import { HOME_C } from '../../homeWords';
import { strings } from './strings';
import { RV } from '../../revampWords';

// The Connect dashboard is an ENTRY POINT to the person's communities and nothing else (scope locked by the owner, 12 Nov 2026).
// Members, events, roles, resources, governance and management all live INSIDE a community, never here.
export const connectIndex = definePage({
  key: 'connect.index',
  module: 'connect',
  route: '/communities',
  tab: 1,
  icon: 'people',
  requiresAuth: true,
  summary: 'Communities: a search bar, your own communities (at most three) with their next gathering and a WhatsApp group, and the communities picked for you by what you enjoy and how near they are, each with Join and See events.',
  keywords: ['community', 'communities', 'join', 'create', 'find', 'events', 'coming up'],
  elements: {
    heading: { kind: 'text' },
    search: { kind: 'field', type: 'string', summary: 'Search communities by name, area or what they do. The results replace the lists below.' },
    intro: { kind: 'text' },
    mine: { kind: 'text', summary: 'The title of the list of communities the person belongs to.' },
    noCommunity: { kind: 'text', summary: 'Says the person is not in a community yet.' },
    joinOrCreate: { kind: 'action', summary: 'Open the page to join a community with an invite code.' },
    explore: { kind: 'action', summary: 'Open the page that lists every community, to search and join an open one.' },
    limitInfo: { kind: 'text', summary: 'How many of the three community places the person uses.' },
    askStart: { kind: 'action', summary: 'Open the form to ask the Interchange team to start a new community.' },
    comingUp: { kind: 'text', summary: 'The next few events across all the communities the person belongs to.' },
  },
  strings: mergeStrings(mergeStrings(mergeStrings(strings, pageWords(R, INDEX_EXTRA_ALIASES)), pageWords(HOME_C)), pageWords(RV, { search: 'search' })),
});

// The earlier, longer Communities screen (limits, invite code, every place to find a group) stays reachable from the bottom of the simple one: nothing is removed.
export const connectMore = definePage({
  key: 'connect.more',
  module: 'connect',
  route: '/communities-more',
  requiresAuth: true,
  summary: 'More ways to find and manage communities: join with an invite code, explore every community, ask the Interchange team to start one, and the next events across all your communities.',
  keywords: ['community', 'communities', 'join', 'invite code', 'explore', 'more'],
  elements: connectIndex.elements,
  strings: connectIndex.strings,
});
