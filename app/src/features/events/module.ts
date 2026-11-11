import { defineModule } from '../../navigation/registry';
import { eventsIndex } from './pages/index/page';

defineModule({
  id: 'events',
  title: 'Events',
  summary: 'Coming soon. Nothing is built here yet.',
  keywords: ['events', 'calendar'],
  pages: [eventsIndex],
  skills: [],
});
