import { RV } from '../../../connect/revampWords';
import { definePage } from '../../../../kit/page';
import { mergeStrings, pageWords } from '../../../../i18n/words';
import { EXTRA } from '../../extraWords';
import { strings } from './strings';

// Community Home, as in ui-samples/10-community-screens.webp (screen 1). Events, Activities, People and Initiatives open their own screens (features/community/screens).
// The belonging parts (our days, who is away, taking part from afar, our stories) say their words in EXTRA, like the other community pages.
export const communityHome = definePage({
  key: 'community.home',
  module: 'community',
  route: '/community/[id]',
  params: ['id'],
  requiresAuth: true,
  summary: 'The home of one community: its name and members, four areas (events, activities, people, initiatives), the days it keeps, who is away, what has been sent for a day, the circle\'s stories, what is happening and the latest updates.',
  keywords: ['community', 'home', 'updates', 'happening', 'days', 'away', 'blessing', 'stories'],
  elements: {
    heading: { kind: 'text', summary: 'The name of the community.' },
    events: { kind: 'action', summary: 'Open the events of this community.' },
    activities: { kind: 'action', summary: 'Open the activities of this community.' },
    people: { kind: 'action', summary: 'Open the people of this community.' },
    initiatives: { kind: 'action', summary: 'Open the initiatives of this community.' },
    happening: { kind: 'text', summary: 'The next events and activities in this community.' },
    updates: { kind: 'text', summary: 'The latest updates posted in this community.' },
    join: { kind: 'action', agent: 'confirm', summary: 'Join this community (a person can be in three at most).' },
    whatsapp: { kind: 'action', summary: "Open this community's WhatsApp group (members only, when the leader has saved a link)." },
    more: { kind: 'action', summary: 'More: share the invite, report the group, or leave it.' },
    leave: { kind: 'action', agent: 'confirm', summary: 'Leave this community. Asks first.' },
    comingUp: { kind: 'text', summary: 'The gatherings of this community, upcoming or past, each with I am going or I am here.' },
  },
  strings: mergeStrings(mergeStrings(strings, pageWords(EXTRA)), pageWords(RV, { join: 'join', whatsapp: 'whatsapp', more: 'more', leave: 'leave', comingUp: 'coming_up' })),
});
