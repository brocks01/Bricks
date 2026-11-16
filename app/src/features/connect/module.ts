import { defineModule } from '../../navigation/registry';
import { connectIndex, connectMore } from './pages/index/page';
import { connectCreate, connectExplore, connectJoin, connectPick, connectReview } from './pages';

defineModule({
  id: 'connect',
  title: 'Community',
  summary: 'Your communities (three at most), exploring the others, joining with a code or an open invitation, and asking the Interchange team to start a new one. Everything inside a community (events, people, updates) is in the community module.',
  keywords: ['community', 'activities', 'events', 'people', 'home'],
  pages: [connectIndex, connectMore, connectExplore, connectJoin, connectCreate, connectReview, connectPick],
  skills: [],
});
