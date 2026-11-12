import { defineModule } from '../../navigation/registry';
import { communityHome } from './pages/home/page';
import {
  communityActivities, communityCategory, communityEvent, communityEvents, communityInitiative, communityInitiatives, communityInvite,
  communityNewEvent, communityNewInitiative, communityPeople, communityUpdate,
} from './pages';

defineModule({
  id: 'community',
  title: 'Community',
  summary: 'One community the person belongs to: its home, events, activities, people, invitations, initiatives, and updates with comments.',
  keywords: ['community', 'home', 'updates', 'events', 'activities', 'people', 'initiatives', 'invite'],
  pages: [
    communityHome, communityEvents, communityEvent, communityActivities, communityCategory, communityPeople, communityInvite,
    communityInitiatives, communityInitiative, communityUpdate, communityNewEvent, communityNewInitiative,
  ],
  skills: [],
});
