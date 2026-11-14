import { defineModule } from '../../navigation/registry';
import { connectIndex } from './pages/index/page';
import { connectCreate, connectExplore, connectJoin, connectReview } from './pages';

defineModule({
  id: 'connect',
  title: 'Community',
  summary: 'Your communities (three at most), exploring the others, joining with a code or an open invitation, and asking the Bricks team to start a new one. Everything inside a community (events, people, updates) is in the community module.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  pages: [connectIndex, connectExplore, connectJoin, connectCreate, connectReview],
  skills: [],
});
