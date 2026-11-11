import { defineModule } from '../../navigation/registry';
import { communityHome } from './pages/home/page';

defineModule({
  id: 'community',
  title: 'Community',
  summary: 'One community the person belongs to: its home with events, activities, people and initiatives, and updates from its members.',
  keywords: ['community', 'home', 'updates', 'events', 'activities', 'people', 'initiatives'],
  pages: [communityHome],
  skills: [],
});
