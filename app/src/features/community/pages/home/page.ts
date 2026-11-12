import { definePage } from '../../../../kit/page';
import { strings } from './strings';

// Community Home, as in ui-samples/10-community-screens.webp (screen 1). Events, Activities, People and Initiatives open their own screens (features/community/screens).
export const communityHome = definePage({
  key: 'community.home',
  module: 'community',
  route: '/community/[id]',
  params: ['id'],
  requiresAuth: true,
  summary: 'The home of one community: its name and members, four areas (events, activities, people, initiatives), what is happening and the latest updates.',
  keywords: ['community', 'home', 'updates', 'happening'],
  elements: {
    heading: { kind: 'text', summary: 'The name of the community.' },
    events: { kind: 'action', summary: 'Open the events of this community.' },
    activities: { kind: 'action', summary: 'Open the activities of this community.' },
    people: { kind: 'action', summary: 'Open the people of this community.' },
    initiatives: { kind: 'action', summary: 'Open the initiatives of this community.' },
    happening: { kind: 'text', summary: 'The next events and activities in this community.' },
    updates: { kind: 'text', summary: 'The latest updates posted in this community.' },
  },
  strings,
});
